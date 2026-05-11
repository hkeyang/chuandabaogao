import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
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
import { ASSETS, DEFAULT_ADMIN, DEFAULT_PRODUCTS, PAYWALL_PACKAGES, PERSONAS, REPORT_TYPES, PREFERENCE_ASSETS, preferenceSections } from "./data";
import type { AdminState, AdminUser, AuditLog, Coupon, PayChannel, PaywallPackage, PersonaId, PreferenceState, Product, ProductId, ReportType, ReportTypeId, Rights, UserReport } from "./types";

type Route = "home" | "purchase" | "success" | "select" | "upload" | "preferences" | "preanalysis" | "confirm" | "progress" | "result" | "admin";
type Toast = { id: number; text: string };
type PaywallState = { open: boolean; reason?: string };
type PayingState = { packageId: string; channel: PayChannel } | null;
const ALLOWED_ROUTES: Route[] = ["home", "purchase", "success", "select", "upload", "preferences", "preanalysis", "confirm", "progress", "result", "admin"];
type PreAnalysis = {
  id: string;
  reportType: ReportTypeId;
  title: string;
  summary: string;
  keywords: string[];
  photoFit: "good" | "warning" | "poor";
  photoAdvice: string;
  recommendedProductId: ProductId;
  sections: Array<{ title: string; text: string }>;
};

const PAYMENT_ERROR_MAP: Record<string, string> = {
  product_not_found: "当前套餐暂不可购买，请稍后重试",
  PRODUCT_NOT_FOUND: "当前套餐暂不可购买，请稍后重试",
  product_config_missing: "当前套餐暂不可购买，请稍后重试",
  PRODUCT_CONFIG_MISSING: "当前套餐暂不可购买，请稍后重试",
  PRODUCT_PACKAGE_MISMATCH: "当前套餐暂不可购买，请稍后重试",
  payment_channel_unavailable: "当前支付方式暂不可用，请选择其他支付方式",
  PAYMENT_CHANNEL_UNAVAILABLE: "当前支付方式暂不可用，请选择其他支付方式",
  stripe_payments_not_enabled: "支付暂未开放，请稍后再试",
  order_create_failed: "订单创建失败，请稍后重试",
  PAY_URL_EMPTY: "支付链接获取失败，请稍后再试",
  PAY_URL_MISSING: "支付链接获取失败，请稍后再试",
};

function getPaymentErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const mapped = PAYMENT_ERROR_MAP[error.message.trim()];
    if (mapped) return mapped;
    if (error.message && !/[A-Z_]{4,}/.test(error.message)) return error.message;
  }
  if (typeof error === "string") {
    return PAYMENT_ERROR_MAP[error] || error;
  }
  return "支付暂时不可用，请稍后再试";
}

function isPaying(paying: PayingState, packageId: string, channel: PayChannel) {
  return paying?.packageId === packageId && paying?.channel === channel;
}

function routeFromHash(hash = window.location.hash): Route {
  const raw = (hash.replace(/^#\/?/, "") || "home").split(/[?&]/)[0] as Route;
  return ALLOWED_ROUTES.includes(raw) ? raw : "home";
}

function hashSearchParams(hash = window.location.hash) {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

const PRIVACY_TEXT = "我知悉并同意本人照片用于生成形象分析报告。我们将严格保护您的隐私，不会用于其他用途。";

function SafeAssetImage({ onError, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      onError={(event) => {
        event.currentTarget.dataset.assetError = "true";
        event.currentTarget.setAttribute("aria-hidden", "true");
        onError?.(event);
      }}
    />
  );
}

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

const FULL_CARD_ASSETS = {
  heroBg: new URL("../assets/aisea_icon_02-全案探索卡/hero_bg_confetti.png", import.meta.url).href,
  medal: new URL("../assets/aisea_icon_02-全案探索卡/badge_check_medal.png", import.meta.url).href,
  benefitBg: new URL("../assets/aisea_icon_02-全案探索卡/benefit_summary_card_bg.png", import.meta.url).href,
  comprehensiveCard: new URL("../assets/aisea_icon_02-全案探索卡/card_comprehensive_report_bg.png", import.meta.url).href,
  topicCard: new URL("../assets/aisea_icon_02-全案探索卡/card_topic_report_bg.png", import.meta.url).href,
  arrowPink: new URL("../assets/aisea_icon_02-全案探索卡/btn_arrow_pink.png", import.meta.url).href,
  arrowOrange: new URL("../assets/aisea_icon_02-全案探索卡/btn_arrow_orange.png", import.meta.url).href,
  sparkleDivider: new URL("../assets/aisea_icon_02-全案探索卡/section_title_sparkle_divider.png", import.meta.url).href,
  reportComprehensive: new URL("../assets/aisea_icon_02-全案探索卡/icon_report_comprehensive.png", import.meta.url).href,
  reportTopic: new URL("../assets/aisea_icon_02-全案探索卡/icon_report_topic.png", import.meta.url).href,
  hairAnalysis: new URL("../assets/aisea_icon_02-全案探索卡/icon_hair_analysis.png", import.meta.url).href,
  hairColor: new URL("../assets/aisea_icon_02-全案探索卡/icon_hair_color.png", import.meta.url).href,
  colorDiagnosis: new URL("../assets/aisea_icon_02-全案探索卡/icon_color_diagnosis.png", import.meta.url).href,
  makeup: new URL("../assets/aisea_icon_02-全案探索卡/icon_makeup.png", import.meta.url).href,
  outfit: new URL("../assets/aisea_icon_02-全案探索卡/icon_outfit.png", import.meta.url).href,
  accessory: new URL("../assets/aisea_icon_02-全案探索卡/icon_accessory_bag.png", import.meta.url).href,
  scene: new URL("../assets/aisea_icon_02-全案探索卡/icon_scene_camera.png", import.meta.url).href,
  clock: new URL("../assets/aisea_icon_02-全案探索卡/icon_clock_validity.png", import.meta.url).href,
  gift: new URL("../assets/aisea_icon_02-全案探索卡/bottom_success_gift.png", import.meta.url).href,
  giftIcon: new URL("../assets/aisea_icon_02-全案探索卡/icon_gift_success.png", import.meta.url).href,
  heartTip: new URL("../assets/aisea_icon_02-全案探索卡/icon_heart_tip.png", import.meta.url).href,
};

const CHOOSE_REPORT_ASSETS = {
  badge: new URL("../assets/aisea_icon_03-choose report/03_全案专享徽章.png", import.meta.url).href,
  comprehensivePreview: new URL("../assets/aisea_icon_03-choose report/01_综合形象报告_无棋盘格.png", import.meta.url).href,
  hair: new URL("../assets/aisea_icon_03-choose report/02_发型发色专题_无棋盘格.png", import.meta.url).href,
  makeup: new URL("../assets/aisea_icon_03-choose report/03_色彩妆容专题_无棋盘格.png", import.meta.url).href,
  outfit: new URL("../assets/aisea_icon_03-choose report/04_穿搭配饰专题_无棋盘格.png", import.meta.url).href,
  look: new URL("../assets/aisea_icon_03-choose report/05_场景Look专题_无棋盘格.png", import.meta.url).href,
};

const PHOTO_UPLOAD_ASSETS = {
  reportBadge: new URL("../assets/aisea_icon_04-photo_upload/report_clipboard_badge.png", import.meta.url).href,
  recommendedPortrait: new URL("../assets/aisea_icon_04-photo_upload/portrait_recommended_front_clean.png", import.meta.url).href,
  avoidPortrait: new URL("../assets/aisea_icon_04-photo_upload/portrait_avoid_side_messy.png", import.meta.url).href,
  uploadPlaceholder: new URL("../assets/aisea_icon_04-photo_upload/image_placeholder_pink.png", import.meta.url).href,
  uploadCloud: new URL("../assets/aisea_icon_04-photo_upload/upload_cloud_arrow.png", import.meta.url).href,
  sparklePair: new URL("../assets/aisea_icon_04-photo_upload/sparkles_pair.png", import.meta.url).href,
  sparkleLarge: new URL("../assets/aisea_icon_04-photo_upload/sparkle_large.png", import.meta.url).href,
  tinyStars: new URL("../assets/aisea_icon_04-photo_upload/tiny_stars_group.png", import.meta.url).href,
  checkGreen: new URL("../assets/aisea_icon_04-photo_upload/check_circle_green.png", import.meta.url).href,
  checkPink: new URL("../assets/aisea_icon_04-photo_upload/check_circle_pink.png", import.meta.url).href,
  crossGray: new URL("../assets/aisea_icon_04-photo_upload/cross_circle_gray.png", import.meta.url).href,
  singleFace: new URL("../assets/aisea_icon_04-photo_upload/icon_single_front_face.png", import.meta.url).href,
  clearLight: new URL("../assets/aisea_icon_04-photo_upload/icon_clear_light.png", import.meta.url).href,
  hairVisible: new URL("../assets/aisea_icon_04-photo_upload/icon_no_face_hair_occlusion.png", import.meta.url).href,
  noBeauty: new URL("../assets/aisea_icon_04-photo_upload/icon_magic_wand_beauty.png", import.meta.url).href,
  heartSingle: new URL("../assets/aisea_icon_04-photo_upload/heart_single.png", import.meta.url).href,
  heartsDouble: new URL("../assets/aisea_icon_04-photo_upload/hearts_double.png", import.meta.url).href,
};

const CONFIRM_GENERATE_ASSETS = {
  back: new URL("../assets/aisea_icon_06-figure2/02_back_arrow_circle.png", import.meta.url).href,
  check: new URL("../assets/aisea_icon_06-figure2/01_check_badge.png", import.meta.url).href,
  tip: new URL("../assets/aisea_icon_06-figure2/03_lightbulb_tip.png", import.meta.url).href,
  token: new URL("../assets/aisea_icon_06-figure2/04_hex_star_token.png", import.meta.url).href,
  report: new URL("../assets/aisea_icon_06-figure2/05_illustration_clipboard_star.png", import.meta.url).href,
  folderHeart: new URL("../assets/aisea_icon_06-figure2/06_illustration_folder_heart.png", import.meta.url).href,
  uploadedPhoto: new URL("../assets/aisea_icon_06-figure2/21_uploaded_photo_thumbnail_crop.png", import.meta.url).href,
  hair: new URL("../assets/aisea_icon_06-figure2/07_icon_hair.png", import.meta.url).href,
  hairColor: new URL("../assets/aisea_icon_06-figure2/08_icon_hair_color_drop.png", import.meta.url).href,
  palette: new URL("../assets/aisea_icon_06-figure2/09_icon_palette_color.png", import.meta.url).href,
  makeup: new URL("../assets/aisea_icon_06-figure2/10_icon_makeup_lipstick.png", import.meta.url).href,
  outfit: new URL("../assets/aisea_icon_06-figure2/11_icon_outfit_shirt.png", import.meta.url).href,
  accessory: new URL("../assets/aisea_icon_06-figure2/12_icon_accessory_bag.png", import.meta.url).href,
  scene: new URL("../assets/aisea_icon_06-figure2/13_icon_scene_image.png", import.meta.url).href,
  heart: new URL("../assets/aisea_icon_06-figure2/15_icon_heart_preference.png", import.meta.url).href,
  camera: new URL("../assets/aisea_icon_06-figure2/14_icon_camera_lens.png", import.meta.url).href,
  sparkle: new URL("../assets/aisea_icon_06-figure2/16_icon_sparkle_change.png", import.meta.url).href,
  clock: new URL("../assets/aisea_icon_06-figure2/17_icon_clock.png", import.meta.url).href,
  decoLarge: new URL("../assets/aisea_icon_06-figure2/19_deco_sparkle_large.png", import.meta.url).href,
  decoSmall: new URL("../assets/aisea_icon_06-figure2/20_deco_sparkle_small.png", import.meta.url).href,
};

const REPORT_PROGRESS_ASSETS = {
  background: new URL("../assets/aisea_icon_07-report_progress/00_background_pink_soft_clouds.png", import.meta.url).href,
  sparklePink: new URL("../assets/aisea_icon_07-report_progress/01_sparkle_pink_large.png", import.meta.url).href,
  sparkleWhite: new URL("../assets/aisea_icon_07-report_progress/02_sparkle_white_medium.png", import.meta.url).href,
  sparkleGray: new URL("../assets/aisea_icon_07-report_progress/03_sparkle_gray_small.png", import.meta.url).href,
  heart: new URL("../assets/aisea_icon_07-report_progress/04_3d_heart_left.png", import.meta.url).href,
  wand: new URL("../assets/aisea_icon_07-report_progress/05_magic_wand.png", import.meta.url).href,
  cloud: new URL("../assets/aisea_icon_07-report_progress/06_cloud_mascot_with_wand.png", import.meta.url).href,
  stepDone: new URL("../assets/aisea_icon_07-report_progress/08_step_check_active.png", import.meta.url).href,
  stepThree: new URL("../assets/aisea_icon_07-report_progress/09_step_number_3_active.png", import.meta.url).href,
  stepFour: new URL("../assets/aisea_icon_07-report_progress/10_step_number_4_gray.png", import.meta.url).href,
  stepFive: new URL("../assets/aisea_icon_07-report_progress/11_step_number_5_gray.png", import.meta.url).href,
  loading: new URL("../assets/aisea_icon_07-report_progress/12_loading_dots_pink.png", import.meta.url).href,
  dashedDivider: new URL("../assets/aisea_icon_07-report_progress/13_dashed_divider.png", import.meta.url).href,
  timelineLine: new URL("../assets/aisea_icon_07-report_progress/14_timeline_vertical_line.png", import.meta.url).href,
  activeCard: new URL("../assets/aisea_icon_07-report_progress/15_active_step_highlight_card.png", import.meta.url).href,
  sparkleCluster: new URL("../assets/aisea_icon_07-report_progress/16_sparkle_cluster.png", import.meta.url).href,
  bottomCloudLeft: new URL("../assets/aisea_icon_07-report_progress/17_bottom_cloud_left.png", import.meta.url).href,
  bottomCloudRight: new URL("../assets/aisea_icon_07-report_progress/18_bottom_cloud_right.png", import.meta.url).href,
  lightDot: new URL("../assets/aisea_icon_07-report_progress/19_soft_white_light_dot.png", import.meta.url).href,
};

const BEAUTY_REPORT_ASSETS = {
  heroPerson: new URL("../assets/aisea_icon_09_beauty_report/01_主视觉人物.png", import.meta.url).href,
  hairstyles: new URL("../assets/aisea_icon_09_beauty_report/02_发型推荐_五连图.png", import.meta.url).href,
  hairColors: new URL("../assets/aisea_icon_09_beauty_report/03_发色推荐_色卡.png", import.meta.url).href,
  colorBoard: new URL("../assets/aisea_icon_09_beauty_report/04_色彩分析_色板.png", import.meta.url).href,
  makeup: new URL("../assets/aisea_icon_09_beauty_report/05_妆容建议_拼图.png", import.meta.url).href,
  outfitCampus: new URL("../assets/aisea_icon_09_beauty_report/06_穿搭建议_校园清新.png", import.meta.url).href,
  outfitDaily: new URL("../assets/aisea_icon_09_beauty_report/07_穿搭建议_日常韩系.png", import.meta.url).href,
  outfitPhoto: new URL("../assets/aisea_icon_09_beauty_report/08_穿搭建议_拍照氛围.png", import.meta.url).href,
  accessories: new URL("../assets/aisea_icon_09_beauty_report/09_配饰推荐_四宫格.png", import.meta.url).href,
  avoid: new URL("../assets/aisea_icon_09_beauty_report/10_氛围避雷区_五连图.png", import.meta.url).href,
};

const BEAUTY_REPORT = {
  title: "干净质感\n形象报告",
  subtitle: "你的专属综合形象报告",
  script: "Clean & Sharp",
  tags: ["干净", "利落", "上镜", "亲和力"],
  quote: "清爽自然的氛围感，会让整体形象更耐看。",
  keywords: [
    ["干净协调的五官", "适合低饱和、轻负担路线"],
    ["明亮清澈的气质", "保留自然感，增加上镜度"],
    ["自然舒展的氛围", "发型和穿搭都要轻盈"],
    ["亲和自然的笑容", "用协调色系放大优势"],
  ],
  hairstyles: [
    ["自然碎发", "修饰额前"],
    ["纹理短发", "清爽利落"],
    ["层次中发", "轻盈自然"],
    ["微卷纹理", "增加氛围"],
    ["侧分轮廓", "更显精神"],
  ],
  hairColors: ["黑茶色", "冷棕色", "奶茶棕", "亚麻棕", "焦糖棕", "蜜茶色"],
  makeup: [
    ["肤色", "干净均匀\n自然通透"],
    ["眉形", "清晰自然\n轮廓利落"],
    ["眼周", "减弱疲惫\n提升精神"],
    ["面中", "气色自然\n不过度修饰"],
    ["唇部", "健康清爽\n保持干净"],
  ],
  outfits: [
    ["日常清爽感", BEAUTY_REPORT_ASSETS.outfitCampus, "清爽干净，轻松耐看"],
    ["通勤简约感", BEAUTY_REPORT_ASSETS.outfitDaily, "简约利落，舒适有质感"],
    ["拍照氛围感", BEAUTY_REPORT_ASSETS.outfitPhoto, "层次感强，氛围出片"],
  ],
  accessories: [
    ["眼镜", "修饰轮廓"],
    ["包袋", "简约百搭"],
    ["腕表", "质感加分"],
    ["眼镜", "文艺减龄"],
  ],
  avoidItems: [
    ["修饰过重", "容易显厚重"],
    ["高饱和色", "易显土气"],
    ["配饰繁杂", "显凌乱"],
    ["发型扁塌油腻", "缺乏氛围"],
    ["风格杂乱", "缺乏统一"],
  ],
  checklist: [
    ["发型换一换", "试试自然层次+清爽轮廓"],
    ["面部清爽化", "肤色干净+眉形利落"],
    ["穿搭照着搭", "低饱和色+简约单品"],
  ],
} as const;

type ProgressStepStatus = "done" | "active" | "pending";

const REPORT_PROGRESS_STEPS = [
  { id: 1, title: "已提交", desc: "照片已成功提交", doneAt: 8, activeAt: 0 },
  { id: 2, title: "照片质量检测中", desc: "正在检测照片清晰度与合规性", doneAt: 35, activeAt: 16 },
  { id: 3, title: "方案生成中", desc: "AI 正在分析你的形象与风格", doneAt: 70, activeAt: 36 },
  { id: 4, title: "报告排版中", desc: "正在精心排版你的专属报告", doneAt: 94, activeAt: 71 },
  { id: 5, title: "生成完成", desc: "报告生成完成，准备展示", doneAt: 100, activeAt: 100 },
] as const;

const CONFIRM_MODULES = [
  { key: "hair", label: "发型", icon: CONFIRM_GENERATE_ASSETS.hair },
  { key: "hairColor", label: "发色", icon: CONFIRM_GENERATE_ASSETS.hairColor },
  { key: "palette", label: "色彩", icon: CONFIRM_GENERATE_ASSETS.palette },
  { key: "makeup", label: "面部", icon: CONFIRM_GENERATE_ASSETS.makeup },
  { key: "outfit", label: "穿搭", icon: CONFIRM_GENERATE_ASSETS.outfit },
  { key: "accessory", label: "配饰", icon: CONFIRM_GENERATE_ASSETS.accessory },
  { key: "scene", label: "场景建议", icon: CONFIRM_GENERATE_ASSETS.scene },
];

const CONFIRM_PREFERENCES = [
  { key: "gentle", label: "温柔精致", icon: CONFIRM_GENERATE_ASSETS.heart },
  { key: "camera", label: "拍照上镜", icon: CONFIRM_GENERATE_ASSETS.camera },
  { key: "sparkle", label: "明显变化", icon: CONFIRM_GENERATE_ASSETS.sparkle },
];

type UploadStatus = "idle" | "dragging" | "uploading" | "success" | "error";
type PhotoCheckResult = "available" | "warning" | "failed";

interface AppState {
  route: Route;
  clientId: string;
  product?: Product;
  rights: Rights;
  reportType: ReportTypeId;
  photoUrl: string;
  photoName: string;
  photoDataUrl?: string;
  preferences: PreferenceState;
  privacyAccepted: boolean;
  progress: number;
  reports: UserReport[];
  admin: AdminState;
  adminAuthed: boolean;
  adminRole: AdminUser["role"];
  uploadStatus: UploadStatus;
  photoCheckResult?: PhotoCheckResult;
  uploadErrorMessage?: string;
  isGenerating: boolean;
  generationError?: string;
  preAnalysis?: PreAnalysis;
  isPreAnalyzing: boolean;
  preAnalysisError?: string;
}

const LS_KEY = "aisea-react-state-v1";
const CLIENT_ID_KEY = "aisea-client-id-v1";
const ADMIN_PASSWORD = "AISea@2026";
const couponAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEMO_COUPON_PRODUCTS: Record<string, ProductId> = {
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
const DEFAULT_PREFERENCES: PreferenceState = {
  stylePreferences: ["auto"],
  targetScenes: ["daily"],
  changeIntensity: "light",
};

function normalizePreferences(value: unknown): PreferenceState {
  const raw = (value && typeof value === "object") ? value as Partial<Record<string, unknown>> : {};
  const legacy = raw as { style?: unknown; scene?: unknown; change?: unknown };
  const stylePreferencesRaw = Array.isArray(raw.stylePreferences)
    ? raw.stylePreferences.filter((item): item is string => typeof item === "string")
    : typeof legacy.style === "string"
      ? [legacy.style]
      : DEFAULT_PREFERENCES.stylePreferences;
  const targetScenesRaw = Array.isArray(raw.targetScenes)
    ? raw.targetScenes.filter((item): item is string => typeof item === "string")
    : typeof legacy.scene === "string"
      ? [legacy.scene]
      : DEFAULT_PREFERENCES.targetScenes;
  const stylePreferences = stylePreferencesRaw.length ? [stylePreferencesRaw[0]] : [...DEFAULT_PREFERENCES.stylePreferences];
  const targetScenes = targetScenesRaw.length ? [targetScenesRaw[0]] : [...DEFAULT_PREFERENCES.targetScenes];
  const changeIntensity = typeof raw.changeIntensity === "string"
    ? raw.changeIntensity
    : typeof legacy.change === "string"
      ? legacy.change
      : DEFAULT_PREFERENCES.changeIntensity;
  return {
    stylePreferences,
    targetScenes,
    changeIntensity,
  };
}

function preferenceLabel(sectionId: string, optionId: string) {
  const section = preferenceSections.find((item) => item.id === sectionId);
  return section?.options.find((item) => item.id === optionId)?.label || optionId;
}

function getClientId() {
  const saved = localStorage.getItem(CLIENT_ID_KEY);
  if (saved) return saved;
  const id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

function loadState(): AppState {
  const params = new URLSearchParams(window.location.search);
  const fallback: AppState = {
    route: routeFromHash(),
    clientId: getClientId(),
    rights: { topic: 0, comprehensive: 0 },
    reportType: "comprehensive",
    photoUrl: ASSETS.heroAlt,
    photoName: "示例照片",
    photoDataUrl: undefined,
    preferences: DEFAULT_PREFERENCES,
    privacyAccepted: false,
    progress: 0,
    reports: [],
    admin: DEFAULT_ADMIN,
    adminAuthed: false,
    adminRole: "owner",
    uploadStatus: "idle",
    photoCheckResult: undefined,
    uploadErrorMessage: undefined,
    isGenerating: false,
    generationError: undefined,
    preAnalysis: undefined,
    isPreAnalyzing: false,
    preAnalysisError: undefined,
  };
  if (params.get("demo") === "full") {
    const product = DEFAULT_PRODUCTS.find((item) => item.id === "full");
    return {
      ...fallback,
      product,
      rights: { topic: 3, comprehensive: 1 },
      reportType: "comprehensive",
      privacyAccepted: false,
      progress: 62,
      isGenerating: true,
      photoUrl: CONFIRM_GENERATE_ASSETS.uploadedPhoto,
      photoName: "示例上传照片",
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
    return saved ? {
      ...fallback,
      ...saved,
      route: fallback.route,
      admin: { ...DEFAULT_ADMIN, ...saved.admin },
      preferences: normalizePreferences(saved.preferences),
      uploadStatus: saved.uploadStatus || fallback.uploadStatus,
      photoCheckResult: saved.photoCheckResult,
      uploadErrorMessage: saved.uploadErrorMessage,
      isGenerating: fallback.route === "progress" ? Boolean(saved.isGenerating) : false,
      generationError: typeof saved.generationError === "string" ? saved.generationError : undefined,
      photoDataUrl: typeof saved.photoDataUrl === "string" ? saved.photoDataUrl : undefined,
      clientId: typeof saved.clientId === "string" ? saved.clientId : fallback.clientId,
      preAnalysis: saved.preAnalysis,
      isPreAnalyzing: Boolean(saved.isPreAnalyzing),
      preAnalysisError: typeof saved.preAnalysisError === "string" ? saved.preAnalysisError : undefined,
    } : fallback;
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
  const moduleLines = type.id === "comprehensive"
    ? [
        "1. 风格定位：先给出一句清晰、可分享的形象结论。",
        "2. 发型发色：给真实发型缩略图、长度、层次、打理方式和自然发色质感；同一模块内的人物必须保持同一肤色、同一光感和干净正脸，不能越画越黑。",
        "3. 个人色彩：推荐色盘、谨慎色盘和适合上身的颜色名称。",
        "4. 面部优化：男性写眉形修整、皮肤清爽度、胡须/鬓角、眼镜框型；女性写底妆、眉形、眼妆、腮红、唇色。",
        "5. 穿搭配饰：男性写上衣、外套、裤装、鞋、包、腕表、眼镜、帽子；女性写服装、鞋包、首饰、发饰和 3 套 OOTD。",
        "6. 场景 Look：日常、通勤/上学、拍照、聚会，每个场景给具体单品和氛围。",
        "7. 雷区提醒：使用“谨慎尝试”“容易削弱协调感”等温和表达，并输出可视化图片式避雷示意，不要只堆文字。",
        "8. 今日可执行的 3 个变美动作和小红书分享金句。",
      ]
    : topicModuleLines(type);
  const topicVisual = topicVisualRules(type.id);
  return `你是一名专业的 AI 形象报告设计师，请基于用户上传的照片，生成一张高信息密度、适合保存和分享到小红书/朋友圈的中文个人形象报告长图。

【输出要求】
- 报告图：1080×1920 或更长的竖版中文长图，文字必须清晰可读。
- 所有文字必须为简体中文；禁止乱码、假中文、随机符号、重复字、不可读小字。

【用户照片要求】
- 以用户上传照片为参考，保留核心长相特征和自然气质。
- 不要过度美颜，不要大幅改变五官，不要夸张失真。
- 不要低俗、暴露、成人化或擦边姿势。
- 先判断照片性别呈现，再决定内容体系。不要被前端人设强行带偏。
- 男性照片必须转译成男士形象报告，禁止法式白月光、学姐、甜妹、公主、少女、腮红、口红、唇色、睫毛、眼影、妆容、发饰、裙装、连衣裙、高跟鞋、女包等女性化内容。
- 女性照片可以输出女士发型、发色、个人色彩、妆容、穿搭、鞋包、首饰、发饰等建议，禁止套用男士胡须/鬓角/硬朗型格内容。
- 性别不清晰时采用中性安全体系：发型、发色、个人色彩、眉形清爽度、基础护肤、简约穿搭、鞋包、眼镜、帽子。

【本次报告】
- 报告类型：${type.name}
- 前端偏好人设（仅作抽象气质参考，必须按照片性别转译）：${persona.title}
- 前端关键词（仅作抽象气质参考）：${persona.keywords.join(" / ")}
- 视觉基调参考：${persona.tone}
- 造型表达偏好：${prefs.stylePreferences.join(" / ")}
- 目标场景：${prefs.targetScenes.join(" / ")}
- 改变幅度：${prefs.changeIntensity}

【必须包含模块】
${moduleLines.join("\n")}

【专题边界】
${topicBoundaryRules(type.id)}

【文案风格】
- 温柔、鼓励、自信，不制造外貌焦虑。
- 不写“丑、土、脸大、显老、不适合你”等攻击性表达。
- 使用“建议”“更适合”“可优先尝试”“谨慎尝试”等表达。

【排版要求】
- 第一屏必须像杂志封面/高端形象顾问诊断页，有清晰人物主视觉、强标题、风格结论和 3 个关键信息锚点。
- 中部使用多个模块卡片，信息密度高但不拥挤；底部包含行动清单、温馨提示和分享金句。
- 男性报告视觉更克制高级，可用米白、炭黑、雾灰、橄榄绿、牛仔蓝、摩卡棕、银灰点缀，避免粉色可爱、爱心、蝴蝶结、花朵、闪闪少女风。
- 女性报告可以温柔精致，但也要高级、有留白、有真实材质图，不要廉价粉色堆叠。
${topicVisual}`;
}

function topicModuleLines(type: ReportType) {
  if (type.id === "hair") {
    return [
      "1. 脸部轮廓、发质状态、发量感、当前发型气质。",
      "2. 推荐发型：真实头部/半身缩略图，展示长度、刘海或额前区、卷度、层次和侧后区处理；3 张头像必须保持同一肤色、同一光感和干净正脸，不要做出黑阴影或肤色漂移。",
      "3. 发色推荐：必须包含 4-6 张同一人物正脸或半身人像效果示意图，分别展示不同发色上脸效果；旁边再放真实头发质感色卡，强调和原照片是同一张脸。",
      "4. 打理方式：洗护、吹风方向、造型品和理发师沟通关键词，要做成图文卡片。",
      "5. 雷区提醒和今日行动清单，也要做成图片化卡片，不要只堆文字。",
    ];
  }
  if (type.id === "makeup") {
    return [
      "1. 个人色彩倾向：冷暖、明度、饱和度、对比度。",
      "2. 推荐色盘：主色、辅助色、点缀色、中性色。",
      "3. 面部效果图：必须包含 5-8 张人物面部近景效果示意图，例如眉形、肤色均匀度、眼周精神度、发际/鬓角或轮廓、眼镜框型、上镜气色。",
      "4. 面部清爽度建议：男性写眉形修整、肤色均匀、控油、黑眼圈、胡须/鬓角、眼镜框型；女性写底妆、眉形、眼妆、腮红、唇色。",
      "5. 发色与贴脸颜色延展建议，只讲影响脸部气色的颜色。",
      "6. 雷区提醒和今日行动清单。",
    ];
  }
  if (type.id === "look") {
    return [
      "1. 日常 Look：给具体上装、下装、鞋和氛围关键词。",
      "2. 通勤 / 上学 Look：给整套组合和适用场景。",
      "3. 拍照 Look：给镜头友好的颜色、层次和姿态建议。",
      "4. 聚会 Look：给更有存在感但不过度的搭配。",
      "5. 不要只做四宫格。日常、通勤/上学、拍照、聚会四个场景都必须出现，每个场景至少 2 张人物图，共至少 8 张人物场景照片或全身/半身 Look 图。",
      "6. 场景对比表、今日可执行建议和总结语。",
    ];
  }
  return type.modules.map((item, index) => `${index + 1}. ${item}：围绕「${type.name}」展开，主题准确，并按照片性别呈现选择男性、女性或中性内容。`);
}

function topicBoundaryRules(typeId: ReportType["id"]) {
  const rules: Record<string, string> = {
    comprehensive: "综合报告可以覆盖多个维度，但每个模块保持简洁，不能让穿搭、发型或面部任一专题吞掉整体版面。",
    hair: "发型发色专题只讲发型、发色、脸型与打理。禁止混入服装搭配、OOTD、鞋包、腕表、帽子、穿搭清单或场景穿搭。",
    makeup: "色彩面部专题只讲个人色彩、面部状态、上镜气色和面部细节。禁止混入穿搭套餐、OOTD、鞋包、整套服装推荐或场景穿搭。",
    outfit: "穿搭配饰专题只讲服装、鞋包配饰、版型、材质和 OOTD，不要深入讲发型发色或面部清爽度。",
    look: "场景 Look 专题可以讲服装和配饰，但每条建议都必须绑定具体场景；不要泛泛列单品。",
  };
  return rules[typeId] || rules.comprehensive;
}

function topicVisualRules(typeId: ReportType["id"]) {
  const rules: Record<string, string> = {
    comprehensive: "- 综合报告图片构成：人物主视觉、发型发色、色彩面部、穿搭配饰、场景 Look 都要覆盖。",
    hair: "- 发型发色专题图片构成：顶部人物主视觉 1 张，保持干净正脸和清爽背景；推荐发型 3-4 张头部/半身图，要求同一人物、同一肤色、同一光感；发色上脸效果 4-6 张同一人物正脸或半身图；发色质感色卡 4-6 个；雷区提醒和打理方式要做成图文卡片。禁止出现穿搭套装、鞋包、腕表、OOTD 或全身搭配模块。",
    makeup: "- 色彩面部专题图片构成：顶部人物主视觉 1 张；面部近景效果图 5-8 张；色盘 2-4 组；眉形/肤色/眼周/胡须鬓角或妆容细节局部图若干。禁止出现整套穿搭、鞋包、服装平铺和 OOTD 模块。",
    outfit: "- 穿搭配饰专题图片构成：3 套 OOTD 全身图、核心单品图、鞋包配饰图和版型/颜色说明。",
    look: "- 场景 Look 专题图片构成：不要做成只有 4 张场景图的四宫格；必须先把日常、通勤/上学、拍照、聚会四个区块全部放出来，每个区块 2 张人物图，共至少 8 张人物场景照片或全身/半身 Look 图。可以补少量单品图，但不能只放衣服平铺。整体要像一本场景造型 mini lookbook。",
  };
  return rules[typeId] || rules.comprehensive;
}

function xhsCopy(type: ReportType, personaId: PersonaId, subjectGender: UserReport["subjectGender"] = "unknown") {
  if (subjectGender === "male") {
    return `我生成了一份 ${type.name}，重点看的是发型、穿搭和整体协调度。

这份报告会结合照片给出更适合男性或中性男性风格的建议，不会套用女性化模板。

我最想参考的是：
1. 发型和发色怎么更精神
2. 日常 / 通勤 / 拍照场景怎么穿
3. 哪些造型元素需要谨慎尝试

#AI形象报告 #男生变帅思路 #发型建议 #穿搭参考`;
  }
  const persona = PERSONAS[personaId];
  if (type.id !== "comprehensive") {
    return `我刚生成了一份 ${type.name}，先把这个方向看明白就够了。

它给我的重点是：
1. ${type.modules[0]}优先看更自然、低负担的路线
2. 建议会结合照片和偏好，不是套模板
3. 也会提醒哪些方向要谨慎尝试

保存下来，慢慢照着改就行。

#AI形象报告 #形象提升 #${type.name.replace("专题", "")} #发型穿搭参考`;
  }
  return `AI 说我是「${persona.title}」路线，这次感觉还挺准的。

刚生成了一份 AI 个人形象报告，重点不是大改，是把整体氛围理顺。
我最想先参考的 4 点是：
1. 发型更适合轻层次和清爽轮廓
2. 发色更适合低饱和、自然过渡
3. 面部状态重点放在干净和提气色
4. 穿搭多选更轻、更干净的单品

先保存下来，照着慢慢试。

#AI形象报告 #形象提升 #个人风格定位 #发型推荐 #穿搭参考`;
}

const PHOTO_TIPS = {
  goodExample: {
    title: "推荐这样拍",
    image: PHOTO_UPLOAD_ASSETS.recommendedPortrait,
    checklist: ["正脸对镜头", "光线清晰"],
  },
  badExample: {
    title: "避免这样拍",
    image: PHOTO_UPLOAD_ASSETS.avoidPortrait,
    checklist: ["侧脸或低头", "遮挡 / 逆光"],
  },
  quickTips: [
    { icon: PHOTO_UPLOAD_ASSETS.singleFace, label: "单人正脸" },
    { icon: PHOTO_UPLOAD_ASSETS.clearLight, label: "光线清晰" },
    { icon: PHOTO_UPLOAD_ASSETS.hairVisible, label: "无遮挡" },
    { icon: PHOTO_UPLOAD_ASSETS.noBeauty, label: "少美颜" },
  ],
} as const;

const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;
const ACCEPT_EXTENSIONS = ["jpg", "jpeg", "png", "heic", "heif"] as const;
const MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 5 * 1024 * 1024 ? 1 : 2)}MB`;
}

function validateUploadFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ACCEPT_TYPES.includes(file.type as (typeof ACCEPT_TYPES)[number]) && !ACCEPT_EXTENSIONS.includes(ext as (typeof ACCEPT_EXTENSIONS)[number])) {
    return "仅支持 JPG / PNG / HEIC 格式";
  }
  if (file.size > MAX_SIZE) {
    return "图片大小不能超过 10MB";
  }
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

function inspectPhotoQuality(file: File): Promise<PhotoCheckResult> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      URL.revokeObjectURL(objectUrl);
      const portraitRatio = height > 0 ? width / height : 1;
      if (Math.min(width, height) < 520) {
        resolve("failed");
        return;
      }
      if (width < 900 || height < 1200 || portraitRatio < 0.65 || portraitRatio > 0.9 || file.size > 6 * 1024 * 1024) {
        resolve("warning");
        return;
      }
      resolve("available");
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image-load-failed"));
    };
    image.src = objectUrl;
  });
}

function photoCheckCopy(result?: PhotoCheckResult) {
  if (result === "warning") {
    return { title: "照片可能影响效果", desc: "建议确认是否为正脸、光线清晰", tone: "warning" as const };
  }
  if (result === "failed") {
    return { title: "照片不可用", desc: "请重新上传清晰正脸照片", tone: "failed" as const };
  }
  return { title: "照片可用", desc: "照片清晰，可继续生成", tone: "available" as const };
}

function reportPhotoRequirement(typeId: ReportTypeId) {
  const map: Record<ReportTypeId, { title: string; desc: string; tips: string[]; strictness: "face" | "upper" | "full" }> = {
    comprehensive: {
      title: "综合报告建议正脸半身照",
      desc: "看清脸部、发型、肩颈和上半身轮廓，综合判断会更稳。",
      tips: ["正脸清晰", "肩颈可见", "光线均匀"],
      strictness: "upper",
    },
    hair: {
      title: "发型发色需要清晰正脸",
      desc: "头部完整、发际线和发量可见，刘海与脸型判断会更准确。",
      tips: ["头发完整", "五官清楚", "少滤镜"],
      strictness: "face",
    },
    makeup: {
      title: "色彩面部需要均匀光线",
      desc: "正脸、自然光、肤色不偏色，适合判断气色和面部清爽度。",
      tips: ["正脸自然光", "肤色不偏", "无遮挡"],
      strictness: "face",
    },
    outfit: {
      title: "穿搭配饰建议半身以上",
      desc: "至少看到上半身和肩颈比例；如果能看到腰线，版型建议会更具体。",
      tips: ["半身以上", "衣服可见", "姿态自然"],
      strictness: "upper",
    },
    look: {
      title: "场景 Look 建议接近全身照",
      desc: "最好看到从头到脚或大半身比例，系统才能给出更完整的场景搭配。",
      tips: ["接近全身", "服装完整", "背景干净"],
      strictness: "full",
    },
  };
  return map[typeId];
}

function localPreAnalysis(input: {
  reportType: ReportType;
  preferences: PreferenceState;
  photoCheckResult?: PhotoCheckResult;
  productId?: ProductId;
}): PreAnalysis {
  const { reportType, preferences, photoCheckResult, productId } = input;
  const personaId = pickPersona(preferences.stylePreferences, preferences.targetScenes);
  const persona = PERSONAS[personaId];
  const requirement = reportPhotoRequirement(reportType.id);
  const photoFit = photoCheckResult === "failed" ? "poor" : photoCheckResult === "warning" ? "warning" : "good";
  const product = productId || (reportType.id === "comprehensive" ? "full" : "single");
  const style = preferenceLabel("style", preferences.stylePreferences[0] || "auto");
  const scene = preferenceLabel("scene", preferences.targetScenes[0] || "daily");
  const change = preferenceLabel("range", preferences.changeIntensity || "light");
  return {
    id: `pa_${Date.now()}`,
    reportType: reportType.id,
    title: `${reportType.name}预分析`,
    summary: `这张照片适合先走「${persona.title}」方向，当前偏好是${style}、${scene}、${change}。完整报告会把建议整理成一张可保存的高清长图。`,
    keywords: [...persona.keywords.slice(0, 3), reportType.tags[0]].filter(Boolean),
    photoFit,
    photoAdvice: photoFit === "good"
      ? `${requirement.title}，当前照片基础可用。`
      : `${requirement.title}，建议按「${requirement.tips.join(" / ")}」重新拍一张，完整报告会更准。`,
    recommendedProductId: product,
    sections: [
      { title: "风格方向", text: `建议围绕「${persona.title}」展开，保留本人原有气质，把${style}和${scene}场景做得更清晰。` },
      { title: "本次重点", text: reportType.id === "comprehensive" ? "完整报告会同时看发型、色彩、面部状态、穿搭和场景，先给出整体形象定位。" : `完整报告会优先展开${reportType.name}，判断当前照片里最值得优化的细节。` },
      { title: "生成建议", text: `${requirement.desc} 当前选择的改变幅度是「${change}」，适合先做可执行、不过度的优化方案。` },
    ],
  };
}

function isCurrentPreAnalysis(analysis: PreAnalysis | undefined, reportTypeId: ReportTypeId) {
  if (!analysis || analysis.reportType !== reportTypeId) return false;
  const titles = analysis.sections.map((section) => section.title);
  return ["风格方向", "本次重点", "生成建议"].every((title) => titles.includes(title));
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [toast, setToast] = useState<Toast | null>(null);
  const [paywall, setPaywall] = useState<PaywallState>({ open: false });
  const [paying, setPaying] = useState<PayingState>(null);
  const payingLockRef = useRef<PayingState>(null);
  const generationSeqRef = useRef(0);

  useEffect(() => {
    const { photoDataUrl: _photoDataUrl, ...serializableState } = state;
    localStorage.setItem(LS_KEY, JSON.stringify(serializableState));
  }, [state]);

  useEffect(() => {
    const expected = `#/${state.route}`;
    if (window.location.hash !== expected) window.history.replaceState(null, "", expected);
  }, [state.route]);

  useEffect(() => {
    const onHash = () => {
      setState((s) => ({ ...s, route: routeFromHash() }));
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
  const showComprehensiveReport = state.rights.comprehensive > 0;

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
      reportType: product.rights.comprehensive > 0 ? "comprehensive" : "hair",
      reports: [],
      route: "select",
      admin: { ...s.admin, coupons: updatedCoupons, auditLogs: audit(s.admin.auditLogs, "system", "coupon.redeem", `${code} 兑换 ${product.name}`) },
    }));
    showToast("兑换成功");
  }

  function demoCoupon(code: string): Coupon | undefined {
    return DEMO_COUPON_PRODUCTS[code] ? { code, productId: DEMO_COUPON_PRODUCTS[code], platform: "演示", status: "unused", createdAt: now(), expiresAt: addDays(new Date(), 30) } : undefined;
  }

  function chooseReport(id: ReportTypeId) {
    setState((s) => ({ ...s, reportType: id, route: "upload", isGenerating: false, generationError: undefined, preAnalysis: undefined, preAnalysisError: undefined }));
  }

function startGenerate() {
  if (state.isGenerating) return showToast("正在生成中，请勿重复点击");
  if (!state.photoUrl) return showToast("请先上传照片");
  if (!state.preAnalysis || state.preAnalysis.reportType !== reportType.id) {
    nav("preanalysis");
    return;
  }
  if (!state.privacyAccepted) return showToast("请先勾选本人照片确认");
  if (state.rights[reportType.rightKey] <= 0) {
    setPaywall({ open: true, reason: reportType.rightKey === "comprehensive" ? "综合报告需要全案探索卡权益" : "生成完整专题前需要先完成支付" });
    return;
  }
    generationSeqRef.current += 1;
    setState((s) => ({ ...s, progress: 8, route: "progress", isGenerating: true, generationError: undefined }));
  }

  async function createPreAnalysis() {
    const type = REPORT_TYPES.find((item) => item.id === state.reportType) || REPORT_TYPES[0];
    setState((s) => ({ ...s, isPreAnalyzing: true, preAnalysisError: undefined }));
    try {
      const response = await fetch("/api/preanalysis/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: state.clientId,
          report_type: type.id,
          report_name: type.name,
          style_preference: state.preferences.stylePreferences.join(" / "),
          scene_preference: state.preferences.targetScenes.join(" / "),
          change_level: state.preferences.changeIntensity,
          photo_check_result: state.photoCheckResult,
          photo_name: state.photoName,
        }),
      });
      const data = await response.json().catch(() => ({} as Partial<PreAnalysis> & { error?: string; message?: string }));
      if (!response.ok) throw new Error(String(data.message || data.error || "预分析暂时不可用"));
      const next: PreAnalysis = {
        ...localPreAnalysis({ reportType: type, preferences: state.preferences, photoCheckResult: state.photoCheckResult }),
        ...data,
        reportType: type.id,
      };
      setState((s) => ({ ...s, preAnalysis: next, isPreAnalyzing: false, preAnalysisError: undefined }));
    } catch (error) {
      const fallback = localPreAnalysis({ reportType: type, preferences: state.preferences, photoCheckResult: state.photoCheckResult });
      setState((s) => ({
        ...s,
        preAnalysis: fallback,
        isPreAnalyzing: false,
        preAnalysisError: error instanceof Error ? error.message : "已使用本地预分析模板",
      }));
    }
  }

  async function startCheckout(item: PaywallPackage, channel: PayChannel) {
    if (payingLockRef.current) {
      showToast("正在跳转支付，请稍后");
      return;
    }
    const productId = item.productIds[channel];
    if (!productId) return showToast("当前套餐暂不可购买，请稍后重试");
    try {
      payingLockRef.current = { packageId: item.id, channel };
      setPaying({ packageId: item.id, channel });
      const response = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          package_id: item.id,
          product_id: productId,
          channel,
          client_id: state.clientId,
          report_type: state.reportType,
          source: "report_unlock_modal",
        }),
      });
      const data = await response.json().catch(() => ({} as { checkout_url?: string; pay_url?: string; message?: string; error?: string }));
      const checkoutUrl = String(data.checkout_url || data.pay_url || "");
      if (!response.ok || !checkoutUrl) {
        throw new Error(String(data.message || data.error || "支付暂未开放"));
      }
      window.location.href = checkoutUrl;
    } catch (error) {
      showToast(getPaymentErrorMessage(error));
    } finally {
      payingLockRef.current = null;
      setPaying(null);
    }
  }

  useEffect(() => {
    if (state.route !== "progress" || !state.isGenerating) return;
    const generationId = generationSeqRef.current;
    const controller = new AbortController();
    const steps = [18, 31, 48, 63, 78, 91, 94];
    let index = Math.max(0, steps.findIndex((step) => step > state.progress));
    if (index < 0) index = steps.length - 1;
    const timer = window.setInterval(() => {
      setState((s) => {
        const next = steps[index] || 94;
        index += 1;
        return { ...s, progress: Math.min(next, 94) };
      });
    }, 2500);

    const run = async () => {
      const type = REPORT_TYPES.find((item) => item.id === state.reportType) || REPORT_TYPES[0];
      const personaId = pickPersona(state.preferences.stylePreferences, state.preferences.targetScenes);
      const prompt = buildPrompt(type, personaId, state.preferences);
      try {
        const response = await fetch("/api/reports/generate", {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_id: state.clientId,
            report_type: type.id,
            right_key: type.rightKey,
            report_name: type.name,
            style_persona: PERSONAS[personaId].title,
            style_keywords: PERSONAS[personaId].keywords.join(" / "),
            style_preference: state.preferences.stylePreferences.join(" / "),
            scene_preference: state.preferences.targetScenes.join(" / "),
            change_level: state.preferences.changeIntensity,
            user_photo_data_url: state.photoDataUrl,
            user_photo_url: state.photoDataUrl || state.photoUrl,
            photo_name: state.photoName,
            prompt,
          }),
        });
        const raw = await response.text();
        const data: Record<string, unknown> = raw ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return { raw };
          }
        })() : {};
        if (!response.ok) {
          throw new Error(String(data.message || data.error || data.raw || `generate failed with HTTP ${response.status}`));
        }
        if (data.status && data.status !== "completed") throw new Error(String(data.message || data.error || "生成失败，请重试，未扣除权益"));
        if (!data.report_image_url) throw new Error(String(data.message || data.error || "报告图生成失败，请重新生成，未扣除权益"));
        if (generationId !== generationSeqRef.current) return;
        const rightKey = type.rightKey;
        setState((latest) => {
          const rights = { ...latest.rights };
          rights[rightKey] = Math.max(0, rights[rightKey] - 1);
          const reportId = String(data.report_id || `rpt_${Date.now()}`);
          const report: UserReport = {
            id: reportId,
            type: type.id,
            name: type.name,
            createdAt: now(),
            persona: personaId,
            photoDataUrl: latest.photoDataUrl,
            reportImageUrl: reportAssetUrl(reportId, "report"),
            coverImageUrl: reportAssetUrl(reportId, "cover"),
            summaryImageUrl: reportAssetUrl(reportId, "summary"),
            prompt: String(data.prompt || prompt),
            status: data.status === "failed" ? "failed" : "completed",
            error: String(data.error || ""),
            subjectGender: String(data.subject_gender || "unknown") as UserReport["subjectGender"],
          };
          return {
            ...latest,
            progress: 100,
            rights,
            reports: [report, ...latest.reports],
            isGenerating: false,
            generationError: undefined,
          };
        });
        window.clearInterval(timer);
        window.setTimeout(() => {
          if (generationId === generationSeqRef.current) {
            setState((latest) => ({ ...latest, route: "result" }));
          }
        }, 260);
      } catch (error) {
        if (controller.signal.aborted) return;
        window.clearInterval(timer);
        setState((latest) => ({
          ...latest,
          progress: Math.min(latest.progress, 94),
          isGenerating: false,
          generationError: error instanceof Error ? error.message : "生成失败，请重试",
        }));
        showToast(error instanceof Error ? error.message : "生成失败，请重试");
      }
    };

    void run();
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [state.route, state.isGenerating]);

  function updateAdmin(admin: AdminState) {
    setState((s) => ({ ...s, admin }));
  }

  const page = (() => {
    switch (state.route) {
      case "purchase": return <PurchasePage products={products} nav={nav} />;
      case "success": return <SuccessRedirectPage state={state} setState={setState} nav={nav} />;
      case "select": return <SelectPage rights={state.rights} chooseReport={chooseReport} nav={nav} />;
      case "upload": return <UploadPage state={state} setState={setState} nav={nav} showToast={showToast} />;
      case "preferences": return <PreferencesPage state={state} setState={setState} nav={nav} showToast={showToast} />;
      case "preanalysis": return <PreAnalysisPage state={state} type={reportType} products={products} nav={nav} onAnalyze={createPreAnalysis} onOpenPaywall={(reason) => setPaywall({ open: true, reason })} />;
      case "confirm": return <ConfirmPage state={state} setState={setState} type={reportType} nav={nav} startGenerate={startGenerate} onOpenPaywall={(reason) => setPaywall({ open: true, reason })} />;
      case "progress": return <ProgressPage progress={state.progress} hasReport={!state.isGenerating && state.reports.length > 0} error={state.generationError} nav={nav} showToast={showToast} />;
      case "result": return <ResultPage state={state} showComprehensiveReport={showComprehensiveReport} nav={nav} showToast={showToast} />;
      case "admin": return <AdminPage state={state} setState={setState} updateAdmin={updateAdmin} showToast={showToast} />;
      default: return <HomePage state={state} nav={nav} />;
    }
  })();

  return (
    <>
      <Shell state={state} nav={nav}>{page}</Shell>
      {paywall.open && <PaywallSheet paying={paying} reason={paywall.reason} onClose={() => setPaywall({ open: false })} onCheckout={startCheckout} />}
      {toast && <div className="toast show">{toast.text}</div>}
    </>
  );
}

function pickPersona(style: string[], scene: string[]): PersonaId {
  const styleText = style.join(" ");
  const sceneText = scene.join(" ");
  if (styleText.includes("时尚") || sceneText.includes("聚会")) return "sweetCool";
  if (styleText.includes("清爽") || sceneText.includes("通勤")) return "coolAiry";
  if (sceneText.includes("拍照")) return "koreanSchool";
  return "softFrench";
}

function audit(logs: AuditLog[], actor: string, action: string, detail: string) {
  return [{ id: `log_${Date.now()}`, actor, action, detail, createdAt: now() }, ...logs].slice(0, 120);
}

function Shell({ state, nav, children }: { state: AppState; nav: (route: Route) => void; children: React.ReactNode }) {
  const showBrandBar = state.route === "home" || state.route === "admin";
  const homeBar = state.route === "home";
  return (
    <div className={`app-shell ${state.route === "progress" ? "progress-shell" : ""}`}>
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

function HomePage({ state, nav }: { state: AppState; nav: (r: Route) => void }) {
  const previewOrder: ReportTypeId[] = ["hair", "makeup", "outfit", "look", "comprehensive"];
  const previewTypes = previewOrder.map((id) => REPORT_TYPES.find((type) => type.id === id)!).filter(Boolean);
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
          <button className="home-cta primary" onClick={() => nav("select")}>
            <img src={HOME_ASSETS.magicWand} alt="" />
            <span>开始形象分析</span>
          </button>
          <button className="home-cta secondary" onClick={() => document.querySelector(".preview-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <img src={HOME_ASSETS.reportCard} alt="" />
            <span>查看报告样例</span>
          </button>
        </div>
      </section>

      <section className="home-panel preview-panel">
        <div className="home-section-head">
          <h2>形象报告预览</h2>
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

      <section className="home-panel step-section">
        <h2>先体验，再生成完整报告</h2>
        <div className="home-step-list">
          {[
            [HOME_ASSETS.profileUpload, "选择专题并上传照片"],
            [HOME_ASSETS.magicWand, "免费查看文字预分析"],
            [HOME_ASSETS.wechat, "支付后生成完整报告"],
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
    comprehensive: CHOOSE_REPORT_ASSETS.comprehensivePreview,
    hair: CHOOSE_REPORT_ASSETS.hair,
    makeup: CHOOSE_REPORT_ASSETS.makeup,
    outfit: CHOOSE_REPORT_ASSETS.outfit,
    look: CHOOSE_REPORT_ASSETS.look,
  };
  const captionMap: Record<ReportTypeId, string> = {
    comprehensive: "形象定位 · 风格建议",
    hair: "发型建议 · 发色推荐",
    makeup: "色彩分析 · 面部建议",
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
    single: "专题 ×1",
    triple: "专题 ×3",
    full: "综合 ×1\n专题 ×3",
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

function ProductCard({ product, nav }: { product: Product; nav: (r: Route) => void }) {
  const full = product.id === "full";
  return <article className={`product-card ${product.badge ? "featured" : ""} ${full ? "gold" : ""}`}>{product.badge && <span className="badge">{product.badge}</span>}<h3>{product.name}</h3><div className="price">¥{product.price}<small>{product.originalPrice ? ` ¥${product.originalPrice}` : ""}</small></div><p>{product.description}</p><div className="ticket-line"><span>综合 ×{product.rights.comprehensive}</span><span>专题 ×{product.rights.topic}</span></div><ul>{product.bullets.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul><button className={`btn ${full ? "gold" : "primary"} full`} onClick={() => nav("select")}>上传照片后解锁<Sparkles size={16} /></button></article>;
}

function PurchasePage({ products, nav }: { products: Product[]; nav: (r: Route) => void }) {
  return <main className="page"><PageHeader title="完整报告权益" description="先完成免费预分析，再在生成完整报告前选择微信/支付宝支付。" onBack={() => nav("home")} backLabel="返回首页" align="left" /><div className="product-list">{products.map((p) => <ProductCard key={p.id} product={p} nav={nav} />)}</div><FAQ /></main>;
}

function FAQ() {
  return <section className="section faq"><h2>常见问题</h2>{[["免费预分析会生成图片吗？", "不会。预分析只给文字方向，支付后才会生成完整高清报告图。"], ["可以基于同一张照片继续生成吗？", "可以。三次探索卡和全案探索卡可继续探索不同专题。"], ["报告可以分享吗？", "可以。结果页支持下载报告，并一键准备小红书封面图和文案。"]].map(([q, a]) => <details key={q} open><summary>{q}</summary><p>{a}</p></details>)}</section>;
}

function PageHeader({
  title,
  onBack,
  backLabel = "返回上一页",
  description,
  action,
  align = "center",
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  description?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <header className={`page-header page-header--${align}`}>
      <button className="page-header__back" onClick={onBack} aria-label={backLabel}>
        <ArrowLeft aria-hidden="true" />
      </button>
      <div className="page-header__body">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-header__action">
        {action || <span className="page-header__spacer" aria-hidden="true" />}
      </div>
    </header>
  );
}

function SuccessRedirectPage({
  state,
  setState,
  nav,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  nav: (r: Route) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    const syncRights = async () => {
      try {
        const sessionId = new URLSearchParams(window.location.search).get("session_id") || hashSearchParams().get("session_id") || "";
        if (sessionId) {
          await fetch(`/api/orders/by-session/${encodeURIComponent(sessionId)}`).catch(() => undefined);
        }
        const response = await fetch(`/api/me/entitlements?client_id=${encodeURIComponent(state.clientId)}`);
        const data = await response.json().catch(() => ({} as { entitlements?: Array<{ topic_remaining?: number; comprehensive_remaining?: number }> }));
        if (response.ok && Array.isArray(data.entitlements)) {
          const entitlements = data.entitlements as Array<{ topic_remaining?: number; comprehensive_remaining?: number }>;
          const rights = entitlements.reduce((acc: { topic: number; comprehensive: number }, item) => ({
            topic: acc.topic + Number(item.topic_remaining || 0),
            comprehensive: acc.comprehensive + Number(item.comprehensive_remaining || 0),
          }), { topic: 0, comprehensive: 0 });
          if (!cancelled) {
            setState((s) => ({ ...s, rights }));
          }
        }
      } finally {
        const hasActivePhoto = state.uploadStatus === "success" || Boolean(state.preAnalysis);
        if (!cancelled) nav(hasActivePhoto ? (state.preAnalysis ? "preanalysis" : "confirm") : "select");
      }
    };
    void syncRights();
    return () => {
      cancelled = true;
    };
  }, [nav, setState, state.clientId, state.preAnalysis, state.uploadStatus]);
  return <main className="page success-page" aria-live="polite">支付成功，正在更新权益...</main>;
}

function RightsPills({ rights, showComprehensiveReport = true }: { rights: Rights; showComprehensiveReport?: boolean }) {
  return <div className="rights-pills">{showComprehensiveReport && <span><ReceiptText size={16} />综合剩余 <b>{rights.comprehensive}</b></span>}<span><KeyRound size={16} />专题剩余 <b>{rights.topic}</b></span></div>;
}

function SectionDivider({ title }: { title: string }) {
  return <div className="success-section-title"><img src={FULL_CARD_ASSETS.sparkleDivider} alt="" /><span>{title}</span><img src={FULL_CARD_ASSETS.sparkleDivider} alt="" /></div>;
}

function SelectPage({ rights, chooseReport, nav }: { rights: Rights; chooseReport: (id: ReportTypeId) => void; nav: (r: Route) => void }) {
  const topicRef = useRef<HTMLDivElement | null>(null);
  const topicCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const topics: Array<{
    id: ReportTypeId;
    title: string;
    subtitle: string;
    image: string;
    border: string;
    tint: string;
  }> = [
    { id: "hair", title: "发型发色专题", subtitle: "找到最适合你的发型", image: CHOOSE_REPORT_ASSETS.hair, border: "#ffc8d8", tint: "#fff3f7" },
    { id: "makeup", title: "色彩面部专题", subtitle: "找到你的专属色彩与面部清爽方向", image: CHOOSE_REPORT_ASSETS.makeup, border: "#d8c6ff", tint: "#f8f5ff" },
    { id: "outfit", title: "穿搭配饰专题", subtitle: "穿出风格，提升气质", image: CHOOSE_REPORT_ASSETS.outfit, border: "#ffd4b6", tint: "#fff7ef" },
    { id: "look", title: "场景 Look 专题", subtitle: "不同场景，轻松变美", image: CHOOSE_REPORT_ASSETS.look, border: "#cbd7ff", tint: "#f5f8ff" },
  ];

  useEffect(() => {
    setActiveTopicIndex(0);
    topicRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [rights.topic]);

  useEffect(() => {
    const rail = topicRef.current;
    if (!rail) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number((visible.target as HTMLElement).dataset.index);
      if (!Number.isNaN(index)) setActiveTopicIndex(index);
    }, { root: rail, threshold: [0.6, 0.75] });
    topicCardRefs.current.slice(0, topics.length).forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, [topics.length]);

  const focusTopic = (index: number) => {
    const card = topicCardRefs.current[index];
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveTopicIndex(index);
  };

  return (
    <main className="choose-report-page">
      <div className="choose-bg-star choose-bg-star-a">✦</div>
      <div className="choose-bg-star choose-bg-star-b">✦</div>
      <PageHeader title="选择报告类型" onBack={() => nav("home")} backLabel="返回首页" />

      <section className="choose-quota choose-quota-inline" aria-label="剩余报告次数">
        <span><Sparkles />免费预分析 <b>可用</b></span>
        <span><KeyRound />已购专题 <b>{rights.topic}</b></span>
        <span><ReceiptText />已购综合 <b>{rights.comprehensive}</b></span>
      </section>

      <section className="choose-main-card choose-report-card" aria-label="综合形象报告">
          <div className="choose-main-copy">
            <h2>综合形象报告 <span>全案探索卡可生成</span></h2>
            <p>先把发型、色彩、面部状态、穿搭和场景感放到一张图里，再决定后面要不要补专题。</p>
            <button className="choose-primary-btn" onClick={() => chooseReport("comprehensive")}>先做综合预分析</button>
          </div>
          <div className="choose-main-visual">
            <img className="choose-badge" src={CHOOSE_REPORT_ASSETS.badge} alt="全案专享" />
            <img className="choose-preview" src={CHOOSE_REPORT_ASSETS.comprehensivePreview} alt="综合形象报告预览" />
          </div>
      </section>

      <section className="choose-topic-section" aria-label="报告类型">
        <div className="choose-topic-divider" aria-hidden="true" />
        <div ref={topicRef} className="choose-topic-rail" aria-label="报告类型横向滑动列表">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              ref={(node) => { topicCardRefs.current[index] = node; }}
              type="button"
              data-index={index}
              className={`choose-topic-card choose-report-card ${activeTopicIndex === index ? "is-active" : ""}`}
              style={{ "--topic-border": topic.border, "--topic-tint": topic.tint } as React.CSSProperties}
              onClick={() => chooseReport(topic.id)}
            >
              <div className="choose-topic-copy">
                <h2>{topic.title}</h2>
                <p>{topic.subtitle}</p>
              </div>
              <div className="choose-topic-image">
                <img src={topic.image} alt={`${topic.title}配图`} />
              </div>
              <span>先做该专题预分析</span>
            </button>
          ))}
        </div>
        <div className="choose-topic-dots" aria-hidden="true">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              type="button"
              className={activeTopicIndex === index ? "active" : ""}
              onClick={() => focusTopic(index)}
              tabIndex={-1}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function UploadPage({ state, setState, nav, showToast }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; nav: (r: Route) => void; showToast: (t: string) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef(0);
  const dragRestoreRef = useRef<UploadStatus>("idle");
  const canGoNext = state.uploadStatus === "success" && state.photoCheckResult !== "failed" && !state.isGenerating;
  const isUploading = state.uploadStatus === "uploading";
  const uploadCopy = state.uploadStatus === "uploading"
    ? { title: "照片上传中", desc: "请稍等一下，正在读取照片信息" }
    : state.uploadStatus === "error" && state.uploadErrorMessage
      ? { title: "上传失败", desc: state.uploadErrorMessage }
      : { title: "点击或拖拽上传照片", desc: "支持 JPG / PNG / HEIC 格式，大小不超过 10MB" };
  const checkCopy = photoCheckCopy(state.photoCheckResult);
  const zoneImage = state.uploadStatus === "success" || state.uploadStatus === "uploading"
    ? state.photoUrl
    : PHOTO_UPLOAD_ASSETS.uploadPlaceholder;
  const reportType = REPORT_TYPES.find((item) => item.id === state.reportType) || REPORT_TYPES[0];
  const requirement = reportPhotoRequirement(reportType.id);

  const openPicker = () => fileRef.current?.click();

  const updateUploadState = (next: Partial<AppState>) => {
    setState((s) => ({ ...s, ...next }));
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    const error = validateUploadFile(file);
    if (error) {
      updateUploadState({ uploadStatus: "error", photoCheckResult: "failed", uploadErrorMessage: error, photoDataUrl: undefined });
      showToast(error);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const dataUrl = await readFileAsDataUrl(file);
    const selectionId = ++selectionRef.current;
    if (state.photoUrl.startsWith("blob:")) URL.revokeObjectURL(state.photoUrl);
    updateUploadState({
      uploadStatus: "uploading",
      uploadErrorMessage: undefined,
      photoCheckResult: undefined,
      photoName: file.name,
      photoUrl: previewUrl,
      photoDataUrl: dataUrl,
      isGenerating: false,
    });
    try {
      const result = await inspectPhotoQuality(file);
      if (selectionRef.current !== selectionId) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      updateUploadState({
        uploadStatus: "success",
        photoCheckResult: result,
        uploadErrorMessage: undefined,
        photoName: file.name,
        photoUrl: previewUrl,
        photoDataUrl: dataUrl,
      });
      showToast(result === "available" ? "照片可用，可继续生成" : "照片已上传，请确认清晰度");
    } catch {
      if (selectionRef.current !== selectionId) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      updateUploadState({
        uploadStatus: "error",
        photoCheckResult: "failed",
        uploadErrorMessage: "照片读取失败，请重新上传",
        photoDataUrl: undefined,
      });
      URL.revokeObjectURL(previewUrl);
      showToast("照片读取失败，请重新上传");
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      dragRestoreRef.current = state.uploadStatus === "dragging" ? "idle" : state.uploadStatus;
      await handleFile(file);
      return;
    }
    updateUploadState({ uploadStatus: dragRestoreRef.current });
  };

  const handleDragEnter = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (state.uploadStatus !== "uploading") {
      dragRestoreRef.current = state.uploadStatus === "dragging" ? "idle" : state.uploadStatus;
      updateUploadState({ uploadStatus: "dragging" });
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    updateUploadState({ uploadStatus: dragRestoreRef.current });
  };

  const handleNext = () => {
    if (isUploading) return showToast("照片还在处理中");
    if (!canGoNext) return showToast("请先上传清晰照片");
    if (state.photoCheckResult === "warning" && !window.confirm("当前照片可能影响生成效果，建议重新上传清晰正脸照。仍要继续吗？")) {
      return;
    }
    nav("preferences");
  };

  const useDemoPhoto = () => {
    if (state.photoUrl.startsWith("blob:")) URL.revokeObjectURL(state.photoUrl);
    updateUploadState({
      uploadStatus: "success",
      photoCheckResult: "available",
      uploadErrorMessage: undefined,
      photoName: "示例照片",
      photoUrl: HOME_ASSETS.heroPerson,
      photoDataUrl: undefined,
      isGenerating: false,
      generationError: undefined,
    });
    showToast("已使用示例照片");
  };

  return (
    <main className="page upload-page">
      <PageHeader title="上传照片" onBack={() => nav("select")} backLabel="返回选择报告" align="left" />

      <section className={`topic-photo-requirement ${requirement.strictness}`}>
        <div>
          <span>{reportType.name}</span>
          <h2>{requirement.title}</h2>
          <p>{requirement.desc}</p>
        </div>
        <div className="topic-photo-tags">
          {requirement.tips.map((tip) => <b key={tip}>{tip}</b>)}
        </div>
      </section>

      <section className="photo-tips-card">
        <div className="tips-title"><img src={PHOTO_UPLOAD_ASSETS.tinyStars} alt="" />拍照小贴士</div>
        <div className="example-grid">
          <ExampleCard example={PHOTO_TIPS.goodExample} tone="good" />
          <ExampleCard example={PHOTO_TIPS.badExample} tone="bad" />
        </div>
        <div className="quick-tip-bar">
          {PHOTO_TIPS.quickTips.map((tip, index) => (
            <div className="quick-tip-item" key={tip.label}>
              <img src={tip.icon} alt="" />
              <span>{tip.label}</span>
              {index < PHOTO_TIPS.quickTips.length - 1 && <i />}
            </div>
          ))}
        </div>
      </section>

      <section
        className={`upload-zone-card ${state.uploadStatus === "error" ? "has-error" : ""}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/heic,image/heif"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div
          className={`upload-drop-zone ${state.uploadStatus === "dragging" ? "dragging" : ""}`}
          onClick={openPicker}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openPicker(); }}
        >
          <img className="upload-icon" src={PHOTO_UPLOAD_ASSETS.uploadCloud} alt="" />
          <h2 className="upload-title">{uploadCopy.title}</h2>
          <p className="upload-desc">{uploadCopy.desc}</p>
          {state.uploadStatus === "error" && state.uploadErrorMessage && <p className="upload-error">{state.uploadErrorMessage}</p>}
          <div className="upload-preview-shell">
            <img className="upload-preview-image" src={zoneImage} alt={state.uploadStatus === "success" ? "已上传照片预览" : "上传占位图"} />
            {state.uploadStatus === "success" && <span>已上传照片预览</span>}
          </div>
        </div>
      </section>

      {state.uploadStatus === "success" && (
        <section className={`uploaded-status-card ${checkCopy.tone}`}>
          <img className="uploaded-thumb" src={state.photoUrl} alt="上传照片缩略图" />
          <div className="uploaded-status-copy">
            <div className={`status-pill ${checkCopy.tone}`}>
              <img src={checkCopy.tone === "available" ? PHOTO_UPLOAD_ASSETS.checkGreen : checkCopy.tone === "warning" ? PHOTO_UPLOAD_ASSETS.checkPink : PHOTO_UPLOAD_ASSETS.crossGray} alt="" />
              {checkCopy.title}
            </div>
            <p>{checkCopy.desc}</p>
            <small>{state.photoName} · {state.photoUrl.startsWith("blob:") ? "本地预览" : "示例照片"}</small>
          </div>
          <img className="status-heart status-heart-one" src={PHOTO_UPLOAD_ASSETS.heartSingle} alt="" />
          <img className="status-heart status-heart-two" src={PHOTO_UPLOAD_ASSETS.heartsDouble} alt="" />
        </section>
      )}

      <div className="upload-action-bar">
        <button className={`primary-button ${canGoNext ? "enabled" : "disabled"}`} disabled={!canGoNext} onClick={handleNext}>
          {isUploading ? "处理中..." : <>下一步 <Sparkles size={20} /></>}
        </button>
        <button className="secondary-button" onClick={openPicker}>重新上传</button>
        <button className="use-demo-link" onClick={useDemoPhoto}>没有合适照片？<strong>使用示例照片</strong></button>
      </div>
    </main>
  );
}

function ExampleCard({ example, tone }: { example: { title: string; image: string; checklist: readonly string[] }; tone: "good" | "bad" }) {
  const ok = tone === "good";
  return (
    <article className={`example-card ${ok ? "good" : "bad"}`}>
      <div className="example-title">
        <img src={ok ? PHOTO_UPLOAD_ASSETS.checkPink : PHOTO_UPLOAD_ASSETS.crossGray} alt="" />
        <h3>{example.title}</h3>
      </div>
      <div className="example-body">
        <img className="example-image" src={example.image} alt={example.title} />
        <ul>
          {example.checklist.map((item) => (
            <li key={item}>
              <img src={ok ? PHOTO_UPLOAD_ASSETS.checkPink : PHOTO_UPLOAD_ASSETS.crossGray} alt="" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function PreferencesPage({
  state,
  setState,
  nav,
  showToast,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  nav: (r: Route) => void;
  showToast: (t: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [reuploadOpen, setReuploadOpen] = useState(false);

  const updatePreference = (sectionId: "style" | "scene", optionId: string) => {
    setState((s) => ({
      ...s,
      preferences: {
        ...s.preferences,
        [sectionId === "style" ? "stylePreferences" : "targetScenes"]: [optionId],
      },
    }));
  };

  const updateSingle = (optionId: string) => {
    setState((s) => ({
      ...s,
      preferences: {
        ...s.preferences,
        changeIntensity: optionId,
      },
    }));
  };

  const handleSave = () => {
    if (!state.preferences.stylePreferences.length) return showToast("请选择至少一个造型表达偏好");
    if (!state.preferences.targetScenes.length) return showToast("请选择至少一个目标场景");
    if (!state.preferences.changeIntensity) return showToast("请选择改变幅度");
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      nav("preanalysis");
    }, 420);
  };

  const handleReuploadConfirm = () => {
    setReuploadOpen(false);
    if (state.photoUrl.startsWith("blob:")) URL.revokeObjectURL(state.photoUrl);
    setState((s) => ({
      ...s,
      route: "upload",
      photoUrl: "",
      photoName: "",
      photoDataUrl: undefined,
      preferences: { ...DEFAULT_PREFERENCES },
    }));
    nav("upload");
  };

  return (
    <main className="page preference-page">
      <div className="preference-page__bg" aria-hidden="true">
        <SafeAssetImage className="preference-bg-cloud preference-bg-cloud--left" src={PREFERENCE_ASSETS.cloud} alt="" />
        <SafeAssetImage className="preference-bg-cloud preference-bg-cloud--right" src={PREFERENCE_ASSETS.cloud} alt="" />
        <SafeAssetImage className="preference-bg-heart" src={PREFERENCE_ASSETS.heart} alt="" />
        <SafeAssetImage className="preference-bg-twinkle preference-bg-twinkle--pink" src={PREFERENCE_ASSETS.twinklePink} alt="" />
        <SafeAssetImage className="preference-bg-twinkle preference-bg-twinkle--white" src={PREFERENCE_ASSETS.twinkleWhite} alt="" />
      </div>

      <div className="preference-page__inner">
        <PageHeader title="生成偏好" onBack={() => nav("upload")} backLabel="返回上传" />
        <div className="preference-header__decor" aria-hidden="true">
          <SafeAssetImage className="decor-twinkle decor-twinkle--1" src={PREFERENCE_ASSETS.twinkleWhite} alt="" />
          <SafeAssetImage className="decor-twinkle decor-twinkle--2" src={PREFERENCE_ASSETS.twinklePink} alt="" />
        </div>

        {preferenceSections.map((section) => (
          <PreferenceSectionCard
            key={section.id}
            section={section}
            selectedValues={section.id === "style" ? state.preferences.stylePreferences : section.id === "scene" ? state.preferences.targetScenes : [state.preferences.changeIntensity]}
            onToggle={(optionId) => {
              if (section.mode === "single") {
                if (section.id === "range") {
                  updateSingle(optionId);
                } else {
                  updatePreference(section.id as "style" | "scene", optionId);
                }
              } else {
                updatePreference(section.id as "style" | "scene", optionId);
              }
            }}
          />
        ))}

      <BottomActionBar saving={saving} onSave={handleSave} onReupload={() => setReuploadOpen(true)} />
      </div>

      {reuploadOpen && <ReuploadDialog onCancel={() => setReuploadOpen(false)} onConfirm={handleReuploadConfirm} />}
    </main>
  );
}

function PreferenceSectionCard({
  section,
  selectedValues,
  onToggle,
}: {
  section: (typeof preferenceSections)[number];
  selectedValues: string[];
  onToggle: (optionId: string) => void;
}) {
  return (
    <section className="preference-section">
      <div className="section-header">
        <div className="section-title">
          <SafeAssetImage className="section-icon" src={section.icon} alt="" />
          <span className="section-index">{section.index}</span>
          <h2>{section.title}</h2>
        </div>
        <p className="section-desc">{section.desc}</p>
      </div>
      <div className={`option-grid option-grid--${section.id}`}>
        {section.options.map((option) => (
          <PreferenceOptionCard
            key={option.id}
            option={option}
            selected={selectedValues.includes(option.id)}
            mode={section.mode}
            onClick={() => onToggle(option.id)}
          />
        ))}
      </div>
    </section>
  );
}

function PreferenceOptionCard({
  option,
  selected,
  mode,
  onClick,
}: {
  option: (typeof preferenceSections)[number]["options"][number];
  selected: boolean;
  mode: "single" | "multiple";
  onClick: () => void;
}) {
  return (
      <button
        className={`preference-option ${selected ? "selected" : ""} ${mode}`}
        onClick={onClick}
        type="button"
        style={{ "--option-accent": option.color, "--option-bg": option.bg } as React.CSSProperties}
      >
        <SafeAssetImage className="preference-option__tile" src={option.tile || option.icon} alt="" aria-hidden="true" />
        <SafeAssetImage className="preference-option__icon" src={option.icon} alt="" aria-hidden="true" />
        <span className="preference-option__label">{option.label}</span>
      <span className="preference-option__check">
        <SafeAssetImage src={selected ? PREFERENCE_ASSETS.checkSelected : PREFERENCE_ASSETS.radioEmpty} alt="" aria-hidden="true" />
      </span>
    </button>
  );
}

function BottomActionBar({ saving, onSave, onReupload }: { saving: boolean; onSave: () => void; onReupload: () => void }) {
  return (
    <div className="preference-actions">
      <button className="save-button" onClick={onSave} disabled={saving} type="button">
        {saving ? "保存中..." : "保存偏好"}
      </button>
      <button className="reupload-button" onClick={onReupload} type="button">
        重新上传
      </button>
    </div>
  );
}

function ReuploadDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <section className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <SafeAssetImage src={PREFERENCE_ASSETS.heart} alt="" />
        <h3>重新上传会清空当前偏好，确认继续吗？</h3>
        <p>确认后将返回上传页，重新选择照片和偏好。</p>
        <div className="dialog-actions">
          <button className="reupload-button" onClick={onCancel} type="button">取消</button>
          <button className="save-button" onClick={onConfirm} type="button">确认继续</button>
        </div>
      </section>
    </div>
  );
}

function PreAnalysisPage({
  state,
  type,
  products,
  nav,
  onAnalyze,
  onOpenPaywall,
}: {
  state: AppState;
  type: ReportType;
  products: Product[];
  nav: (r: Route) => void;
  onAnalyze: () => void;
  onOpenPaywall: (reason: string) => void;
}) {
  useEffect(() => {
    if (!isCurrentPreAnalysis(state.preAnalysis, type.id)) onAnalyze();
  }, [state.preAnalysis, type.id]);
  const analysis = state.preAnalysis?.reportType === type.id ? state.preAnalysis : undefined;
  const recommendedProduct = products.find((item) => item.id === (analysis?.recommendedProductId || (type.id === "comprehensive" ? "full" : "single")));
  const hasRight = state.rights[type.rightKey] > 0;
  return (
    <main className="page preanalysis-page">
      <PageHeader title="免费预分析" onBack={() => nav("preferences")} backLabel="返回偏好" align="left" />

      <section className="preanalysis-hero">
        <div className="preanalysis-photo">
          <img src={state.photoUrl || PHOTO_UPLOAD_ASSETS.uploadPlaceholder} alt="上传照片预览" />
          <span>{type.name}</span>
        </div>
        <div className="preanalysis-copy">
          <small>AISea Preview</small>
          <h2>{analysis?.title || `${type.name}预分析`}</h2>
          <p>{analysis?.summary || "正在读取照片、专题和偏好，生成一份低成本文字预分析。"}</p>
        </div>
      </section>

      {state.isPreAnalyzing && (
        <section className="preanalysis-loading">
          <Sparkles />
          <span>正在生成文字预分析...</span>
        </section>
      )}

      {analysis && (
        <>
          <section className="preanalysis-insights" aria-label="预分析内容">
            {analysis.sections.map((section) => (
              <article key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </section>

          {state.preAnalysisError && <p className="preanalysis-note">接口暂不可用，当前展示本地预分析模板：{state.preAnalysisError}</p>}
        </>
      )}

      <section className="preanalysis-pay-card">
        <div>
          <span className="preanalysis-pay-card__eyebrow">下一步</span>
          <h2>{hasRight ? "使用已购权益生成完整报告" : `生成完整报告${recommendedProduct ? ` ¥${recommendedProduct.price}` : ""}`}</h2>
          <p>{hasRight ? "确认本人照片后开始生成，成功后才扣权益。" : "购买成功后会回到本页，重新点击后再生成。"}</p>
        </div>
        <button
          className="confirm-primary-btn"
          onClick={() => {
            if (!analysis || state.isPreAnalyzing) return;
            if (!hasRight) {
              onOpenPaywall(type.rightKey === "comprehensive" ? "综合报告需要先购买全案探索卡" : "生成完整专题前需要先完成支付");
              return;
            }
            nav("confirm");
          }}
          disabled={!analysis || state.isPreAnalyzing}
        >
          <span className="confirm-primary-btn__label">{hasRight ? "生成完整报告" : "选择套餐并支付"}</span>
          <Sparkles size={18} />
        </button>
        <button className="confirm-secondary-btn" onClick={() => nav("upload")}>重新上传照片</button>
      </section>
    </main>
  );
}

function PaywallSheet({
  paying,
  onClose,
  onCheckout,
  reason,
}: {
  paying: PayingState;
  onClose: () => void;
  onCheckout: (item: PaywallPackage, channel: PayChannel) => void;
  reason?: string;
}) {
  return (
    <div className="paywall-backdrop" onClick={onClose}>
      <section className="paywall-sheet" onClick={(e) => e.stopPropagation()} aria-label="选择报告套餐">
        <button className="paywall-close" onClick={onClose} aria-label="关闭">
          <XMark />
        </button>

        <div className="sheet-handle" />

        <header className="paywall-header">
          <h2>选择报告套餐</h2>
          <p>{reason || "生成完整报告前需先完成支付"}</p>
        </header>

        <div className="paywall-products">
          {PAYWALL_PACKAGES.map((item) => (
            <article className="package-card" key={item.id}>
              {item.badge && <div className="package-badge">{item.badge}</div>}
              <div className="package-main">
                <div className="package-icon" aria-hidden="true">
                  <PackageGlyph kind={item.icon} />
                </div>
                <div className="package-info">
                  <div className="package-title">{item.title}</div>
                  <div className="package-desc">{item.description}</div>
                </div>
                <div className="package-price">
                  <div className="price">¥{item.price}</div>
                  {item.originalPrice && <div className="origin-price">¥{item.originalPrice}</div>}
                </div>
              </div>

              <div className="payment-buttons">
                <button
                  type="button"
                  className="pay-button wechat"
                  onClick={() => onCheckout(item, "wechat")}
                  disabled={paying?.packageId === item.id}
                >
                  <WechatPayIcon />
                  {isPaying(paying, item.id, "wechat") ? "跳转中..." : "微信支付"}
                </button>
                <button
                  type="button"
                  className="pay-button alipay"
                  onClick={() => onCheckout(item, "alipay")}
                  disabled={paying?.packageId === item.id}
                >
                  <AlipayPayIcon />
                  {isPaying(paying, item.id, "alipay") ? "跳转中..." : "支付宝支付"}
                </button>
              </div>
            </article>
          ))}
        </div>

        <footer className="paywall-footer">
          <ShieldCheck size={16} />
          <span>支付安全有保障</span>
          <span className="paywall-divider">|</span>
          <span>订单完成后可在「我的订单」中查看</span>
        </footer>
      </section>
    </div>
  );
}

function PackageGlyph({ kind }: { kind: PaywallPackage["icon"] }) {
  if (kind === "card") return <PackagePlus size={28} strokeWidth={1.9} />;
  if (kind === "crown") return <Crown size={28} strokeWidth={1.9} />;
  return <FileText size={28} strokeWidth={1.9} />;
}

function WechatPayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9.2 3.5c3.9 0 7 2.4 7 5.4 0 2.9-3.1 5.4-7 5.4-.4 0-.9 0-1.3-.1L4.8 16l.9-2.8C4.5 12.2 3.6 10.9 3.6 8.9c0-3 3.1-5.4 5.6-5.4Z" fill="currentColor" opacity=".18" />
      <path d="M10.2 6.2h3.4v1.1h-1.1l1.1 1.6h-1.4l-.8-1.2-.8 1.2H9.2l1.1-1.6H9.2V6.2Zm-1.6 5.4c-.4 0-.8.3-.8.7s.4.7.8.7.8-.3.8-.7-.4-.7-.8-.7Zm3.6 0c-.4 0-.8.3-.8.7s.4.7.8.7.8-.3.8-.7-.4-.7-.8-.7Z" fill="currentColor" />
    </svg>
  );
}

function AlipayPayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="6.5" width="14" height="11" rx="3" fill="currentColor" opacity=".15" />
      <path d="M8 6.8h8.1v1.8H13l2.9 6.2H14l-.8-1.8H9.7l-.7 1.8H7.2l2.8-6.2H8V6.8Zm2.3 4.6h2.6L12 8.9l-1.7 2.5Z" fill="currentColor" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function ConfirmPage({
  state,
  setState,
  type,
  nav,
  startGenerate,
  onOpenPaywall,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  type: ReportType;
  nav: (r: Route) => void;
  startGenerate: () => void;
  onOpenPaywall: (reason: string) => void;
}) {
  const selectedPreferenceLabels = [
    ...state.preferences.stylePreferences.map((item) => ({ key: `style-${item}`, label: preferenceLabel("style", item) })),
    ...state.preferences.targetScenes.map((item) => ({ key: `scene-${item}`, label: preferenceLabel("scene", item) })),
    { key: `range-${state.preferences.changeIntensity}`, label: preferenceLabel("range", state.preferences.changeIntensity) },
  ];
  const isInvalidPhoto = state.uploadStatus === "error" || state.photoCheckResult === "failed";
  const hasPhoto = Boolean(state.photoUrl);
  const hasRight = state.rights[type.rightKey] > 0;
  const canProceed = hasPhoto && !isInvalidPhoto && state.privacyAccepted && !state.isGenerating;
  return (
    <main className="page confirm-generate-page">
      <img className="confirm-bg confirm-bg-left" src={CONFIRM_GENERATE_ASSETS.decoSmall} alt="" aria-hidden="true" />
      <img className="confirm-bg confirm-bg-right" src={CONFIRM_GENERATE_ASSETS.decoLarge} alt="" aria-hidden="true" />

      <PageHeader title="确认生成" onBack={() => nav("preanalysis")} backLabel="返回预分析" />

      <section className="confirm-report-card confirm-fade-in" style={{ animationDelay: "0ms" }}>
        <div className="confirm-report-head">
          <img className="confirm-report-illus left" src={CONFIRM_GENERATE_ASSETS.report} alt="" aria-hidden="true" />
          <div className="confirm-report-copy">
            <div className="confirm-report-title-row">
              <h2>{type.name}</h2>
            </div>
            <p>{type.subtitle}</p>
          </div>
          <img className="confirm-report-illus right" src={CONFIRM_GENERATE_ASSETS.folderHeart} alt="" aria-hidden="true" />
        </div>

        <div className="confirm-block">
          <div className="confirm-block-title"><i />包含模块</div>
          <div className="confirm-tag-grid">
            {CONFIRM_MODULES.map((item) => (
              <div className="confirm-module-tag" key={item.key}>
                <img src={item.icon} alt="" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="confirm-block">
          <div className="confirm-block-title"><i />已选择偏好</div>
          <div className="confirm-tag-grid confirm-preference-grid">
            {CONFIRM_PREFERENCES.map((item, index) => {
              const selectedLabel = selectedPreferenceLabels[index]?.label || item.label;
              return (
                <div className="confirm-preference-tag" key={item.key}>
                  <img src={item.icon} alt="" aria-hidden="true" />
                  <span>{selectedLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="confirm-time-tip">
          <img src={CONFIRM_GENERATE_ASSETS.clock} alt="" aria-hidden="true" />
          <span>预计耗时 1–3 分钟，生成失败不会消耗权益</span>
        </div>
      </section>

      <button
        type="button"
        className={`confirm-privacy-row confirm-fade-in ${state.privacyAccepted ? "checked" : ""}`}
        style={{ animationDelay: "80ms" }}
        onClick={() => setState((s) => ({ ...s, privacyAccepted: !s.privacyAccepted }))}
      >
        <span className="confirm-checkbox">{state.privacyAccepted && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
        <span className="confirm-privacy-copy">
          <strong>我确认上传的是本人照片</strong>
          <span>{PRIVACY_TEXT}</span>
        </span>
      </button>

      <div className="confirm-bottom-actions confirm-fade-in" style={{ animationDelay: "120ms" }}>
        <button
          className="confirm-primary-btn"
          disabled={!canProceed}
          onClick={() => {
            if (!canProceed) return;
            if (!hasRight) {
              onOpenPaywall("生成完整报告前需要先完成支付");
              return;
            }
            startGenerate();
          }}
        >
          <span className="confirm-primary-btn__label">{state.isGenerating ? "生成中..." : hasRight ? "开始生成报告" : "选择报告套餐"}</span>
          <Sparkles size={18} />
        </button>
        <button className="confirm-secondary-btn" onClick={() => nav("preanalysis")}>返回预分析</button>
      </div>
    </main>
  );
}

function ProgressPage({ progress, hasReport, error, nav, showToast }: { progress: number; hasReport: boolean; error?: string; nav: (r: Route) => void; showToast: (t: string) => void }) {
  const displayProgress = useAnimatedNumber(progress, 720);
  const percent = Math.round(displayProgress);
  const ready = progress >= 100 && hasReport;
  const failed = Boolean(error);
  const statusText = failed ? "生成失败" : ready ? "进度已同步" : "生成中...";
  const bottomLabel = failed ? "重新生成" : ready ? "查看报告" : "稍后再看";
  const handleBottomClick = () => {
    if (failed) {
      nav("confirm");
      return;
    }
    if (ready) {
      nav("result");
      return;
    }
    showToast("报告还在生成中，请稍后再试");
  };

  return (
    <main className="page progress-stage">
      <div className="progress-stage-layout">
        <div className="progress-stage-bg">
          <img className="progress-bg-image" src={REPORT_PROGRESS_ASSETS.background} alt="" aria-hidden="true" />
          <span className="progress-bg-glow progress-bg-glow-a" />
          <span className="progress-bg-glow progress-bg-glow-b" />
        </div>

        <img className="progress-decoration sparkle-left" src={REPORT_PROGRESS_ASSETS.sparklePink} alt="" aria-hidden="true" />
        <img className="progress-decoration sparkle-right" src={REPORT_PROGRESS_ASSETS.sparklePink} alt="" aria-hidden="true" />
        <img className="progress-decoration sparkle-white" src={REPORT_PROGRESS_ASSETS.sparkleWhite} alt="" aria-hidden="true" />
        <img className="progress-decoration sparkle-gray" src={REPORT_PROGRESS_ASSETS.sparkleGray} alt="" aria-hidden="true" />
        <img className="progress-decoration heart-left" src={REPORT_PROGRESS_ASSETS.heart} alt="" aria-hidden="true" />
        <img className="progress-decoration wand-right" src={REPORT_PROGRESS_ASSETS.wand} alt="" aria-hidden="true" />
        <img className="progress-decoration cloud-mascot" src={REPORT_PROGRESS_ASSETS.cloud} alt="" aria-hidden="true" />
        <img className="progress-decoration sparkle-cluster" src={REPORT_PROGRESS_ASSETS.sparkleCluster} alt="" aria-hidden="true" />
        <img className="progress-decoration bottom-cloud-left" src={REPORT_PROGRESS_ASSETS.bottomCloudLeft} alt="" aria-hidden="true" />
        <img className="progress-decoration bottom-cloud-right" src={REPORT_PROGRESS_ASSETS.bottomCloudRight} alt="" aria-hidden="true" />
        <img className="progress-decoration soft-dot-a" src={REPORT_PROGRESS_ASSETS.lightDot} alt="" aria-hidden="true" />
        <img className="progress-decoration soft-dot-b" src={REPORT_PROGRESS_ASSETS.lightDot} alt="" aria-hidden="true" />

        <PageHeader title="生成进度" onBack={() => nav("home")} backLabel="返回首页" />

        <section className="progress-title">
          <div className="progress-title-decor">
            <img src={REPORT_PROGRESS_ASSETS.sparklePink} alt="" aria-hidden="true" />
            <img src={REPORT_PROGRESS_ASSETS.sparklePink} alt="" aria-hidden="true" />
          </div>
          <h1>报告正在生成中</h1>
          <p className="progress-title-copy">
            <strong>预计需要 1~5 分钟</strong>
            <span>可切到其他页面，回来自动同步进度</span>
          </p>
        </section>

        <section className="progress-ring-shell" aria-label="生成进度">
          <div className="progress-ring-shadow" />
          <svg className="progress-ring-svg" viewBox="0 0 260 260" aria-hidden="true">
            <defs>
              <linearGradient id="progressPinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff9abb" />
                <stop offset="55%" stopColor="#ff5f95" />
                <stop offset="100%" stopColor="#ff2f78" />
              </linearGradient>
            </defs>
            <circle className="progress-ring-outer" cx="130" cy="130" r="103" />
            <circle className="progress-ring-thin" cx="130" cy="130" r="112" />
            <circle className="progress-ring-bg" cx="130" cy="130" r="96" />
            <circle
              className="progress-ring-bar"
              cx="130"
              cy="130"
              r="96"
              style={{ strokeDashoffset: `${603 - (603 * progress) / 100}` }}
            />
          </svg>
          <div className="progress-ring-content">
            <div className={`progress-percent ${ready ? "is-100" : ""}`} aria-label={`${percent} percent`}>{percent}<span>%</span></div>
            <div className="progress-status">{statusText}</div>
            {failed && <div className="progress-error-text">{error}</div>}
          </div>
          <span className="progress-ring-dot" style={{ "--progress": progress } as React.CSSProperties} />
        </section>

        <section className="progress-card" aria-label="步骤进度">
          <span className="progress-timeline-line" aria-hidden="true" />
          {REPORT_PROGRESS_STEPS.map((step, index) => {
            const status: ProgressStepStatus = progress >= step.doneAt
              ? "done"
              : progress >= step.activeAt
                ? "active"
                : "pending";
            return (
              <React.Fragment key={step.id}>
                <article className={`progress-step ${status}`}>
                  {status === "active" && <img className="progress-step-highlight" src={REPORT_PROGRESS_ASSETS.activeCard} alt="" aria-hidden="true" />}
                  <div className={`progress-step-badge ${status}`}>
                    {status === "done" ? <Check size={22} strokeWidth={3.1} /> : <span>{step.id}</span>}
                  </div>
                  <div className="progress-step-copy">
                    <strong>{step.title}</strong>
                    <p>{step.desc}</p>
                  </div>
                  <div className="progress-step-state">
                    {status === "active" ? (
                      <div className="progress-loading-dots" aria-hidden="true">
                        {Array.from({ length: 8 }).map((_, dotIndex) => <span key={dotIndex} />)}
                      </div>
                    ) : status === "done" && ready ? (
                      <Check size={18} />
                    ) : status === "done" ? (
                      <img className="progress-card-sparkle" src={REPORT_PROGRESS_ASSETS.sparklePink} alt="" aria-hidden="true" />
                    ) : (
                      <img className="progress-pending-sparkle" src={REPORT_PROGRESS_ASSETS.sparkleGray} alt="" aria-hidden="true" />
                    )}
                  </div>
                </article>
                {index < REPORT_PROGRESS_STEPS.length - 1 && <img className="progress-divider" src={REPORT_PROGRESS_ASSETS.dashedDivider} alt="" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </section>

        <button className={`progress-bottom-btn ${ready ? "is-complete" : ""}`} onClick={handleBottomClick}>
          {bottomLabel}
        </button>
      </div>
    </main>
  );
}

function useAnimatedNumber(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);
  useEffect(() => {
    const from = currentRef.current;
    const to = target;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const ratio = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const next = from + (to - from) * eased;
      currentRef.current = next;
      setValue(next);
      if (ratio < 1) {
        raf = window.requestAnimationFrame(frame);
      } else {
        currentRef.current = to;
      }
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

type SharePlatform = "xhs" | "wechat" | "moments";

type ShareAssets = {
  report_id: string;
  report_type: string;
  style_persona: string;
  cover_image_url: string;
  report_image_url: string;
  summary_image_url: string;
  share_title: string;
  share_text: string;
  copy_text: string;
  hashtags: string[];
  platform_actions?: Partial<Record<SharePlatform, { label: string; deep_link: string; hint: string }>>;
};

function reportAssetUrl(reportId: string, kind: "report" | "cover" | "summary") {
  return `/api/reports/${reportId}/${kind}.png`;
}

function ResultPage({ state, showComprehensiveReport, nav, showToast }: { state: AppState; showComprehensiveReport: boolean; nav: (r: Route) => void; showToast: (t: string) => void }) {
  const report = state.reports[0];
  const [shareState, setShareState] = useState<{ open: boolean; platform: SharePlatform; loading: boolean; assets?: ShareAssets; error?: string }>({
    open: false,
    platform: "xhs",
    loading: false,
  });
  const shareRequestSeq = useRef(0);
  if (!report) return <Empty title="还没有生成报告" text="请先选择报告类型并完成生成。" action="选择报告" onClick={() => nav("select")} />;
  const type = REPORT_TYPES.find((item) => item.id === report.type)!;
  const persona = PERSONAS[report.persona];
  const reportDownloadUrl = reportAssetUrl(report.id, "report");

  if (report.status === "failed" && !report.reportImageUrl) {
    return <Empty title="报告生成失败" text={report.error || "没有拿到完整报告图，请重新生成。"} action="重新生成" onClick={() => nav("confirm")} />;
  }

  const prepareShareAssets = async (platform: SharePlatform) => {
    const requestId = ++shareRequestSeq.current;
    setShareState((current) => ({ ...current, open: true, platform, loading: true, error: undefined }));
    try {
      const response = await fetch("/api/reports/prepare-xhs-share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          report_id: report.id,
          report_type: report.type,
          style_persona: persona.title,
        }),
      });
      if (!response.ok) throw new Error(`share prep failed with HTTP ${response.status}`);
      const assets = await response.json() as ShareAssets;
      if (requestId !== shareRequestSeq.current) return;
      setShareState({
        open: true,
        platform,
        loading: false,
        assets,
      });
      await copyText(assets.copy_text || xhsCopy(type, report.persona, report.subjectGender), showToast, false);
    } catch (error) {
      if (requestId !== shareRequestSeq.current) return;
      setShareState({
        open: true,
        platform,
        loading: false,
        error: error instanceof Error ? error.message : "分享素材准备失败",
        assets: {
          report_id: report.id,
          report_type: type.id,
          style_persona: persona.title,
          cover_image_url: reportAssetUrl(report.id, "cover"),
          report_image_url: reportDownloadUrl,
          summary_image_url: reportAssetUrl(report.id, "summary"),
          share_title: `${type.name}已准备好`,
          share_text: xhsCopy(type, report.persona, report.subjectGender),
          copy_text: xhsCopy(type, report.persona, report.subjectGender),
          hashtags: ["AI形象报告", "变美思路", "个人风格定位", "发型推荐"],
          platform_actions: buildShareActions(),
        },
      });
      showToast("分享素材已回退为本地模板");
    }
  };

  const closeShare = () => {
    shareRequestSeq.current += 1;
    setShareState((current) => ({ ...current, open: false }));
  };

  const onDownload = () => downloadAsset(reportDownloadUrl, `${report.type}-report.${reportDownloadUrl.endsWith(".svg") ? "svg" : "png"}`, showToast);

  return (
    <main className="result-page">
      <PageHeader title="查看结果" onBack={() => nav("home")} backLabel="返回首页" action={<button className="page-header__action-btn" onClick={() => prepareShareAssets("xhs")} aria-label="分享报告"><Share2 aria-hidden="true" /></button>} />
      <section className="result-summary">
        <div className="result-summary-copy">
          <span className="result-summary-eyebrow">本次结果</span>
          <h2>{type.name}</h2>
          <p>{persona.title} · {persona.summary}</p>
        </div>
        <div className="result-summary-tags">
          {type.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </section>
      <section className="result-preview-band">
        <div className="result-preview-head">
          <div>
            <b>页面预览</b>
            <p>屏幕里看的是清晰可读的移动版报告，保存版会单独导出高清长图。</p>
          </div>
          <span>{report.status === "completed" ? "高清下载已就绪" : "使用本地模板兜底"}</span>
        </div>
        <ReportCanvas id="report-card" type={type} persona={persona} className="result-preview-report" />
      </section>
      <ResultActionBar
        rights={state.rights}
        showComprehensiveReport={showComprehensiveReport}
        onDownload={onDownload}
        onGenerate={() => nav("select")}
        onShare={prepareShareAssets}
      />
      {shareState.open && (
        <ShareSheet
          report={report}
          type={type}
          photo={reportAssetUrl(report.id, "cover")}
          platform={shareState.platform}
          assets={shareState.assets}
          loading={shareState.loading}
          error={shareState.error}
          close={closeShare}
          showToast={showToast}
          onSelectPlatform={prepareShareAssets}
        />
      )}
    </main>
  );
}

function buildShareActions() {
  return {
    xhs: { label: "打开小红书", deep_link: "xhsdiscover://", hint: "若未自动打开，请手动打开小红书" },
    wechat: { label: "打开微信", deep_link: "weixin://dl/chat", hint: "可先复制文案，再发给朋友或群聊" },
    moments: { label: "打开朋友圈", deep_link: "weixin://dl/moments", hint: "如未跳转，可先进入微信后手动发布朋友圈" },
  } as const;
}

function ResultActionBar({ rights, showComprehensiveReport, onDownload, onGenerate, onShare }: { rights: Rights; showComprehensiveReport: boolean; onDownload: () => void; onGenerate: () => void; onShare: (platform: SharePlatform) => void }) {
  return (
    <footer className="result-bottom-bar">
      <div className="result-rights">
        {showComprehensiveReport && <span><FileText size={16} />综合剩余 <b>{rights.comprehensive}</b></span>}
        <span><KeyRound size={16} />专题剩余 <b>{rights.topic}</b></span>
      </div>
      <div className="result-primary-actions">
        <button className="result-download-btn" onClick={onDownload}><Download /><span>下载完整报告<small>高清大图，直接保存</small></span></button>
        <button className="result-generate-btn" onClick={onGenerate}><PackagePlus /><span>继续生成专题<small>再补一个方向看看</small></span></button>
      </div>
      <section className="result-share-panel" aria-label="分享结果">
        <div className="result-share-copy">
          <Heart />
          <span>
            <b>分享</b>
            <small>先准备素材，再发到对应平台</small>
          </span>
        </div>
        <div className="result-share-icons">
          <button className="result-share-icon xhs" onClick={() => onShare("xhs")} aria-label="分享到小红书"><img src={HOME_ASSETS.xiaohongshu} alt="" /></button>
          <button className="result-share-icon wechat" onClick={() => onShare("wechat")} aria-label="分享到微信"><img src={HOME_ASSETS.wechat} alt="" /></button>
          <button className="result-share-icon moments" onClick={() => onShare("moments")} aria-label="分享到朋友圈"><img src={HOME_ASSETS.moments} alt="" /></button>
        </div>
      </section>
    </footer>
  );
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

function ReportCanvas({ id, type, persona, className = "" }: { id: string; type: ReportType; persona: typeof PERSONAS.softFrench; className?: string }) {
  const title = type.id === "comprehensive" ? BEAUTY_REPORT.title : `${type.name}\n变美报告`;
  return (
    <article className={`report-canvas beauty-report-canvas ${className}`} id={id}>
      <HeroBanner title={title} persona={persona} />
      <div className="beauty-report-grid">
        <SectionCard index={1} title="发型推荐" className="span-wide"><HairstyleSection /></SectionCard>
        <SectionCard index={2} title="发色推荐"><HairColorSection /></SectionCard>
        <SectionCard index={3} title="色彩分析"><ColorAnalysisSection /></SectionCard>
        <SectionCard index={4} title="面部建议" className="span-wide"><MakeupSection /></SectionCard>
        <SectionCard index={5} title="穿搭风格建议" className="span-wide"><OutfitSection /></SectionCard>
        <SectionCard index={6} title="配饰推荐"><AccessorySection /></SectionCard>
        <SectionCard index={7} title="氛围雷区（避免这些会减分哦）" className="span-wide"><AvoidSection /></SectionCard>
        <SectionCard index={8} title="打理方式"><CareSection /></SectionCard>
      </div>
      <footer className="keyword-summary"><Heart size={20} /><b>你的专属风格关键词：干净质感 ｜ 清新自然 ｜ 协调耐看</b><span>舒服又有辨识度，就是你的风格。</span><Sparkles size={22} /></footer>
    </article>
  );
}

function HeroBanner({ title, persona }: { title: string; persona: typeof PERSONAS.softFrench }) {
  return <section className="beauty-hero"><div className="beauty-hero-copy"><h2>{title}</h2><p>{BEAUTY_REPORT.subtitle}</p><div className="beauty-tag-list">{BEAUTY_REPORT.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><blockquote>{BEAUTY_REPORT.quote}</blockquote><em>{BEAUTY_REPORT.script}</em></div><img className="beauty-hero-person" src={BEAUTY_REPORT_ASSETS.heroPerson} alt={persona.title} decoding="async" /><div className="beauty-keyword-card"><h3>形象关键词</h3>{BEAUTY_REPORT.keywords.map(([name, desc]) => <div key={name}><Sparkles size={24} /><span><b>{name}</b><small>{desc}</small></span></div>)}<p>You look so pretty!</p></div></section>;
}

function SectionCard({ index, title, children, className = "" }: { index: number; title: string; children: React.ReactNode; className?: string }) {
  return <section className={`beauty-section-card ${className}`}><div className="beauty-section-title"><span>{index}</span><h3>{title}</h3></div>{children}</section>;
}

function HairstyleSection() {
  return <div className="hairstyle-section"><img className="report-strip-img" src={BEAUTY_REPORT_ASSETS.hairstyles} alt="发型推荐五连图" loading="lazy" decoding="async" /><div className="hairstyle-labels">{BEAUTY_REPORT.hairstyles.map(([name, desc]) => <span key={name}><b>{name}</b><small>{desc}</small></span>)}</div></div>;
}

function HairColorSection() {
  return <div className="haircolor-section"><img className="report-strip-img" src={BEAUTY_REPORT_ASSETS.hairColors} alt="发色推荐色卡" loading="lazy" decoding="async" /><div className="haircolor-labels">{BEAUTY_REPORT.hairColors.map((name) => <span key={name}>{name}</span>)}</div><p>自然提亮，更显干净质感</p></div>;
}

function ColorAnalysisSection() {
  const recommended = ["#f7b3a5", "#f9d4c9", "#f8e4d6", "#fff2df", "#e6e6be"];
  const avoid = ["#f39a8d", "#f3aaa8", "#bd7c85", "#a86f68", "#8c3f3d"];
  return <div className="color-analysis-section"><article><h4>推荐色盘 <small>柔和明亮</small></h4><div className="color-chip-row">{recommended.map((color) => <i key={color} style={{ background: color }} />)}</div><p>适合干净清爽的路线，提亮肤色，气质加分。</p></article><article><h4>避免色盘 <small>对比过强</small></h4><div className="color-chip-row">{avoid.map((color) => <i key={color} style={{ background: color }} />)}</div><p>高饱和与深暗色容易沉闷，降低亲和力。</p></article></div>;
}

function MakeupSection() {
  return <div className="makeup-section"><img className="report-strip-img" src={BEAUTY_REPORT_ASSETS.makeup} alt="面部建议拼图" loading="lazy" decoding="async" /><div className="makeup-labels">{BEAUTY_REPORT.makeup.map(([title, subtitle]) => <span key={title}><b>{title}</b><small>{subtitle}</small></span>)}</div></div>;
}

function OutfitSection() {
  return <div className="outfit-section">{BEAUTY_REPORT.outfits.map(([title, image, caption]) => <article key={title}><img src={image} alt={title} loading="lazy" decoding="async" /><b>{title}</b><p>{caption}</p></article>)}</div>;
}

function AccessorySection() {
  return <div className="accessory-section"><img src={BEAUTY_REPORT_ASSETS.accessories} alt="配饰推荐四宫格" loading="lazy" decoding="async" /><div>{BEAUTY_REPORT.accessories.map(([title, desc], index) => <span key={`${title}-${index}`}><b>{title}</b><small>{desc}</small></span>)}</div></div>;
}

function AvoidSection() {
  return (
    <div className="avoid-section">
      <img className="report-strip-img" src={BEAUTY_REPORT_ASSETS.avoid} alt="氛围雷区五连图" loading="lazy" decoding="async" />
      <div className="avoid-labels">
        {BEAUTY_REPORT.avoidItems.map(([title, reason]) => (
          <span key={title}><b>{title}</b><small>{reason}</small></span>
        ))}
      </div>
    </div>
  );
}

function CareSection() {
  return (
    <div className="care-section">
      <div className="care-tiles">
        {BEAUTY_REPORT.checklist.map(([title, desc], index) => (
          <article key={title} className="care-tile">
            <div className="care-tile-art">
              <span>{index + 1}</span>
              <WandSparkles />
            </div>
            <b>{title}</b>
            <small>{desc}</small>
          </article>
        ))}
      </div>
      <p>打理步骤做成图卡后，更适合手机上直接看，也更容易照着做。</p>
    </div>
  );
}

function ShareSheet({
  report,
  type,
  photo,
  platform,
  assets,
  loading,
  error,
  close,
  showToast,
  onSelectPlatform,
}: {
  report: UserReport;
  type: ReportType;
  photo: string;
  platform: SharePlatform;
  assets?: ShareAssets;
  loading: boolean;
  error?: string;
  close: () => void;
  showToast: (t: string) => void;
  onSelectPlatform: (platform: SharePlatform) => void;
}) {
  const persona = PERSONAS[report.persona];
  const copy = assets?.copy_text || xhsCopy(type, report.persona, report.subjectGender);
  const coverImage = reportAssetUrl(report.id, "cover");
  const summaryImage = reportAssetUrl(report.id, "summary");
  const reportImage = reportAssetUrl(report.id, "report");
  const platformMeta: Record<SharePlatform, { title: string; desc: string; action: string; deepLink: string }> = {
    xhs: { title: "分享到小红书", desc: "先保存封面、摘要和完整报告，再复制文案发布", action: "打开小红书", deepLink: "xhsdiscover://" },
    wechat: { title: "分享到微信", desc: "先保存图片，再把文案发给朋友或自己收藏", action: "打开微信", deepLink: "weixin://dl/chat" },
    moments: { title: "分享到朋友圈", desc: "先保存素材，再进入朋友圈手动发布", action: "打开朋友圈", deepLink: "weixin://dl/moments" },
  };
  const meta = platformMeta[platform];
  const platformButtons: Record<SharePlatform, { label: string; icon: string }> = {
    xhs: { label: "小红书", icon: HOME_ASSETS.xiaohongshu },
    wechat: { label: "微信", icon: HOME_ASSETS.wechat },
    moments: { label: "朋友圈", icon: HOME_ASSETS.moments },
  };
  const saveCover = () => downloadAsset(coverImage, `aisea-${platform}-cover.png`, showToast);
  const saveSummary = () => downloadAsset(summaryImage, `aisea-${platform}-summary.png`, showToast);
  const saveReport = () => downloadAsset(reportImage, `aisea-${platform}-report.png`, showToast);
  const copyShare = () => copyText(copy, showToast);
  const openPlatform = () => openShareLink(meta.deepLink, showToast, meta.action);
  const useSystemShare = async () => {
    try {
      if (!navigator.share) throw new Error("no_share_api");
      await navigator.share({ title: assets?.share_title || meta.title, text: copy, url: window.location.href });
    } catch {
      showToast("当前设备不支持系统分享，已保留文案和图片");
    }
  };

  return (
    <div className="sheet-backdrop" onClick={close}>
      <section className="share-sheet" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.desc}</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <div className="share-platform-tabs">
          {(Object.keys(platformButtons) as SharePlatform[]).map((item) => (
            <button key={item} className={item === platform ? "is-active" : ""} onClick={() => onSelectPlatform(item)}>
              <img src={platformButtons[item].icon} alt="" />
              <span>{platformButtons[item].label}</span>
            </button>
          ))}
        </div>
        <div className="share-grid">
          <section className="share-preview-panel">
            <div className="share-preview-stack">
              <figure>
                <img src={coverImage} alt="分享封面图" />
                <figcaption>封面图</figcaption>
              </figure>
              <figure>
                <img src={summaryImage} alt="分享摘要图" />
                <figcaption>摘要图</figcaption>
              </figure>
              <figure>
                <img src={reportImage} alt="完整报告图" />
                <figcaption>完整报告图</figcaption>
              </figure>
            </div>
            <div className="share-preview-copy">
              <h3>{assets?.share_title || meta.title}</h3>
              <p>{copy}</p>
            </div>
          </section>
          <div className="share-steps">
            <section className="share-phase">
              <h3>第一步，先保存图片</h3>
              <StepButton n={1} icon={<ImageDown />} title="保存封面图" text="适合作为首图" onClick={saveCover} />
              <StepButton n={2} icon={<ImageDown />} title="保存摘要图" text="适合作为第二张图" onClick={saveSummary} />
              <StepButton n={3} icon={<Download />} title="保存完整报告图" text="适合作为长图备份" onClick={saveReport} />
            </section>
            <section className="share-phase">
              <h3>第二步，再复制并发布</h3>
              <StepButton n={4} icon={<Clipboard />} title="复制分享文案" text="打开平台后直接粘贴" onClick={copyShare} />
              <StepButton n={5} icon={<ExternalLink />} title={meta.action} text="如果没有自动跳转，就手动打开" onClick={openPlatform} />
              <StepButton n={6} icon={<Share2 />} title="系统分享" text="调用手机自带分享面板" onClick={useSystemShare} />
            </section>
            <section className="share-phase share-phase-note">
              <h3>发出去之前</h3>
              <p>{error || (loading ? "分享素材准备中..." : "封面、摘要和完整报告都已经准备好了。")}</p>
              <textarea readOnly value={copy} />
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function openShareLink(url: string, showToast: (t: string) => void, label: string) {
  try {
    window.location.href = url;
    window.setTimeout(() => showToast(`已尝试打开${label}`), 650);
  } catch {
    showToast(`未能自动打开${label}，请手动进入对应 App`);
  }
}

function StepButton({ n, icon, title, text, onClick }: { n: number; icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button className="step-button" onClick={onClick}><b>{n}</b>{icon}<span><strong>{title}</strong><small>{text}</small></span></button>;
}

async function copyText(text: string, showToast: (t: string) => void, announce = true) {
  try {
    await navigator.clipboard.writeText(text);
    if (announce) showToast("文案已复制");
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    showToast(ok ? "文案已复制" : "当前浏览器不支持自动复制，请手动选择文本");
    return ok;
  }
}

async function downloadAsset(url: string, filename: string, showToast: (t: string) => void) {
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    showToast("已开始下载高清文件");
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("已尝试直接下载，请检查浏览器下载栏");
  }
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
