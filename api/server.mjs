import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(import.meta.url), "../.."));
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "127.0.0.1";
const dataFile = process.env.AISEA_DATA_FILE || join(root, "data", "aisea-store.json");
const imageEndpoint = process.env.AISEA_IMAGE_ENDPOINT || "";
const imageEndpointToken = process.env.AISEA_IMAGE_ENDPOINT_TOKEN || "";
const imageEndpointTimeoutMs = Number(process.env.AISEA_IMAGE_ENDPOINT_TIMEOUT_MS || 15000);

const products = {
  AISEA19: {
    id: "single",
    name: "单次专题报告券",
    rights: { topic: 1, comprehensive: 0 },
  },
  AISEA49: {
    id: "triple",
    name: "三次探索卡",
    rights: { topic: 3, comprehensive: 0 },
  },
  AISEA99: {
    id: "full",
    name: "全案探索卡",
    rights: { topic: 3, comprehensive: 1 },
  },
};

const purchaseLinks = {
  single: process.env.PURCHASE_LINK_SINGLE || "https://www.goofish.com/",
  triple: process.env.PURCHASE_LINK_TRIPLE || "https://www.goofish.com/",
  full: process.env.PURCHASE_LINK_FULL || "https://www.goofish.com/",
};

const defaultPurchaseLink = "https://www.goofish.com/";

let store = {
  redemptions: [],
  reports: {},
  shares: [],
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function productionReadiness() {
  const checks = [
    {
      id: "purchase_links",
      ok: Object.values(purchaseLinks).every((link) => link && link !== defaultPurchaseLink),
      message: "真实闲鱼商品链接已配置",
    },
    {
      id: "image_provider",
      ok: Boolean(imageEndpoint),
      message: "真实生图服务 AISEA_IMAGE_ENDPOINT 已配置",
    },
    {
      id: "persistent_store",
      ok: Boolean(dataFile),
      message: "持久化数据文件已配置",
    },
  ];
  return {
    ready: checks.every((check) => check.ok),
    mode: imageEndpoint ? "external-image-provider" : "local-svg-fallback",
    checks,
  };
}

function svg(res, payload) {
  res.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "no-cache",
  });
  res.end(payload);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function loadStore() {
  try {
    const data = await readFile(dataFile, "utf-8");
    store = { ...store, ...JSON.parse(data) };
  } catch {
    await saveStore();
  }
}

async function saveStore() {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(store, null, 2));
}

function buildShareCopy(persona = "轻法式白月光") {
  return `AI说我是「${persona}」路线，感觉有点准？

刚生成了一份 AI 个人形象报告，关键词是：清透 / 温柔 / 低饱和 / 松弛感。

它给我的变美方向是：
1. 发型增加轻层次，不要太厚重
2. 发色更适合奶茶棕、冷茶棕、摩卡棕
3. 妆容重点放在清透底妆和温柔唇色
4. 穿搭多选奶油白、燕麦色、浅咖色

感觉不是大改造，而是把整体氛围变轻、变柔、变干净。

#AI形象报告 #变美思路 #个人风格定位 #发型推荐 #普通女生变美`;
}

function buildImagePrompt(input = {}) {
  const reportType = input.report_type || "综合形象报告";
  const style = input.style_preference || "系统自动推荐";
  const scene = input.scene_preference || "系统推荐";
  const change = input.change_level || "系统推荐";
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传的照片，生成一张高信息密度、适合保存和分享到小红书/朋友圈的中文个人形象报告长图。

【输出规格】
- 完整报告图：1080x1920，竖版长图，中文清晰可读。
- 小红书封面图：1080x1440，3:4 竖版，作为笔记首图。
- 所有文字必须为中文，不要乱码、错字、重复字或无意义文字。

【报告类型】
${reportType}

【用户偏好】
- 造型表达偏好：${style}
- 目标场景：${scene}
- 改变幅度：${change}

【风格人设】
轻法式白月光。关键词：清透、温柔、松弛、低饱和、轻法式、自然、知性、氛围感。
标题建议：轻法式白月光养成报告。
变美方向：减少厚重感，增加轻盈感、柔和感和氛围感。

【必须包含】
1. 顶部醒目标题区：用户照片主视觉、人设名、关键词、一句话变美方向。
2. 发型推荐：展示真实发型缩略图、刘海、长度、卷度、层次，不能用普通色块代替。
3. 发色推荐：展示真实头发质感色板，例如冷茶棕、奶茶棕、摩卡棕、黑茶色。
4. 色彩妆容：展示色盘、口红、腮红、眼影、眉形、底妆方向。
5. 穿搭配饰：展示服装、鞋、包、首饰、发饰和 3 套 OOTD 灵感。
6. 场景 Look：日常、通勤/上学、拍照、聚会的完整形象方案。
7. 雷区提醒：用“谨慎尝试”“容易削弱协调感”等温和表达。
8. 今日可执行建议：3 条具体行动。
9. 小红书分享金句：2-4 条可直接发布的短句。

【禁止】
- 不要攻击外貌，不要写“丑、土、脸大、显老、不适合你”。
- 不要低俗、暴露、成人化、擦边姿势。
- 不要医学诊断式表达。
- 不要把发型、妆容、穿搭、场景模块混乱摆放。
- 不要生成乱码文字、假中文、随机符号或不可读小字。`;
}

async function generateImageAssets(input, reportId, prompt) {
  if (!imageEndpoint) {
    return {
      provider: "local-svg-fallback",
      report_image_url: `/api/reports/${reportId}/report.svg`,
      xhs_cover_image_url: `/api/reports/${reportId}/cover.svg`,
      xhs_summary_image_url: `/api/reports/${reportId}/cover.svg`,
    };
  }

  const headers = { "content-type": "application/json" };
  if (imageEndpointToken) headers.authorization = `Bearer ${imageEndpointToken}`;
  const response = await fetch(imageEndpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(imageEndpointTimeoutMs),
    body: JSON.stringify({
      report_id: reportId,
      report_type: input.report_type || "综合形象报告",
      style_persona: input.style_persona || "轻法式白月光",
      style_preference: input.style_preference || "系统自动推荐",
      scene_preference: input.scene_preference || "系统推荐",
      change_level: input.change_level || "系统推荐",
      prompt,
      required_outputs: {
        report_image: "1080x1920",
        xhs_cover_image: "1080x1440",
        xhs_summary_image: "1080x1440",
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`image provider failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data.report_image_url || !data.xhs_cover_image_url) {
    throw new Error("image provider response missing image URLs");
  }
  return {
    provider: "external-image-provider",
    report_image_url: data.report_image_url,
    xhs_cover_image_url: data.xhs_cover_image_url,
    xhs_summary_image_url: data.xhs_summary_image_url || data.xhs_cover_image_url,
  };
}

function buildCoverSvg(report = {}) {
  const persona = escapeXml(report.style_persona || "轻法式白月光");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff8fb"/>
      <stop offset="0.55" stop-color="#fffdf9"/>
      <stop offset="1" stop-color="#ffe7dd"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d89a4c"/>
      <stop offset="1" stop-color="#f0c77c"/>
    </linearGradient>
    <style>
      text { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; fill: #7a5147; }
      .serif { font-family: "Songti SC", "STSong", serif; font-weight: 700; }
      .tag { fill: #ff3f7f; font-size: 32px; font-weight: 700; }
      .body { fill: #6c5350; font-size: 34px; }
      .small { fill: #8e7470; font-size: 26px; }
    </style>
  </defs>
  <rect width="1080" height="1440" fill="url(#bg)"/>
  <rect x="70" y="70" width="940" height="1300" rx="56" fill="#fffdf9" stroke="#f1e1e4" stroke-width="3"/>
  <rect x="112" y="130" width="310" height="68" rx="34" fill="#fff1f6"/>
  <text x="154" y="175" class="tag">AI 个人形象报告</text>
  <text x="112" y="350" class="serif" font-size="112">${persona}</text>
  <text x="112" y="475" class="serif" font-size="112">养成报告</text>
  <g>
    <rect x="112" y="540" width="124" height="52" rx="26" fill="#fff1f6"/><text x="146" y="575" class="tag" font-size="28">清透</text>
    <rect x="258" y="540" width="124" height="52" rx="26" fill="#fff1f6"/><text x="292" y="575" class="tag" font-size="28">温柔</text>
    <rect x="404" y="540" width="150" height="52" rx="26" fill="#fff1f6"/><text x="437" y="575" class="tag" font-size="28">低饱和</text>
    <rect x="576" y="540" width="150" height="52" rx="26" fill="#fff1f6"/><text x="609" y="575" class="tag" font-size="28">松弛感</text>
  </g>
  <rect x="112" y="660" width="856" height="230" rx="34" fill="#ffffff" stroke="#f1e1e4" stroke-width="3"/>
  <text x="152" y="725" class="tag" font-size="32">AI 说我的变美方向</text>
  <text x="152" y="790" class="body">不需要大改，减少厚重感，</text>
  <text x="152" y="845" class="body">增加轻盈和低饱和氛围就会更出片。</text>
  <rect x="112" y="945" width="856" height="230" rx="34" fill="#ffffff" stroke="#f1e1e4" stroke-width="3"/>
  <text x="152" y="1010" class="tag" font-size="32">发布引导语</text>
  <text x="152" y="1075" class="body">换发型前真的可以先看看。</text>
  <text x="152" y="1130" class="body">AI 说我更适合这个路线，感觉有点准？</text>
  <rect x="112" y="1245" width="856" height="72" rx="36" fill="url(#gold)"/>
  <text x="260" y="1294" fill="#fff" font-size="34" font-weight="800">适合自己的风格，比盲目跟风更重要</text>
</svg>`;
}

function buildReportSvg(report = {}) {
  const persona = escapeXml(report.style_persona || "轻法式白月光");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff8fb"/>
      <stop offset="0.5" stop-color="#fffdf9"/>
      <stop offset="1" stop-color="#ffe7dd"/>
    </linearGradient>
    <style>
      text { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; fill: #604944; }
      .serif { font-family: "Songti SC", "STSong", serif; font-weight: 700; fill: #7a5147; }
      .title { fill: #ff3f7f; font-size: 32px; font-weight: 800; }
      .body { font-size: 28px; }
      .small { fill: #8e7470; font-size: 23px; }
    </style>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect x="56" y="56" width="968" height="1808" rx="54" fill="#fffdf9" stroke="#f1e1e4" stroke-width="3"/>
  <text x="96" y="185" class="serif" font-size="88">${persona}</text>
  <text x="96" y="285" class="serif" font-size="88">养成报告</text>
  <text x="96" y="350" class="small">清透 / 温柔 / 低饱和 / 松弛感。减少厚重感，增加轻盈和氛围。</text>
  ${reportModule(96, 440, "发型推荐", ["法式慵懒卷 / 锁骨层次发 / 空气感刘海", "关键词：轻盈、自然、脸周修饰"])}
  ${reportModule(552, 440, "发色推荐", ["冷茶棕 / 摩卡棕 / 奶茶棕", "低饱和棕调更耐看，也更适合日常"])}
  ${reportModule(96, 700, "个人色彩", ["中性偏暖、柔和低饱和", "奶油白、燕麦色、豆沙、浅咖更协调"])}
  ${reportModule(552, 700, "妆容建议", ["清透底妆、柔和眉毛、奶茶大地色眼妆", "唇颊选择豆沙色 / 奶茶色 / 玫瑰豆沙"])}
  ${reportModule(96, 960, "穿搭配饰", ["奶油白针织、浅咖半裙、风衣", "珍珠耳饰、小号肩包、细链项链"])}
  ${reportModule(552, 960, "场景 Look", ["日常奶油感 / 通勤松弛感 / 拍照温柔感", "保持低饱和协调，不堆叠复杂元素"])}
  ${reportModule(96, 1220, "谨慎尝试", ["厚重齐刘海、高饱和发色、过重眼妆", "配饰过多容易分散视觉重点"])}
  ${reportModule(552, 1220, "今日动作", ["1. 发尾做轻层次  2. 上衣先选浅色", "3. 妆容重点放在气色"])}
  <rect x="96" y="1510" width="888" height="220" rx="32" fill="#ffffff" stroke="#f1e1e4" stroke-width="3"/>
  <text x="136" y="1585" class="title">小红书分享金句</text>
  <text x="136" y="1650" class="body">AI 说我是轻法式白月光路线，有点准。</text>
  <text x="136" y="1705" class="body">适合自己的风格，比盲目跟风更重要。</text>
</svg>`;
}

function reportModule(x, y, title, lines) {
  return `<rect x="${x}" y="${y}" width="432" height="218" rx="28" fill="#ffffff" stroke="#f1e1e4" stroke-width="3"/>
  <text x="${x + 30}" y="${y + 58}" class="title">${escapeXml(title)}</text>
  <text x="${x + 30}" y="${y + 118}" class="body">${escapeXml(lines[0])}</text>
  <text x="${x + 30}" y="${y + 166}" class="small">${escapeXml(lines[1])}</text>`;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, { ok: true, service: "aisea-h5", version: "1.0.0" });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/readiness") {
    json(res, 200, productionReadiness());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    json(res, 200, {
      products: Object.entries(products).map(([code, product]) => ({
        code,
        ...product,
        purchase_link: purchaseLinks[product.id],
      })),
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/coupons/redeem") {
    const body = await readJson(req);
    if (!body) {
      json(res, 400, { error: "invalid_json" });
      return true;
    }
    const code = String(body.code || "").trim().toUpperCase();
    const product = products[code];
    if (!product) {
      json(res, 404, { error: "invalid_coupon", message: "兑换码无效，请检查后重新输入" });
      return true;
    }
    const redeemedAt = new Date().toISOString();
    store.redemptions.push({
      coupon_code: code,
      product_id: product.id,
      redeemed_at: redeemedAt,
    });
    await saveStore();
    json(res, 200, {
      coupon_code: code,
      product: { ...product, purchase_link: purchaseLinks[product.id] },
      rights: product.rights,
      redeemed_at: redeemedAt,
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/reports/generate") {
    const body = await readJson(req);
    if (!body) {
      json(res, 400, { error: "invalid_json" });
      return true;
    }
    const reportId = `rpt_${Date.now()}`;
    const prompt = buildImagePrompt(body);
    let assets;
    try {
      assets = await generateImageAssets(body, reportId, prompt);
    } catch (error) {
      assets = {
        provider: "local-svg-fallback",
        provider_error: error.message,
        report_image_url: `/api/reports/${reportId}/report.svg`,
        xhs_cover_image_url: `/api/reports/${reportId}/cover.svg`,
        xhs_summary_image_url: `/api/reports/${reportId}/cover.svg`,
      };
    }
    const report = {
      report_id: reportId,
      status: "completed",
      progress: 100,
      report_type: body.report_type || "comprehensive",
      style_persona: body.style_persona || "轻法式白月光",
      style_keywords: ["清透", "温柔", "低饱和", "松弛感"],
      image_provider: assets.provider,
      image_provider_error: assets.provider_error,
      report_image_url: assets.report_image_url,
      xhs_cover_image_url: assets.xhs_cover_image_url,
      xhs_summary_image_url: assets.xhs_summary_image_url,
      created_at: new Date().toISOString(),
      prompt,
    };
    store.reports[reportId] = report;
    await saveStore();
    json(res, 200, report);
    return true;
  }

  const reportMatch = url.pathname.match(/^\/api\/reports\/([^/]+)$/);
  if (req.method === "GET" && reportMatch) {
    const report = store.reports[reportMatch[1]];
    if (!report) {
      json(res, 404, { error: "report_not_found" });
      return true;
    }
    json(res, 200, report);
    return true;
  }

  if (req.method === "DELETE" && reportMatch) {
    const existed = Boolean(store.reports[reportMatch[1]]);
    delete store.reports[reportMatch[1]];
    store.shares = store.shares.filter((share) => share.report_id !== reportMatch[1]);
    await saveStore();
    json(res, 200, { ok: true, deleted: existed, report_id: reportMatch[1] });
    return true;
  }

  const assetMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/(cover|report)\.svg$/);
  if (req.method === "GET" && assetMatch) {
    const report = store.reports[assetMatch[1]] || { report_id: assetMatch[1], style_persona: "轻法式白月光" };
    svg(res, assetMatch[2] === "cover" ? buildCoverSvg(report) : buildReportSvg(report));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/reports/prepare-xhs-share") {
    const body = (await readJson(req)) || {};
    const reportId = body.report_id || `rpt_${Date.now()}`;
    const persona = body.style_persona || "轻法式白月光";
    const share = {
      report_id: reportId,
      report_type: body.report_type || "comprehensive",
      style_persona: persona,
      cover_image_url: `/api/reports/${reportId}/cover.svg`,
      report_image_url: `/api/reports/${reportId}/report.svg`,
      summary_image_url: `/api/reports/${reportId}/cover.svg`,
      share_title: `AI说我是「${persona}」路线，感觉有点准？`,
      share_text: buildShareCopy(persona),
      hashtags: ["AI形象报告", "变美思路", "个人风格定位", "发型推荐"],
      copy_text: buildShareCopy(persona),
      prepared_at: new Date().toISOString(),
    };
    store.shares.push({
      report_id: share.report_id,
      platform: "xhs",
      action: "prepare",
      created_at: share.prepared_at,
    });
    await saveStore();
    json(res, 200, share);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/reports/generate-prompt") {
    const body = (await readJson(req)) || {};
    json(res, 200, {
      prompt: buildImagePrompt(body),
      negative_checks: [
        "中文清晰可读",
        "发型、发色、妆容、穿搭、场景模块不混乱",
        "不出现乱码、假中文、随机符号",
        "不攻击外貌、不制造焦虑",
      ],
    });
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  } catch {
    const data = await readFile(join(root, "index.html"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(data);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url)) return;
    await serveStatic(req, res, url);
  } catch (error) {
    json(res, 500, { error: "internal_error", message: error.message });
  }
});

await loadStore();

server.listen(port, host, () => {
  console.log(`AISea H5 server running at http://${host}:${port}/`);
});
