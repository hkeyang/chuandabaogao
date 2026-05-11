import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://ai.aisea.space").replace(/\/$/, "");
const outputDir = process.env.PAYMENT_VERIFY_DIR || join(process.cwd(), "output", "playwright", "production-payments");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(outputDir, timestamp);
const packageConfigs = {
  single_topic: {
    title: "单次专题报告",
    cardIndex: 0,
    productIds: { wechat: "single_topic_wechat", alipay: "single_topic_alipay" },
  },
  three_topic: {
    title: "3次专题报告",
    cardIndex: 1,
    productIds: { wechat: "three_topic_wechat", alipay: "three_topic_alipay" },
  },
  full_case: {
    title: "全案探索卡",
    cardIndex: 2,
    productIds: { wechat: "full_case_wechat", alipay: "full_case_alipay" },
  },
};
const packageId = process.env.PAYMENT_VERIFY_PACKAGE || "single_topic";
const packageConfig = packageConfigs[packageId];
assert(packageConfig, `Unsupported PAYMENT_VERIFY_PACKAGE: ${packageId}`, { allowed: Object.keys(packageConfigs) });
const requestedChannels = (process.env.PAYMENT_VERIFY_CHANNELS || "wechat,alipay").split(",").map((item) => item.trim()).filter(Boolean);
const allChannels = [
  { channel: "wechat", label: "微信支付", buttonClass: ".pay-button.wechat", productId: packageConfig.productIds.wechat },
  { channel: "alipay", label: "支付宝支付", buttonClass: ".pay-button.alipay", productId: packageConfig.productIds.alipay },
];
const channels = allChannels.filter((item) => requestedChannels.includes(item.channel));
assert(channels.length > 0, "No payment channels selected", { requestedChannels });
const verifyPhone = process.env.PAYMENT_VERIFY_PHONE || "13900000001";
const verifyClientId = `verify_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
].filter(Boolean);

function assert(condition, message, detail = {}) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

function redact(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/(sk_(test|live)_[A-Za-z0-9_]+)/g, "sk_$2_[redacted]")
    .replace(/(whsec_[A-Za-z0-9_]+)/g, "whsec_[redacted]");
}

function isStripeCheckoutUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl));
    return url.protocol === "https:" && (
      url.hostname === "checkout.stripe.com" ||
      url.hostname.endsWith(".checkout.stripe.com") ||
      url.hostname === "stripe.com" ||
      url.hostname.endsWith(".stripe.com")
    );
  } catch {
    return false;
  }
}

function checkoutSessionIdFromUrl(rawUrl) {
  const match = String(rawUrl).match(/\/pay\/(cs_(?:test|live)_[^#?/]+)/);
  return match?.[1] || "";
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      if (candidate.startsWith("/")) await access(candidate);
      return candidate;
    } catch {
      // Try the next browser candidate.
    }
  }
  return undefined;
}

async function requestJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { url, status: response.status, ok: response.ok, data, text };
}

async function screenshot(page, name) {
  const file = join(runDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function verifyReadiness() {
  const home = await fetch(`${baseUrl}/`);
  const health = await requestJson("/api/health");
  const config = await requestJson("/api/config");

  assert(home.ok, "Production homepage is not reachable", { url: `${baseUrl}/`, status: home.status });
  assert(health.ok && health.data?.ok === true, "Production health check failed", health);
  assert(config.ok, "Production config endpoint failed", config);
  assert(config.data?.payments?.stripeEnabled === true, "Stripe payments are not enabled in production config", config.data?.payments || {});
  assert(Array.isArray(config.data?.products) && config.data.products.some((product) => product.id === "single" && product.enabled), "Lowest-price product is not enabled", config.data?.products || []);

  return {
    homepage: { url: `${baseUrl}/`, status: home.status },
    health: { url: health.url, status: health.status, ok: health.data.ok },
    config: {
      url: config.url,
      status: config.status,
      payments: config.data.payments,
      products: config.data.products?.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        enabled: product.enabled,
      })),
    },
  };
}

async function verifyRouteGuards(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 1200 }, locale: "zh-CN" });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      localStorage.setItem("aisea-react-state-v1", JSON.stringify({
        route: "progress",
        reportType: "hair",
        uploadStatus: "success",
        progress: 8,
        isGenerating: true,
        generationError: "legacy cached failure",
      }));
      localStorage.removeItem("aisea-auth-token-v1");
    });
    await page.goto(`${baseUrl}/#/progress`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    const body = await page.locator("body").textContent({ timeout: 10_000 });
    const currentUrl = page.url();
    assert(!currentUrl.includes("#/progress"), "Unauthenticated legacy progress route was not redirected", { currentUrl, bodyPreview: (body || "").slice(0, 240) });
    assert(!(body || "").includes("生成进度") && !(body || "").includes("报告正在生成中"), "Progress UI rendered without login, payment, and generation intent", {
      currentUrl,
      bodyPreview: (body || "").slice(0, 240),
    });
    const guardScreenshot = await screenshot(page, "route-guard-progress");

    await page.goto(`${baseUrl}/#/pay`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    const wechatDisabled = await page.locator(".pay-button.wechat").first().isDisabled();
    const alipayDisabled = await page.locator(".pay-button.alipay").first().isDisabled();
    assert(wechatDisabled && alipayDisabled, "Unauthenticated pay buttons are not disabled", { wechatDisabled, alipayDisabled });
    return {
      progressRedirectUrl: currentUrl,
      guardScreenshot,
      unauthenticatedPayButtonsDisabled: { wechat: wechatDisabled, alipay: alipayDisabled },
    };
  } finally {
    await context.close();
  }
}

async function loginForVerification() {
  const send = await requestJson("/api/auth/sms/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: verifyPhone, client_id: verifyClientId }),
  });
  assert(send.ok, "SMS login code request failed", send);
  const code = process.env.PAYMENT_VERIFY_SMS_CODE || send.data?.dev_code;
  assert(code, "SMS code unavailable; set PAYMENT_VERIFY_SMS_CODE for production SMS verification", {
    provider: send.data?.provider,
    phone: send.data?.phone,
  });
  const verify = await requestJson("/api/auth/sms/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: verifyPhone, code, client_id: verifyClientId }),
  });
  assert(verify.ok && verify.data?.token, "SMS login verification failed", verify);
  const me = await requestJson("/api/me", {
    headers: { authorization: `Bearer ${verify.data.token}` },
  });
  assert(me.ok && me.data?.user?.id, "Logged-in /api/me check failed", me);
  return {
    token: verify.data.token,
    user: me.data.user,
    rights: me.data.rights,
    provider: send.data?.provider,
  };
}

async function openPayPage(page, channel, auth) {
  await page.addInitScript(({ token }) => {
    localStorage.setItem("aisea-auth-token-v1", token);
  }, { token: auth.token });
  await page.goto(`${baseUrl}/#/pay`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await page.getByText("当前账号").waitFor({ state: "visible", timeout: 15_000 });
  const option = page.locator(".pay-package-option").nth(packageConfig.cardIndex);
  await option.click({ timeout: 15_000 });
  await expectText(page.locator(".pay-detail-card"), packageConfig.title);
  const paywallShot = await screenshot(page, `${channel.channel}-pay-page`);
  return { paywallShot, packageCard: page.locator(".pay-detail-card") };
}

async function expectText(locator, text) {
  const content = await locator.textContent({ timeout: 10_000 });
  assert(content?.includes(text), `Expected UI text not found: ${text}`, { text: content || "" });
}

async function verifyChannel(browser, channel, auth) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 1200 },
    locale: "zh-CN",
  });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: redact(message.text()) });
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: redact(request.url()),
      method: request.method(),
      failure: request.failure()?.errorText || "unknown",
    });
  });

  try {
    const { paywallShot: paywallScreenshot, packageCard } = await openPayPage(page, channel, auth);
    const checkoutResponsePromise = page.waitForResponse((response) => (
      response.url().includes("/api/orders/checkout") && response.request().method() === "POST"
    ), { timeout: 30_000 });
    const stripeNavigationPromise = page
      .waitForURL((url) => isStripeCheckoutUrl(url.href), { timeout: 45_000 })
      .then(() => ({ ok: true }))
      .catch((error) => ({ ok: false, message: error instanceof Error ? error.message : String(error) }));

    await packageCard.locator(channel.buttonClass).click({ timeout: 15_000 });

    const checkoutResponse = await checkoutResponsePromise;
    let checkoutText = "";
    let checkoutBodyReadError = "";
    let checkoutData = {};
    try {
      checkoutText = await checkoutResponse.text();
      checkoutData = checkoutText ? JSON.parse(checkoutText) : {};
    } catch (error) {
      checkoutBodyReadError = error instanceof Error ? error.message : String(error);
      checkoutData = checkoutText ? { raw: checkoutText } : {};
    }

    if (!checkoutResponse.ok()) {
      await screenshot(page, `${channel.channel}-checkout-error`);
      assert(false, `${channel.label} checkout API returned ${checkoutResponse.status()}`, {
        status: checkoutResponse.status(),
        body: redact(JSON.stringify(checkoutData)),
      });
    }

    if (!checkoutBodyReadError) {
      assert(checkoutData.checkout_url || checkoutData.pay_url, `${channel.label} checkout URL missing`, checkoutData);
      assert(checkoutData.stripe_checkout_session_id, `${channel.label} Stripe session id missing`, checkoutData);
      assert(checkoutData.order_id, `${channel.label} order id missing`, checkoutData);
    }
    assert(!checkoutData.checkout_url && !checkoutData.pay_url || isStripeCheckoutUrl(checkoutData.checkout_url || checkoutData.pay_url), `${channel.label} checkout URL is not Stripe-hosted`, {
      checkout_url: checkoutData.checkout_url,
      pay_url: checkoutData.pay_url,
    });

    const stripeNavigation = await stripeNavigationPromise;
    assert(stripeNavigation.ok, `${channel.label} browser did not navigate to Stripe Checkout`, {
      currentUrl: page.url(),
      navigationError: stripeNavigation.message,
    });
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    const stripeUrl = page.url();
    assert(isStripeCheckoutUrl(stripeUrl), `${channel.label} browser did not navigate to Stripe Checkout`, { stripeUrl });
    const stripeCheckoutSessionId = String(checkoutData.stripe_checkout_session_id || checkoutSessionIdFromUrl(stripeUrl));
    assert(stripeCheckoutSessionId, `${channel.label} Stripe session id missing`, { stripeUrl, checkoutBodyReadError });
    const stripeBodyText = await page.locator("body").textContent({ timeout: 15_000 }).catch(() => "");
    assert((stripeBodyText || "").trim().length > 20, `${channel.label} Stripe Checkout page did not render meaningful content`, {
      stripeUrl,
      bodyPreview: (stripeBodyText || "").slice(0, 240),
    });

    const stripeScreenshot = await screenshot(page, `${channel.channel}-stripe-checkout`);
    const bySession = await requestJson(`/api/orders/by-session/${encodeURIComponent(stripeCheckoutSessionId)}`);
    assert(bySession.ok && bySession.data?.order?.id, `${channel.label} order lookup by Stripe session failed`, bySession);
    const orderId = String(checkoutData.order_id || bySession.data.order.id || "");
    assert(orderId, `${channel.label} order id missing`, { checkoutData, order: bySession.data.order });

    return {
      channel: channel.channel,
      label: channel.label,
      api: {
        status: checkoutResponse.status(),
        order_id: orderId,
        order_no: checkoutData.order_no,
        stripe_checkout_session_id: stripeCheckoutSessionId,
        checkout_url_host: new URL(checkoutData.checkout_url || checkoutData.pay_url || stripeUrl).hostname,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        package_id: checkoutData.package_id,
        product_id: checkoutData.product_id,
        payment_methods: checkoutData.payment_methods,
        checkout_body_read_error: checkoutBodyReadError || undefined,
      },
      browser: {
        stripe_url_host: new URL(stripeUrl).hostname,
        stripe_url_path: new URL(stripeUrl).pathname,
        paywallScreenshot,
        stripeScreenshot,
      },
      orderLookup: {
        status: bySession.status,
        orderStatus: bySession.data.order.status,
        orderId: bySession.data.order.id,
        stripeCheckoutSessionId: bySession.data.order.stripe_checkout_session_id,
      },
      diagnostics: { consoleMessages, failedRequests },
    };
  } catch (error) {
    const failureScreenshot = await screenshot(page, `${channel.channel}-failure`).catch(() => "");
    error.detail = {
      ...(error.detail || {}),
      channel: channel.channel,
      currentUrl: page.url(),
      failureScreenshot,
      consoleMessages,
      failedRequests,
    };
    throw error;
  } finally {
    await context.close();
  }
}

await mkdir(runDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  runDir,
  package: {
    packageId,
    title: packageConfig.title,
    productIds: Object.fromEntries(channels.map((item) => [item.channel, item.productId])),
  },
  readiness: null,
  routeGuards: null,
  auth: null,
  channels: [],
  failures: [],
  status: "running",
};

try {
  report.readiness = await verifyReadiness();
  const executablePath = await findChrome();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    report.routeGuards = await verifyRouteGuards(browser);
    const auth = await loginForVerification();
    report.auth = {
      user: auth.user,
      rights: auth.rights,
      provider: auth.provider,
    };
    const homePage = await browser.newPage({ viewport: { width: 390, height: 1200 }, locale: "zh-CN" });
    await homePage.goto(`${baseUrl}/#/home`, { waitUntil: "domcontentloaded" });
    await homePage.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    await expectText(homePage.locator("body"), "AISea");
    report.homeScreenshot = await screenshot(homePage, "home");
    await homePage.close();

    for (const channel of channels) {
      try {
        report.channels.push(await verifyChannel(browser, channel, auth));
      } catch (error) {
        report.failures.push({
          channel: channel.channel,
          label: channel.label,
          message: redact(error instanceof Error ? error.message : String(error)),
          detail: error?.detail || {},
        });
      }
    }
    if (report.failures.length) {
      const failedLabels = report.failures.map((failure) => failure.label).join(", ");
      assert(false, `Production payment verification blocked for: ${failedLabels}`, { failures: report.failures });
    }
  } finally {
    await browser.close();
  }
  report.status = "passed";
  report.finishedAt = new Date().toISOString();
  await writeFile(join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log("AISea production payment verification passed");
  console.log(`Report: ${join(runDir, "report.json")}`);
  for (const item of report.channels) {
    console.log(`${item.label}: order=${item.api.order_id} session=${item.api.stripe_checkout_session_id} host=${item.browser.stripe_url_host}`);
  }
} catch (error) {
  report.status = "failed";
  report.finishedAt = new Date().toISOString();
  report.error = {
    message: redact(error instanceof Error ? error.message : String(error)),
    detail: error?.detail || {},
    stack: redact(error instanceof Error ? error.stack || "" : ""),
  };
  await writeFile(join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.error("AISea production payment verification failed");
  console.error(`Report: ${join(runDir, "report.json")}`);
  console.error(report.error.message);
  if (Object.keys(report.error.detail).length) console.error(JSON.stringify(report.error.detail, null, 2));
  process.exitCode = 1;
}
