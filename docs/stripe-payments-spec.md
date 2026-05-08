# Stripe 微信支付 / 支付宝支付接入规范（预埋版）

## 目标

- 先完成接口、数据结构、风控和幂等准备。
- 现阶段不替换现有“跳外链购买”入口。
- Stripe 审批通过后，只需打开开关并补齐密钥即可上线。

## 当前状态

- 默认关闭：`STRIPE_PAYMENTS_ENABLED=false`
- 默认币种：`cny`
- 支付方式预留：`wechat_pay`、`alipay`
- 购买流程不变：现有兑换码 / 权益系统继续可用

## 后端接口

### `POST /api/orders/checkout`

创建站内订单并返回 Stripe Checkout URL。

入参：
- `product_id`
- `client_id`

出参：
- `order_id`
- `order_no`
- `stripe_checkout_session_id`
- `checkout_url`

行为：
- 校验商品有效、上架、价格合法。
- 生成本地订单，状态为 `created`。
- 调用 Stripe Checkout Sessions 创建一次性付款会话。
- 写入 `stripe_checkout_session_id` 并切到 `checkout_open`。

### `GET /api/orders/:orderId`

查询本地订单状态。

### `GET /api/orders/by-session/:sessionId`

按 Stripe session 查询订单。

用途：
- 支付成功页轮询
- webhook 延迟时做补偿查询

### `POST /api/stripe/webhook`

接收 Stripe webhook。

处理事件：
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

规则：
- 必须验签。
- 必须幂等。
- 订单履约只执行一次。

## 数据表

新增：
- `orders`
- `payment_events`

履约策略：
- 支付成功后发放 `Stripe` 来源兑换码。
- 兑换码保持 `unused`，由用户沿用现有兑换流程领取权益。

## Stripe 参数约定

- `mode=payment`
- `currency=cny`
- `payment_method_options[wechat_pay][client]=web`
- `payment_method_types[] = wechat_pay`
- `payment_method_types[] = alipay`
- `success_url` 带 `{CHECKOUT_SESSION_ID}`
- `cancel_url` 回购买页

## 上线前开关

需要补齐：
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PAYMENTS_ENABLED=true`

建议先完成：
- Stripe Dashboard 启用微信支付、支付宝
- webhook endpoint 配好签名密钥
- 用测试 session 跑通 `checkout -> webhook -> order -> coupon`

