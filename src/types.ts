export type ProductId = "single" | "triple" | "full";
export type ReportTypeId = "comprehensive" | "hair" | "makeup" | "outfit" | "look";
export type Role = "owner" | "admin" | "operator" | "viewer";
export type PreferenceMode = "single" | "multiple";

export interface Product {
  id: ProductId;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  description: string;
  rights: { topic: number; comprehensive: number };
  tags: string[];
  bullets: string[];
  purchaseLink: string;
  enabled: boolean;
  sort: number;
}

export interface Coupon {
  code: string;
  productId: ProductId;
  platform: string;
  status: "unused" | "redeemed" | "expired" | "disabled";
  createdAt: string;
  expiresAt: string;
  redeemedAt?: string;
}

export interface ReportType {
  id: ReportTypeId;
  name: string;
  subtitle: string;
  rightKey: "topic" | "comprehensive";
  tags: string[];
  modules: string[];
  asset: string;
}

export interface Rights {
  topic: number;
  comprehensive: number;
}

export interface UserReport {
  id: string;
  type: ReportTypeId;
  name: string;
  createdAt: string;
  persona: PersonaId;
  photoDataUrl?: string;
  reportImageUrl?: string;
  coverImageUrl?: string;
  prompt: string;
  subjectGender?: "male" | "female" | "neutral" | "unknown";
}

export type PersonaId = "softFrench" | "koreanSchool" | "coolAiry" | "sweetCool";

export interface Persona {
  id: PersonaId;
  title: string;
  reportTitle: string;
  keywords: string[];
  summary: string;
  palette: string[];
  tone: string;
}

export interface PreferenceOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  tile?: string;
}

export interface PreferenceSection {
  id: string;
  index: number;
  title: string;
  desc: string;
  icon: string;
  mode: PreferenceMode;
  maxSelected?: number;
  options: PreferenceOption[];
}

export interface PreferenceState {
  stylePreferences: string[];
  targetScenes: string[];
  changeIntensity: string;
}

export interface AdminUser {
  id: string;
  name: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface AdminState {
  passwordHashHint: string;
  products: Product[];
  coupons: Coupon[];
  users: AdminUser[];
  auditLogs: AuditLog[];
}
