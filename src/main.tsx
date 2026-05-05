import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  Clipboard,
  CloudUpload,
  Crown,
  Download,
  ExternalLink,
  FileText,
  Gift,
  Heart,
  ImageDown,
  KeyRound,
  Lock,
  LogOut,
  PackagePlus,
  Palette,
  Plus,
  ReceiptText,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";
import "./styles.css";
import { ASSETS, DEFAULT_ADMIN, DEFAULT_PRODUCTS, PERSONAS, REPORT_TYPES, preferenceOptions } from "./data";
import type { AdminState, AdminUser, AuditLog, Coupon, PersonaId, Product, ProductId, ReportType, ReportTypeId, Rights, UserReport } from "./types";

type Route = "home" | "purchase" | "success" | "select" | "upload" | "preferences" | "confirm" | "progress" | "result" | "admin";
type Toast = { id: number; text: string };

const HOME_ASSETS = {
  logo: new URL("../assets/aisea_icon_01/01_logo_mark.png", import.meta.url).href,
  heroBg: new URL("../assets/aisea_icon_01/hero-background.png", import.meta.url).href,
  heroPerson: new URL("../assets/aisea_icon_01/hair-hero-user01.png", import.meta.url).href,
  heroPersonAlt: new URL("../assets/aisea_icon_01/hair-hero-user.png", import.meta.url).href,
  forYou: new URL("../assets/aisea_icon_01/for you love.png", import.meta.url).href,
  sparkle: new URL("../assets/aisea_icon_01/02_sparkle.svg", import.meta.url).href,
  star: new URL("../assets/aisea_icon_01/03_star.svg", import.meta.url).href,
  heart: new URL("../assets/aisea_icon_01/04_heart.svg", import.meta.url).href,
  shoppingBag: new URL("../assets/aisea_icon_01/05_shopping_bag.svg", import.meta.url).href,
  ticketPink: new URL("../assets/aisea_icon_01/06_ticket_pink.svg", import.meta.url).href,
  ticketOrange: new URL("../assets/aisea_icon_01/07_ticket_orange.svg", import.meta.url).href,
  ticketOutline: new URL("../assets/aisea_icon_01/08_ticket_outline.svg", import.meta.url).href,
  gift: new URL("../assets/aisea_icon_01/09_gift.svg", import.meta.url).href,
  profileUpload: new URL("../assets/aisea_icon_01/10_profile_upload.svg", import.meta.url).href,
  lock: new URL("../assets/aisea_icon_01/11_lock.svg", import.meta.url).href,
  arrowRight: new URL("../assets/aisea_icon_01/12_arrow_right.svg", import.meta.url).href,
  xiaohongshu: new URL("../assets/aisea_icon_01/13_xiaohongshu.svg", import.meta.url).href,
  wechat: new URL("../assets/aisea_icon_01/14_wechat.svg", import.meta.url).href,
  moments: new URL("../assets/aisea_icon_01/15_moments.svg", import.meta.url).href,
  reportCard: new URL("../assets/aisea_icon_01/16_report_card.svg", import.meta.url).href,
  magicWand: new URL("../assets/aisea_icon_01/17_magic_wand.svg", import.meta.url).href,
  hanger: new URL("../assets/aisea_icon_01/18_hanger.svg", import.meta.url).href,
  palette: new URL("../assets/aisea_icon_01/19_palette.svg", import.meta.url).href,
};

interface AppState {
  route: Route;
  product?: Product;
  rights: Rights;
  reportType: ReportTypeId;
  photoUrl: string;
  photoName: string;
  preferences: { style: string; scene: string; change: string };
  privacyAccepted: boolean;
  progress: number;
  reports: UserReport[];
  admin: AdminState;
  adminAuthed: boolean;
  adminRole: AdminUser["role"];
}

const LS_KEY = "aisea-react-state-v1";
const ADMIN_PASSWORD = "AISea@2026";
const couponAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function loadState(): AppState {
  const hashRoute = (window.location.hash.replace(/^#\/?/, "") || "home") as Route;
  const params = new URLSearchParams(window.location.search);
  const allowedRoutes: Route[] = ["home", "purchase", "success", "select", "upload", "preferences", "confirm", "progress", "result", "admin"];
  const fallback: AppState = {
    route: allowedRoutes.includes(hashRoute) ? hashRoute : "home",
    rights: { topic: 0, comprehensive: 0 },
    reportType: "comprehensive",
    photoUrl: ASSETS.heroAlt,
    photoName: "示例照片",
    preferences: { style: "系统自动推荐", scene: "系统推荐", change: "系统推荐" },
    privacyAccepted: false,
    progress: 0,
    reports: [],
    admin: DEFAULT_ADMIN,
    adminAuthed: false,
    adminRole: "owner",
  };
  if (params.get("demo") === "full") {
    const product = DEFAULT_PRODUCTS.find((item) => item.id === "full");
    return {
      ...fallback,
      product,
      rights: { topic: 3, comprehensive: 1 },
      reportType: "comprehensive",
      privacyAccepted: true,
      progress: 100,
      reports: [{
        id: "rpt_demo",
        type: "comprehensive",
        name: "综合形象报告",
        createdAt: now(),
        persona: "softFrench",
        prompt: "Demo prompt: 生产环境会调用 gpt-image-2，并要求中文清晰、无乱码、模块准确。",
      }],
    };
  }
  if (params.get("demo") === "admin" && ["127.0.0.1", "localhost"].includes(window.location.hostname)) {
    return {
      ...fallback,
      route: "admin",
      adminAuthed: true,
    };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    return saved ? { ...fallback, ...saved, route: fallback.route, admin: { ...DEFAULT_ADMIN, ...saved.admin } } : fallback;
  } catch {
    return fallback;
  }
}

function now() {
  return new Date().toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function code8(existing: Set<string>) {
  let code = "";
  do {
    code = Array.from({ length: 8 }, () => couponAlphabet[Math.floor(Math.random() * couponAlphabet.length)]).join("");
  } while (existing.has(code));
  return code;
}

function buildPrompt(type: ReportType, personaId: PersonaId, prefs: AppState["preferences"]) {
  const persona = PERSONAS[personaId];
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传的照片，生成一张高信息密度、适合保存和分享到小红书/朋友圈的中文个人形象报告长图。

【输出要求】
- 报告图：1080×1920 或更长的竖版中文长图，文字必须清晰可读。
- 小红书封面图：1080×1440，3:4 竖版，标题大、留白足、适合作为笔记首图。
- 所有文字必须为简体中文；禁止乱码、假中文、随机符号、重复字、不可读小字。

【用户照片要求】
- 以用户上传照片为参考，保留核心长相特征和自然气质。
- 不要过度美颜，不要大幅改变五官，不要夸张失真。
- 不要低俗、暴露、成人化或擦边姿势。

【本次报告】
- 报告类型：${type.name}
- 人设方向：${persona.title}
- 关键词：${persona.keywords.join(" / ")}
- 视觉基调：${persona.tone}
- 造型表达偏好：${prefs.style}
- 目标场景：${prefs.scene}
- 改变幅度：${prefs.change}

【必须包含模块】
${type.id === "comprehensive" ? [
  "1. 风格人设与形象关键词：给出温和正向的一句话结论。",
  "2. 发型推荐：真实发型缩略图、刘海、长度、卷度、层次，不能用普通色块代替。",
  "3. 发色推荐：真实头发质感色板，例如黑茶色、冷茶棕、摩卡棕、奶茶棕。",
  "4. 个人色彩：推荐色盘与谨慎色盘，颜色名称要准确。",
  "5. 妆容建议：底妆、眉形、眼妆、腮红、唇色。",
  "6. 穿搭配饰：服装、鞋、包、首饰、发饰和 3 套 OOTD。",
  "7. 场景 Look：日常、通勤/上学、拍照、聚会。",
  "8. 雷区提醒：使用“谨慎尝试”“容易削弱协调感”等温和表达。",
  "9. 今日可执行的 3 个变美动作和小红书分享金句。",
] : type.modules.map((item, index) => `${index + 1}. ${item}：围绕「${type.name}」展开，主题准确，不混入无关模块。`).join("\n")}

【文案风格】
- 温柔、鼓励、自信，不制造外貌焦虑。
- 不写“丑、土、脸大、显老、不适合你”等攻击性表达。
- 使用“建议”“更适合”“可优先尝试”“谨慎尝试”等表达。

【排版要求】
- 顶部有醒目的标题区和人物主视觉。
- 中部使用多个模块卡片，信息密度高但不拥挤。
- 底部包含今日行动清单、温馨提示和分享金句。
- 整体像“小红书种草风 + 高级形象顾问报告 + 杂志信息图”，不要像后台表格。`;
}

function xhsCopy(type: ReportType, personaId: PersonaId) {
  const persona = PERSONAS[personaId];
  if (type.id !== "comprehensive") {
    return `我生成了一份 ${type.name}，感觉很适合变美前参考。

它给我的方向：
1. ${type.modules[0]}更适合先从自然、低负担的路线尝试
2. 推荐内容会结合照片和偏好，不是盲目套模板
3. 还会提醒哪些方向需要谨慎尝试

最有用的是它把建议整理成一张图，保存下来就能慢慢看。

#AI形象报告 #变美思路 #${type.name.replace("专题", "")} #普通女生变美`;
  }
  return `AI说我是「${persona.title}」路线，感觉有点准？

刚生成了一份 AI 个人形象报告，关键词是：${persona.keywords.join(" / ")}。

它给我的变美方向是：
1. 发型增加轻层次，不要太厚重
2. 发色更适合低饱和、自然过渡的棕调
3. 妆容重点放在清透底妆和温柔唇色
4. 穿搭多选奶油白、燕麦色、浅咖色

感觉不是大改造，而是把整体氛围变轻、变柔、变干净。

#AI形象报告 #变美思路 #个人风格定位 #发型推荐 #普通女生变美`;
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const expected = `#/${state.route}`;
    if (window.location.hash !== expected) window.history.replaceState(null, "", expected);
  }, [state.route]);

  useEffect(() => {
    const onHash = () => {
      const route = (window.location.hash.replace(/^#\/?/, "") || "home") as Route;
      const allowedRoutes: Route[] = ["home", "purchase", "success", "select", "upload", "preferences", "confirm", "progress", "result", "admin"];
      if (allowedRoutes.includes(route)) setState((s) => ({ ...s, route }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (text: string) => setToast({ id: Date.now(), text });
  const nav = (route: Route) => {
    window.location.hash = `/${route}`;
    setState((s) => ({ ...s, route }));
  };
  const products = [...state.admin.products].filter((p) => p.enabled).sort((a, b) => a.sort - b.sort);
  const reportType = REPORT_TYPES.find((item) => item.id === state.reportType) || REPORT_TYPES[0];

  function redeem(codeInput: string) {
    const code = codeInput.trim().toUpperCase();
    if (!code) return showToast("请输入兑换码");
    const coupon = state.admin.coupons.find((item) => item.code === code) || demoCoupon(code);
    if (!coupon) return showToast("兑换码无效，请检查后重新输入");
    if (coupon.status !== "unused") return showToast("兑换码已使用或不可用");
    if (new Date(coupon.expiresAt).getTime() < Date.now()) return showToast("兑换码已过期，请购买新券码");
    const product = state.admin.products.find((item) => item.id === coupon.productId);
    if (!product) return showToast("兑换码商品配置不存在");
    const updatedCoupons = state.admin.coupons.map((item) => item.code === code ? { ...item, status: "redeemed" as const, redeemedAt: now() } : item);
    setState((s) => ({
      ...s,
      product,
      rights: { ...product.rights },
      reports: [],
      route: "success",
      admin: { ...s.admin, coupons: updatedCoupons, auditLogs: audit(s.admin.auditLogs, "system", "coupon.redeem", `${code} 兑换 ${product.name}`) },
    }));
    showToast("兑换成功");
  }

  function demoCoupon(code: string): Coupon | undefined {
    const map: Record<string, ProductId> = { AISEA19: "single", AISEA49: "triple", AISEA99: "full" };
    return map[code] ? { code, productId: map[code], platform: "演示", status: "unused", createdAt: now(), expiresAt: addDays(new Date(), 30) } : undefined;
  }

  function chooseReport(id: ReportTypeId) {
    const type = REPORT_TYPES.find((item) => item.id === id)!;
    if (state.rights[type.rightKey] <= 0) {
      showToast(type.rightKey === "comprehensive" ? "综合报告仅全案探索卡可用" : "专题次数不足，请购买新券码");
      nav("purchase");
      return;
    }
    setState((s) => ({ ...s, reportType: id, route: "upload" }));
  }

  function startGenerate() {
    if (!state.privacyAccepted) return showToast("请先确认照片授权");
    if (state.rights[reportType.rightKey] <= 0) return showToast("当前权益不足，请购买新券码");
    setState((s) => ({ ...s, progress: 8, route: "progress" }));
  }

  useEffect(() => {
    if (state.route !== "progress") return;
    const steps = [18, 31, 48, 63, 78, 91, 100];
    let index = 0;
    const timer = window.setInterval(() => {
      setState((s) => {
        const next = steps[index] || 100;
        index += 1;
        if (next >= 100) {
          window.clearInterval(timer);
          const type = REPORT_TYPES.find((item) => item.id === s.reportType) || REPORT_TYPES[0];
          const personaId = pickPersona(s.preferences.style, s.preferences.scene);
          const prompt = buildPrompt(type, personaId, s.preferences);
          const rights = { ...s.rights };
          rights[type.rightKey] = Math.max(0, rights[type.rightKey] - 1);
          const report: UserReport = {
            id: `rpt_${Date.now()}`,
            type: type.id,
            name: type.name,
            createdAt: now(),
            persona: personaId,
            prompt,
          };
          window.setTimeout(() => setState((latest) => ({ ...latest, route: "result" })), 350);
          return { ...s, progress: 100, rights, reports: [report, ...s.reports] };
        }
        return { ...s, progress: next };
      });
    }, 26000);
    return () => window.clearInterval(timer);
  }, [state.route]);

  function updateAdmin(admin: AdminState) {
    setState((s) => ({ ...s, admin }));
  }

  const page = (() => {
    switch (state.route) {
      case "purchase": return <PurchasePage products={products} nav={nav} showToast={showToast} />;
      case "success": return <SuccessPage state={state} setState={setState} nav={nav} />;
      case "select": return <SelectPage rights={state.rights} chooseReport={chooseReport} nav={nav} />;
      case "upload": return <UploadPage state={state} setState={setState} nav={nav} showToast={showToast} />;
      case "preferences": return <PreferencesPage state={state} setState={setState} nav={nav} />;
      case "confirm": return <ConfirmPage state={state} setState={setState} type={reportType} nav={nav} startGenerate={startGenerate} />;
      case "progress": return <ProgressPage progress={state.progress} nav={nav} />;
      case "result": return <ResultPage state={state} nav={nav} showToast={showToast} />;
      case "admin": return <AdminPage state={state} setState={setState} updateAdmin={updateAdmin} showToast={showToast} />;
      default: return <HomePage products={products} state={state} nav={nav} redeem={redeem} showToast={showToast} />;
    }
  })();

  return (
    <>
      <Shell state={state} nav={nav}>{page}</Shell>
      {toast && <div className="toast show">{toast.text}</div>}
    </>
  );
}

function pickPersona(style: string, scene: string): PersonaId {
  if (style.includes("时尚") || scene.includes("聚会")) return "sweetCool";
  if (style.includes("清爽") || scene.includes("通勤")) return "coolAiry";
  if (scene.includes("拍照")) return "koreanSchool";
  return "softFrench";
}

function audit(logs: AuditLog[], actor: string, action: string, detail: string) {
  return [{ id: `log_${Date.now()}`, actor, action, detail, createdAt: now() }, ...logs].slice(0, 120);
}

function Shell({ state, nav, children }: { state: AppState; nav: (route: Route) => void; children: React.ReactNode }) {
  const showBrandBar = state.route === "home" || state.route === "admin";
  const homeBar = state.route === "home";
  return (
    <div className="app-shell">
      {showBrandBar && (
        <header className={`topbar ${homeBar ? "home-topbar" : ""}`}>
          <button className="brand reset" onClick={() => nav("home")} aria-label="返回首页">
            <img src={homeBar ? HOME_ASSETS.logo : ASSETS.logo} alt="AISea Logo" />
            <span><b>AISea</b><small>hair.aisea.space</small></span>
          </button>
          <nav className="nav-actions">
            {homeBar ? (
              null
            ) : (
              <>
                <button className="btn ghost" onClick={() => nav("purchase")}>套餐购买</button>
                <button className="btn ghost" onClick={() => nav("select")}>选择报告</button>
                <button className="btn primary small" onClick={() => nav("admin")}><ShieldCheck size={16} />后台</button>
              </>
            )}
          </nav>
        </header>
      )}
      {children}
    </div>
  );
}

function HomePage({ products, state, nav, redeem, showToast }: { products: Product[]; state: AppState; nav: (r: Route) => void; redeem: (c: string) => void; showToast: (t: string) => void }) {
  const [code, setCode] = useState("");
  const previewOrder: ReportTypeId[] = ["hair", "makeup", "outfit", "look", "comprehensive"];
  const previewTypes = previewOrder.map((id) => REPORT_TYPES.find((type) => type.id === id)!).filter(Boolean);
  const scrollToPackages = () => document.getElementById("packages")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToCoupon = () => {
    document.getElementById("coupon")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.querySelector<HTMLInputElement>(".home-redeem-input")?.focus(), 350);
  };
  return (
    <main className="page home-page report-page">
      <img className="home-bg-deco home-bg-star-1" src={HOME_ASSETS.sparkle} alt="" />
      <img className="home-bg-deco home-bg-heart-1" src={HOME_ASSETS.heart} alt="" />

      <section className="home-hero">
        <img className="home-hero-bg" src={HOME_ASSETS.heroBg} alt="" />
        <div className="home-hero-ring" />
        <img className="home-hero-person" src={HOME_ASSETS.heroPerson} alt="AISea 形象报告人物示例" />
        <div className="home-hero-copy">
          <div className="home-ai">AI</div>
          <h1>个人形象报告</h1>
          <img className="home-script-img" src={HOME_ASSETS.forYou} alt="for you" />
          <p><span>一张照片，生成你的专属形象报告</span></p>
        </div>
        <div className="home-hero-actions">
          <button className="home-cta primary" onClick={scrollToPackages}>
            <img src={HOME_ASSETS.shoppingBag} alt="" />
            <span>购买兑换码<small>低至 ￥1.9</small></span>
          </button>
          <button className="home-cta secondary" onClick={scrollToCoupon}>
            <img src={HOME_ASSETS.ticketOutline} alt="" />
            <span>我已有兑换码<small>去兑换报告</small></span>
          </button>
        </div>
      </section>

      <section className="home-panel preview-panel">
        <div className="home-section-head">
          <h2>热门报告预览</h2>
          <button onClick={() => nav("select")}>看看报告长什么样 <img src={HOME_ASSETS.arrowRight} alt="" /></button>
        </div>
        <div className="home-preview-list">
          {previewTypes.map((type) => (
            <HomeReportPreview
              key={type.id}
              type={type}
              locked={type.id === "comprehensive" && state.rights.comprehensive <= 0}
            />
          ))}
        </div>
      </section>

      <section className="home-panel package-section" id="packages">
        <div className="home-section-head">
          <h2>选择你的报告套餐</h2>
          <span>越多越划算</span>
        </div>
        <div className="home-package-list">
          {products.map((product) => <HomePackageCard key={product.id} product={product} showToast={showToast} />)}
        </div>
      </section>

      <section className="home-redeem-section" id="coupon">
        <div className="home-redeem-title">
          <img src={HOME_ASSETS.gift} alt="" />
          <strong>兑换报告券</strong>
        </div>
        <input className="home-redeem-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="请输入兑换码" maxLength={8} />
        <button className="home-redeem-btn" onClick={() => redeem(code)}>立即兑换</button>
      </section>

      <section className="home-panel step-section">
        <h2>3 步轻松获取你的专属报告</h2>
        <div className="home-step-list">
          {[
            [HOME_ASSETS.shoppingBag, "购买兑换码"],
            [HOME_ASSETS.ticketPink, "输入兑换码"],
            [HOME_ASSETS.profileUpload, "上传照片生成报告"],
          ].map(([icon, title], index) => (
            <React.Fragment key={title}>
              {index > 0 && <div className="home-step-arrow">→</div>}
              <div className="home-step-item">
                <div className="home-step-icon"><img src={icon} alt="" /></div>
                <div className="home-step-num">{index + 1}</div>
                <strong>{title}</strong>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      <footer className="home-share-footer">
        <div className="home-share-heart"><img src={HOME_ASSETS.heart} alt="" /></div>
        <div className="home-share-text">
          <strong>报告支持一键分享至 小红书 / 微信 / 朋友圈</strong>
          <p>记录变美过程，收获更多赞美与灵感</p>
        </div>
        <div className="home-share-icons">
          <img src={HOME_ASSETS.xiaohongshu} alt="小红书" />
          <img src={HOME_ASSETS.wechat} alt="微信" />
          <img src={HOME_ASSETS.moments} alt="朋友圈" />
        </div>
      </footer>
    </main>
  );
}

function Section({ title, caption, action, children }: { title: string; caption?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="section"><div className="section-head"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{action}</div>{children}</section>;
}

function ReportPreview({ type, locked }: { type: ReportType; locked?: boolean }) {
  return <article className="preview-card"><div className="preview-img"><VisualSlot label={type.name} tone={type.id} />{locked && <span className="lock"><Lock size={20} /></span>}</div><h3>{type.name}</h3><p>{type.subtitle}</p><div className="chip-row">{type.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div></article>;
}

function HomeReportPreview({ type, locked }: { type: ReportType; locked?: boolean }) {
  const iconMap: Record<ReportTypeId, string> = {
    comprehensive: HOME_ASSETS.reportCard,
    hair: HOME_ASSETS.heroPersonAlt,
    makeup: HOME_ASSETS.palette,
    outfit: HOME_ASSETS.hanger,
    look: HOME_ASSETS.heroPerson,
  };
  const captionMap: Record<ReportTypeId, string> = {
    comprehensive: "形象定位 · 风格建议",
    hair: "发型建议 · 发色推荐",
    makeup: "色彩分析 · 妆容建议",
    outfit: "风格定位 · 穿搭方案",
    look: "场景穿搭 · 妆发建议",
  };
  return (
    <article className={`home-preview-card ${type.id} ${locked ? "locked" : ""}`}>
      <h3>{type.name}</h3>
      <p>{type.subtitle}</p>
      <div className="home-preview-img">
        <img src={iconMap[type.id]} alt="" />
        {locked && <span><img src={HOME_ASSETS.lock} alt="" /></span>}
      </div>
      <div className="home-preview-desc">{captionMap[type.id]}</div>
    </article>
  );
}

function HomePackageCard({ product, showToast }: { product: Product; showToast: (t: string) => void }) {
  const full = product.id === "full";
  const icon = full ? HOME_ASSETS.ticketOrange : product.id === "triple" ? HOME_ASSETS.ticketPink : HOME_ASSETS.ticketOutline;
  const homeDescription: Record<ProductId, string> = {
    single: "专题报告 ×1",
    triple: "专题报告 ×3",
    full: "综合形象报告 ×1\n专题报告 ×3",
  };
  const handleBuy = () => product.purchaseLink ? window.open(product.purchaseLink, "_blank", "noopener") : showToast("商品链接待配置，请先在后台填写闲鱼链接");
  return (
    <article className={`home-package-card ${product.id === "triple" ? "recommend" : ""} ${full ? "full" : ""}`}>
      {product.badge && <div className={`home-package-badge ${full ? "orange" : ""}`}>{product.badge}</div>}
      <h3>{product.name}</h3>
      <div className={`home-package-price ${full ? "orange-text" : ""}`}>￥{product.price}{product.originalPrice && <del>￥{product.originalPrice}</del>}</div>
      <div className={`home-ticket-icon ${full ? "orange-ticket" : ""}`}>
        <img src={icon} alt="" />
        {product.id === "triple" && <b>×3</b>}
      </div>
      <p>{homeDescription[product.id]}</p>
      <button onClick={handleBuy}>去购买</button>
    </article>
  );
}

function ProductCard({ product, nav, showToast }: { product: Product; nav: (r: Route) => void; showToast: (t: string) => void }) {
  const full = product.id === "full";
  return <article className={`product-card ${product.badge ? "featured" : ""} ${full ? "gold" : ""}`}>{product.badge && <span className="badge">{product.badge}</span>}<h3>{product.name}</h3><div className="price">¥{product.price}<small>{product.originalPrice ? ` ¥${product.originalPrice}` : ""}</small></div><p>{product.description}</p><div className="ticket-line"><span>综合 ×{product.rights.comprehensive}</span><span>专题 ×{product.rights.topic}</span></div><ul>{product.bullets.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul><button className={`btn ${full ? "gold" : "primary"} full`} onClick={() => product.purchaseLink ? window.open(product.purchaseLink, "_blank", "noopener") : showToast("商品链接待配置，请先在后台填写闲鱼链接")}>去购买<ExternalLink size={16} /></button><button className="btn light full" onClick={() => nav("admin")}>后台配置商品</button></article>;
}

function PurchasePage({ products, nav, showToast }: { products: Product[]; nav: (r: Route) => void; showToast: (t: string) => void }) {
  return <main className="page"><PageTitle title="购买兑换码" text="购买后会获得兑换码，回到首页输入兑换码即可生成报告。当前闲鱼链接可在后台随时配置。" nav={nav} /><div className="product-list">{products.map((p) => <ProductCard key={p.id} product={p} nav={nav} showToast={showToast} />)}</div><FAQ /></main>;
}

function FAQ() {
  return <section className="section faq"><h2>常见问题</h2>{[["兑换码多久有效？", "兑换券自生成日起 30 天内有效，请尽快使用。"], ["可以基于同一张照片继续生成吗？", "可以。三次探索卡和全案探索卡可继续探索不同专题。"], ["报告可以分享吗？", "可以。结果页支持下载报告，并一键准备小红书封面图和文案。"]].map(([q, a]) => <details key={q} open><summary>{q}</summary><p>{a}</p></details>)}</section>;
}

function PageTitle({ title, text, nav }: { title: string; text: string; nav: (r: Route) => void }) {
  return <div className="page-title"><button className="round-back" onClick={() => nav("home")} aria-label="返回首页"><ArrowLeft /></button><div><h1>{title}</h1><p>{text}</p></div></div>;
}

function SuccessPage({ state, setState, nav }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; nav: (r: Route) => void }) {
  if (!state.product) return <Empty title="还没有兑换权益" text="请先购买或输入兑换码。" action="去兑换" onClick={() => nav("home")} />;
  const full = state.product.id === "full";
  return <main className="page"><PageTitle title={`已兑换：${state.product.name}`} text="开启你的专属形象探索之旅。" nav={nav} /><section className="success-hero"><BadgeCheck size={74} /><h2>{state.product.name}</h2><RightsPills rights={state.rights} /><p>{full ? "建议先生成综合形象报告，再继续探索专题。" : "下一步选择你最想看的专题报告。"}</p></section><div className="choice-grid"><button className="journey-card hot" disabled={!full} onClick={() => setState((s) => ({ ...s, reportType: "comprehensive", route: "upload" }))}><b>先生成综合形象报告</b><span>全面了解你的个人形象蓝图</span><ArrowLeft className="arrow" /></button><button className="journey-card" onClick={() => nav("select")}><b>先生成专题报告</b><span>自由探索你感兴趣的方向</span><ArrowLeft className="arrow" /></button></div></main>;
}

function RightsPills({ rights }: { rights: Rights }) {
  return <div className="rights-pills"><span><ReceiptText size={16} />综合报告剩余 <b>{rights.comprehensive}</b></span><span><KeyRound size={16} />专题报告剩余 <b>{rights.topic}</b></span></div>;
}

function SelectPage({ rights, chooseReport, nav }: { rights: Rights; chooseReport: (id: ReportTypeId) => void; nav: (r: Route) => void }) {
  return <main className="page"><PageTitle title="选择报告类型" text="根据当前权益选择本次要生成的报告。" nav={nav} /><RightsPills rights={rights} /><div className="report-grid">{REPORT_TYPES.map((type) => { const available = rights[type.rightKey] > 0; return <button className={`report-card ${type.id === "comprehensive" ? "wide" : ""} ${available ? "" : "disabled"}`} key={type.id} onClick={() => chooseReport(type.id)}><div><h3>{type.name}{type.id === "comprehensive" && <span>全案专享</span>}</h3><p>{type.subtitle}</p><ul>{type.modules.slice(0, 5).map((m) => <li key={m}><Check size={15} />{m}</li>)}</ul></div><VisualSlot label={type.name} tone={type.id} /></button>; })}</div></main>;
}

function UploadPage({ state, setState, nav, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; nav: (r: Route) => void; showToast: (t: string) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const type = REPORT_TYPES.find((item) => item.id === state.reportType)!;
  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return showToast("图片超过 10MB，请重新选择");
    const reader = new FileReader();
    reader.onload = () => setState((s) => ({ ...s, photoUrl: String(reader.result), photoName: file.name }));
    reader.readAsDataURL(file);
    showToast("照片可用，可继续生成");
  };
  return <main className="page"><PageTitle title="上传照片" text={`本次生成：${type.name}。支持 JPG / PNG / HEIC，最大 10MB。`} nav={nav} /><section className="upload-tips"><div><h2>拍照小贴士</h2><div className="do-dont"><Tip title="推荐这样拍" ok items={["正脸对镜头", "光线均匀明亮", "头发自然垂落", "背景干净简洁"]} /><Tip title="避免这样拍" items={["侧脸或低头", "光线昏暗 / 逆光", "刘海遮挡眉眼", "背景杂乱"]} /></div></div></section><section className="upload-box" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/heic" hidden onChange={(e) => handleFile(e.target.files?.[0])} /><CloudUpload size={52} /><h2>点击或拖拽上传照片</h2><p>照片越清晰，报告越稳定</p>{state.photoUrl && <img src={state.photoUrl} alt="已上传照片预览" />}</section><div className="bottom-actions"><button className="btn primary full" onClick={() => nav("preferences")}>下一步<Sparkles size={18} /></button><button className="btn light full" onClick={() => setState((s) => ({ ...s, photoUrl: ASSETS.heroAlt, photoName: "示例照片" }))}>使用示例照片</button></div></main>;
}

function Tip({ title, items, ok }: { title: string; items: string[]; ok?: boolean }) {
  return <div className={`tip ${ok ? "ok" : ""}`}><h3>{ok ? <Check /> : <Trash2 />}{title}</h3>{items.map((item) => <p key={item}>{item}</p>)}</div>;
}

function PreferencesPage({ state, setState, nav }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; nav: (r: Route) => void }) {
  return <main className="page"><PageTitle title="生成偏好" text="选择你更想要的方向，AI 会生成更贴合的报告。" nav={nav} />{(["style", "scene", "change"] as const).map((key, index) => <section className="pref-section" key={key}><h2><span>{index + 1}</span>{key === "style" ? "造型表达偏好" : key === "scene" ? "目标场景" : "改变幅度"}</h2><div className="option-grid">{preferenceOptions[key].map((value) => <button key={value} className={state.preferences[key] === value ? "selected" : ""} onClick={() => setState((s) => ({ ...s, preferences: { ...s.preferences, [key]: value } }))}><Sparkles size={18} />{value}<i /></button>)}</div></section>)}<div className="bottom-actions"><button className="btn primary full" onClick={() => nav("confirm")}>保存偏好</button><button className="btn light full" onClick={() => nav("upload")}>重新上传</button></div></main>;
}

function ConfirmPage({ state, setState, type, nav, startGenerate }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; type: ReportType; nav: (r: Route) => void; startGenerate: () => void }) {
  return <main className="page"><PageTitle title="确认生成" text="确认本次消耗权益和报告内容。预计耗时 2-5 分钟，生成失败不会消耗权益。" nav={nav} /><section className="confirm-card"><div className="confirm-photo"><img src={state.photoUrl} alt="上传照片" /><div><h2>已上传照片 <BadgeCheck /></h2><p>{state.photoName}</p><span>建议：自然光、妆容清淡、露出额头和耳朵</span></div></div><div className="consume"><PackagePlus /><b>本次将消耗：{type.rightKey === "comprehensive" ? "综合形象报告 ×1" : "专题报告 ×1"}</b></div><div className="report-detail"><h2>{type.name}</h2><p>{type.subtitle}</p><div className="chip-row">{type.modules.map((m) => <span key={m}>{m}</span>)}</div><div className="chip-row strong">{Object.values(state.preferences).map((m) => <span key={m}>{m}</span>)}</div><p className="time"><Clipboard size={16} />预计耗时 2-5 分钟，生成失败会自动重试 1 次并返还权益</p></div><label className="privacy"><input type="checkbox" checked={state.privacyAccepted} onChange={(e) => setState((s) => ({ ...s, privacyAccepted: e.target.checked }))} />我确认上传的是本人照片，知悉并同意用于生成专属形象分析报告。我们将严格保护您的隐私，仅用于报告生成，不会用于其他用途。</label></section><div className="bottom-actions"><button className="btn primary full glossy" onClick={startGenerate}>开始生成报告<Sparkles /></button><button className="btn light full" onClick={() => nav("preferences")}>返回修改</button></div></main>;
}

function ProgressPage({ progress, nav }: { progress: number; nav: (r: Route) => void }) {
  const steps = [["已提交", 8], ["照片质量检测中", 25], ["方案生成中", 60], ["报告排版中", 85], ["生成完成", 100]] as const;
  return <main className="page progress-page"><h1><span>报告</span>正在生成中</h1><p>预计需要 2-5 分钟，可切到其他页面，回来自动同步进度</p><div className="ring" style={{ "--p": `${progress}%` } as React.CSSProperties}><b>{progress}%</b><span>生成中...</span></div><section className="progress-list">{steps.map(([label, value], index) => <div key={label} className={progress >= value ? "done" : progress > steps[Math.max(0, index - 1)][1] ? "active" : ""}><i>{progress >= value ? <Check /> : index + 1}</i><div><b>{label}</b><p>{progress >= value ? "已完成" : "等待处理"}</p></div></div>)}</section><button className="btn primary" onClick={() => nav("home")}>稍后再看</button></main>;
}

function ResultPage({ state, nav, showToast }: { state: AppState; nav: (r: Route) => void; showToast: (t: string) => void }) {
  const report = state.reports[0];
  const [shareOpen, setShareOpen] = useState(false);
  if (!report) return <Empty title="还没有生成报告" text="请先选择报告类型并完成生成。" action="选择报告" onClick={() => nav("select")} />;
  const type = REPORT_TYPES.find((item) => item.id === report.type)!;
  const persona = PERSONAS[report.persona];
  return <main className="page result-page"><PageTitle title="查看结果" text="长按报告图可保存，支持下载和准备小红书分享。" nav={nav} /><div className="result-layout"><aside className="result-actions"><RightsPills rights={state.rights} /><button className="btn primary full" onClick={() => downloadNode("report-card", "aisea-report.html", showToast)}><Download />下载完整报告</button><button className="btn gold full" onClick={() => setShareOpen(true)}><Share2 />一键准备小红书分享</button><button className="btn light full" onClick={() => nav("select")}><Plus />继续生成专题报告</button><details><summary>查看生图指令</summary><pre>{report.prompt}</pre></details></aside><ReportCanvas id="report-card" type={type} persona={persona} photo={state.photoUrl} /></div>{shareOpen && <ShareSheet report={report} type={type} photo={state.photoUrl} close={() => setShareOpen(false)} showToast={showToast} />}</main>;
}

function ReportCanvas({ id, type, persona, photo }: { id: string; type: ReportType; persona: typeof PERSONAS.softFrench; photo: string }) {
  return <article className="report-canvas" id={id}><header><div><h2>{type.id === "comprehensive" ? persona.reportTitle : type.name}</h2><p>你的专属综合形象报告</p><div className="chip-row">{persona.keywords.map((k) => <span key={k}>{k}</span>)}</div></div><img src={photo} alt="报告人物" /></header><div className="report-modules">{["发型推荐", "发色推荐", "色彩分析", "妆容建议", "穿搭风格建议", "配饰推荐", "氛围雷区提醒", "一键抄作业清单"].map((title, idx) => <section key={title}><span>{idx + 1}</span><h3>{title}</h3>{idx === 1 ? <div className="hair-swatches"><i /><i /><i /><i /><i /></div> : idx === 2 ? <div className="palette">{persona.palette.map((c) => <i key={c} style={{ background: c }} />)}</div> : <VisualSlot label={title} tone={type.id} compact />}<p>{moduleText(title, persona.title)}</p></section>)}</div><footer>你的专属风格关键词：{persona.keywords.join(" ｜ ")}。好看又舒服，就是你的风格。</footer></article>;
}

function VisualSlot({ label, tone, compact = false }: { label: string; tone: string; compact?: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    comprehensive: <Sparkles />,
    hair: <WandSparkles />,
    makeup: <Palette />,
    outfit: <Heart />,
    look: <Camera />,
  };
  return <div className={`visual-slot tone-${tone} ${compact ? "compact" : ""}`}><span>{icons[tone] || <ImageDown />}</span><b>{label}</b><small>素材占位</small></div>;
}

function moduleText(title: string, persona: string) {
  const map: Record<string, string> = {
    发型推荐: "优先尝试轻层次、自然卷度和脸周修饰，让整体更轻盈。",
    发色推荐: "低饱和棕调更耐看，黑茶色、冷茶棕、摩卡棕都适合日常。",
    色彩分析: "柔和浅色和低饱和色更协调，高饱和色建议小面积点缀。",
    妆容建议: "清透底妆、自然眉、奶茶大地色眼妆和豆沙唇更提气色。",
    穿搭风格建议: `${persona}路线适合统一色系，材质轻盈，有一点精致细节。`,
    配饰推荐: "小巧耳饰、细链项链、浅色包更能增加完整度。",
    氛围雷区提醒: "谨慎尝试厚重刘海、高饱和大面积颜色和过多复杂配饰。",
    一键抄作业清单: "发尾做轻层次，上衣选浅色，妆容重点放在气色。",
  };
  return map[title];
}

function ShareSheet({ report, type, photo, close, showToast }: { report: UserReport; type: ReportType; photo: string; close: () => void; showToast: (t: string) => void }) {
  const persona = PERSONAS[report.persona];
  const copy = xhsCopy(type, report.persona);
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      showToast("文案已复制，打开小红书后可直接粘贴");
    } catch {
      showToast("当前浏览器不支持自动复制，请长按文案手动复制");
    }
  };
  return <div className="sheet-backdrop" onClick={close}><section className="share-sheet" onClick={(e) => e.stopPropagation()}><header><div><h2>分享到小红书</h2><p>已为你准备好封面图、完整报告图和种草文案</p></div><button onClick={close}>×</button></header><div className="share-grid"><XhsCover persona={persona} photo={photo} /><div className="share-steps"><StepButton n={1} icon={<ImageDown />} title="保存小红书封面图" text="建议作为笔记第 1 张图" onClick={() => showToast("移动端请长按封面图保存到相册")} /><StepButton n={2} icon={<Download />} title="保存完整报告图" text="建议作为笔记第 2 张图" onClick={() => showToast("移动端请长按完整报告图保存")} /><StepButton n={3} icon={<Clipboard />} title="复制小红书文案" text="打开小红书后直接粘贴" onClick={copyShare} /><StepButton n={4} icon={<ExternalLink />} title="打开小红书发布笔记" text="若未自动打开，请手动打开" onClick={() => { window.location.href = "xhsdiscover://"; setTimeout(() => showToast("如未自动打开，请手动打开小红书"), 800); }} /><textarea readOnly value={copy} /></div></div></section></div>;
}

function XhsCover({ persona, photo }: { persona: typeof PERSONAS.softFrench; photo: string }) {
  return <article className="xhs-cover"><span>AI 个人形象报告</span><h2>{persona.title}<br />养成报告</h2><div className="chip-row">{persona.keywords.map((k) => <i key={k}>{k}</i>)}</div><img src={photo} alt="小红书封面人物" /><p>{persona.summary}</p></article>;
}

function StepButton({ n, icon, title, text, onClick }: { n: number; icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button className="step-button" onClick={onClick}><b>{n}</b>{icon}<span><strong>{title}</strong><small>{text}</small></span></button>;
}

function downloadNode(_id: string, _filename: string, showToast: (t: string) => void) {
  showToast("移动端建议长按报告图保存；正式端会由后端返回 PNG/JPG 下载地址");
}

function Empty({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return <main className="page empty"><Sparkles size={48} /><h1>{title}</h1><p>{text}</p><button className="btn primary" onClick={onClick}>{action}</button></main>;
}

function AdminPage({ state, setState, updateAdmin, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; updateAdmin: (a: AdminState) => void; showToast: (t: string) => void }) {
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"products" | "coupons" | "users" | "audit">("products");
  if (!state.adminAuthed) {
    return <main className="admin-login"><section><ShieldCheck size={52} /><h1>AISea 后台</h1><p>初始本地密码：{ADMIN_PASSWORD}</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="管理员密码" /><button className="btn primary full" onClick={() => { if (password === ADMIN_PASSWORD) { setState((s) => ({ ...s, adminAuthed: true, admin: { ...s.admin, auditLogs: audit(s.admin.auditLogs, "AISea Owner", "admin.login", "后台登录成功") } })); } else showToast("密码错误"); }}>登录后台</button></section></main>;
  }
  return <main className="admin-page"><header><div><h1>AISea 管理后台</h1><p>多管理员、权限分级、商品配置、批量兑换码和审计日志。</p></div><button className="btn light" onClick={() => setState((s) => ({ ...s, adminAuthed: false }))}><LogOut />退出</button></header><div className="admin-tabs">{(["products", "coupons", "users", "audit"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ products: "商品配置", coupons: "兑换码", users: "管理员", audit: "审计日志" } as const)[item]}</button>)}</div>{tab === "products" && <ProductsAdmin admin={state.admin} updateAdmin={updateAdmin} />}{tab === "coupons" && <CouponsAdmin admin={state.admin} updateAdmin={updateAdmin} showToast={showToast} />}{tab === "users" && <UsersAdmin admin={state.admin} updateAdmin={updateAdmin} />}{tab === "audit" && <AuditAdmin logs={state.admin.auditLogs} />}</main>;
}

function ProductsAdmin({ admin, updateAdmin }: { admin: AdminState; updateAdmin: (a: AdminState) => void }) {
  const change = (id: ProductId, patch: Partial<Product>) => updateAdmin({ ...admin, products: admin.products.map((p) => p.id === id ? { ...p, ...patch } : p), auditLogs: audit(admin.auditLogs, "AISea Owner", "product.update", `更新商品 ${id}`) });
  return <section className="admin-panel">{admin.products.map((p) => <div className="admin-row" key={p.id}><input value={p.name} onChange={(e) => change(p.id, { name: e.target.value })} /><input type="number" value={p.price} onChange={(e) => change(p.id, { price: Number(e.target.value) })} /><input value={p.purchaseLink} onChange={(e) => change(p.id, { purchaseLink: e.target.value })} placeholder="闲鱼跳转链接" /><label><input type="checkbox" checked={p.enabled} onChange={(e) => change(p.id, { enabled: e.target.checked })} />上架</label></div>)}</section>;
}

function CouponsAdmin({ admin, updateAdmin, showToast }: { admin: AdminState; updateAdmin: (a: AdminState) => void; showToast: (t: string) => void }) {
  const [productId, setProductId] = useState<ProductId>("single");
  const [platform, setPlatform] = useState("闲鱼");
  const [count, setCount] = useState(10);
  const generate = () => {
    const existing = new Set(admin.coupons.map((c) => c.code));
    const coupons: Coupon[] = Array.from({ length: Math.max(1, Math.min(count, 500)) }, () => {
      const code = code8(existing);
      existing.add(code);
      return { code, productId, platform, status: "unused", createdAt: now(), expiresAt: addDays(new Date(), 30) };
    });
    updateAdmin({ ...admin, coupons: [...coupons, ...admin.coupons], auditLogs: audit(admin.auditLogs, "AISea Owner", "coupon.batch_create", `${platform} 批量生成 ${coupons.length} 个兑换码`) });
    showToast(`已生成 ${coupons.length} 个兑换码`);
  };
  const exportCsv = () => {
    const rows = ["code,product_id,platform,status,expires_at,created_at", ...admin.coupons.map((c) => [c.code, c.productId, c.platform, c.status, c.expiresAt, c.createdAt].join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aisea-coupons.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return <section className="admin-panel"><div className="admin-tools"><select value={productId} onChange={(e) => setProductId(e.target.value as ProductId)}>{admin.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="平台，如闲鱼" /><input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} /><button className="btn primary" onClick={generate}><PackagePlus />批量生成</button><button className="btn light" onClick={exportCsv}><Download />导出 CSV</button></div><div className="table">{admin.coupons.slice(0, 100).map((c) => <div key={c.code}><b>{c.code}</b><span>{c.productId}</span><span>{c.platform}</span><span>{c.status}</span><span>{new Date(c.expiresAt).toLocaleDateString("zh-CN")}</span></div>)}</div></section>;
}

function UsersAdmin({ admin, updateAdmin }: { admin: AdminState; updateAdmin: (a: AdminState) => void }) {
  const addUser = () => {
    const user: AdminUser = { id: `adm_${Date.now()}`, name: `管理员 ${admin.users.length + 1}`, role: "operator", enabled: true, createdAt: now() };
    updateAdmin({ ...admin, users: [...admin.users, user], auditLogs: audit(admin.auditLogs, "AISea Owner", "admin.create", `创建 ${user.name}`) });
  };
  const patch = (id: string, patchUser: Partial<AdminUser>) => updateAdmin({ ...admin, users: admin.users.map((u) => u.id === id ? { ...u, ...patchUser } : u), auditLogs: audit(admin.auditLogs, "AISea Owner", "admin.update", `更新管理员 ${id}`) });
  return <section className="admin-panel"><button className="btn primary" onClick={addUser}><Plus />新增管理员</button>{admin.users.map((u) => <div className="admin-row" key={u.id}><input value={u.name} onChange={(e) => patch(u.id, { name: e.target.value })} /><select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value as AdminUser["role"] })}><option value="owner">owner</option><option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option></select><label><input type="checkbox" checked={u.enabled} onChange={(e) => patch(u.id, { enabled: e.target.checked })} />启用</label></div>)}</section>;
}

function AuditAdmin({ logs }: { logs: AuditLog[] }) {
  return <section className="admin-panel"><div className="table">{logs.map((log) => <div key={log.id}><b>{log.action}</b><span>{log.actor}</span><span>{log.detail}</span><span>{new Date(log.createdAt).toLocaleString("zh-CN")}</span></div>)}</div></section>;
}

createRoot(document.getElementById("root")!).render(<App />);
