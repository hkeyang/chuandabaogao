GlassFuture Market 官网技术开发文档 v1.0
1. 项目定位
GlassFuture Market 是一个面向全球用户的虚拟数字商品商城，主要销售 Discord Nitro、Spotify Premium、YouTube Premium、Steam Wallet、Microsoft 365 等数字商品。
核心目标：


支持几十个甚至上百个商品品类扩展。


支持商品后台灵活配置规格、分组、套餐和价格。


支持 USDT 支付，并按后台配置显示 TRON、ETH、BSC、BASE 等支付网络。


支持用户通过 Telegram 登录。


支持根据用户 IP 自动显示法币参考价，也允许用户手动切换法币。


降低用户下单、支付、查单、收货过程中的不确定感。


保持高级、轻盈、科技感的官网视觉风格。



2. 页面范围
本期建议开发以下核心页面：
页面路由建议说明首页/商品浏览、快速下单、套餐联动、法币切换商品列表页/products全量商品分类、搜索、筛选商品详情页/product/:slug商品介绍、规格选择、购买说明、快速购买购买确认页/checkout联系方式、支付网络、订单确认支付页面/pay/:orderId钱包跳转、二维码、充值地址、链上等待支付成功 / 订单完成页/order/:orderId/success发货结果、交付信息、后续操作订单查询页/orders/lookup用户用订单号、邮箱、Telegram 查询订单用户中心/accountTelegram 登录后的订单、资料、通知设置后台管理/admin商品、规格、库存、价格、订单、支付网络配置

3. 整体前端信息架构
3.1 首页结构
首页采用「左侧浏览选择 + 右侧快速下单」布局。
顶部导航
内容包括：


Logo：GlassFuture Market


导航：


商品


FAQ


订单查询




Telegram 登录入口


法币切换器


购物车


右上角建议顺序：
[Telegram 登录 / 用户头像] [CNY ▼] [购物车(0)]
登录前显示：
Telegram 登录
登录后显示：
头像 + @username

3.2 首页左侧主区域
首页左侧分为：


Hero 区


商品分类与搜索


商品卡片区域


动态购买选项区域


商品说明区域


购买流程区域


Hero 区
标题：
未来已来，虚拟由你定义
副标题：
精选高品质数字商品，即刻拥有，安全便捷。
功能标签：
即时发货 / 秒级交付安全支付 / 加密保障7×24支持 / 全时在线
背景风格：


玻璃星球


透明晶体


低饱和蓝紫渐变


柔光粒子


轻微空间感



3.3 商品分类区域
分类 Tab：
全部 / 社交 / 音乐 / 视频 / 游戏 / 软件 / 礼品卡 / 更多
右侧搜索框：
搜索商品名称
商品数量增多后，首页只展示热门商品。完整商品进入 /products 商品页展示。

4. 商品与规格配置逻辑
这是整个商城最关键的部分。
你前面提到：

有的商品有分组，有的没有分组；有的商品需要先选几个分组才到套餐；分组下面有的是多套餐，有的是没有套餐。

这个应该全部通过后台配置实现，前端只根据配置动态渲染。

4.1 商品配置模型
建议商品结构如下：
type Product = {  id: string;  slug: string;  name: string;  categoryId: string;  iconUrl: string;  coverUrl?: string;  shortDescription: string;  detailDescription: string;  deliveryType: 'auto' | 'manual' | 'mixed';  status: 'active' | 'hidden' | 'sold_out';  isHot: boolean;  isRecommended: boolean;  sortOrder: number;  baseCurrency: 'USDT';  supportedPaymentNetworks: PaymentNetwork[];  optionGroups: ProductOptionGroup[];  skus: ProductSku[];  notice: ProductNotice;};

4.2 规格分组配置
前端不要固定叫“套餐”，而是统一叫：
规格 / 购买选项
后台可以配置每一级的名称。
type ProductOptionGroup = {  id: string;  productId: string;  name: string;   key: string;  required: boolean;  displayType: 'chips' | 'cards' | 'dropdown' | 'segmented';  sortOrder: number;  options: ProductOption[];};
示例：
[  {    "name": "地区",    "key": "region",    "displayType": "chips",    "options": ["Global", "US", "EU", "JP"]  },  {    "name": "账号类型",    "key": "account_type",    "displayType": "segmented",    "options": ["新号", "老号", "共享"]  },  {    "name": "套餐周期",    "key": "duration",    "displayType": "cards",    "options": ["1个月", "3个月", "12个月"]  }]

4.3 SKU 配置
每个最终可购买组合都是一个 SKU。
type ProductSku = {  id: string;  productId: string;  optionValues: Record<string, string>;  priceUsdt: string;  originalPriceUsdt?: string;  stockType: 'unlimited' | 'limited';  stockQuantity?: number;  stockStatus: 'in_stock' | 'low_stock' | 'sold_out';  deliveryType: 'auto' | 'manual';  isDefault: boolean;  isRecommended: boolean;  discountLabel?: string;};
示例：
{  "productId": "discord-nitro",  "optionValues": {    "region": "Global",    "account_type": "新号",    "duration": "1个月"  },  "priceUsdt": "1.80",  "stockStatus": "in_stock",  "deliveryType": "auto",  "isDefault": true}

4.4 前端渲染规则
商品无规格
直接显示：
选中商品 → 显示价格 → 可下单
商品有一级规格
例如：
套餐：Basic / Pro / Max
前端显示一组套餐卡片。
商品有多级规格
例如：
地区 → 账号类型 → 套餐周期
前端按顺序显示，未选择上一级前，下一级置灰。
SKU 不存在
如果用户选择了一个后台不存在的组合，提示：
当前规格组合暂不可购买，请重新选择
SKU 售罄
显示：
暂时缺货
按钮置灰。

5. 首页快速下单逻辑
右侧快速下单区需要和左侧实时同步。
5.1 字段结构
快速下单商品[Discord Nitro ▼]规格 / 套餐[Global · 新号 · 1个月 ▼]Telegram 用户名 *[例如 @username]邮箱 *[例如 name@example.com]支付币种[USDT 🔒]支付网络[TRON (TRC20) ▼]订单金额1.80 USDT≈ ¥13.0[立即支付]

5.2 左右联动规则
用户在左侧点击商品后：


右侧商品同步更新


规格区域同步为该商品默认 SKU


价格同步更新


商品说明同步更新


用户在左侧切换规格后：


右侧规格组合同步更新


订单金额同步更新


支付网络按商品配置刷新


用户在右侧切换商品后：


左侧商品卡片选中态同步


左侧规格区域切换为该商品配置


页面不跳转，保持快速下单体验



6. Telegram 登录设计
用户可以通过 Telegram 登录，登录后可查看订单、接收通知、减少填写成本。
Telegram 官方 Login Widget 支持网站授权，接入时需要创建 Telegram Bot，并将网站域名通过 BotFather 的 /setdomain 绑定到该 Bot；授权成功后，Telegram 会返回用户 id、first_name、last_name、username、photo_url、auth_date、hash 等字段，服务端需要校验 hash 和 auth_date。

6.1 登录入口
顶部右上角：
登录前：
[Telegram 登录]
登录后：
[@username ▼]
下拉菜单：
我的订单通知设置退出登录

6.2 Telegram 登录流程
用户点击 Telegram 登录↓弹出 Telegram 授权窗口↓用户确认授权↓前端收到 Telegram auth data↓发送给后端 /auth/telegram↓后端校验 hash↓校验成功后创建或更新用户↓返回 JWT / Session↓前端保存登录状态

6.3 后端校验逻辑
服务端必须做：


按 Telegram 要求拼接 data-check-string。


使用 Bot Token 生成 secret key。


使用 HMAC-SHA256 验证 hash。


检查 auth_date 是否过期。


防止伪造登录数据。


伪代码：
function verifyTelegramLogin(data: TelegramAuthData, botToken: string) {  const { hash, ...rest } = data;  const dataCheckString = Object.keys(rest)    .sort()    .map((key) => `${key}=${rest[key]}`)    .join('\n');  const secretKey = sha256(botToken);  const computedHash = hmacSha256(dataCheckString, secretKey);  return computedHash === hash;}

6.4 用户表设计
type User = {  id: string;  telegramId?: string;  telegramUsername?: string;  telegramFirstName?: string;  telegramLastName?: string;  telegramPhotoUrl?: string;  email?: string;  defaultCurrency: FiatCurrency;  lastLoginAt: Date;  createdAt: Date;};

6.5 登录后的下单优化
如果用户已 Telegram 登录：
快速下单区的 Telegram 用户名默认填充：
@username
但仍允许用户修改，因为有些用户可能希望发货到另一个 Telegram 账号。
建议文案：
默认使用当前登录 Telegram，可修改为其他接收账号。
邮箱仍建议必填。

7. 法币参考价系统
7.1 需求
页面右上角提供法币切换器，支持：
USD 美元CNY 人民币GBP 英镑EUR 欧元AUD 澳元JPY 日元HKD 港币KRW 韩元
根据用户 IP 自动判断地区，默认显示对应法币参考价。
例如中国用户：
1.80 USDT≈ ¥13.0
美国用户：
1.80 USDT≈ $1.80
欧洲用户：
1.80 USDT≈ €1.68

7.2 显示原则
USDT 是主价格，法币是参考价。
UI 必须明确主次：
1.80 USDT≈ ¥13.0
不能让用户误以为可以用法币结算。
建议在币种切换器附近加提示：
根据 IP 自动显示参考价，最终支付以 USDT 为准。

7.3 汇率逻辑
后台定时拉取汇率，前端只展示后端返回的参考价。
type ExchangeRate = {  base: 'USDT';  target: 'CNY' | 'USD' | 'GBP' | 'EUR' | 'AUD' | 'JPY' | 'HKD' | 'KRW';  rate: string;  updatedAt: Date;};

7.4 法币切换前端状态
优先级：
用户手动选择 > 登录用户偏好 > IP 自动识别 > 默认 USD
本地存储：
localStorage.setItem('preferredCurrency', 'CNY');
登录用户同步到后端：
PATCH /api/me/preferences{  "defaultCurrency": "CNY"}

7.5 价格组件
统一封装价格组件：
<Price  amountUsdt="1.80"  fiatCurrency="CNY"  fiatAmount="13.0"/>
渲染：
1.80 USDT≈ ¥13.0

8. 商品详情页设计
8.1 页面结构
商品详情页 /product/:slug 分为：


顶部导航


面包屑


商品主视觉


商品标题与价格


规格选择


右侧订单摘要


商品说明与售后规则


相关推荐



8.2 商品详情主区域
左侧：


商品大图


缩略图


商品图标


中间：
Discord Nitro解锁 Discord 高级聊天体验，享受自定义表情、高清直播、超大文件上传等专属权益。自动发货 / 库存充足 / 支持售后咨询1.80 USDT≈ ¥13.0
规格区：
地区：Global / US / EU / JP账号类型：新号 / 老号 / 共享套餐周期：1个月 / 3个月 / 12个月

8.3 商品说明区
核心规则必须直接平铺展示：
发货方式：自动发货保质期：30天售后规则：开通后不支持退款
详细说明以 Tab 或折叠面板展示：
商品介绍使用说明保质期详情售后规则常见问题

9. 购买确认页设计
购买页 /checkout 用来减少误填和错付。
9.1 页面结构
顶部步骤条：
1 选择商品 → 2 选择规格 → 3 填写信息 → 4 确认支付
左侧：


订单商品预览


联系信息


支付信息


支付前确认


右侧：


订单摘要


阅读确认


确认并支付按钮



9.2 联系信息
Telegram 用户名 *例如 @username邮箱 *例如 name@example.com
若用户已 Telegram 登录：
Telegram 用户名默认填充登录账号
但仍允许修改。

9.3 支付前确认
在页面中增加轻量确认区，避免弹窗过多。
显示：
商品：Discord Nitro规格：Global / 新号 / 1个月Telegram：@username邮箱：name@example.com支付网络：TRON (TRC20)应付金额：1.80 USDT ≈ ¥13.0
提示：
虚拟商品开通后通常不支持退款，请确认信息无误后再进行支付。

9.4 阅读确认
用户点击支付前必须勾选：
我已阅读并同意购买须知与售后规则
按钮：
确认并支付

10. 支付页面设计
支付页 /pay/:orderId 用来处理钱包跳转、扫码支付、链上等待。
10.1 状态步骤
订单已创建 → 等待付款 → 链上确认 → 正在发货 → 已完成
当前状态高亮。

10.2 支付信息
显示：
订单号：GF20240527000123商品：Discord Nitro规格：Global / 新号 / 1个月支付金额：1.80 USDT ≈ ¥13.0支付网络：TRON (TRC20)剩余支付时间：14:32

10.3 钱包打开方式
浏览器钱包移动钱包WalletConnectTronLink
按钮：
重新打开钱包

10.4 充值地址区域
右侧显示：
请使用 TRON (TRC20) 向以下地址转账二维码收款地址复制地址支付金额复制金额支付网络复制网络
注意事项：
请确保金额与网络正确，否则可能导致资产丢失且无法找回。

10.5 用户支付后反馈
按钮：
我已完成支付
点击后：


前端进入轮询状态


后端查询链上交易


状态变为「链上确认中」


提示：
支付后通常需要 1–3 分钟链上确认，请勿重复支付。

11. 订单完成页设计
订单完成页 /order/:orderId/success 用来展示结果、交付内容和后续操作。
11.1 顶部成功区
订单已完成，感谢您的购买！支付成功，商品已发送至您的 Telegram 与邮箱。
状态标签：
Telegram 通知已发送邮件通知已发送安全可靠的自动发货系统

11.2 进度条
订单已创建已收到付款链上确认完成正在发货已完成
每一步显示时间。

11.3 订单信息
订单号商品规格订单金额支付网络支付时间发货方式

11.4 发货结果
显示：
发货状态：已发送至 Telegram 与邮箱Telegram：已发送至 @username邮箱：已发送至 name@example.com
交付内容建议默认隐藏：
交付内容预览（部分信息已隐藏）激活链接：********激活码：********有效期：1个月
按钮：
查看完整交付内容

12. 订单查询页
12.1 查询方式
支持：


订单号 + 邮箱


订单号 + Telegram 用户名


登录后查看全部订单


表单：
订单号邮箱 / Telegram 用户名[查询订单]

12.2 订单状态
type OrderStatus =  | 'created'  | 'pending_payment'  | 'payment_confirming'  | 'paid'  | 'delivering'  | 'completed'  | 'expired'  | 'failed'  | 'refunding'  | 'refunded';
中文显示：
待付款链上确认中已付款发货中已完成已超时支付失败退款中已退款

13. 支付网络配置
13.1 支持网络
后台可配置：
TRON / TRC20ETH / ERC20BSC / BEP20BASE / ERC20PolygonSolana
当前 UI 先显示：
TRONETHBSCBASE
超过 4 个网络后，前端自动改为下拉列表。

13.2 网络配置表
type PaymentNetwork = {  id: string;  code: 'TRON' | 'ETH' | 'BSC' | 'BASE' | string;  displayName: string;  tokenStandard: string;  isEnabled: boolean;  isRecommended: boolean;  sortOrder: number;  minAmountUsdt?: string;  maxAmountUsdt?: string;  warningText?: string;};
示例：
{  "code": "TRON",  "displayName": "TRON",  "tokenStandard": "TRC20",  "isRecommended": true,  "warningText": "请勿使用其他链转账，跨链支付可能导致资产无法找回。"}

14. 订单数据模型
type Order = {  id: string;  orderNo: string;  userId?: string;  productId: string;  skuId: string;  productSnapshot: ProductSnapshot;  skuSnapshot: SkuSnapshot;  telegramUsername: string;  email: string;  amountUsdt: string;  fiatCurrency: FiatCurrency;  fiatAmountSnapshot: string;  exchangeRateSnapshot: string;  paymentCurrency: 'USDT';  paymentNetwork: string;  paymentAddress: string;  status: OrderStatus;  expiresAt: Date;  paidAt?: Date;  deliveredAt?: Date;  createdAt: Date;  updatedAt: Date;};

15. 后台管理功能
后台需要支持：
15.1 商品管理


新增商品


编辑商品


上下架


分类配置


商品图标


商品简介


商品详情


是否热门


是否推荐


排序



15.2 规格管理


新增规格组


配置规格组名称


配置规格展示方式


配置规格选项


拖拽排序


配置 SKU 组合


配置 SKU 价格


配置库存状态



15.3 商品说明配置
后台结构：
type ProductNotice = {  deliverySummary: string;  warrantySummary: string;  refundSummary: string;  usageGuide: string;  warrantyDetail: string;  refundRule: string;  attention: string;  faq: ProductFaqItem[];};
前端显示：
核心摘要：
发货方式保质期售后规则
详细内容：
使用说明保质期详情注意事项FAQ

15.4 支付配置


支付币种：固定 USDT


支付网络配置


收款地址配置


网络开启 / 关闭


是否推荐


风险提示文案


最小 / 最大支付金额


支付超时时间



15.5 订单管理


订单列表


状态筛选


用户信息


支付网络


支付金额


链上交易 Hash


手动标记已支付


手动补发


退款标记


客服备注



16. API 设计
16.1 商品接口
GET /api/products
返回商品列表。
GET /api/products/:slug
返回商品详情、规格组、SKU、说明内容。

16.2 下单接口
POST /api/orders
请求：
{  "productId": "discord-nitro",  "skuId": "sku_001",  "telegramUsername": "@username",  "email": "name@example.com",  "paymentNetwork": "TRON",  "fiatCurrency": "CNY"}
返回：
{  "orderId": "order_001",  "orderNo": "GF20240527000123",  "paymentUrl": "/pay/order_001"}

16.3 支付信息接口
GET /api/orders/:orderId/payment
返回：
{  "orderNo": "GF20240527000123",  "amountUsdt": "1.80",  "fiatCurrency": "CNY",  "fiatAmount": "13.0",  "paymentNetwork": "TRON",  "paymentAddress": "TX...",  "expiresAt": "2026-05-05T12:00:00Z",  "status": "pending_payment"}

16.4 订单状态接口
GET /api/orders/:orderId/status
前端支付页轮询该接口。
建议轮询频率：
前 3 分钟：每 5 秒一次3 分钟后：每 15 秒一次订单超时后停止轮询

16.5 Telegram 登录接口
POST /api/auth/telegram
请求：
{  "id": "123456",  "first_name": "John",  "username": "username",  "photo_url": "https://...",  "auth_date": "1710000000",  "hash": "..."}
返回：
{  "token": "jwt_token",  "user": {    "id": "user_001",    "telegramUsername": "username",    "defaultCurrency": "CNY"  }}

16.6 法币接口
GET /api/exchange-rates?base=USDT
PATCH /api/me/preferences
请求：
{  "defaultCurrency": "CNY"}

17. 前端技术建议
17.1 技术栈
建议：
Next.jsReactTypeScriptTailwind CSSZustand / Redux ToolkitReact Query / TanStack QueryFramer Motion

17.2 关键组件
HeaderCurrencySwitcherTelegramLoginButtonProductCardProductOptionSelectorSkuSelectorPriceDisplayQuickOrderPanelOrderSummaryCheckoutStepperPaymentNetworkSelectorPaymentQrCardOrderStatusTrackerProductNoticePanel

17.3 状态管理
前端核心状态：
type PurchaseState = {  selectedProductId?: string;  selectedOptions: Record<string, string>;  selectedSkuId?: string;  telegramUsername?: string;  email?: string;  paymentCurrency: 'USDT';  paymentNetwork?: string;  fiatCurrency: FiatCurrency;};

18. 设计样式规范
18.1 视觉关键词
未来感轻玻璃蓝紫渐变柔光安全感高级感简洁可信任

18.2 颜色建议
主色：
--primary: #6C63FF;--primary-light: #8B7CFF;--primary-dark: #4D46D9;
辅助色：
--blue: #5B8CFF;--cyan: #66D9E8;--green: #20C997;--warning: #FFB020;--danger: #FF5A5F;
背景：
--bg-page: #F6F8FF;--bg-card: rgba(255, 255, 255, 0.78);--bg-glass: rgba(255, 255, 255, 0.62);
文字：
--text-main: #111A44;--text-secondary: #667199;--text-muted: #9AA3C7;
边框：
--border-light: rgba(120, 130, 255, 0.18);--border-active: #6C63FF;

18.3 字体
建议：
font-family:  Inter,  "SF Pro Display",  "PingFang SC",  "Microsoft YaHei",  sans-serif;

18.4 圆角
--radius-sm: 8px;--radius-md: 12px;--radius-lg: 18px;--radius-xl: 24px;--radius-card: 28px;

18.5 阴影
--shadow-card: 0 16px 40px rgba(80, 90, 180, 0.10);--shadow-float: 0 24px 70px rgba(80, 90, 180, 0.16);--shadow-button: 0 12px 28px rgba(108, 99, 255, 0.32);

18.6 玻璃卡片样式
.glass-card {  background: rgba(255, 255, 255, 0.72);  backdrop-filter: blur(18px);  border: 1px solid rgba(130, 140, 255, 0.18);  box-shadow: 0 16px 40px rgba(80, 90, 180, 0.10);  border-radius: 24px;}

18.7 主按钮
.primary-button {  background: linear-gradient(135deg, #5B8CFF 0%, #7B61FF 55%, #9B5CFF 100%);  color: white;  border-radius: 16px;  height: 56px;  font-weight: 700;  box-shadow: 0 12px 28px rgba(108, 99, 255, 0.32);}

18.8 价格样式
主价格：1.80 USDT参考价：≈ ¥13.0
CSS：
.price-main {  font-size: 28px;  font-weight: 800;  color: #5F58FF;}.price-fiat {  font-size: 13px;  color: #7B82A8;}

19. 交互细节
19.1 商品卡片选中
选中态：


紫色描边


右上角 check


背景轻微渐变


阴影增强



19.2 规格不可选
不可选状态：
灰色背景禁用点击悬浮提示：当前组合暂不可购买

19.3 支付网络切换
TRON 选中时显示：
推荐到账较快
ETH 选中时可提示：
网络费用可能较高
BASE 选中时：
请确认钱包支持 BASE 网络

19.4 点击立即支付
流程：
校验 Telegram 用户名校验邮箱校验 SKU 是否有效校验库存校验支付网络生成订单跳转支付页
如果未登录 Telegram，也允许下单，但仍必须填写 Telegram username 和邮箱。

20. 安全与风控
20.1 表单校验
Telegram 用户名：
^@?[a-zA-Z0-9_]{5,32}$
邮箱：
标准邮箱校验

20.2 订单防重复


下单按钮 loading 防重复点击


同一用户短时间内相同 SKU 可提示确认


支付页订单超时后禁止继续付款



20.3 支付安全
必须提示：
请确认转账网络与订单一致，勿跨链支付。
支付金额建议精确匹配，避免少付或多付。

20.4 Telegram 登录安全


服务端校验 Telegram hash


校验 auth_date 时效


不信任前端传来的 username


用户资料以后端校验后的 Telegram 数据为准


Telegram Login Widget 官方文档明确要求校验授权数据完整性，并建议检查 auth_date 以避免使用过期数据。

21. 订单通知逻辑
21.1 通知渠道
Telegram BotEmail站内订单页

21.2 通知节点
订单创建支付成功链上确认完成发货成功订单异常订单超时

21.3 通知内容
订单创建：
您的订单已创建，请在 15 分钟内完成支付。
支付成功：
我们已收到您的付款，正在为您处理商品。
发货成功：
商品已发送至您的 Telegram 与邮箱，请及时查收。

22. 开发优先级
第一阶段：MVP
必须完成：


首页


商品详情页


动态规格 / SKU


快速下单


购买确认页


支付页


订单完成页


订单查询


Telegram 登录


法币参考价


后台商品与 SKU 配置


后台订单管理



第二阶段：优化


用户中心


Telegram Bot 通知绑定


邮件模板管理


库存预警


最近热卖


优惠码


多语言


法币自动定位优化


支付网络扩展


自动发货接口对接



23. 总结版产品逻辑
最终用户路径：
进入首页↓系统根据 IP 自动显示参考法币↓用户可切换 USD / CNY / EUR 等↓用户选择商品↓选择地区、账号类型、套餐↓右侧快速下单同步更新↓可使用 Telegram 登录，自动填充 Telegram username↓填写邮箱↓选择 USDT 支付网络↓确认订单↓进入支付页↓打开钱包 / 扫码转账↓等待链上确认↓系统自动发货↓Telegram + 邮箱同步通知↓订单完成页展示交付结果
这版文档可以直接作为你和前端、后端、UI 设计、后台开发沟通的基础版本。
