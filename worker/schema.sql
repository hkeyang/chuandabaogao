CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  original_price REAL,
  badge TEXT,
  description TEXT NOT NULL,
  topic_rights INTEGER NOT NULL DEFAULT 0,
  comprehensive_rights INTEGER NOT NULL DEFAULT 0,
  purchase_link TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unused', 'redeemed', 'expired', 'disabled')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT,
  redeemed_client_id TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  coupon_code TEXT,
  report_type TEXT NOT NULL,
  style_persona TEXT NOT NULL,
  style_keywords TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  locked_right_key TEXT NOT NULL,
  report_image_key TEXT,
  xhs_cover_image_key TEXT,
  xhs_summary_image_key TEXT,
  report_image_url TEXT,
  xhs_cover_image_url TEXT,
  xhs_summary_image_url TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS share_events (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  action TEXT NOT NULL,
  device_info TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  ip TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_product ON coupons(product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_reports_client ON reports(client_id);
CREATE INDEX IF NOT EXISTS idx_share_events_report ON share_events(report_id);
