CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_snapshot_json TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'checkout_open', 'paid', 'fulfilled', 'expired', 'canceled', 'payment_failed', 'refund_pending', 'refunded')),
  rights_topic INTEGER NOT NULL DEFAULT 0,
  rights_comprehensive INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  expires_at TEXT,
  paid_at TEXT,
  fulfilled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  raw_status TEXT,
  processed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  order_id TEXT,
  product_id TEXT NOT NULL REFERENCES products(id),
  topic_remaining INTEGER NOT NULL DEFAULT 0,
  comprehensive_remaining INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'exhausted', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_client ON entitlements(client_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_order ON entitlements(order_id);

INSERT INTO products
  (id, name, price, original_price, badge, description, topic_rights, comprehensive_rights, purchase_link, enabled, sort_order, updated_at)
VALUES
  ('single', '单次专题报告券', 1.9, NULL, NULL, '专题 ×1', 1, 0, '', 1, 1, datetime('now')),
  ('triple', '三次探索卡', 4.9, 5.7, '推荐', '专题 ×3', 3, 0, '', 1, 2, datetime('now')),
  ('full', '全案探索卡', 9.9, 15.9, '最完整', '综合 ×1 / 专题 ×3', 3, 1, '', 1, 3, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  price = excluded.price,
  original_price = excluded.original_price,
  badge = excluded.badge,
  description = excluded.description,
  topic_rights = excluded.topic_rights,
  comprehensive_rights = excluded.comprehensive_rights,
  enabled = 1,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;
