const ASSETS = {
  logo: "./assets/website-Logo.png",
  hero: "./assets/hair-hero-user6-transparent.png",
  heroAlt: "./assets/hair-hero-user.png",
  french: "./assets/hair-style-french-v2.png",
  wave: "./assets/hair-style-wave-v2.png",
  layer: "./assets/hair-style-layer-v2.png",
  bob: "./assets/hair-style-bob-v2.png",
  air: "./assets/hair-style-air-v2.png",
  iconColor: "./assets/icon-color-style.png",
  iconCoupon: "./assets/icon-coupon.png",
  iconHot: "./assets/icon-hot-style.png",
  iconLove: "./assets/icon-love-style.png",
  iconMatch: "./assets/icon-match-style.png",
  poster: "./assets/hair-poster-sprite-v2.png",
};

const PRODUCTS = [
  {
    id: "single",
    name: "单次专题报告券",
    price: "1.9",
    badge: "",
    desc: "任选 1 个专题，生成 1 张长图报告",
    rights: { topic: 1, comprehensive: 0 },
    code: "AISEA19",
    link: "https://www.goofish.com/",
    tags: ["发型发色", "色彩妆容", "穿搭配饰", "场景 Look"],
    bullets: ["核心维度深度分析", "专业建议 + 参考示例", "长图报告，清晰易读", "随时查看保存"],
  },
  {
    id: "triple",
    name: "三次探索卡",
    price: "4.9",
    badge: "推荐",
    desc: "可生成 3 张专题报告，随心探索不同风格",
    rights: { topic: 3, comprehensive: 0 },
    code: "AISEA49",
    link: "https://www.goofish.com/",
    tags: ["3 张专题", "性价比更高", "多方向探索"],
    bullets: ["3 张不同专题报告", "更全面的维度解读", "更多风格建议参考", "同一张照片可继续探索"],
  },
  {
    id: "full",
    name: "全案探索卡",
    price: "9.9",
    badge: "最完整",
    desc: "综合形象报告 ×1 + 专题报告 ×3",
    rights: { topic: 3, comprehensive: 1 },
    code: "AISEA99",
    link: "https://www.goofish.com/",
    tags: ["综合报告", "专题 ×3", "全案专享"],
    bullets: ["综合 + 3 张专题报告", "个人专属形象定位", "全维度分析", "最完整形象方案"],
  },
];

const DEMO_COUPON_PRODUCTS = {
  AISEA19: "single",
  AISEA49: "triple",
  AISEA99: "full",
  S19K7M2A: "single",
  S19P8Q4B: "single",
  S19R6T5C: "single",
  S19V3W9D: "single",
  S19X2Y7E: "single",
  T49K7M2A: "triple",
  T49P8Q4B: "triple",
  T49R6T5C: "triple",
  T49V3W9D: "triple",
  T49X2Y7E: "triple",
  F99K7M2A: "full",
  F99P8Q4B: "full",
  F99R6T5C: "full",
  F99V3W9D: "full",
  F99X2Y7E: "full",
};

const REPORT_TYPES = [
  {
    id: "comprehensive",
    name: "综合形象报告",
    subtitle: "全案专享，全方位解析你的个人形象",
    icon: ASSETS.poster,
    rightKey: "comprehensive",
    tags: ["发型发色", "色彩妆容", "穿搭配饰", "场景 Look"],
  },
  {
    id: "hair",
    name: "发型发色专题",
    subtitle: "找到更适合你的发型、刘海、卷度和发色",
    icon: ASSETS.french,
    rightKey: "topic",
    tags: ["发型推荐", "发色质感", "理发师关键词"],
  },
  {
    id: "makeup",
    name: "色彩妆容专题",
    subtitle: "找到你的专属提气色色盘和妆容方向",
    icon: ASSETS.iconColor,
    rightKey: "topic",
    tags: ["色盘", "口红", "腮红", "眼妆"],
  },
  {
    id: "outfit",
    name: "穿搭配饰专题",
    subtitle: "穿出风格，提升气质，明确单品选择",
    icon: ASSETS.iconLove,
    rightKey: "topic",
    tags: ["服装", "鞋包", "首饰", "OOTD"],
  },
  {
    id: "look",
    name: "场景 Look 专题",
    subtitle: "不同场景轻松变美，日常、通勤、拍照都能用",
    icon: ASSETS.iconHot,
    rightKey: "topic",
    tags: ["日常", "通勤", "拍照", "聚会"],
  },
];

const PREFERENCES = {
  style: ["系统自动推荐", "清爽利落", "温柔精致", "中性简约", "时尚个性"],
  scene: ["系统推荐", "日常干净", "通勤 / 上学", "拍照上镜", "聚会活动", "风格焕新"],
  change: ["系统推荐", "轻微优化", "明显变化", "大胆尝试"],
};

const PERSONAS = {
  softFrench: {
    title: "轻法式白月光",
    reportTitle: "轻法式白月光养成报告",
    keywords: ["清透", "温柔", "低饱和", "松弛感"],
    direction: "减少厚重感，增加轻盈和氛围。",
  },
};

const initialState = {
  product: null,
  rights: { topic: 0, comprehensive: 0 },
  reportType: null,
  uploadedPhoto: ASSETS.heroAlt,
  uploadedName: "示例照片",
  preferences: {
    style: "系统自动推荐",
    scene: "系统推荐",
    change: "系统推荐",
  },
  privacyAccepted: false,
  progress: 0,
  activeTask: null,
  completedReports: [],
  sharePrepared: false,
};

let state = loadState();
seedDemoState();
let progressTimer = null;
let shareAutoOpened = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("aisea-state") || "null");
    return saved ? { ...initialState, ...saved } : { ...initialState };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  localStorage.setItem("aisea-state", JSON.stringify(state));
}

async function loadRemoteConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    const data = await response.json();
    for (const remote of data.products || []) {
      const product = PRODUCTS.find((item) => item.id === remote.id);
      if (product && remote.purchase_link) product.link = remote.purchase_link;
    }
  } catch {
    // Static hosting fallback keeps default product links.
  }
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || data.error || "接口请求失败");
    error.payload = data;
    throw error;
  }
  return data;
}

async function apiDelete(path) {
  const response = await fetch(path, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || data.error || "接口请求失败");
    error.payload = data;
    throw error;
  }
  return data;
}

function seedDemoState() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "full") return;
  const product = PRODUCTS.find((item) => item.id === "full");
  state.product = product;
  state.rights = { topic: 2, comprehensive: 0 };
  state.reportType = "comprehensive";
  state.uploadedPhoto = ASSETS.heroAlt;
  state.uploadedName = "示例照片";
  state.privacyAccepted = true;
  state.progress = 100;
  if (!state.completedReports.length) {
    state.completedReports = [{
      id: "rpt_demo",
      type: "comprehensive",
      name: "综合形象报告",
      createdAt: new Date().toISOString(),
      persona: "softFrench",
    }];
  }
  saveState();
}

function $(selector) {
  return document.querySelector(selector);
}

function getReportType(id = state.reportType) {
  return REPORT_TYPES.find((item) => item.id === id) || REPORT_TYPES[1];
}

function navigate(route) {
  window.location.hash = route;
}

function routeName() {
  return window.location.hash.replace(/^#\/?/, "") || "home";
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
}

async function copyText(text, success = "已复制") {
  try {
    await navigator.clipboard.writeText(text);
    toast(success);
    return true;
  } catch {
    toast("当前浏览器不支持自动复制，请长按文案手动复制");
    return false;
  }
}

function downloadAsset(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function appLayout(content) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/home" aria-label="返回首页">
          <img src="${ASSETS.logo}" alt="AISea Logo" />
          <span>
            <span class="brand-title">AISea</span>
            <span class="brand-sub">hair.aisea.space</span>
          </span>
        </a>
        <nav class="nav-actions" aria-label="主导航">
          <button class="btn btn-ghost" data-nav="purchase">套餐购买</button>
          <button class="btn btn-ghost" data-nav="select">选择报告</button>
          <button class="btn btn-primary" data-scroll-coupon>兑换码</button>
        </nav>
      </header>
      ${content}
    </div>
  `;
}

function render() {
  clearInterval(progressTimer);
  const route = routeName();
  const views = {
    home: renderHome,
    purchase: renderPurchase,
    success: renderSuccess,
    select: renderSelect,
    upload: renderUpload,
    preferences: renderPreferences,
    confirm: renderConfirm,
    progress: renderProgress,
    result: renderResult,
  };
  $("#app").innerHTML = appLayout((views[route] || renderHome)());
  bindCommon();
  const binder = {
    home: bindHome,
    purchase: bindPurchase,
    success: bindSuccess,
    select: bindSelect,
    upload: bindUpload,
    preferences: bindPreferences,
    confirm: bindConfirm,
    progress: bindProgress,
    result: bindResult,
  }[route] || bindHome;
  binder();
  const params = new URLSearchParams(window.location.search);
  if (route === "result" && params.get("share") === "1" && !shareAutoOpened) {
    shareAutoOpened = true;
    setTimeout(openShareModal, 50);
  }
}

function bindCommon() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.nav));
  });
  document.querySelectorAll("[data-scroll-coupon]").forEach((button) => {
    button.addEventListener("click", () => {
      if (routeName() !== "home") {
        navigate("home");
        setTimeout(() => $("#coupon")?.scrollIntoView({ block: "center" }), 80);
      } else {
        $("#coupon")?.scrollIntoView({ block: "center" });
      }
    });
  });
}

function renderHome() {
  return `
    <main class="page">
      <section class="hero">
        <div class="hero-copy">
          <h1>AI 个人形象报告</h1>
          <h2>一张照片，生成你的专属形象报告</h2>
          <p>发型 / 发色 / 色彩 / 妆容 / 穿搭 / 配饰，一次探索更适合你的风格。路径短、状态清楚，适合保存和分享到小红书。</p>
          <div class="button-row">
            <button class="btn btn-primary" data-nav="purchase">购买兑换码</button>
            <button class="btn btn-secondary" data-scroll-coupon>我已有兑换码</button>
          </div>
        </div>
        <div class="hero-visual" aria-label="报告主视觉">
          <div class="portrait-orbit">
            <img src="${ASSETS.hero}" alt="AI 形象报告人物示例" />
          </div>
          <div class="floating-note">
            <strong>轻法式白月光路线</strong>
            <span>清透 / 温柔 / 低饱和 / 松弛感。减少厚重感，增加轻盈和氛围。</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">形象报告预览</h2>
            <p class="section-desc">点击卡片查看样例。综合报告仅全案探索卡可用。</p>
          </div>
          <button class="btn btn-ghost" data-preview="comprehensive">看看报告长什么样</button>
        </div>
        <div class="preview-scroll">
          ${REPORT_TYPES.map((type) => `
            <button class="card preview-card" data-preview="${type.id}">
              <div class="preview-media"><img src="${type.icon}" alt="${type.name}预览" /></div>
              <div class="preview-body">
                <h3>${type.name}</h3>
                <p>${type.subtitle}</p>
                <div class="tag-row">${type.tags.slice(0, 2).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
              </div>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2 class="section-title">选择你的报告套餐</h2>
            <p class="section-desc">价格差异来自权益和内容范围，综合形象报告仅全案探索卡可生成。</p>
          </div>
        </div>
        <div class="grid grid-3">
          ${PRODUCTS.map(productCard).join("")}
        </div>
      </section>

      <section class="section" id="coupon">
        <div class="section-head">
          <div>
            <h2 class="section-title">兑换报告券</h2>
            <p class="section-desc">演示兑换码：AISEA19 / AISEA49 / AISEA99。正式上线时接入后端兑换接口。</p>
          </div>
        </div>
        <div class="card coupon-panel">
          <input id="couponInput" class="input" placeholder="请输入兑换码" autocomplete="one-time-code" />
          <button class="btn btn-primary" id="redeemBtn">立即兑换</button>
        </div>
        ${state.product ? `<div class="rights-summary">${rightsSummary()}</div>` : ""}
      </section>

      <section class="section">
        <div class="steps">
          <div class="step"><div class="step-num">1</div><strong>购买兑换码</strong><p class="section-desc">从闲鱼购买对应套餐，拿到兑换码。</p></div>
          <div class="step"><div class="step-num">2</div><strong>输入兑换码</strong><p class="section-desc">回到 H5 兑换权益，状态清楚可继续使用。</p></div>
          <div class="step"><div class="step-num">3</div><strong>上传照片生成报告</strong><p class="section-desc">选择报告类型、偏好和授权后开始生成。</p></div>
        </div>
      </section>

      <p class="footer-note">隐私说明：上传照片仅用于生成专属形象分析报告。静态演示版不会上传文件到服务器。</p>
    </main>
  `;
}

function productCard(product) {
  return `
    <article class="card product-card ${product.id === "triple" ? "recommended" : ""}">
      ${product.badge ? `<span class="badge">${product.badge}</span>` : ""}
      <h3>${product.name}</h3>
      <div class="price">¥${product.price}<small> / 份</small></div>
      <p>${product.desc}</p>
      <div class="tag-row">${product.tags.map((tag) => `<span class="tag ${product.id === "full" ? "gold" : ""}">${tag}</span>`).join("")}</div>
      <ul class="check-list">${product.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>
      <button class="btn ${product.id === "full" ? "btn-gold" : "btn-primary"} btn-full" data-buy="${product.id}">去购买</button>
      <button class="btn btn-secondary btn-full" style="margin-top:10px" data-demo-code="${product.code}">填入演示兑换码</button>
    </article>
  `;
}

function rightsSummary() {
  return `
    <span class="rights-pill">当前套餐：${state.product?.name || "未兑换"}</span>
    <span class="rights-pill">专题报告剩余 ${state.rights.topic}</span>
    <span class="rights-pill">综合报告剩余 ${state.rights.comprehensive}</span>
  `;
}

function bindHome() {
  document.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => navigate("purchase"));
  });
  document.querySelectorAll("[data-demo-code]").forEach((button) => {
    button.addEventListener("click", () => {
      $("#couponInput").value = button.dataset.demoCode;
      $("#coupon")?.scrollIntoView({ block: "center" });
    });
  });
  $("#redeemBtn")?.addEventListener("click", redeemFromInput);
  document.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => openPreview(button.dataset.preview));
  });
}

async function redeemFromInput() {
  const code = ($("#couponInput")?.value || "").trim().toUpperCase();
  if (!code) {
    toast("请输入兑换码");
    return;
  }
  let product = PRODUCTS.find((item) => item.code === code || item.id === DEMO_COUPON_PRODUCTS[code]);
  if (!product) {
    toast("兑换码无效，请检查后重新输入");
    return;
  }
  try {
    const result = await apiPost("/api/coupons/redeem", { code });
    product = PRODUCTS.find((item) => item.id === result.product.id) || product;
    state.rights = { ...result.rights };
  } catch (error) {
    state.rights = { ...product.rights };
  }
  state.product = product;
  state.completedReports = [];
  saveState();
  toast("兑换成功");
  navigate("success");
}

function renderPurchase() {
  return `
    <main class="page">
      <div class="page-title">
        <h1>购买兑换码</h1>
        <p>购买后会获得兑换码，回到首页输入兑换码即可生成报告。按钮会打开闲鱼交易页面，演示版也提供一键填入兑换码。</p>
      </div>
      <div class="grid grid-3">${PRODUCTS.map(productCard).join("")}</div>
      <section class="section card pad">
        <h2 class="section-title">常见问题</h2>
        <div class="grid grid-3" style="margin-top:14px">
          <div><strong>兑换码多久有效？</strong><p class="section-desc">建议购买后尽快兑换。正式版以后台配置有效期为准。</p></div>
          <div><strong>报告可以分享吗？</strong><p class="section-desc">可以。结果页支持下载报告、准备小红书封面图和复制分享文案。</p></div>
          <div><strong>同一张照片能继续生成吗？</strong><p class="section-desc">可以，三次探索卡和全案探索卡支持继续探索不同专题。</p></div>
        </div>
      </section>
    </main>
  `;
}

function bindPurchase() {
  document.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = PRODUCTS.find((item) => item.id === button.dataset.buy);
      window.open(product.link, "_blank", "noopener");
      toast("购买完成后，请复制兑换码回首页使用");
    });
  });
  document.querySelectorAll("[data-demo-code]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = PRODUCTS.find((item) => item.code === button.dataset.demoCode);
      state.product = product;
      state.rights = { ...product.rights };
      state.completedReports = [];
      saveState();
      navigate("success");
    });
  });
}

function renderSuccess() {
  const product = state.product;
  if (!product) {
    return emptyState("还没有兑换权益", "请先购买或输入兑换码。", "去兑换", "home");
  }
  const isFull = product.id === "full";
  return `
    <main class="page">
      <div class="page-title">
        <h1>已兑换：${product.name}</h1>
        <p>${isFull ? "建议先生成综合形象报告，再继续探索专题。" : "权益已激活，下一步选择专题报告。"}</p>
      </div>
      <div class="card pad">
        <div class="rights-summary">${rightsSummary()}</div>
        <div class="button-row">
          ${isFull ? `<button class="btn btn-gold" id="startFull">先生成综合形象报告</button>` : ""}
          <button class="btn btn-primary" data-nav="select">${isFull ? "先生成专题报告" : "选择专题报告"}</button>
          <button class="btn btn-secondary" data-nav="home">返回首页</button>
        </div>
      </div>
    </main>
  `;
}

function bindSuccess() {
  $("#startFull")?.addEventListener("click", () => {
    state.reportType = "comprehensive";
    saveState();
    navigate("upload");
  });
}

function renderSelect() {
  if (!state.product) {
    return emptyState("请先兑换报告券", "兑换成功后才能选择报告类型。", "去兑换", "home");
  }
  return `
    <main class="page">
      <div class="page-title">
        <h1>选择报告类型</h1>
        <p>根据当前权益选择本次要生成的报告。没有剩余次数的卡片会置灰并引导购买。</p>
      </div>
      <div class="rights-summary">${rightsSummary()}</div>
      <div class="grid grid-2">
        ${REPORT_TYPES.map((type) => {
          const available = state.rights[type.rightKey] > 0;
          return `
            <button class="card report-type-card ${available ? "" : "disabled"}" data-type="${type.id}" ${available ? "" : "data-disabled='true'"}>
              <span class="type-icon"><img src="${type.icon}" alt="" /></span>
              <span>
                <h3>${type.name}</h3>
                <p>${type.subtitle}</p>
                <span class="tag-row">${type.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</span>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    </main>
  `;
}

function bindSelect() {
  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = getReportType(button.dataset.type);
      if (button.dataset.disabled) {
        toast(type.rightKey === "comprehensive" ? "综合报告仅全案探索卡可用" : "专题次数不足，请购买新券码");
        navigate("purchase");
        return;
      }
      state.reportType = type.id;
      saveState();
      navigate("upload");
    });
  });
}

function renderUpload() {
  const type = getReportType();
  return `
    <main class="page">
      <div class="page-title">
        <h1>上传照片</h1>
        <p>本次生成：${type.name}。照片越清晰，报告越稳定，前端会在本地预览，不上传服务器。</p>
      </div>
      <div class="upload-layout">
        <section class="card pad">
          <h2 class="section-title">拍照小贴士</h2>
          <div class="tip-grid" style="margin-top:14px">
            <div class="card pad">
              <strong>推荐这样拍</strong>
              <ul class="tip-list">
                <li>正脸对镜头</li>
                <li>光线均匀明亮</li>
                <li>头发自然垂落</li>
                <li>背景干净简洁</li>
              </ul>
            </div>
            <div class="card pad">
              <strong>避免这样拍</strong>
              <ul class="tip-list">
                <li>侧脸或低头</li>
                <li>光线昏暗 / 逆光</li>
                <li>刘海遮挡眉眼</li>
                <li>背景杂乱</li>
              </ul>
            </div>
          </div>
          <div class="tag-row">
            ${["单人正脸", "光线清晰", "脸和头发无遮挡", "尽量不要重度美颜"].map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
        </section>
        <section class="upload-box" id="uploadBox" tabindex="0">
          <input id="fileInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/heic" />
          <div id="uploadInner">
            ${state.uploadedPhoto ? `<img class="upload-preview" src="${state.uploadedPhoto}" alt="已上传照片预览" />` : ""}
            <h2 class="section-title" style="margin-top:14px">点击或拖拽上传照片</h2>
            <p class="section-desc">支持 JPG / PNG / HEIC / WEBP，大小不超过 10MB</p>
            <div class="button-row" style="justify-content:center">
              <button class="btn btn-primary" id="pickFile">选择照片</button>
              <button class="btn btn-secondary" id="useDemo">使用示例照片</button>
            </div>
          </div>
        </section>
      </div>
      <div class="button-row">
        <button class="btn btn-primary" id="nextPrefs">下一步</button>
        <button class="btn btn-secondary" data-nav="select">返回选择报告</button>
      </div>
    </main>
  `;
}

function bindUpload() {
  const input = $("#fileInput");
  const box = $("#uploadBox");
  $("#pickFile")?.addEventListener("click", (event) => {
    event.stopPropagation();
    input.click();
  });
  $("#useDemo")?.addEventListener("click", (event) => {
    event.stopPropagation();
    state.uploadedPhoto = ASSETS.heroAlt;
    state.uploadedName = "示例照片";
    saveState();
    toast("已使用示例照片");
    render();
  });
  box?.addEventListener("click", () => input.click());
  box?.addEventListener("dragover", (event) => {
    event.preventDefault();
    box.classList.add("dragover");
  });
  box?.addEventListener("dragleave", () => box.classList.remove("dragover"));
  box?.addEventListener("drop", (event) => {
    event.preventDefault();
    box.classList.remove("dragover");
    handleFile(event.dataTransfer.files[0]);
  });
  input?.addEventListener("change", () => handleFile(input.files[0]));
  $("#nextPrefs")?.addEventListener("click", () => {
    if (!state.uploadedPhoto) {
      toast("请先上传照片");
      return;
    }
    navigate("preferences");
  });
}

function handleFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    toast("图片超过 10MB，请重新选择");
    return;
  }
  if (!/^image\//.test(file.type) && !/\.heic$/i.test(file.name)) {
    toast("请上传图片文件");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.uploadedPhoto = reader.result;
    state.uploadedName = file.name;
    saveState();
    toast("照片可用，可继续生成");
    render();
  };
  reader.readAsDataURL(file);
}

function renderPreferences() {
  return `
    <main class="page">
      <div class="page-title">
        <h1>生成偏好</h1>
        <p>无需复杂表单，系统会结合照片和偏好生成更贴合你的形象建议。</p>
      </div>
      ${preferenceSection("造型表达偏好", "style", PREFERENCES.style)}
      ${preferenceSection("目标场景", "scene", PREFERENCES.scene)}
      ${preferenceSection("改变幅度", "change", PREFERENCES.change)}
      <div class="button-row">
        <button class="btn btn-primary" data-nav="confirm">保存偏好</button>
        <button class="btn btn-secondary" data-nav="upload">重新上传</button>
      </div>
    </main>
  `;
}

function preferenceSection(title, key, options) {
  return `
    <section class="section card pad">
      <h2 class="section-title">${title}</h2>
      <div class="option-grid" style="margin-top:14px">
        ${options.map((option) => `
          <button class="option ${state.preferences[key] === option ? "selected" : ""}" data-pref-key="${key}" data-pref-value="${option}">${option}</button>
        `).join("")}
      </div>
    </section>
  `;
}

function bindPreferences() {
  document.querySelectorAll("[data-pref-key]").forEach((button) => {
    button.addEventListener("click", () => {
      state.preferences[button.dataset.prefKey] = button.dataset.prefValue;
      saveState();
      render();
    });
  });
}

function renderConfirm() {
  const type = getReportType();
  const modules = type.id === "comprehensive"
    ? ["发型发色", "色彩妆容", "穿搭配饰", "场景建议", "雷区提醒", "今日动作"]
    : type.tags;
  return `
    <main class="page">
      <div class="page-title">
        <h1>确认生成</h1>
        <p>确认本次消耗权益和报告内容。预计耗时 1-3 分钟，生成失败不会消耗权益。</p>
      </div>
      <div class="confirm-layout">
        <aside class="card pad">
          <div class="photo-thumb"><img src="${state.uploadedPhoto}" alt="上传照片确认" /></div>
          <p class="section-desc">已上传：${state.uploadedName}</p>
        </aside>
        <section class="card pad">
          <h2 class="section-title">${type.name}</h2>
          <p class="section-desc">本次将消耗：${type.rightKey === "comprehensive" ? "综合形象报告 ×1" : "专题报告 ×1"}</p>
          <div class="tag-row">${modules.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
          <ul class="check-list">
            <li>造型表达偏好：${state.preferences.style}</li>
            <li>目标场景：${state.preferences.scene}</li>
            <li>改变幅度：${state.preferences.change}</li>
            <li>隐私说明：照片仅用于生成专属形象分析报告</li>
          </ul>
          <label class="privacy-check">
            <input id="privacyCheck" type="checkbox" ${state.privacyAccepted ? "checked" : ""} />
            <span>我确认上传的是本人照片，知悉并同意用于生成专属形象分析报告。我们将严格保护您的隐私，仅用于报告生成，不会用于其他用途。</span>
          </label>
          <div class="button-row">
            <button class="btn btn-primary" id="startGenerate">开始生成报告</button>
            <button class="btn btn-secondary" data-nav="preferences">返回修改</button>
          </div>
        </section>
      </div>
    </main>
  `;
}

function bindConfirm() {
  $("#privacyCheck")?.addEventListener("change", (event) => {
    state.privacyAccepted = event.target.checked;
    saveState();
  });
  $("#startGenerate")?.addEventListener("click", () => {
    const type = getReportType();
    if (!state.privacyAccepted) {
      toast("请先确认照片授权");
      return;
    }
    if (state.rights[type.rightKey] <= 0) {
      toast("当前权益不足，请购买新券码");
      navigate("purchase");
      return;
    }
    beginGenerate(type);
  });
}

async function beginGenerate(type) {
  state.progress = 8;
  state.sharePrepared = false;
  state.activeTask = null;
  saveState();
  try {
    state.activeTask = await apiPost("/api/reports/generate", {
      report_type: type.name,
      style_persona: "轻法式白月光",
      style_preference: state.preferences.style,
      scene_preference: state.preferences.scene,
      change_level: state.preferences.change,
    });
    saveState();
  } catch {
    // Static fallback: simulated progress still completes the user flow.
  }
  navigate("progress");
}

function renderProgress() {
  return `
    <main class="page">
      <section class="progress-wrap">
        <div>
          <div class="progress-ring" style="--p:${state.progress}"><span>${state.progress}%</span></div>
          <h1 class="section-title" style="margin-top:22px">报告正在生成中</h1>
          <p class="section-desc">预计需要 1-3 分钟，可切到其他页面，回来自动同步进度。正在生成，请勿重复提交。</p>
          <div class="progress-list">
            ${progressItem("已提交照片", 8)}
            ${progressItem("质量检测中", 25)}
            ${progressItem("方案生成中", 60)}
            ${progressItem("报告排版中", 85)}
            ${progressItem("生成完成", 100)}
          </div>
          <div class="button-row" style="justify-content:center">
            <button class="btn btn-secondary" data-nav="home">稍后再看</button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function progressItem(label, value) {
  return `<div class="progress-item ${state.progress >= value ? "done" : ""}"><span>${label}</span><span>${state.progress >= value ? "完成" : "等待"}</span></div>`;
}

function bindProgress() {
  const increments = [25, 42, 60, 73, 85, 94, 100];
  let index = increments.findIndex((value) => value > state.progress);
  if (index < 0) index = increments.length - 1;
  progressTimer = setInterval(() => {
    state.progress = increments[index] || 100;
    saveState();
    if (state.progress >= 100) {
      clearInterval(progressTimer);
      finishReport();
      setTimeout(() => navigate("result"), 450);
    } else {
      index += 1;
      render();
    }
  }, 650);
}

function finishReport() {
  const type = getReportType();
  if (state.rights[type.rightKey] > 0) {
    state.rights[type.rightKey] -= 1;
  }
  const task = state.activeTask || {};
  state.completedReports.unshift({
    id: task.report_id || `rpt_${Date.now()}`,
    type: type.id,
    name: type.name,
    createdAt: task.created_at || new Date().toISOString(),
    persona: task.style_persona || "softFrench",
    reportImageUrl: task.report_image_url,
    coverImageUrl: task.xhs_cover_image_url,
  });
  state.progress = 100;
  state.activeTask = null;
  saveState();
}

function renderResult() {
  if (!state.completedReports.length) {
    return emptyState("还没有生成报告", "请先选择报告类型并完成生成。", "选择报告", "select");
  }
  const report = state.completedReports[0];
  const type = getReportType(report.type);
  return `
    <main class="page">
      <div class="page-title">
        <h1>${type.name}</h1>
        <p>${type.id === "comprehensive" ? "这是一张可分享的完整形象总览报告。" : "长按图片可保存，支持下载和准备小红书分享。"}</p>
      </div>
      <div class="result-layout">
        <aside class="card pad">
          <div class="rights-summary">${rightsSummary()}</div>
          <div class="button-row">
            <button class="btn btn-primary btn-full" id="downloadReport">下载完整报告</button>
            <button class="btn btn-secondary btn-full" data-nav="select">继续生成其他专题</button>
            <button class="btn btn-gold btn-full" id="openShare">一键准备小红书分享</button>
            <button class="btn btn-ghost btn-full" id="openPrompt">查看生图指令</button>
            <button class="btn btn-ghost btn-full" id="deleteReport">删除报告数据</button>
          </div>
          <section class="section" style="margin-bottom:0">
            <h2 class="section-title">推荐下一步</h2>
            <div class="tag-row">${REPORT_TYPES.filter((item) => item.id !== "comprehensive" && item.id !== type.id).slice(0, 3).map((item) => `<span class="tag">${item.name}</span>`).join("")}</div>
          </section>
        </aside>
        <section>
          ${reportCanvas(type)}
          <p class="section-desc" style="text-align:center;margin-top:12px">提示：移动端可长按报告图保存到相册。</p>
        </section>
      </div>
    </main>
  `;
}

function bindResult() {
  $("#downloadReport")?.addEventListener("click", () => {
    const report = state.completedReports[0] || {};
    downloadAsset(report.reportImageUrl || `/api/reports/${report.id || "rpt_demo"}/report.svg`, "aisea-report.svg");
    toast("已准备下载完整报告图");
  });
  $("#openShare")?.addEventListener("click", openShareModal);
  $("#openPrompt")?.addEventListener("click", openPromptModal);
  $("#deleteReport")?.addEventListener("click", deleteCurrentReport);
}

async function deleteCurrentReport() {
  const report = state.completedReports[0];
  if (!report) return;
  try {
    await apiDelete(`/api/reports/${report.id}`);
  } catch {
    // Local-only reports can still be removed from the current browser state.
  }
  state.completedReports = state.completedReports.filter((item) => item.id !== report.id);
  saveState();
  toast("报告数据已删除");
  navigate("select");
}

function reportCanvas(type = getReportType()) {
  const persona = PERSONAS.softFrench;
  return `
    <article class="report-canvas" id="reportCanvas" aria-label="完整报告长图">
      <div class="report-hero">
        <div>
          <h2>${type.id === "comprehensive" ? persona.reportTitle : type.name}</h2>
          <div class="tag-row">${persona.keywords.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
          <p class="section-desc">${persona.direction}</p>
        </div>
        <div class="report-person"><img src="${state.uploadedPhoto}" alt="报告人物主视觉" /></div>
      </div>
      <div class="mini-modules">
        <div class="mini-card"><h4>发型推荐</h4><p>法式慵懒卷 / 锁骨层次发 / 空气感刘海。关键词：轻盈、自然、脸周修饰。</p></div>
        <div class="mini-card"><h4>发色推荐</h4><div class="hair-strip"><span class="hair-swatch" style="--c:#3d2c27"></span><span class="hair-swatch" style="--c:#6d4639"></span><span class="hair-swatch" style="--c:#a4745a"></span></div><p>冷茶棕 / 摩卡棕 / 奶茶棕。</p></div>
        <div class="mini-card"><h4>个人色彩</h4><div class="palette"><span class="swatch" style="--c:#fff4e8"></span><span class="swatch" style="--c:#d8a090"></span><span class="swatch" style="--c:#a98b73"></span><span class="swatch" style="--c:#cbd8c8"></span></div><p>中性偏暖、柔和低饱和。</p></div>
        <div class="mini-card"><h4>妆容建议</h4><p>清透底妆、柔和眉毛、奶茶大地色眼妆、豆沙色唇颊。</p></div>
        <div class="mini-card"><h4>穿搭配饰</h4><p>奶油白针织、浅咖半裙、风衣、珍珠耳饰、小号肩包。</p></div>
        <div class="mini-card"><h4>场景 Look</h4><p>日常奶油感 / 通勤松弛感 / 拍照温柔感，保持低饱和协调。</p></div>
        <div class="mini-card"><h4>谨慎尝试</h4><p>厚重齐刘海、高饱和发色、过重眼妆、配饰过多。</p></div>
        <div class="mini-card"><h4>今日动作</h4><p>1. 发尾做轻层次。2. 上衣先选浅色。3. 妆容重点放在气色。</p></div>
      </div>
      <div class="mini-card" style="margin-top:10px"><h4>分享金句</h4><p>AI 说我是轻法式白月光路线，有点准。适合自己的风格，比盲目跟风更重要。</p></div>
    </article>
  `;
}

function coverCanvas() {
  const persona = PERSONAS.softFrench;
  return `
    <article class="cover-canvas" aria-label="小红书封面图 1080x1440">
      <div class="cover-hero">
        <div>
          <span class="tag">AI 个人形象报告</span>
          <h2 style="margin-top:12px">${persona.title}<br />养成报告</h2>
          <div class="tag-row">${persona.keywords.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
        </div>
        <div class="cover-person"><img src="${state.uploadedPhoto}" alt="小红书封面人物" /></div>
      </div>
      <div class="mini-card" style="margin-top:14px"><h4>AI 说我的变美方向</h4><p>不需要大改，减少厚重感，增加轻盈和低饱和氛围就会更出片。</p></div>
      <div class="mini-card" style="margin-top:10px"><h4>发布引导语</h4><p>换发型前真的可以先看看。AI 说我更适合这个路线，感觉有点准？</p></div>
    </article>
  `;
}

function shareCopy() {
  return `AI说我是「轻法式白月光」路线，感觉有点准？

刚生成了一份 AI 个人形象报告，关键词是：清透 / 温柔 / 低饱和 / 松弛感。

它给我的变美方向是：
1. 发型增加轻层次，不要太厚重
2. 发色更适合奶茶棕、冷茶棕、摩卡棕
3. 妆容重点放在清透底妆和温柔唇色
4. 穿搭多选奶油白、燕麦色、浅咖色

感觉不是大改造，而是把整体氛围变轻、变柔、变干净。

#AI形象报告 #变美思路 #个人风格定位 #发型推荐 #普通女生变美`;
}

async function prepareShareAssets() {
  const report = state.completedReports[0] || {};
  try {
    return await apiPost("/api/reports/prepare-xhs-share", {
      report_id: report.id,
      report_type: report.type,
      style_persona: "轻法式白月光",
    });
  } catch {
    return {
      report_id: report.id || "rpt_local",
      style_persona: "轻法式白月光",
      cover_image_url: ASSETS.poster,
      report_image_url: ASSETS.heroAlt,
      summary_image_url: ASSETS.poster,
      share_title: "AI说我是「轻法式白月光」路线，感觉有点准？",
      copy_text: shareCopy(),
      hashtags: ["AI形象报告", "变美思路", "个人风格定位", "发型推荐"],
    };
  }
}

async function openShareModal() {
  state.sharePrepared = true;
  saveState();
  const shareAssets = await prepareShareAssets();
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="分享你的变美报告">
      <div class="modal-head">
        <div>
          <h2>分享你的变美报告</h2>
          <p class="section-desc" style="margin:4px 0 0">已为你准备好封面图、完整报告图和小红书文案。</p>
        </div>
        <button class="close-btn" data-close>×</button>
      </div>
      <div class="modal-body share-panel">
        <div>
          ${coverCanvas()}
          <p class="section-desc" style="text-align:center">建议把封面图放第 1 张，更容易被点击。</p>
        </div>
        <div>
          <h3>准备步骤</h3>
          <div class="grid" style="margin:12px 0">
            <button class="btn btn-primary" id="saveCover">保存封面图</button>
            <button class="btn btn-secondary" id="saveReport">保存完整报告图</button>
            <button class="btn btn-secondary" id="copyShare">复制文案</button>
            <button class="btn btn-gold" id="openXhs">打开小红书</button>
          </div>
          <div class="copy-box">${shareAssets.copy_text || shareCopy()}</div>
          <p class="section-desc">打开小红书后，选择刚保存的图片并粘贴文案发布。H5 不承诺自动发布。</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });
  $("#saveCover").addEventListener("click", () => {
    downloadAsset(shareAssets.cover_image_url || `/api/reports/${shareAssets.report_id || "rpt_demo"}/cover.svg`, "aisea-xhs-cover.svg");
    toast("已准备下载小红书封面图");
  });
  $("#saveReport").addEventListener("click", () => {
    downloadAsset(shareAssets.report_image_url || `/api/reports/${shareAssets.report_id || "rpt_demo"}/report.svg`, "aisea-report.svg");
    toast("已准备下载完整报告图");
  });
  $("#copyShare").addEventListener("click", () => copyText(shareAssets.copy_text || shareCopy(), "文案已复制，打开小红书后可直接粘贴"));
  $("#openXhs").addEventListener("click", () => {
    window.location.href = "xhsdiscover://";
    setTimeout(() => toast("如未自动打开，请手动打开小红书并选择已保存图片"), 900);
  });
  copyText(shareAssets.copy_text || shareCopy(), "文案已自动复制");
}

function buildImagePrompt() {
  const type = getReportType();
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传的照片，生成一张高信息密度、适合保存和分享到小红书/朋友圈的中文个人形象报告长图。

【输出规格】
- 完整报告图：1080x1920，竖版长图，中文清晰可读。
- 小红书封面图：1080x1440，3:4 竖版，作为笔记首图。
- 所有文字必须为中文，不要乱码、错字、重复字或无意义文字。

【报告类型】
${type.name}

【用户偏好】
- 造型表达偏好：${state.preferences.style}
- 目标场景：${state.preferences.scene}
- 改变幅度：${state.preferences.change}

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

async function openPromptModal() {
  let prompt = buildImagePrompt();
  try {
    const result = await apiPost("/api/reports/generate-prompt", {
      report_type: getReportType().name,
      style_preference: state.preferences.style,
      scene_preference: state.preferences.scene,
      change_level: state.preferences.change,
    });
    prompt = result.prompt || prompt;
  } catch {
    // Static hosting fallback keeps prompt generation available without the API server.
  }
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="生图指令">
      <div class="modal-head">
        <div>
          <h2>生图指令</h2>
          <p class="section-desc" style="margin:4px 0 0">用于生成符合要求的报告图和小红书封面图，重点约束中文可读、主题准确、模块不混乱。</p>
        </div>
        <button class="close-btn" data-close>×</button>
      </div>
      <div class="modal-body">
        <pre class="prompt-code">${escapeHtml(prompt)}</pre>
        <div class="button-row"><button class="btn btn-primary" id="copyPrompt">复制生图指令</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  $("#copyPrompt").addEventListener("click", () => copyText(prompt, "生图指令已复制"));
}

function openPreview(typeId) {
  const type = getReportType(typeId);
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${type.name}样例">
      <div class="modal-head">
        <div>
          <h2>${type.name}样例预览</h2>
          <p class="section-desc" style="margin:4px 0 0">${type.subtitle}</p>
        </div>
        <button class="close-btn" data-close>×</button>
      </div>
      <div class="modal-body">
        ${reportCanvas(type)}
        <div class="button-row" style="justify-content:center">
          <button class="btn btn-primary" data-close>关闭预览</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
}

function emptyState(title, desc, button, route) {
  return `
    <main class="page">
      <section class="progress-wrap">
        <div class="card pad" style="max-width:560px">
          <h1 class="section-title">${title}</h1>
          <p class="section-desc">${desc}</p>
          <div class="button-row" style="justify-content:center">
            <button class="btn btn-primary" data-nav="${route}">${button}</button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("hashchange", render);
loadRemoteConfig().finally(render);
