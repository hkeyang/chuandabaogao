# AISea 上线清单

## 1. Cloudflare 资源

1. 创建 D1 数据库，并把 `wrangler.toml` 里的 `database_id` 换成真实 ID。
2. 创建 R2 bucket：`aisea-reports`。
3. 将 `worker/schema.sql` 导入 D1。
4. 配置 `hair.aisea.space` 指向 Worker，配置 `img.hair.aisea.space` 为 R2 公开域名或图片服务域名。

## 2. Secrets

不要把真实 API Key 写进代码。使用：

```bash
wrangler secret put ADMIN_PASSWORD_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

当前生图模型配置为 `gpt-image-2`，接口地址在 `wrangler.toml` 的 `OPENAI_IMAGE_ENDPOINT`。

## 2.1 Stripe 预埋状态

- `STRIPE_PAYMENTS_ENABLED=false` 时，支付接口只保留骨架，不会创建真实 Checkout Session。
- 等微信支付 / 支付宝审批通过后，再把 `STRIPE_PAYMENTS_ENABLED` 改成 `true`，并配置 `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`。
- 推荐先在 Stripe Dashboard 完成微信支付、支付宝和 webhook 的测试联调，再切生产开关。

## 3. 本地开发

```bash
npm install
npm run dev
```

访问：

- 用户端：`http://localhost:4174/#/home`
- 后台：`http://localhost:4174/#/admin`

本地演示后台密码：`AISea@2026`。生产环境以后端 secret 为准。

## 4. 构建

```bash
npm run build
```

产物在 `dist/`，由 Cloudflare Worker 的 assets binding 提供静态访问。

## 5. 后台能力

- 商品名称、价格、权益、闲鱼链接、上下架配置
- 8 位英文数字兑换码批量生成
- 平台标记，默认支持闲鱼，也可手输
- CSV 导出
- 多管理员、角色：owner / admin / operator / viewer
- 操作审计日志

## 6. 生成与分享

- 用户上传 JPG / PNG / HEIC，最大 10MB
- 报告预计耗时 2-5 分钟
- 任务策略：先锁定权益，成功扣除，失败自动重试 1 次并返还
- 结果页支持完整报告图、小红书封面图、种草文案
- 小红书第一版只做“准备分享素材”，不承诺自动发布
