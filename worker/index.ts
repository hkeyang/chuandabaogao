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
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; httpMetadata?: { contentType?: string } } | null>;
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
  OPENAI_RESPONSES_ENDPOINT?: string;
  OPENAI_PREANALYSIS_MODEL?: string;
  ALIYUN_ACCESS_KEY_ID?: string;
  ALIYUN_ACCESS_KEY_SECRET?: string;
  ALIYUN_SMS_SIGN_NAME?: string;
  ALIYUN_SMS_TEMPLATE_CODE?: string;
  ALIYUN_SMS_ENDPOINT?: string;
  ALIYUN_SMS_PROVIDER?: string;
  AUTH_DEV_CODE?: string;
  ADMIN_PASSWORD_SECRET: string;
  COUPON_VALID_DAYS: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PAYMENTS_ENABLED?: string;
  STRIPE_PAYMENT_CURRENCY?: string;
  STRIPE_SUCCESS_URL?: string;
  STRIPE_CANCEL_URL?: string;
}

type Json = Record<string, unknown>;
type PayChannel = "wechat" | "alipay";
type ProductRow = {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  badge?: string | null;
  description: string;
  topic_rights: number;
  comprehensive_rights: number;
  purchase_link: string;
  enabled: number;
  sort_order: number;
  updated_at: string;
};
const PRODUCT_ALIAS_MAP: Record<string, string> = {
  single_topic_wechat: "single",
  single_topic_alipay: "single",
  three_topic_wechat: "triple",
  three_topic_alipay: "triple",
  full_case_wechat: "full",
  full_case_alipay: "full",
};
const PRODUCT_PACKAGE_MAP: Record<string, string> = {
  single_topic_wechat: "single_topic",
  single_topic_alipay: "single_topic",
  three_topic_wechat: "three_topic",
  three_topic_alipay: "three_topic",
  full_case_wechat: "full_case",
  full_case_alipay: "full_case",
};
const DEFAULT_PRODUCT_ROWS: ProductRow[] = [
  {
    id: "single",
    name: "单次专题报告券",
    price: 4,
    original_price: null,
    badge: null,
    description: "专题 ×1",
    topic_rights: 1,
    comprehensive_rights: 0,
    purchase_link: "",
    enabled: 1,
    sort_order: 1,
    updated_at: "2026-05-10T00:00:00.000Z",
  },
  {
    id: "triple",
    name: "三次探索卡",
    price: 4.9,
    original_price: 5.7,
    badge: "推荐",
    description: "专题 ×3",
    topic_rights: 3,
    comprehensive_rights: 0,
    purchase_link: "",
    enabled: 1,
    sort_order: 2,
    updated_at: "2026-05-10T00:00:00.000Z",
  },
  {
    id: "full",
    name: "全案探索卡",
    price: 9.9,
    original_price: 15.9,
    badge: "最完整",
    description: "综合 ×1 / 专题 ×3",
    topic_rights: 3,
    comprehensive_rights: 1,
    purchase_link: "",
    enabled: 1,
    sort_order: 3,
    updated_at: "2026-05-10T00:00:00.000Z",
  },
];
const PAYMENT_METHODS_BY_CHANNEL: Record<PayChannel, string[]> = {
  wechat: ["wechat_pay"],
  alipay: ["alipay"],
};
type OrderRow = {
  id: string;
  order_no: string;
  client_id: string;
  user_id?: string | null;
  product_id: string;
  product_snapshot_json: string;
  amount: number;
  currency: string;
  status: string;
  rights_topic: number;
  rights_comprehensive: number;
  coupon_code?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  fulfilled_at?: string | null;
  created_at: string;
  updated_at: string;
};
type ReportRow = {
  id: string;
  report_image_key?: string | null;
  xhs_cover_image_key?: string | null;
  xhs_summary_image_key?: string | null;
  report_image_url?: string | null;
  xhs_cover_image_url?: string | null;
  xhs_summary_image_url?: string | null;
  status?: string | null;
  error?: string | null;
};
type EntitlementRow = {
  id: string;
  topic_remaining: number;
  comprehensive_remaining: number;
};
type UserRow = {
  id: string;
  phone: string;
  display_name: string;
  created_at: string;
  last_login_at?: string | null;
};
type AuthUser = {
  id: string;
  phone: string;
  display_name: string;
};
type SmsCodeRow = {
  id: string;
  phone: string;
  code_hash: string;
  purpose: string;
  status: string;
  attempts: number;
  expires_at: string;
  created_at: string;
  used_at?: string | null;
};

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(init.headers || {}) },
  });

const now = () => new Date().toISOString();

function isMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /no such table/i.test(message);
}

function setupRequiredResponse(detail = "支付系统数据表尚未初始化，请稍后重试。") {
  return json({
    error: "database_setup_required",
    message: detail,
  }, { status: 503 });
}

function userFacingGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (isMissingTableError(error)) return "支付系统数据表尚未初始化，请稍后重试。";
  if (/OPENAI_API_KEY/i.test(message)) return "生图服务密钥未配置，请联系管理员。";
  if (/R2 binding/i.test(message)) return "报告存储服务未配置，请联系管理员。";
  if (/user photo/i.test(message)) return "照片数据缺失，请重新上传后再试。";
  if (/timed out/i.test(message)) return "生图等待超时，请稍后重新生成，未扣除权益。";
  if (/image upload failed/i.test(message)) return "照片上传到生图服务失败，请重新上传后再试。";
  if (/image task submit failed/i.test(message)) return "生图任务提交失败，请稍后重新生成，未扣除权益。";
  if (/image task query failed/i.test(message)) return "生图任务查询失败，请稍后重新生成，未扣除权益。";
  if (/completed without/i.test(message)) return "生图服务没有返回报告图，请重新生成，未扣除权益。";
  return message || "生成失败，请重新生成，未扣除权益。";
}

function redactedUpstreamError(message: string) {
  return message
    .replace(/sk-[A-Za-z0-9_*.-]+/g, "[redacted_api_key]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function orderNo() {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  return `AI${stamp}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function stripePaymentsEnabled(env: Env) {
  return env.STRIPE_PAYMENTS_ENABLED === "true" && Boolean(env.STRIPE_SECRET_KEY);
}

function stripeCurrency(env: Env) {
  return String(env.STRIPE_PAYMENT_CURRENCY || "cny").toLowerCase();
}

function unitAmount(price: unknown) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) throw new Error("invalid_product_price");
  return Math.round(value * 100);
}

function couponCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function body<T = Json>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

function checkoutReturnUrl(env: Env, key: "success" | "cancel") {
  const base = env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (key === "success") return env.STRIPE_SUCCESS_URL || `${base}/#/success?session_id={CHECKOUT_SESSION_ID}`;
  return env.STRIPE_CANCEL_URL || `${base}/#/cancel`;
}

function reportAssetPath(reportId: string, kind: "report" | "cover" | "summary") {
  return `/api/reports/${reportId}/${kind}.png`;
}

function reportAssetKey(reportId: string, kind: "report" | "cover" | "summary") {
  if (kind === "report") return `reports/${reportId}.png`;
  if (kind === "cover") return `reports/${reportId}-xhs-cover.png`;
  return `reports/${reportId}-xhs-summary.png`;
}

function reportAssetFallbackKeys(reportId: string, kind: "report" | "cover" | "summary", row?: ReportRow | null) {
  const keys = [
    kind === "report" ? row?.report_image_key : kind === "cover" ? row?.xhs_cover_image_key : row?.xhs_summary_image_key,
    reportAssetKey(reportId, kind),
  ];
  if (kind === "summary") {
    keys.push(row?.xhs_cover_image_key, reportAssetKey(reportId, "cover"), row?.report_image_key, reportAssetKey(reportId, "report"));
  }
  if (kind === "cover") {
    keys.push(row?.report_image_key, reportAssetKey(reportId, "report"));
  }
  return [...new Set(keys.filter((item): item is string => Boolean(item)))];
}

async function serveR2Object(object: { body: ReadableStream<Uint8Array>; httpMetadata?: { contentType?: string } }) {
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "image/png",
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

async function stripeRequest(env: Env, path: string, params: URLSearchParams) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("stripe_secret_missing");
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": "2026-02-25.clover",
    },
    body: params,
  });
  const payload = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    const error = typeof payload.error === "object" && payload.error ? payload.error as Json : {};
    throw new Error(String(error.message || payload.error || `stripe_${response.status}`));
  }
  return payload;
}

function checkoutErrorResponse(error: unknown, channel = "") {
  const detail = error instanceof Error ? error.message : String(error || "checkout_failed");
  const normalized = detail.toLowerCase();
  if (isMissingTableError(error)) return setupRequiredResponse();
  if (detail === "stripe_secret_missing") {
    return json({
      error: "STRIPE_SECRET_MISSING",
      message: "支付密钥尚未配置，请稍后再试。",
      channel,
    }, { status: 503 });
  }
  if (normalized.includes("payment method type provided") || normalized.includes("activated in your dashboard")) {
    return json({
      error: "STRIPE_PAYMENT_METHOD_NOT_ENABLED",
      message: "当前支付方式尚未在 Stripe 启用或审批通过，请选择其他支付方式或稍后再试。",
      channel,
      stripe_error: detail,
    }, { status: 424 });
  }
  if (normalized.includes("currency") || normalized.includes("country combination")) {
    return json({
      error: "STRIPE_PAYMENT_METHOD_UNSUPPORTED",
      message: "当前支付方式与币种或账户地区配置不匹配，请稍后再试。",
      channel,
      stripe_error: detail,
    }, { status: 424 });
  }
  if (normalized.includes("total amount must convert to at least") || normalized.includes("amount must be at least")) {
    return json({
      error: "STRIPE_AMOUNT_BELOW_MINIMUM",
      message: "当前套餐金额低于 Stripe 对该支付方式的最低金额要求，请选择更高金额套餐或调整定价。",
      channel,
      stripe_error: detail,
    }, { status: 424 });
  }
  console.error("[orders/checkout] failed", { channel, message: detail });
  return json({
    error: "CHECKOUT_CREATE_FAILED",
    message: "订单创建失败，请稍后重试。",
    channel,
  }, { status: 502 });
}

async function retrieveCheckoutSession(env: Env, sessionId: string) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("stripe_secret_missing");
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "stripe-version": "2026-02-25.clover",
    },
  });
  const payload = await response.json().catch(() => ({})) as Json;
  if (!response.ok) throw new Error(`stripe_session_retrieve_failed:${response.status}`);
  return payload;
}

function orderPayload(order: OrderRow | null) {
  if (!order) return null;
  return {
    id: order.id,
    order_no: order.order_no,
    user_id: order.user_id || "",
    product_id: order.product_id,
    product: JSON.parse(order.product_snapshot_json || "{}"),
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    rights: { topic: order.rights_topic, comprehensive: order.rights_comprehensive },
    coupon_code: order.coupon_code || "",
    stripe_checkout_session_id: order.stripe_checkout_session_id || "",
    stripe_payment_intent_id: order.stripe_payment_intent_id || "",
    expires_at: order.expires_at || "",
    paid_at: order.paid_at || "",
    fulfilled_at: order.fulfilled_at || "",
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("preanalysis_json_missing");
    return JSON.parse(match[0]) as Json;
  }
}

function responseOutputText(payload: Json) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Json).content) ? (item as Json).content as Json[] : [];
    for (const part of content) {
      if (typeof part.text === "string") parts.push(part.text);
      if (typeof part.output_text === "string") parts.push(part.output_text);
    }
  }
  return parts.join("\n").trim();
}

function normalizePreAnalysis(raw: Json, fallback: {
  reportType: string;
  label: string;
  fit: "good" | "warning" | "poor";
  recommendedProductId: string;
}) {
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const normalizedSections = sections.slice(0, 3).map((section, index) => {
    const item = section && typeof section === "object" ? section as Json : {};
    return {
      title: String(item.title || ["整体判断", "当前优势", "优先优化"][index] || "分析建议"),
      text: String(item.text || ""),
    };
  }).filter((section) => section.text.trim());
  while (normalizedSections.length < 3) {
    const titles = ["整体判断", "当前优势", "优先优化"];
    normalizedSections.push({ title: titles[normalizedSections.length], text: "当前照片可用于预分析，完整报告会继续细化可执行建议。" });
  }
  const keywords = Array.isArray(raw.keywords) ? raw.keywords.map(String).filter(Boolean).slice(0, 3) : [];
  while (keywords.length < 3) keywords.push(["方向明确", "可继续深化", "适合生成"][keywords.length]);
  const photoFit = ["good", "warning", "poor"].includes(String(raw.photoFit)) ? String(raw.photoFit) : fallback.fit;
  return {
    id: String(raw.id || randomId("pa")),
    reportType: fallback.reportType,
    title: String(raw.title || `${fallback.label}预分析`),
    summary: String(raw.summary || normalizedSections[0]?.text || "当前照片适合继续生成完整形象报告。"),
    keywords,
    photoFit,
    photoAdvice: String(raw.photoAdvice || "建议使用清晰、正面、自然光照片，完整报告会更准确。"),
    recommendedProductId: String(raw.recommendedProductId || fallback.recommendedProductId),
    sections: normalizedSections,
    aiGenerated: Boolean(raw.aiGenerated ?? true),
  };
}

async function createAiPreAnalysis(env: Env, input: Json, fallback: {
  reportType: string;
  label: string;
  fit: "good" | "warning" | "poor";
  recommendedProductId: string;
}) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  const userPhoto = String(input.user_photo_data_url || input.user_photo_url || "");
  if (!userPhoto) throw new Error("user_photo_data_url_required");
  const model = env.OPENAI_PREANALYSIS_MODEL || "gpt-4.1-mini";
  const prompt = [
    "你是 AISea 的个人形象预分析师。请只基于用户上传照片中能看见的信息，结合用户偏好，生成温和、具体、可执行的中文预分析。",
    "不要评价颜值，不要做医学、种族、年龄、身份等敏感推断；不确定就写“照片中暂不明显”。",
    "必须返回纯 JSON，不要 Markdown。JSON 字段：title, summary, keywords(3个字符串), photoFit(good|warning|poor), photoAdvice, recommendedProductId(single|triple|full), sections(3个对象，标题固定为“整体判断”“当前优势”“优先优化”，每个 text 60-100 字)。",
    `报告类型：${String(input.report_name || fallback.label)} (${fallback.reportType})`,
    `风格偏好：${String(input.style_preference || "系统推荐")}`,
    `场景偏好：${String(input.scene_preference || "日常干净")}`,
    `改变幅度：${String(input.change_level || "轻微优化")}`,
    `照片检测：${String(input.photo_check_result || "available")}`,
  ].join("\n");
  const responsesEndpoint = (env.OPENAI_RESPONSES_ENDPOINT || "https://api.openai.com/v1/responses").replace(/\/$/, "");
  const response = await fetch(responsesEndpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: userPhoto, detail: "low" },
        ],
      }],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });
  const payload = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    const detail = typeof payload.error === "object" && payload.error ? JSON.stringify(payload.error).slice(0, 300) : JSON.stringify(payload).slice(0, 300);
    throw new Error(`preanalysis_ai_failed:${response.status}:${detail}`);
  }
  const text = responseOutputText(payload);
  if (!text) throw new Error("preanalysis_ai_empty");
  return normalizePreAnalysis(parseJsonObject(text), fallback);
}

async function fulfillOrder(env: Env, orderId: string, stripePaymentIntentId = "") {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<OrderRow>();
  if (!order) throw new Error("order_not_found");
  if (order.fulfilled_at && order.coupon_code) return order;

  let code = couponCode();
  for (let guard = 0; guard < 8; guard += 1) {
    const existed = await env.DB.prepare("SELECT code FROM coupons WHERE code = ?").bind(code).first();
    if (!existed) break;
    code = couponCode();
  }
  const paidAt = order.paid_at || now();
  const days = Number(env.COUPON_VALID_DAYS || 30);
  const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();

  await env.DB.prepare("INSERT INTO coupons (code, product_id, platform, status, created_at, expires_at, redeemed_client_id) VALUES (?, ?, 'Stripe', 'unused', ?, ?, ?)")
    .bind(code, order.product_id, now(), expiresAt, order.client_id)
    .run();
  await env.DB.prepare("UPDATE orders SET status = 'fulfilled', coupon_code = ?, stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id), paid_at = COALESCE(paid_at, ?), fulfilled_at = ?, updated_at = ? WHERE id = ? AND fulfilled_at IS NULL")
    .bind(code, stripePaymentIntentId, paidAt, now(), now(), order.id)
    .run();
  await env.DB.prepare(`INSERT INTO entitlements
    (id, client_id, user_id, order_id, product_id, topic_remaining, comprehensive_remaining, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
    .bind(randomId("ent"), order.client_id, order.user_id || null, order.id, order.product_id, order.rights_topic, order.rights_comprehensive, now(), now())
    .run();

  return {
    ...order,
    status: "fulfilled",
    coupon_code: code,
    stripe_payment_intent_id: stripePaymentIntentId || order.stripe_payment_intent_id,
    paid_at: order.paid_at || paidAt,
    fulfilled_at: now(),
    updated_at: now(),
  };
}

async function availableEntitlement(env: Env, clientId: string, rightKey: string, userId = "") {
  if (!clientId && !userId) return null;
  const column = rightKey === "comprehensive" ? "comprehensive_remaining" : "topic_remaining";
  const where = userId ? "user_id = ?" : "client_id = ?";
  return env.DB.prepare(`SELECT id, topic_remaining, comprehensive_remaining FROM entitlements WHERE ${where} AND status = 'active' AND ${column} > 0 ORDER BY created_at ASC LIMIT 1`)
    .bind(userId || clientId)
    .first<EntitlementRow>();
}

async function consumeEntitlement(env: Env, entitlementId: string, rightKey: string) {
  const column = rightKey === "comprehensive" ? "comprehensive_remaining" : "topic_remaining";
  await env.DB.prepare(`UPDATE entitlements SET ${column} = MAX(0, ${column} - 1), updated_at = ? WHERE id = ? AND ${column} > 0`)
    .bind(now(), entitlementId)
    .run();
  await env.DB.prepare("UPDATE entitlements SET status = 'exhausted', updated_at = ? WHERE id = ? AND topic_remaining <= 0 AND comprehensive_remaining <= 0")
    .bind(now(), entitlementId)
    .run();
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const timestamp = signature.match(/(?:^|,)t=([^,]+)/)?.[1] || "";
  const signatures = [...signature.matchAll(/(?:^|,)v1=([^,]+)/g)].map((match) => match[1]);
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return signatures.some((item) => item.length === digest.length && item === digest);
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

function normalizePhone(phone: string) {
  const compact = phone.replace(/[^\d+]/g, "");
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  if (/^\+86[1]\d{10}$/.test(compact)) return compact;
  if (/^861\d{10}$/.test(compact)) return `+${compact}`;
  return compact;
}

function maskPhone(phone: string) {
  const normalized = normalizePhone(phone);
  return normalized.replace(/(\+?\d{2,4})\d{4}(\d{3,4})$/, "$1****$2");
}

function randomDigits(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => String(byte % 10)).join("");
}

function rfc3986(input: string) {
  return encodeURIComponent(input).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1Base64(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function callAliyunRpc(endpoint: string, secret: string, params: Record<string, string>) {
  const canonical = Object.keys(params).sort().map((key) => `${rfc3986(key)}=${rfc3986(params[key])}`).join("&");
  const stringToSign = `GET&%2F&${rfc3986(canonical)}`;
  const signature = await hmacSha1Base64(`${secret}&`, stringToSign);
  const url = `${endpoint}?Signature=${rfc3986(signature)}&${canonical}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({})) as Json;
  if (!response.ok || String(payload.Code || "") !== "OK") {
    throw new Error(String(payload.Message || payload.Code || `aliyun_sms_${response.status}`));
  }
  return payload;
}

async function sendAliyunSms(env: Env, phone: string, code: string) {
  if (!env.ALIYUN_ACCESS_KEY_ID || !env.ALIYUN_ACCESS_KEY_SECRET || !env.ALIYUN_SMS_SIGN_NAME || !env.ALIYUN_SMS_TEMPLATE_CODE) {
    if (env.AUTH_DEV_CODE) return { sent: false, provider: "dev", code };
    throw new Error("sms_provider_not_configured");
  }
  const provider = (env.ALIYUN_SMS_PROVIDER || "dysms").toLowerCase();
  const commonParams: Record<string, string> = {
    AccessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    Format: "JSON",
    RegionId: "cn-hangzhou",
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };
  if (provider === "dypns") {
    const payload = await callAliyunRpc(env.ALIYUN_SMS_ENDPOINT || "https://dypnsapi.aliyuncs.com/", env.ALIYUN_ACCESS_KEY_SECRET, {
      ...commonParams,
      Action: "SendSmsVerifyCode",
      AutoRetry: "1",
      CodeLength: "6",
      CodeType: "1",
      CountryCode: "86",
      DuplicatePolicy: "1",
      Interval: "60",
      PhoneNumber: phone.replace(/^\+86/, ""),
      ReturnVerifyCode: "true",
      SignName: env.ALIYUN_SMS_SIGN_NAME,
      TemplateCode: env.ALIYUN_SMS_TEMPLATE_CODE,
      TemplateParam: JSON.stringify({ code: "##code##", min: "5" }),
      ValidTime: "300",
    });
    const model = (payload.Model || {}) as Json;
    const verifyCode = String(model.VerifyCode || "");
    if (!/^\d{4,8}$/.test(verifyCode)) throw new Error("aliyun_sms_code_unavailable");
    return { sent: true, provider: "aliyun-dypns", code: verifyCode };
  }
  await callAliyunRpc(env.ALIYUN_SMS_ENDPOINT || "https://dysmsapi.aliyuncs.com/", env.ALIYUN_ACCESS_KEY_SECRET, {
    ...commonParams,
    Action: "SendSms",
    PhoneNumbers: phone.replace(/^\+86/, ""),
    SignName: env.ALIYUN_SMS_SIGN_NAME,
    TemplateCode: env.ALIYUN_SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
  });
  return { sent: true, provider: "aliyun", code };
}

async function requireUser(request: Request, env: Env): Promise<AuthUser | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) return null;
  const tokenHash = await hash(token);
  try {
    const row = await env.DB.prepare(`SELECT users.id, users.phone, users.display_name
      FROM auth_sessions
      JOIN users ON users.id = auth_sessions.user_id
      WHERE auth_sessions.token_hash = ? AND auth_sessions.revoked_at IS NULL AND auth_sessions.expires_at > ?
      LIMIT 1`)
      .bind(tokenHash, now())
      .first<AuthUser>();
    return row;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

function userPayload(user: AuthUser | UserRow) {
  return {
    id: user.id,
    phone: user.phone,
    masked_phone: maskPhone(user.phone),
    display_name: user.display_name,
  };
}

async function requireAdmin(request: Request, env: Env, roles: string[] = ["owner", "admin"]) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = await hash(env.ADMIN_PASSWORD_SECRET);
  if (token !== expected) return null;
  return { id: "env_owner", role: "owner", name: "AISea Owner", roles };
}

const REPORT_LABELS: Record<string, string> = {
  comprehensive: "综合形象报告",
  hair: "发型发色专题",
  makeup: "色彩与面部清爽度专题",
  outfit: "穿搭配饰专题",
  look: "场景 Look 专题",
};

function typePrompt(reportType: string) {
  const sharedEnding = [
    "雷区提醒：必须温和表达，用“谨慎尝试”“容易削弱协调感”，不能攻击外貌。",
    "今日行动清单：给 3 个立刻可执行的小动作。",
  ];
  const prompts: Record<string, string[]> = {
    comprehensive: [
      "风格定位：先给出一句清晰、可分享的形象结论。",
      "发型发色：给真实发型缩略图、长度、层次、打理方式和自然发色质感；同一模块内人物必须保持同一肤色、同一光感和干净正脸。",
      "个人色彩：推荐色盘、谨慎色盘和适合上身的颜色名称。",
      "面部优化：男性写眉形修整、皮肤清爽度、胡须/鬓角、眼镜框型；女性写底妆、眉形、眼妆、腮红、唇色。",
      "穿搭配饰：男性写上衣、外套、裤装、鞋、包、腕表、眼镜、帽子；女性写服装、鞋包、首饰、发饰和 3 套 OOTD。",
      "场景 Look：日常、通勤/上学、拍照、聚会，每个场景给具体单品和氛围。",
      ...sharedEnding,
      "分享金句：一句适合小红书封面的短句。",
    ],
    hair: [
      "专题边界：只讲发型、发色、脸型与打理，不要出现服装搭配、OOTD、鞋包、腕表、帽子、穿搭清单或场景穿搭。",
      "脸部轮廓、发质状态、发量感、当前发型气质。",
      "推荐发型：真实头部/半身缩略图，展示长度、刘海或额前区、卷度、层次和侧后区处理；3-4 张头像必须保持同一肤色、同一光感和干净正脸，禁止黑阴影和肤色漂移。",
      "发色推荐：必须包含 4-6 张同一人物正脸或半身人像效果示意图，分别展示不同发色上脸效果；旁边再放真实头发质感色卡。男性优先自然黑、黑茶、冷棕、摩卡棕；女性可补充奶茶棕、亚麻棕、玫瑰棕等。",
      "打理方式：洗护、吹风方向、造型品和理发师沟通关键词，要做成图文卡片。",
      ...sharedEnding,
    ],
    makeup: [
      "专题边界：只讲个人色彩、面部状态、上镜气色和面部细节，不要出现穿搭套餐、OOTD、鞋包、整套服装推荐或场景穿搭。",
      "个人色彩倾向：冷暖、明度、饱和度、对比度。",
      "推荐色盘：主色、辅助色、点缀色、中性色。",
      "面部效果图：必须包含 5-8 张人物面部近景效果示意图，例如眉形、肤色均匀度、眼周精神度、发际/鬓角或轮廓、眼镜框型、上镜气色；女性可加入底妆、眼妆、腮红、唇色效果，男性禁止口红腮红妆容化。",
      "面部清爽度建议：男性写眉形修整、肤色均匀、控油、黑眼圈、胡须/鬓角、眼镜框型；女性写底妆、眉形、眼妆、腮红、唇色。",
      "发色与贴脸颜色延展建议：只讲靠近脸部的发色、上衣领口颜色、眼镜/帽檐颜色如何影响气色，不做整套穿搭推荐。",
      ...sharedEnding,
    ],
    outfit: [
      "风格定位：结合照片与偏好给出一句话结论。",
      "服装推荐：男性只写上衣、外套、裤装、叠穿、版型和面料；女性可写上衣、外套、下装或连衣搭配。",
      "配饰推荐：男性只写鞋、包、腕表、眼镜、帽子、腰带；女性可写鞋包、首饰、发饰。",
      "3 套 OOTD 灵感：日常、通勤、拍照或聚会，必须和人物性别呈现一致。",
      ...sharedEnding,
    ],
    look: [
      "专题边界：这是场景 Look 专题，可以讲服装和配饰，但每个建议都必须绑定具体场景，不要泛泛列单品。",
      "固定结构：日常、通勤/上学、拍照、聚会四个场景必须全部出现，任何一个都不能省略。",
      "日常 Look：给具体上装、下装、鞋和氛围关键词。",
      "通勤 / 上学 Look：给整套组合和适用场景。",
      "拍照 Look：给镜头友好的颜色、层次和姿态建议。",
      "聚会 Look：给更有存在感但不过度的搭配。",
      "图片密度：不要只做四宫格。必须至少 8 张人物场景照片或全身/半身 Look 图，日常、通勤/上学、拍照、聚会每个场景至少 2 张人物图；优先使用同一人物脸部特征延展，不要只放衣服平铺图。",
      "场景对比表与今日可执行建议。",
      "适合保存的总结语。",
    ],
  };
  return (prompts[reportType] || prompts.comprehensive).map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function genderRoutingPrompt(persona: string, keywords: string) {
  return `性别分流规则（最高优先级，必须严格执行）：
1. 先观察用户上传照片的人物性别呈现，再决定内容体系。不要被前端传入的人设方向强行带偏。
2. 如果照片呈现为男性或偏男性气质：
   - 报告标题、人设和模块必须转译成男性表达，例如“清爽质感型”“韩系干净学长感”“松弛高级男生日常”“商务轻熟感”“日系盐系少年感”。
   - 禁止出现或暗示：法式白月光、学姐、甜妹、公主、少女、腮红、口红、唇色、睫毛、眼影、妆容、发饰、耳饰、裙装、连衣裙、高跟鞋、女包、女性化自拍姿态。
   - 可使用：发型层次、额前区、两侧鬓角、后颈线条、自然发色、眉形修整、皮肤清爽度、控油、胡须/鬓角、眼镜框型、T 恤、衬衫、夹克、针织、卫衣、西装外套、直筒裤、牛仔裤、休闲裤、球鞋、乐福鞋、双肩包、托特包、腕表、帽子。
   - 如果前端人设是“${persona}”或关键词“${keywords}”偏女性，只能保留其中的抽象气质，例如清透=干净通透，温柔=亲和松弛，低饱和=高级克制，不能照抄女性化标题。
3. 如果照片呈现为女性或偏女性气质：
   - 可以输出发型、发色、个人色彩、妆容、穿搭、鞋包、首饰、发饰等女士形象建议。
   - 禁止把女性用户写成男士型格报告，禁止胡须、鬓角、男士西装硬朗化等不匹配内容。
4. 如果照片性别特征不清晰：
   - 采用中性安全体系：发型、发色、个人色彩、眉形清爽度、基础护肤、简约穿搭、鞋包、眼镜、帽子；不出现强女性化或强男性化单品。
5. 每个标题、分区标题、单品、示例图片都必须和识别出的性别呈现一致；一旦发现冲突，优先删除冲突内容。`;
}

function topicVisualPrompt(reportType: string) {
  const prompts: Record<string, string> = {
    hair: "- 发型发色专题图片构成：顶部人物主视觉 1 张，保持干净正脸和清爽背景；推荐发型 3-4 张头部/半身图，要求同一人物、同一肤色、同一光感；发色上脸效果 4-6 张同一人物正脸或半身图；发色质感色卡 4-6 个；雷区提醒和打理方式要做成图文卡片。禁止出现穿搭套装、鞋包、腕表、OOTD 或全身搭配模块。",
    makeup: "- 色彩与面部清爽度专题图片构成：顶部人物主视觉 1 张；面部近景效果图 5-8 张；色盘 2-4 组；眉形/肤色/眼周/胡须鬓角或妆容细节局部图若干。禁止出现整套穿搭、鞋包、服装平铺和 OOTD 模块。",
    look: "- 场景 Look 专题图片构成：不要做成只有 4 张场景图的四宫格；必须先把“日常、通勤/上学、拍照、聚会”四个区块全部放出来，每个区块 2 张人物图，共至少 8 张人物场景照片或全身/半身 Look 图。可以补少量单品图，但不能只放衣服平铺。整体要像一本场景造型 mini lookbook。",
    outfit: "- 穿搭配饰专题图片构成：3 套 OOTD 全身图、核心单品图、鞋包配饰图和版型/颜色说明；不要深入讲发型发色或面部清爽度。",
    comprehensive: "- 综合报告图片构成：人物主视觉、发型发色、色彩面部、穿搭配饰、场景 Look 都要覆盖，但每个模块保持简洁，不要让某一专题吞掉整体版面。",
  };
  return prompts[reportType] || prompts.comprehensive;
}

function visualDesignPrompt(reportLabel: string, reportType: string) {
  return `视觉设计要求：
- 这不是普通模板拼贴，要做成有点击欲望的高质量中文视觉报告。第一屏必须像杂志封面/高端形象顾问诊断页，有清晰人物主视觉、强标题、风格结论和 3 个关键信息锚点。
- 竖版 9:16，整体有层次：顶部主视觉区 35%，中部模块网格 50%，底部行动清单 15%。不要密密麻麻的小字，不要后台表格感。
- 男性报告视觉：更克制高级，可用米白、炭黑、雾灰、橄榄绿、牛仔蓝、摩卡棕、银灰点缀；避免粉色可爱、爱心、蝴蝶结、花朵、闪闪少女风。
- 女性报告视觉：可以温柔精致，但也要高级、有留白、有真实材质图，不要廉价粉色堆叠。
- 人物主图必须干净正脸、背景清爽，不要大面积黑色阴影、脏背景或脸部失真。
- 推荐发型和发色上脸图必须保持同一肤色、同一光感，不能因为换发型或发色把人画黑。
- ${topicVisualPrompt(reportType)}
- ${reportLabel} 必须有清晰中文大标题、模块编号、真实材质/单品缩略图和可读正文。所有中文必须正确、清楚、无乱码。`;
}

function promptFor(input: Json) {
  const reportType = String(input.report_type || "comprehensive");
  const reportLabel = REPORT_LABELS[reportType] || "综合形象报告";
  const persona = String(input.style_persona || "系统智能风格");
  const keywords = String(input.style_keywords || "干净 / 协调 / 有质感 / 适合本人");
  const style = String(input.style_preference || "系统自动推荐");
  const scene = String(input.scene_preference || "系统推荐");
  const change = String(input.change_level || "系统推荐");
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传照片生成中文个人形象报告图。

输出一张完整报告长图，竖版 9:16，适合保存查看。画面中必须使用用户上传照片作为人物参考，不要套用固定女性模板。

报告类型：${reportLabel}
报告名称：${reportLabel}
前端偏好人设（仅作气质参考，必须按照片性别转译）：${persona}
前端关键词（仅作抽象气质参考）：${keywords}
造型表达偏好：${style}
目标场景：${scene}
改变幅度：${change}

${genderRoutingPrompt(persona, keywords)}

必须包含：
${typePrompt(reportType)}

${visualDesignPrompt(reportLabel, reportType)}

文字必须是清晰简体中文。禁止乱码、假中文、随机符号、重复字、不可读小字。
保留用户本人核心长相特征，不要过度美颜，不要攻击外貌，不要低俗或成人化。`;
}

async function imageGenerate(env: Env, payload: Json, prompt: string): Promise<Json> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const userPhoto = String(payload.user_photo_data_url || payload.user_photo_url || "");
  if (!userPhoto) throw new Error("user photo is required for image generation");

  const apiBase = env.OPENAI_IMAGE_ENDPOINT.replace(/\/images\/generations\/?$/, "");
  const authHeaders = { authorization: `Bearer ${env.OPENAI_API_KEY}` };

  const uploadPhoto = async () => {
    if (/^https?:\/\//i.test(userPhoto)) return userPhoto;
    const match = userPhoto.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i);
    if (!match) throw new Error("user photo must be a base64 image data URL");
    const [, mimeType, b64] = match;
    const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const binary = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.append("file", new File([binary], `user-photo.${extension}`, { type: mimeType }));

    const response = await fetch(`${apiBase}/uploads/images`, {
      method: "POST",
      headers: authHeaders,
      body: form,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`image upload failed: ${response.status}${detail ? ` ${detail.slice(0, 240)}` : ""}`);
    }
    const result = await response.json() as Json;
    if (typeof result.url !== "string") throw new Error("image upload response missing url");
    return result.url;
  };

  const waitForTask = async (taskId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    for (let attempt = 0; attempt < 72; attempt += 1) {
      const response = await fetch(`${apiBase}/tasks/${taskId}?language=zh`, { headers: authHeaders });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`image task query failed: ${response.status}${detail ? ` ${detail.slice(0, 240)}` : ""}`);
      }
      const result = await response.json() as Json;
      const data = typeof result.data === "object" && result.data ? result.data as Json : result;
      const status = String(data.status || "");
      if (status === "completed") {
        const taskResult = typeof data.result === "object" && data.result ? data.result as Json : {};
        const images = Array.isArray(taskResult.images) ? taskResult.images as Json[] : [];
        const first = images[0] || {};
        const urls = Array.isArray(first.url) ? first.url : [];
        const url = typeof urls[0] === "string" ? urls[0] : typeof first.url === "string" ? first.url : "";
        if (!url) throw new Error("image task completed without image url");
        return url;
      }
      if (["failed", "cancelled"].includes(status)) {
        const taskError = typeof data.error === "object" && data.error ? data.error as Json : {};
        throw new Error(String(taskError.message || `image task ${status}`));
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    throw new Error(`image task timed out: ${taskId}`);
  };

  const photoUrl = await uploadPhoto();
  const generateFromPhoto = async (imagePrompt: string, size: string) => {
    const response = await fetch(env.OPENAI_IMAGE_ENDPOINT, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt: imagePrompt,
        size,
        n: 1,
        image_urls: [photoUrl],
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`image task submit failed: ${response.status}${detail ? ` ${detail.slice(0, 240)}` : ""}`);
    }
    const result = await response.json() as Json;
    const data = Array.isArray(result.data) ? result.data[0] as Json : result.data as Json | undefined;
    const taskId = String(data?.task_id || result.task_id || "");
    if (!taskId) throw new Error("image task submit response missing task_id");
    return waitForTask(taskId);
  };

  const reportImageUrl = await generateFromPhoto(prompt, "9:16");
  return { data: [{ image_url: reportImageUrl }] };
}

async function storeB64(env: Env, key: string, b64: string, type = "image/png") {
  const bucket = (env as { R2?: R2Bucket }).R2;
  if (!bucket) throw new Error("R2 binding is not configured");
  const binary = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
  await bucket.put(key, binary, { httpMetadata: { contentType: type } });
  return key;
}

async function storeRemoteImage(env: Env, key: string, sourceUrl: string) {
  const bucket = (env as { R2?: R2Bucket }).R2;
  if (!bucket) throw new Error("R2 binding is not configured");
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`generated image download failed: ${response.status}`);
  const type = response.headers.get("content-type") || "image/png";
  const binary = new Uint8Array(await response.arrayBuffer());
  await bucket.put(key, binary, { httpMetadata: { contentType: type } });
  return key;
}

async function handleApi(request: Request, env: Env, url: URL) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, service: "aisea", date: now() });
  }

  if (request.method === "GET" && url.pathname === "/api/config") {
    let productRows: ProductRow[] = DEFAULT_PRODUCT_ROWS;
    try {
      const products = await env.DB.prepare("SELECT * FROM products WHERE enabled = 1 ORDER BY sort_order ASC").all<ProductRow>();
      if (products.results.length) productRows = products.results;
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
    return json({
      products: productRows,
      payments: {
        stripeEnabled: stripePaymentsEnabled(env),
        currency: stripeCurrency(env),
        methods: ["wechat_pay", "alipay"],
      },
    });
  }

  if (request.method === "POST" && url.pathname === "/api/preanalysis/create") {
    const input = await body(request);
    const reportType = String(input.report_type || "hair");
    const labels: Record<string, string> = {
      comprehensive: "综合形象报告",
      hair: "发型发色专题",
      makeup: "色彩面部专题",
      outfit: "穿搭配饰专题",
      look: "场景 Look 专题",
    };
    const requirements: Record<string, string> = {
      comprehensive: "建议使用正脸半身照，看清脸部、发型、肩颈和上半身轮廓。",
      hair: "建议使用清晰正脸照，头部完整、发际线和发量可见。",
      makeup: "建议使用自然光正脸照，肤色不偏色、五官清楚。",
      outfit: "建议使用半身以上照片，能看到上半身穿搭和肩颈比例。",
      look: "建议使用接近全身照，能看到整体比例、服装和姿态。",
    };
    const style = String(input.style_preference || "系统推荐");
    const scene = String(input.scene_preference || "日常干净");
    const change = String(input.change_level || "轻微优化");
    const photoCheck = String(input.photo_check_result || "available");
    const fit = photoCheck === "failed" ? "poor" : photoCheck === "warning" ? "warning" : "good";
    const recommendedProductId = reportType === "comprehensive" ? "full" : "single";
    const label = labels[reportType] || labels.hair;
    try {
      return json(await createAiPreAnalysis(env, { ...input, style_preference: style, scene_preference: scene, change_level: change }, {
        reportType,
        label,
        fit,
        recommendedProductId,
      }));
    } catch (error) {
      const message = redactedUpstreamError(error instanceof Error ? error.message : "preanalysis_failed");
      console.error("[preanalysis] failed", { message, reportType });
      return json({
        error: "PREANALYSIS_AI_FAILED",
        message: "预分析暂时不可用，请稍后重试。",
        detail: message,
      }, { status: 502 });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/auth/sms/send") {
    const input = await body(request);
    const phone = normalizePhone(String(input.phone || ""));
    const clientId = String(input.client_id || "");
    if (!/^\+861\d{10}$/.test(phone)) return json({ error: "invalid_phone", message: "请输入有效的中国大陆手机号" }, { status: 400 });
    const code = env.AUTH_DEV_CODE || randomDigits(6);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    let sms: { sent: boolean; provider: string; code: string };
    try {
      sms = await sendAliyunSms(env, phone, code);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "sms_send_failed";
      return json({
        error: detail === "sms_provider_not_configured" ? "SMS_PROVIDER_NOT_CONFIGURED" : "SMS_SEND_FAILED",
        message: detail === "sms_provider_not_configured" ? "短信服务尚未配置，请联系管理员。" : "验证码发送失败，请稍后重试。",
        detail,
      }, { status: 503 });
    }
    await env.DB.prepare("INSERT INTO sms_codes (id, phone, code_hash, purpose, status, attempts, expires_at, created_at) VALUES (?, ?, ?, 'login', 'pending', 0, ?, ?)")
      .bind(randomId("sms"), phone, await hash(sms.code), expiresAt, now())
      .run();
    await audit(env, clientId || "guest", "auth.sms_send", `${maskPhone(phone)} ${sms.provider}`, request).catch(() => undefined);
    return json({
      ok: true,
      phone: maskPhone(phone),
      expires_at: expiresAt,
      provider: sms.provider,
      dev_code: sms.provider === "dev" ? sms.code : undefined,
    });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/sms/verify") {
    const input = await body(request);
    const phone = normalizePhone(String(input.phone || ""));
    const code = String(input.code || "").trim();
    const clientId = String(input.client_id || "");
    if (!/^\+861\d{10}$/.test(phone) || !/^\d{4,8}$/.test(code)) return json({ error: "invalid_code", message: "验证码不正确" }, { status: 400 });
    const row = await env.DB.prepare("SELECT * FROM sms_codes WHERE phone = ? AND purpose = 'login' AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
      .bind(phone)
      .first<SmsCodeRow>();
    if (!row || row.expires_at < now()) return json({ error: "code_expired", message: "验证码已过期，请重新获取" }, { status: 400 });
    if (row.attempts >= 5) return json({ error: "too_many_attempts", message: "验证码尝试次数过多，请重新获取" }, { status: 429 });
    const codeHash = await hash(code);
    if (codeHash !== row.code_hash) {
      await env.DB.prepare("UPDATE sms_codes SET attempts = attempts + 1 WHERE id = ?").bind(row.id).run();
      return json({ error: "invalid_code", message: "验证码不正确" }, { status: 400 });
    }
    await env.DB.prepare("UPDATE sms_codes SET status = 'used', used_at = ? WHERE id = ?").bind(now(), row.id).run();
    let user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first<UserRow>();
    if (!user) {
      const userId = randomId("usr");
      await env.DB.prepare("INSERT INTO users (id, phone, display_name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?)")
        .bind(userId, phone, `用户${phone.slice(-4)}`, now(), now())
        .run();
      user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
    } else {
      await env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(now(), user.id).run();
    }
    if (!user) throw new Error("user_create_failed");
    if (clientId) {
      await env.DB.prepare("UPDATE orders SET user_id = ? WHERE client_id = ? AND user_id IS NULL").bind(user.id, clientId).run().catch(() => undefined);
      await env.DB.prepare("UPDATE entitlements SET user_id = ? WHERE client_id = ? AND user_id IS NULL").bind(user.id, clientId).run().catch(() => undefined);
      await env.DB.prepare("UPDATE reports SET user_id = ? WHERE client_id = ? AND user_id IS NULL").bind(user.id, clientId).run().catch(() => undefined);
    }
    const token = `${randomId("tok")}.${crypto.randomUUID().replaceAll("-", "")}`;
    const sessionExpiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
    await env.DB.prepare("INSERT INTO auth_sessions (id, user_id, token_hash, client_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(randomId("ses"), user.id, await hash(token), clientId || null, sessionExpiresAt, now())
      .run();
    await audit(env, user.id, "auth.login", maskPhone(phone), request).catch(() => undefined);
    return json({ token, expires_at: sessionExpiresAt, user: userPayload(user) });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (token) await env.DB.prepare("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?").bind(now(), await hash(token)).run().catch(() => undefined);
    return json({ ok: true });
  }

  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = await requireUser(request, env);
    if (!user) return json({ error: "unauthorized", message: "请先登录" }, { status: 401 });
    const entitlements = await env.DB.prepare("SELECT * FROM entitlements WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    const orders = await env.DB.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").bind(user.id).all<OrderRow>();
    const rights = entitlements.results.reduce((acc: { topic: number; comprehensive: number }, item: Json) => ({
      topic: acc.topic + Number(item.topic_remaining || 0),
      comprehensive: acc.comprehensive + Number(item.comprehensive_remaining || 0),
    }), { topic: 0, comprehensive: 0 });
    return json({ user: userPayload(user), rights, entitlements: entitlements.results, orders: orders.results.map(orderPayload) });
  }

  if (request.method === "GET" && url.pathname === "/api/me/entitlements") {
    const clientId = url.searchParams.get("client_id") || "";
    const user = await requireUser(request, env);
    if (!clientId && !user) return json({ error: "client_id_required" }, { status: 400 });
    try {
      const rows = user
        ? await env.DB.prepare("SELECT * FROM entitlements WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all()
        : await env.DB.prepare("SELECT * FROM entitlements WHERE client_id = ? ORDER BY created_at DESC").bind(clientId).all();
      return json({ entitlements: rows.results });
    } catch (err) {
      if (isMissingTableError(err)) return setupRequiredResponse();
      throw err;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/me/reports") {
    const clientId = url.searchParams.get("client_id") || "";
    const user = await requireUser(request, env);
    if (!clientId && !user) return json({ error: "client_id_required" }, { status: 400 });
    const rows = user
      ? await env.DB.prepare("SELECT id, report_type, style_persona, status, error, created_at, completed_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(user.id).all()
      : await env.DB.prepare("SELECT id, report_type, style_persona, status, error, created_at, completed_at FROM reports WHERE client_id = ? ORDER BY created_at DESC LIMIT 50").bind(clientId).all();
    return json({ reports: rows.results });
  }

  const reportAssetMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/(report|cover|summary)\.(png|svg)$/);
  if (request.method === "GET" && reportAssetMatch) {
    const [, reportId, kind] = reportAssetMatch;
    const report = await env.DB.prepare("SELECT id, report_image_key, xhs_cover_image_key, xhs_summary_image_key FROM reports WHERE id = ?").bind(reportId).first<ReportRow>();
    if (!report) return json({ error: "report_not_found" }, { status: 404 });
    const bucket = (env as { R2?: R2Bucket }).R2;
    if (!bucket) return json({ error: "r2_not_configured" }, { status: 503 });
    for (const key of reportAssetFallbackKeys(reportId, kind as "report" | "cover" | "summary", report)) {
      const object = await bucket.get(key);
      if (object?.body) return serveR2Object(object);
    }
    return json({ error: "report_asset_not_found" }, { status: 404 });
  }

  if (request.method === "POST" && url.pathname === "/api/orders/checkout") {
    const input = await body(request);
    const user = await requireUser(request, env);
    const packageId = String(input.package_id || input.packageId || "");
    const productId = String(input.product_id || input.productId || "");
    const channel = String(input.channel || "") as PayChannel | "";
    const clientId = String(input.client_id || "");
    if (!user) return json({ error: "AUTH_REQUIRED", message: "请先登录后再支付。" }, { status: 401 });
    if (!packageId) return json({ error: "package_id_required", message: "套餐信息缺失，请重新打开支付窗口" }, { status: 400 });
    if (!productId) return json({ error: "product_id_required", message: "商品信息缺失，请稍后重试" }, { status: 400 });
    if (channel !== "wechat" && channel !== "alipay") {
      return json({ error: "PAYMENT_CHANNEL_UNAVAILABLE", message: "当前支付方式暂不可用，请选择其他支付方式" }, { status: 400 });
    }
    if (!clientId) return json({ error: "client_id_required" }, { status: 400 });
    if (!stripePaymentsEnabled(env)) {
      return json({
        error: "stripe_payments_not_enabled",
        message: "支付暂未开放，请稍后再试。",
        stripe_enabled: false,
      }, { status: 503 });
    }

    const expectedPackageId = PRODUCT_PACKAGE_MAP[productId];
    if (expectedPackageId && expectedPackageId !== packageId) {
      return json({
        error: "PRODUCT_PACKAGE_MISMATCH",
        message: "当前套餐暂不可购买，请稍后重试",
        package_id: packageId,
        product_id: productId,
      }, { status: 400 });
    }

    const resolvedProductId = PRODUCT_ALIAS_MAP[productId] || productId;
    const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? AND enabled = 1").bind(resolvedProductId).first<ProductRow>();
    if (!product) {
      return json({
        error: "PRODUCT_NOT_FOUND",
        message: "当前套餐暂不可购买，请稍后重试",
        package_id: packageId,
        product_id: productId,
      }, { status: 404 });
    }

    const amount = unitAmount(product.price);
    const orderId = randomId("ord");
    const orderNoValue = orderNo();
    const currency = stripeCurrency(env);
    const productSnapshot = {
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price || null,
      badge: product.badge || null,
      description: product.description,
      rights: {
        topic: product.topic_rights,
        comprehensive: product.comprehensive_rights,
      },
      packageId,
      channel,
      productId,
    };
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

    await env.DB.prepare(`INSERT INTO orders
      (id, order_no, client_id, user_id, product_id, product_snapshot_json, amount, currency, status, rights_topic, rights_comprehensive, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?, ?, ?)`)
      .bind(orderId, orderNoValue, clientId, user.id, product.id, JSON.stringify(productSnapshot), amount, currency, product.topic_rights, product.comprehensive_rights, expiresAt, now(), now())
      .run();

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", checkoutReturnUrl(env, "success"));
    params.set("cancel_url", checkoutReturnUrl(env, "cancel"));
    params.set("client_reference_id", orderId);
    if (channel === "wechat") {
      params.set("payment_method_options[wechat_pay][client]", "web");
    }
    PAYMENT_METHODS_BY_CHANNEL[channel].forEach((method, index) => {
      params.append(`payment_method_types[${index}]`, method);
    });
    params.set("line_items[0][price_data][currency]", currency);
    params.set("line_items[0][price_data][product_data][name]", product.name);
    params.set("line_items[0][price_data][unit_amount]", String(amount));
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[order_id]", orderId);
    params.set("metadata[order_no]", orderNoValue);
    params.set("metadata[product_id]", product.id);
    params.set("metadata[package_id]", packageId);
    params.set("metadata[channel]", channel);
    params.set("metadata[client_id]", clientId);
    params.set("metadata[user_id]", user.id);
    params.set("metadata[preanalysis_id]", String(input.preanalysis_id || ""));
    params.set("metadata[report_type]", String(input.report_type || ""));
    params.set("metadata[platform]", "web");

    const session = await stripeRequest(env, "/checkout/sessions", params).catch((error) => checkoutErrorResponse(error, channel)) as Json | Response;
    if (session instanceof Response) return session;
    const checkoutSessionId = String(session.id || "");
    const checkoutUrl = String(session.url || "");
    if (!checkoutSessionId || !checkoutUrl) throw new Error("stripe_checkout_session_missing");
    await env.DB.prepare("UPDATE orders SET status = 'checkout_open', stripe_checkout_session_id = ?, updated_at = ? WHERE id = ?")
      .bind(checkoutSessionId, now(), orderId)
      .run();

    return json({
      order_id: orderId,
      order_no: orderNoValue,
      checkout_url: checkoutUrl,
      pay_url: checkoutUrl,
      stripe_checkout_session_id: checkoutSessionId,
      currency,
      amount,
      channel,
      package_id: packageId,
      product_id: product.id,
      payment_methods: PAYMENT_METHODS_BY_CHANNEL[channel],
    });
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (request.method === "GET" && orderMatch) {
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderMatch[1]).first<OrderRow>();
    return order ? json({ order: orderPayload(order) }) : json({ error: "order_not_found" }, { status: 404 });
  }

  const sessionMatch = url.pathname.match(/^\/api\/orders\/by-session\/([^/]+)$/);
  if (request.method === "GET" && sessionMatch) {
    let order = await env.DB.prepare("SELECT * FROM orders WHERE stripe_checkout_session_id = ?").bind(sessionMatch[1]).first<OrderRow>();
    if (!order) return json({ error: "order_not_found" }, { status: 404 });
    if (!order.fulfilled_at && env.STRIPE_SECRET_KEY && stripePaymentsEnabled(env)) {
      try {
        const session = await retrieveCheckoutSession(env, sessionMatch[1]);
        const paymentStatus = String(session.payment_status || "");
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : typeof session.payment_intent === "object" && session.payment_intent && typeof (session.payment_intent as Json).id === "string"
            ? String((session.payment_intent as Json).id)
            : "";
        if (paymentStatus === "paid" || paymentStatus === "no_payment_required") {
          await env.DB.prepare("UPDATE orders SET status = 'paid', stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id), paid_at = COALESCE(paid_at, ?), updated_at = ? WHERE id = ?")
            .bind(paymentIntentId, now(), now(), order.id)
            .run();
          order = await fulfillOrder(env, order.id, paymentIntentId);
        } else if (paymentStatus === "unpaid") {
          await env.DB.prepare("UPDATE orders SET status = 'checkout_open', updated_at = ? WHERE id = ?")
            .bind(now(), order.id)
            .run();
        }
      } catch {
        // keep the endpoint read-only tolerant; webhook is the source of truth
      }
    }
    const latest = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(order.id).first<OrderRow>();
    return json({ order: orderPayload(latest) });
  }

  if (request.method === "POST" && url.pathname === "/api/stripe/webhook") {
    if (!stripePaymentsEnabled(env) || !env.STRIPE_WEBHOOK_SECRET) {
      return json({ error: "stripe_webhook_not_configured" }, { status: 503 });
    }
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const verified = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!verified) return json({ error: "invalid_signature" }, { status: 400 });

    const event = JSON.parse(payload) as Json;
    const eventId = String(event.id || "");
    const eventType = String(event.type || "");
    const data = typeof event.data === "object" && event.data ? event.data as Json : {};
    const object = typeof data.object === "object" && data.object ? data.object as Json : {};
    const sessionId = String(object.id || "");
    const paymentIntentId = typeof object.payment_intent === "string"
      ? object.payment_intent
      : typeof object.payment_intent === "object" && object.payment_intent && typeof (object.payment_intent as Json).id === "string"
        ? String((object.payment_intent as Json).id)
        : "";

    if (eventId) {
      const existed = await env.DB.prepare("SELECT id FROM payment_events WHERE stripe_event_id = ?").bind(eventId).first();
      if (!existed) {
        await env.DB.prepare("INSERT INTO payment_events (id, stripe_event_id, type, checkout_session_id, payment_intent_id, raw_status, processed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(randomId("evt"), eventId, eventType, sessionId, paymentIntentId, String(object.payment_status || object.status || ""), now(), now())
          .run();
      }
    }

    if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
      const order = await env.DB.prepare("SELECT * FROM orders WHERE stripe_checkout_session_id = ?").bind(sessionId).first<OrderRow>();
      if (order) {
        await env.DB.prepare("UPDATE orders SET status = 'paid', stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id), paid_at = COALESCE(paid_at, ?), updated_at = ? WHERE id = ?")
          .bind(paymentIntentId, now(), now(), order.id)
          .run();
        await fulfillOrder(env, order.id, paymentIntentId);
      }
    }

    if (eventType === "checkout.session.async_payment_failed" || eventType === "checkout.session.expired") {
      await env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE stripe_checkout_session_id = ? AND status IN ('created', 'checkout_open', 'paid')")
        .bind(eventType === "checkout.session.expired" ? "expired" : "payment_failed", now(), sessionId)
        .run();
    }

    return json({ received: true });
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
    const reportId = randomId("rpt");
    try {
      const input = await body(request);
      const user = await requireUser(request, env);
      if (!user) return json({ error: "AUTH_REQUIRED", message: "请先登录后再生成报告。" }, { status: 401 });
      const prompt = promptFor(input);
      const rightKey = String(input.right_key || "topic");
      const clientId = String(input.client_id || "");
      const entitlement = await availableEntitlement(env, clientId, rightKey, user.id);
      if (!entitlement) {
        return json({
          error: "entitlement_required",
          message: rightKey === "comprehensive" ? "请先购买全案探索卡，再生成综合报告。" : "请先完成支付，再生成完整专题报告。",
        }, { status: 402 });
      }
      let reportImageKey = "";
      let coverImageKey = "";
      let summaryImageKey = "";
      let subjectGender = "unknown";
      let status = "completed";
      let error = "";
      let reportImageUrl = reportAssetPath(reportId, "report");
      let coverImageUrl = reportAssetPath(reportId, "cover");
      let summaryImageUrl = reportAssetPath(reportId, "summary");
      try {
        const generated = await imageGenerate(env, input, prompt);
        const image = Array.isArray(generated.data) ? generated.data[0] as Json : generated;
        const generatedSubject = typeof generated.subject === "object" && generated.subject
          ? (generated.subject as Json).gender
          : "";
        subjectGender = String(generated.subject_gender || generatedSubject || image.subject_gender || "unknown");
        if (typeof image.b64_json === "string") {
          reportImageKey = await storeB64(env, reportAssetKey(reportId, "report"), image.b64_json);
        }
        if (typeof image.xhs_cover_b64_json === "string") {
          coverImageKey = await storeB64(env, reportAssetKey(reportId, "cover"), image.xhs_cover_b64_json);
        }
        if (typeof image.image_url === "string") {
          reportImageKey = await storeRemoteImage(env, reportAssetKey(reportId, "report"), image.image_url);
        }
        if (typeof image.xhs_cover_image_url === "string") {
          coverImageKey = await storeRemoteImage(env, reportAssetKey(reportId, "cover"), image.xhs_cover_image_url);
        }
        if (!reportImageKey) {
          throw new Error("image generation completed without report image");
        }
      } catch (err) {
        status = "failed";
        const rawError = err instanceof Error ? err.message : "image generation failed";
        error = userFacingGenerationError(err);
        console.error("[reports/generate] image pipeline failed", {
          reportId,
          clientId,
          rightKey,
          error: rawError,
        });
      }
      summaryImageKey = coverImageKey || reportImageKey;
      reportImageUrl = reportAssetPath(reportId, "report");
      coverImageUrl = reportAssetPath(reportId, "cover");
      summaryImageUrl = reportAssetPath(reportId, "summary");
      const db = (env as { DB?: D1Database }).DB;
      if (db) {
        await db.prepare(`INSERT INTO reports
          (id, client_id, user_id, coupon_code, report_type, style_persona, style_keywords, prompt, status, error, retry_count, locked_right_key, report_image_key, xhs_cover_image_key, xhs_summary_image_key, report_image_url, xhs_cover_image_url, xhs_summary_image_url, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(reportId, clientId, user.id, String(input.coupon_code || ""), String(input.report_type || ""), String(input.style_persona || "系统智能风格"), String(input.style_keywords || ""), prompt, status, error, rightKey, reportImageKey, coverImageKey, summaryImageKey, reportImageUrl, coverImageUrl, summaryImageUrl, now(), status === "completed" ? now() : null)
          .run();
      }
      if (status === "completed") {
        await consumeEntitlement(env, entitlement.id, rightKey);
      }
      return json({
        report_id: reportId,
        status,
        error,
        prompt,
        subject_gender: subjectGender,
        report_image_url: reportImageUrl,
        xhs_cover_image_url: coverImageUrl,
        xhs_summary_image_url: summaryImageUrl,
      });
    } catch (err) {
      if (isMissingTableError(err)) return setupRequiredResponse();
      const rawMessage = err instanceof Error ? err.message : "report_generation_failed";
      const message = userFacingGenerationError(err);
      console.error("[reports/generate] unexpected failure", { reportId, message: rawMessage });
      return json({
        report_id: reportId,
        status: "failed",
        error: message,
        message,
      }, { status: 200 });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/reports/prepare-xhs-share") {
    const input = await body(request);
    const reportId = String(input.report_id || "");
    await env.DB.prepare("INSERT INTO share_events (id, report_id, platform, action, device_info, created_at) VALUES (?, ?, 'xhs', 'prepare', ?, ?)")
      .bind(randomId("share"), reportId, request.headers.get("user-agent") || "", now())
      .run();
    const report = await env.DB.prepare("SELECT * FROM reports WHERE id = ?").bind(reportId).first<ReportRow>();
    if (!report) return json({ error: "report_not_found" }, { status: 404 });
    const reportImageUrl = reportAssetPath(reportId, "report");
    const coverImageUrl = reportAssetPath(reportId, "cover");
    const summaryImageUrl = reportAssetPath(reportId, "summary");
    return json({
      report_id: reportId,
      cover_image_url: coverImageUrl,
      report_image_url: reportImageUrl,
      summary_image_url: summaryImageUrl,
      share_title: `AI 形象报告把我的风格路线理清楚了`,
      share_text: `刚生成了一份 AI 个人形象报告，重点不是大改，是把发型、色彩、面部状态、穿搭和场景感理顺。\n\n#AI形象报告 #形象提升 #发型建议 #穿搭参考`,
      copy_text: `刚生成了一份 AI 个人形象报告，重点不是大改，是把发型、色彩、面部状态、穿搭和场景感理顺。\n\n#AI形象报告 #形象提升 #发型建议 #穿搭参考`,
      hashtags: ["AI形象报告", "形象提升", "发型建议", "穿搭参考"],
      platform_actions: {
        xhs: { label: "打开小红书", deep_link: "xhsdiscover://", hint: "若未自动打开，请手动打开小红书" },
        wechat: { label: "打开微信", deep_link: "weixin://dl/chat", hint: "可先复制文案，再发给朋友或群聊" },
        moments: { label: "打开朋友圈", deep_link: "weixin://dl/moments", hint: "如未跳转，可先进入微信后手动发布朋友圈" },
      },
    });
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await handleApi(request, env, url);
        if (response) return response;
        return json({ error: "not_found" }, { status: 404 });
      } catch (err) {
        if (isMissingTableError(err)) return setupRequiredResponse();
        if (request.method === "POST" && url.pathname === "/api/orders/checkout") {
          let channel = "";
          try {
            const cloned = request.clone();
            const input = await body(cloned);
            channel = String(input.channel || "");
          } catch {
            // Keep the diagnostic response useful even when the body cannot be read twice.
          }
          return checkoutErrorResponse(err, channel);
        }
        const message = err instanceof Error ? err.message : "internal_error";
        console.error("[api] unhandled error", { path: url.pathname, message });
        return json({ error: "internal_error", message: "服务暂时不可用，请稍后重试。" }, { status: 500 });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
