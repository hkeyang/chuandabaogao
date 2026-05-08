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
  S19K7M2A: {
    id: "single",
    name: "单次专题报告券",
    rights: { topic: 1, comprehensive: 0 },
  },
  S19P8Q4B: {
    id: "single",
    name: "单次专题报告券",
    rights: { topic: 1, comprehensive: 0 },
  },
  S19R6T5C: {
    id: "single",
    name: "单次专题报告券",
    rights: { topic: 1, comprehensive: 0 },
  },
  S19V3W9D: {
    id: "single",
    name: "单次专题报告券",
    rights: { topic: 1, comprehensive: 0 },
  },
  S19X2Y7E: {
    id: "single",
    name: "单次专题报告券",
    rights: { topic: 1, comprehensive: 0 },
  },
  T49K7M2A: {
    id: "triple",
    name: "三次探索卡",
    rights: { topic: 3, comprehensive: 0 },
  },
  T49P8Q4B: {
    id: "triple",
    name: "三次探索卡",
    rights: { topic: 3, comprehensive: 0 },
  },
  T49R6T5C: {
    id: "triple",
    name: "三次探索卡",
    rights: { topic: 3, comprehensive: 0 },
  },
  T49V3W9D: {
    id: "triple",
    name: "三次探索卡",
    rights: { topic: 3, comprehensive: 0 },
  },
  T49X2Y7E: {
    id: "triple",
    name: "三次探索卡",
    rights: { topic: 3, comprehensive: 0 },
  },
  F99K7M2A: {
    id: "full",
    name: "全案探索卡",
    rights: { topic: 3, comprehensive: 1 },
  },
  F99P8Q4B: {
    id: "full",
    name: "全案探索卡",
    rights: { topic: 3, comprehensive: 1 },
  },
  F99R6T5C: {
    id: "full",
    name: "全案探索卡",
    rights: { topic: 3, comprehensive: 1 },
  },
  F99V3W9D: {
    id: "full",
    name: "全案探索卡",
    rights: { topic: 3, comprehensive: 1 },
  },
  F99X2Y7E: {
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

function shareActions() {
  return {
    xhs: { label: "打开小红书", deep_link: "xhsdiscover://", hint: "若未自动打开，请手动打开小红书" },
    wechat: { label: "打开微信", deep_link: "weixin://dl/chat", hint: "可先复制文案，再发给朋友或群聊" },
    moments: { label: "打开朋友圈", deep_link: "weixin://dl/moments", hint: "如未跳转，可先进入微信后手动发布朋友圈" },
  };
}

function buildTypePrompt(reportType) {
  const prompts = {
    comprehensive: [
      "1. 风格人设与形象关键词：给出温和正向的一句话结论。",
      "2. 发型推荐：真实发型缩略图、刘海、长度、卷度、层次，不能用普通色块代替；同一模块内的人物必须保持同一肤色、同一光感和干净正脸。",
      "3. 发色推荐：真实头发质感色板，例如黑茶色、冷茶棕、摩卡棕、奶茶棕。",
      "4. 个人色彩：推荐色盘与谨慎色盘，颜色名称要准确。",
      "5. 妆容建议：底妆、眉形、眼妆、腮红、唇色。",
      "6. 穿搭配饰：服装、鞋、包、首饰、发饰和 3 套 OOTD。",
      "7. 场景 Look：日常、通勤/上学、拍照、聚会。",
      "8. 雷区提醒：使用“谨慎尝试”“容易削弱协调感”等温和表达，并输出图片化避雷卡片。",
      "9. 今日可执行的 3 个变美动作和小红书分享金句。",
    ],
    hair: [
      "1. 脸部轮廓、发质状态、发量感、当前发型气质。",
      "2. 推荐发型：3-4 张真实头部/半身缩略图，展示长度、刘海、卷度、层次；头像必须是同一人物、同一肤色、同一光感，禁止黑阴影和肤色漂移。",
      "3. 发色推荐：4-6 张同一人物正脸或半身上脸效果，展示低饱和、自然过渡的发色质感。",
      "4. 刘海 / 长度 / 卷度建议。",
      "5. 谨慎尝试方向，用图片化避雷发型卡片展示。",
      "6. 理发师沟通关键词和今日专属造型灵感，打理方式也要做成图文卡片。",
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

function buildImagePrompt(input = {}) {
  const reportType = String(input.report_type || "comprehensive");
  const reportLabel = {
    comprehensive: "综合形象报告",
    hair: "发型发色专题",
    makeup: "色彩妆容专题",
    outfit: "穿搭配饰专题",
    look: "场景 Look 专题",
  }[reportType] || "综合形象报告";
  const style = input.style_preference || "系统自动推荐";
  const scene = input.scene_preference || "系统推荐";
  const change = input.change_level || "系统推荐";
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传的照片，生成一张高信息密度、适合保存和分享到小红书/朋友圈的中文个人形象报告长图。

【输出规格】
- 完整报告图：1080x1920，竖版长图，中文清晰可读。
- 小红书封面图：1080x1440，3:4 竖版，作为笔记首图。
- 所有文字必须为中文，不要乱码、错字、重复字或无意义文字。

【报告类型】
${reportLabel}

【用户偏好】
- 造型表达偏好：${style}
- 目标场景：${scene}
- 改变幅度：${change}

【人物识别要求】
- 先根据上传照片识别人物的性别呈现、气质和五官轮廓，再决定输出内容。
- 如果照片呈现为男性或偏男性气质，所有穿搭、鞋包、配饰、发型和妆容建议都必须是男性或中性男性风格。
- 男性照片禁止出现裙装、高跟鞋、口红、浓重腮红、女性化连衣裙、夸张睫毛、擦边姿态等内容。
- 如果性别特征不清晰，优先输出中性、克制、适合男性也适合女性的安全风格。
- 必须尽量保留用户本人核心长相特征，不要把用户生成成别人的脸。

【必须包含】
${buildTypePrompt(reportType)}

【禁止】
- 不要攻击外貌，不要写“丑、土、脸大、显老、不适合你”。
- 不要低俗、暴露、成人化、擦边姿势。
- 不要医学诊断式表达。
- 不要把发型、妆容、穿搭、场景模块混乱摆放。
- 发型专题的人物主图必须是清爽背景和正脸，不要大黑阴影、脏背景或脸部失真。
- 推荐发型和发色上脸效果必须保持同一肤色、同一光感，不能因为换发型而把人画黑。
- 雷区提醒和打理方式要有图片式卡片，方便用户一眼理解。
- 不要生成乱码文字、假中文、随机符号或不可读小字。`;
}

async function generateImageAssets(input, reportId, prompt) {
  if (!imageEndpoint) {
    throw new Error("image provider is not configured");
  }

  const headers = { "content-type": "application/json" };
  if (imageEndpointToken) headers.authorization = `Bearer ${imageEndpointToken}`;
  const response = await fetch(imageEndpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(imageEndpointTimeoutMs),
    body: JSON.stringify({
      report_id: reportId,
      report_type: input.report_type || "comprehensive",
      style_persona: input.style_persona || "轻法式白月光",
      style_preference: input.style_preference || "系统自动推荐",
      scene_preference: input.scene_preference || "系统推荐",
      change_level: input.change_level || "系统推荐",
      user_photo_url: input.user_photo_data_url || input.user_photo_url || "",
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
    subject_gender: data.subject_gender || data.subject?.gender,
  };
}

function buildCoverSvg(report = {}) {
  const persona = escapeXml(report.style_persona || "轻法式白月光");
  const photo = report.source_photo_url || report.user_photo_url || "";
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
  ${photoFrame("coverPhoto", photo, 690, 150, 280, 380, 32)}
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

function buildSummarySvg(report = {}) {
  const persona = escapeXml(report.style_persona || "轻法式白月光");
  const photo = report.source_photo_url || report.user_photo_url || "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff8fb"/>
      <stop offset="0.58" stop-color="#fffdf9"/>
      <stop offset="1" stop-color="#ffece4"/>
    </linearGradient>
    <style>
      text { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; fill: #604944; }
      .serif { font-family: "Songti SC", "STSong", serif; font-weight: 800; fill: #6d4d44; }
      .title { fill: #ff3f7f; font-size: 34px; font-weight: 850; }
      .body { fill: #6c5350; font-size: 30px; }
      .small { fill: #8e7470; font-size: 24px; }
    </style>
  </defs>
  <rect width="1080" height="1440" fill="url(#bg)"/>
  <rect x="58" y="58" width="964" height="1324" rx="56" fill="#fffdf9" stroke="#f1e1e4" stroke-width="3"/>
  <rect x="104" y="104" width="872" height="272" rx="42" fill="#fff5f8" stroke="#f2dce2" stroke-width="3"/>
  ${photoFrame("summaryPhoto", photo, 720, 128, 210, 224, 28)}
  <text x="132" y="172" class="title">AI 形象报告摘要</text>
  <text x="132" y="260" class="serif" font-size="72">${persona}</text>
  <text x="132" y="322" class="small">先看方向，再保存完整报告慢慢对照。</text>
  ${summaryModule(104, 430, "01 发型发色", "保持清爽正脸和同一肤色，优先自然层次、低饱和发色。")}
  ${summaryModule(104, 610, "02 雷区提醒", "谨慎尝试厚重刘海、高饱和发色和过度修饰。")}
  ${summaryModule(104, 790, "03 打理方式", "洗护、吹风、造型品和理发师沟通关键词都要可执行。")}
  ${summaryModule(104, 970, "04 分享金句", "不是大改造，而是把整体氛围变干净、轻盈、自然。")}
  <rect x="104" y="1200" width="872" height="86" rx="43" fill="#ff3f7f"/>
  <text x="210" y="1256" fill="#fff" font-size="32" font-weight="850">封面图 + 摘要图 + 完整报告图都已准备好</text>
</svg>`;
}

function summaryModule(x, y, title, line) {
  return `<rect x="${x}" y="${y}" width="872" height="130" rx="30" fill="#ffffff" stroke="#f1e1e4" stroke-width="3"/>
  <text x="${x + 34}" y="${y + 48}" class="title">${escapeXml(title)}</text>
  <text x="${x + 34}" y="${y + 94}" class="body">${escapeXml(line)}</text>`;
}

function buildReportSvg(report = {}) {
  const persona = escapeXml(report.style_persona || "轻法式白月光");
  const photo = report.source_photo_url || report.user_photo_url || "";
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
  ${photoFrame("reportPhoto", photo, 704, 116, 280, 300, 28)}
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

function photoFrame(id, photoUrl, x, y, width, height, radius = 28) {
  if (!photoUrl) return "";
  const safePhoto = escapeXml(photoUrl);
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="#fff7fb" stroke="#f1e1e4" stroke-width="3"/>
  <image href="${safePhoto}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
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
        xhs_summary_image_url: `/api/reports/${reportId}/summary.svg`,
      };
    }
    const report = {
      report_id: reportId,
      status: assets.report_image_url ? "completed" : "failed",
      progress: assets.report_image_url ? 100 : 0,
      report_type: body.report_type || "comprehensive",
      style_persona: body.style_persona || "轻法式白月光",
      style_keywords: ["清透", "温柔", "低饱和", "松弛感"],
      subject_gender: assets.subject_gender || body.subject_gender || "unknown",
      source_photo_url: body.user_photo_data_url || body.user_photo_url || "",
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

  const assetMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/(cover|summary|report)\.svg$/);
  if (req.method === "GET" && assetMatch) {
    const report = store.reports[assetMatch[1]] || { report_id: assetMatch[1], style_persona: "轻法式白月光" };
    const svgBody = assetMatch[2] === "cover"
      ? buildCoverSvg(report)
      : assetMatch[2] === "summary"
        ? buildSummarySvg(report)
        : buildReportSvg(report);
    svg(res, svgBody);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/reports/prepare-xhs-share") {
    const body = (await readJson(req)) || {};
    const reportId = body.report_id || `rpt_${Date.now()}`;
    const report = store.reports[reportId] || {};
    const persona = body.style_persona || report.style_persona || "轻法式白月光";
    const share = {
      report_id: reportId,
      report_type: body.report_type || report.report_type || "comprehensive",
      style_persona: persona,
      cover_image_url: report.xhs_cover_image_url || `/api/reports/${reportId}/cover.svg`,
      report_image_url: report.report_image_url || `/api/reports/${reportId}/report.svg`,
      summary_image_url: report.xhs_summary_image_url || `/api/reports/${reportId}/summary.svg`,
      share_title: `AI说我是「${persona}」路线，感觉有点准？`,
      share_text: buildShareCopy(persona),
      hashtags: ["AI形象报告", "变美思路", "个人风格定位", "发型推荐"],
      copy_text: buildShareCopy(persona),
      platform_actions: shareActions(),
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
