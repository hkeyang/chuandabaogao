import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 4180;
const base = `http://localhost:${port}`;
const tempDir = await mkdtemp(join(tmpdir(), "aisea-verify-"));
const dataFile = join(tempDir, "store.json");
let server;
let stderr = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Static files are expected to be plain text.
  }
  return { response, data, text };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const { response } = await request("/api/health");
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await wait(150);
  }
  throw new Error("Server did not become ready");
}

function startServer() {
  stderr = "";
  server = spawn(process.execPath, ["api/server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), AISEA_DATA_FILE: dataFile },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
}

async function stopServer() {
  if (!server) return;
  server.kill("SIGTERM");
  await wait(150);
  server = null;
}

try {
  startServer();
  await waitForServer();

  const health = await request("/api/health");
  assert(health.response.ok && health.data.ok, "health endpoint failed");

  const readiness = await request("/api/readiness");
  assert(readiness.response.ok, "readiness endpoint failed");
  assert(readiness.data.mode === "local-svg-fallback", "default readiness should use local SVG fallback");
  assert(Array.isArray(readiness.data.checks), "readiness checks missing");

  const config = await request("/api/config");
  assert(config.response.ok, "config endpoint failed");
  assert(config.data.products?.length === 3, "config should expose three products");

  const home = await request("/");
  assert(home.response.ok, "index page failed");
  assert(home.text.includes("AISea 个人形象报告 H5"), "index title missing");

  const redeem = await request("/api/coupons/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "AISEA99" }),
  });
  assert(redeem.response.ok, "coupon redeem failed");
  assert(redeem.data.product.id === "full", "full coupon did not resolve");
  assert(redeem.data.rights.topic === 3 && redeem.data.rights.comprehensive === 1, "rights mismatch");

  const invalid = await request("/api/coupons/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "BADCODE" }),
  });
  assert(invalid.response.status === 404, "invalid coupon should fail");

  const generated = await request("/api/reports/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      report_type: "综合形象报告",
      style_preference: "温柔精致",
      scene_preference: "拍照上镜",
      change_level: "明显变化",
    }),
  });
  assert(generated.response.ok, "report generate endpoint failed");
  assert(generated.data.report_id && generated.data.status === "completed", "generated report payload incomplete");
  assert(generated.data.report_image_url.endsWith("/report.svg"), "generated report image should be downloadable SVG");
  assert(generated.data.xhs_cover_image_url.endsWith("/cover.svg"), "generated cover image should be downloadable SVG");

  const fetchedReport = await request(`/api/reports/${generated.data.report_id}`);
  assert(fetchedReport.response.ok, "report query endpoint failed");
  assert(fetchedReport.data.report_id === generated.data.report_id, "report query id mismatch");

  const reportSvg = await request(`/api/reports/${generated.data.report_id}/report.svg`);
  assert(reportSvg.response.ok && reportSvg.text.includes("<svg"), "report svg endpoint failed");
  assert(reportSvg.text.includes("轻法式白月光") && reportSvg.text.includes("发型推荐"), "report svg content incomplete");

  const coverSvg = await request(`/api/reports/${generated.data.report_id}/cover.svg`);
  assert(coverSvg.response.ok && coverSvg.text.includes("<svg"), "cover svg endpoint failed");
  assert(coverSvg.text.includes("养成报告") && coverSvg.text.includes("AI 个人形象报告"), "cover svg content incomplete");

  await stopServer();
  startServer();
  await waitForServer();
  const persistedReport = await request(`/api/reports/${generated.data.report_id}`);
  assert(persistedReport.response.ok, "persisted report query endpoint failed after restart");
  assert(persistedReport.data.report_id === generated.data.report_id, "persisted report id mismatch after restart");

  const deletedReport = await request(`/api/reports/${generated.data.report_id}`, { method: "DELETE" });
  assert(deletedReport.response.ok && deletedReport.data.ok, "report delete endpoint failed");
  const missingReport = await request(`/api/reports/${generated.data.report_id}`);
  assert(missingReport.response.status === 404, "deleted report should not be queryable");

  const share = await request("/api/reports/prepare-xhs-share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ report_id: "rpt_test", report_type: "comprehensive" }),
  });
  assert(share.response.ok, "share assets endpoint failed");
  assert(share.data.cover_image_url && share.data.report_image_url && share.data.copy_text, "share payload incomplete");
  assert(share.data.cover_image_url.endsWith("/cover.svg") && share.data.report_image_url.endsWith("/report.svg"), "share image urls should point to downloadable SVG assets");
  assert(share.data.copy_text.includes("#AI形象报告"), "share copy missing hashtags");

  const prompt = await request("/api/reports/generate-prompt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      report_type: "综合形象报告",
      style_preference: "温柔精致",
      scene_preference: "拍照上镜",
      change_level: "明显变化",
    }),
  });
  assert(prompt.response.ok, "prompt endpoint failed");
  for (const required of ["1080x1440", "不要乱码", "发型推荐", "发色推荐", "穿搭配饰", "不要生成乱码文字"]) {
    assert(prompt.data.prompt.includes(required), `prompt missing ${required}`);
  }

  const app = await readFile("app.js", "utf-8");
  const styles = await readFile("styles.css", "utf-8");
  for (const route of ["renderHome", "renderPurchase", "renderSuccess", "renderSelect", "renderUpload", "renderPreferences", "renderConfirm", "renderProgress", "renderResult"]) {
    assert(app.includes(route), `missing ${route}`);
  }
  for (const feature of ["一键准备小红书分享", "xhsdiscover://", "复制生图指令", "downloadAsset(", "删除报告数据", "apiDelete(`/api/reports/${report.id}`)", "apiPost(\"/api/coupons/redeem\"", "apiPost(\"/api/reports/generate\"", "apiPost(\"/api/reports/generate-prompt\""]) {
    assert(app.includes(feature), `missing feature ${feature}`);
  }
  for (const responsive of ["@media (max-width: 900px)", "@media (max-width: 560px)", "aspect-ratio: 1080 / 1440", "aspect-ratio: 1080 / 1920"]) {
    assert(styles.includes(responsive), `missing responsive/style evidence ${responsive}`);
  }

  console.log("AISea verification passed");
} finally {
  await stopServer();
  await rm(tempDir, { recursive: true, force: true });
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
}
