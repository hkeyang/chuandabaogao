interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2Bucket {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ASSETS: Fetcher;
  PUBLIC_BASE_URL: string;
  R2_PUBLIC_BASE_URL: string;
  OPENAI_IMAGE_ENDPOINT: string;
  OPENAI_IMAGE_MODEL: string;
  OPENAI_API_KEY: string;
  ADMIN_PASSWORD_SECRET: string;
  COUPON_VALID_DAYS: string;
}

type Json = Record<string, unknown>;

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(init.headers || {}) },
  });

const now = () => new Date().toISOString();

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function couponCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function body<T = Json>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

async function audit(env: Env, actor: string, action: string, detail: string, request: Request) {
  await env.DB.prepare("INSERT INTO audit_logs (id, actor_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(randomId("log"), actor, action, detail, request.headers.get("cf-connecting-ip") || "", now())
    .run();
}

async function hash(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function requireAdmin(request: Request, env: Env, roles: string[] = ["owner", "admin"]) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = await hash(env.ADMIN_PASSWORD_SECRET);
  if (token !== expected) return null;
  return { id: "env_owner", role: "owner", name: "AISea Owner", roles };
}

function typePrompt(reportType: string) {
  const prompts: Record<string, string[]> = {
    comprehensive: [
      "1. 风格人设与形象关键词：给出温和正向的一句话结论。",
      "2. 发型推荐：真实发型缩略图、刘海、长度、卷度、层次，不能用普通色块代替。",
      "3. 发色推荐：真实头发质感色板，例如黑茶色、冷茶棕、摩卡棕、奶茶棕。",
      "4. 个人色彩：推荐色盘与谨慎色盘，颜色名称要准确。",
      "5. 妆容建议：底妆、眉形、眼妆、腮红、唇色。",
      "6. 穿搭配饰：服装、鞋、包、首饰、发饰和 3 套 OOTD。",
      "7. 场景 Look：日常、通勤/上学、拍照、聚会。",
      "8. 雷区提醒：使用“谨慎尝试”“容易削弱协调感”等温和表达。",
      "9. 今日可执行的 3 个变美动作和小红书分享金句。",
    ],
    hair: [
      "1. 脸部轮廓、发质状态、发量感、当前发型气质。",
      "2. 推荐发型：真实缩略图，展示长度、刘海、卷度、层次。",
      "3. 发色推荐：展示低饱和、自然过渡的发色质感。",
      "4. 刘海 / 长度 / 卷度建议。",
      "5. 谨慎尝试方向。",
      "6. 理发师沟通关键词和今日专属造型灵感。",
    ],
    makeup: [
      "1. 个人色彩倾向：冷暖、明度、饱和度、对比度。",
      "2. 推荐色盘：主色、辅助色、点缀色、中性色。",
      "3. 妆容方向：底妆、眉形、眼妆、腮红、唇色。",
      "4. 发色延展建议。",
      "5. 谨慎尝试的妆色与雷区。",
      "6. 今日可执行妆容步骤。",
    ],
    outfit: [
      "1. 风格定位：结合照片与偏好给出一句话结论。",
      "2. 服装推荐：上衣、外套、下装或连衣搭配。",
      "3. 鞋包首饰：必须对应人物性别呈现，男性照片只输出男性或中性男性单品，禁止裙装、高跟鞋和口红类女性化内容。",
      "4. 3 套 OOTD 灵感：日常、通勤、拍照或聚会。",
      "5. 谨慎尝试：避免风格冲突和过度堆叠。",
      "6. 今日穿搭清单和一句话搭配口诀。",
    ],
    look: [
      "1. 日常 Look。",
      "2. 通勤 / 上学 Look。",
      "3. 拍照 Look。",
      "4. 聚会 Look。",
      "5. 场景对比表与今日可执行建议。",
      "6. 适合保存的总结语。",
    ],
  };
  return (prompts[reportType] || prompts.comprehensive).join("\n");
}

function promptFor(input: Json) {
  const reportType = String(input.report_type || "comprehensive");
  const reportLabel = ({
    comprehensive: "综合形象报告",
    hair: "发型发色专题",
    makeup: "色彩妆容专题",
    outfit: "穿搭配饰专题",
    look: "场景 Look 专题",
  } as Record<string, string>)[reportType] || "综合形象报告";
  const persona = String(input.style_persona || "轻法式白月光");
  const keywords = String(input.style_keywords || "清透 / 温柔 / 低饱和 / 松弛感");
  const style = String(input.style_preference || "系统自动推荐");
  const scene = String(input.scene_preference || "系统推荐");
  const change = String(input.change_level || "系统推荐");
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传照片生成中文个人形象报告图。

输出两张图：
1. 完整报告长图：1080×1920 或更长，适合保存查看。
2. 小红书封面图：1080×1440，3:4，标题大、人物清晰、留白干净。

报告类型：${reportType}
报告名称：${reportLabel}
风格人设：${persona}
关键词：${keywords}
造型表达偏好：${style}
目标场景：${scene}
改变幅度：${change}

人物识别硬规则：
- 先根据上传照片识别人物的性别呈现、气质和五官轮廓，再决定输出内容。
- 如果照片呈现为男性或偏男性气质，所有穿搭、鞋包、配饰、发型和妆容建议都必须是男性或中性男性风格。
- 男性照片禁止出现裙装、高跟鞋、口红、浓重腮红、女性化连衣裙、夸张睫毛、擦边姿态等内容。
- 如果性别特征不清晰，优先输出中性、克制、适合男性也适合女性的安全风格。
- 必须尽量保留用户本人核心长相特征，不要把用户生成成别人的脸。

必须包含：
${typePrompt(reportType)}

文字必须是清晰简体中文。禁止乱码、假中文、随机符号、重复字、不可读小字。
保留用户本人核心长相特征，不要过度美颜，不要攻击外貌，不要低俗或成人化。`;
}

async function imageGenerate(env: Env, payload: Json, prompt: string) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(env.OPENAI_IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt,
      size: "1080x1920",
      n: 1,
      response_format: "b64_json",
      user_photo_url: payload.user_photo_data_url || payload.user_photo_url,
      extra_outputs: [{ name: "xhs_cover", size: "1080x1440" }],
    }),
  });
  if (!response.ok) throw new Error(`image endpoint failed: ${response.status}`);
  return response.json() as Promise<Json>;
}

async function storeB64(env: Env, key: string, b64: string, type = "image/png") {
  const bucket = (env as { R2?: R2Bucket }).R2;
  if (!bucket) throw new Error("R2 binding is not configured");
  const binary = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
  await bucket.put(key, binary, { httpMetadata: { contentType: type } });
  return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

async function handleApi(request: Request, env: Env, url: URL) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, service: "aisea", date: now() });
  }

  if (request.method === "GET" && url.pathname === "/api/config") {
    const products = await env.DB.prepare("SELECT * FROM products WHERE enabled = 1 ORDER BY sort_order ASC").all();
    return json({ products: products.results });
  }

  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    const input = await body(request);
    const password = String(input.password || "");
    if (!env.ADMIN_PASSWORD_SECRET || password !== env.ADMIN_PASSWORD_SECRET) return json({ error: "invalid_password" }, { status: 401 });
    await audit(env, "env_owner", "admin.login", "管理员登录", request);
    return json({ token: await hash(env.ADMIN_PASSWORD_SECRET), user: { id: "env_owner", role: "owner", name: "AISea Owner" } });
  }

  if (url.pathname.startsWith("/api/admin/")) {
    const admin = await requireAdmin(request, env);
    if (!admin) return json({ error: "unauthorized" }, { status: 401 });

    if (request.method === "POST" && url.pathname === "/api/admin/coupons/batch") {
      const input = await body(request);
      const count = Math.max(1, Math.min(Number(input.count || 1), 1000));
      const productId = String(input.product_id || "single");
      const platform = String(input.platform || "闲鱼");
      const days = Number(env.COUPON_VALID_DAYS || 30);
      const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
      const codes: string[] = [];
      for (let i = 0; i < count; i += 1) {
        let code = couponCode();
        for (let guard = 0; guard < 5; guard += 1) {
          const existed = await env.DB.prepare("SELECT code FROM coupons WHERE code = ?").bind(code).first();
          if (!existed) break;
          code = couponCode();
        }
        await env.DB.prepare("INSERT INTO coupons (code, product_id, platform, status, created_at, expires_at) VALUES (?, ?, ?, 'unused', ?, ?)")
          .bind(code, productId, platform, now(), expiresAt)
          .run();
        codes.push(code);
      }
      await audit(env, admin.id, "coupon.batch_create", `${platform} 生成 ${count} 个 ${productId} 兑换码`, request);
      return json({ codes, expires_at: expiresAt });
    }

    if (request.method === "GET" && url.pathname === "/api/admin/audit") {
      const logs = await env.DB.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200").all();
      return json({ logs: logs.results });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/coupons/redeem") {
    const input = await body(request);
    const code = String(input.code || "").toUpperCase();
    const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?").bind(code).first<Record<string, string>>();
    if (!coupon) return json({ error: "invalid_coupon", message: "兑换码无效，请检查后重新输入" }, { status: 404 });
    if (coupon.status !== "unused") return json({ error: "coupon_unavailable", message: "兑换码已使用或不可用" }, { status: 409 });
    if (new Date(coupon.expires_at).getTime() < Date.now()) return json({ error: "coupon_expired", message: "兑换码已过期" }, { status: 410 });
    const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(coupon.product_id).first<Record<string, unknown>>();
    await env.DB.prepare("UPDATE coupons SET status = 'redeemed', redeemed_at = ?, redeemed_client_id = ? WHERE code = ?")
      .bind(now(), String(input.client_id || ""), code)
      .run();
    return json({ coupon_code: code, product, rights: { topic: product?.topic_rights || 0, comprehensive: product?.comprehensive_rights || 0 } });
  }

  if (request.method === "POST" && url.pathname === "/api/reports/generate") {
    const input = await body(request);
    const reportId = randomId("rpt");
    const prompt = promptFor(input);
    const rightKey = String(input.right_key || "topic");
    let reportImageUrl = "";
    let coverImageUrl = "";
    let subjectGender = "unknown";
    let status = "completed";
    let error = "";
    try {
      const generated = await imageGenerate(env, input, prompt);
      const image = Array.isArray(generated.data) ? generated.data[0] as Json : generated;
      const generatedSubject = typeof generated.subject === "object" && generated.subject
        ? (generated.subject as Json).gender
        : "";
      subjectGender = String(generated.subject_gender || generatedSubject || image.subject_gender || "unknown");
      if (typeof image.b64_json === "string") {
        reportImageUrl = await storeB64(env, `reports/${reportId}.png`, image.b64_json);
      }
      if (typeof image.xhs_cover_b64_json === "string") {
        coverImageUrl = await storeB64(env, `reports/${reportId}-xhs-cover.png`, image.xhs_cover_b64_json);
      }
      if (!reportImageUrl) {
        throw new Error("image generation completed without report image");
      }
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : "image generation failed";
    }
    const db = (env as { DB?: D1Database }).DB;
    if (db) {
      await db.prepare(`INSERT INTO reports
        (id, client_id, coupon_code, report_type, style_persona, style_keywords, prompt, status, error, retry_count, locked_right_key, report_image_url, xhs_cover_image_url, created_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`)
        .bind(reportId, String(input.client_id || ""), String(input.coupon_code || ""), String(input.report_type || ""), String(input.style_persona || "轻法式白月光"), String(input.style_keywords || ""), prompt, status, error, rightKey, reportImageUrl, coverImageUrl, now(), status === "completed" ? now() : null)
        .run();
    }
    return json({ report_id: reportId, status, error, prompt, subject_gender: subjectGender, report_image_url: reportImageUrl, xhs_cover_image_url: coverImageUrl });
  }

  if (request.method === "POST" && url.pathname === "/api/reports/prepare-xhs-share") {
    const input = await body(request);
    const reportId = String(input.report_id || "");
    await env.DB.prepare("INSERT INTO share_events (id, report_id, platform, action, device_info, created_at) VALUES (?, ?, 'xhs', 'prepare', ?, ?)")
      .bind(randomId("share"), reportId, request.headers.get("user-agent") || "", now())
      .run();
    const report = await env.DB.prepare("SELECT * FROM reports WHERE id = ?").bind(reportId).first<Record<string, string>>();
    return json({
      report_id: reportId,
      cover_image_url: report?.xhs_cover_image_url || "",
      report_image_url: report?.report_image_url || "",
      share_title: `AI说我是「${input.style_persona || "轻法式白月光"}」路线，感觉有点准？`,
      copy_text: `AI说我是「${input.style_persona || "轻法式白月光"}」路线，感觉有点准？\n\n刚生成了一份 AI 个人形象报告，准备照着试试。\n\n#AI形象报告 #变美思路 #普通女生变美`,
    });
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const response = await handleApi(request, env, url);
      if (response) return response;
      return json({ error: "not_found" }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
