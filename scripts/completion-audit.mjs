import { readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.PORT || 4182);
const base = `http://127.0.0.1:${port}`;
const tempDir = await mkdtemp(join(tmpdir(), "aisea-audit-"));
const dataFile = join(tempDir, "store.json");

const criteria = [];
let server;
let stderr = "";

function record(id, ok, evidence, remediation = "") {
  criteria.push({ id, ok, evidence, remediation });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Keep text for HTML/SVG.
  }
  return { response, data, text };
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const { response } = await request("/api/health");
      if (response.ok) return true;
    } catch {
      // Server is starting.
    }
    await wait(150);
  }
  return false;
}

function startServer() {
  server = spawn(process.execPath, ["api/server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), AISEA_DATA_FILE: dataFile },
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

async function fileIncludes(path, values) {
  const text = await readFile(path, "utf-8");
  return values.every((value) => text.includes(value));
}

try {
  const files = [
    "index.html",
    "styles.css",
    "app.js",
    "api/server.mjs",
    "scripts/verify.mjs",
    "scripts/screenshot-verify.mjs",
    "package.json",
    "Dockerfile",
    ".env.example",
    "data/aisea-store.json",
  ];
  for (const file of files) {
    try {
      await stat(file);
      record(`file:${file}`, true, `${file} exists`);
    } catch {
      record(`file:${file}`, false, `${file} missing`, `Create ${file}`);
    }
  }

  record(
    "frontend:pages",
    await fileIncludes("app.js", ["renderHome", "renderPurchase", "renderSuccess", "renderSelect", "renderUpload", "renderPreferences", "renderConfirm", "renderProgress", "renderResult"]),
    "app.js contains all 9 required page renderers",
    "Restore missing H5 page renderers"
  );
  record(
    "frontend:share",
    await fileIncludes("app.js", ["一键准备小红书分享", "保存封面图", "保存完整报告图", "复制文案", "xhsdiscover://"]),
    "app.js contains XHS share preparation flow",
    "Implement cover/report/copy/open-XHS flow"
  );
  record(
    "frontend:download-delete",
    await fileIncludes("app.js", ["downloadAsset(", "删除报告数据", "apiDelete(`/api/reports/${report.id}`)"]),
    "app.js contains download and delete-report interactions",
    "Implement download and privacy deletion controls"
  );
  record(
    "styles:responsive",
    await fileIncludes("styles.css", ["@media (max-width: 900px)", "@media (max-width: 560px)", "aspect-ratio: 1080 / 1440", "aspect-ratio: 1080 / 1920"]),
    "styles.css contains responsive breakpoints and report/cover ratios",
    "Add responsive layout and stable report/cover dimensions"
  );
  record(
    "prompt:anti-gibberish",
    await fileIncludes("api/server.mjs", ["不要乱码", "不要生成乱码文字", "发型推荐", "发色推荐", "穿搭配饰", "1080x1440", "1080x1920"]),
    "server prompt includes Chinese readability, anti-gibberish, module, and size constraints",
    "Restore prompt constraints"
  );

  startServer();
  const serverReady = await waitForServer();
  record("server:starts", serverReady, serverReady ? `server responded at ${base}` : stderr, "Fix server startup");

  if (serverReady) {
    const health = await request("/api/health");
    record("api:health", health.response.ok && health.data.ok, "GET /api/health returned ok", "Fix health endpoint");

    const readiness = await request("/api/readiness");
    record("api:readiness-endpoint", readiness.response.ok && Array.isArray(readiness.data.checks), "GET /api/readiness returned checks", "Fix readiness endpoint");
    record(
      "production:readiness",
      readiness.data.ready === true,
      JSON.stringify(readiness.data),
      "Configure real PURCHASE_LINK_* and AISEA_IMAGE_ENDPOINT values"
    );

    const redeem = await request("/api/coupons/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "AISEA99" }),
    });
    record("api:redeem", redeem.response.ok && redeem.data.rights?.comprehensive === 1, "POST /api/coupons/redeem returns full-card rights", "Fix coupon redemption");

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
    record("api:generate", generated.response.ok && generated.data.report_id && generated.data.prompt?.includes("不要乱码"), "POST /api/reports/generate returns report, assets, and prompt", "Fix report generation endpoint");

    if (generated.response.ok) {
      const reportId = generated.data.report_id;
      const reportSvg = await request(`/api/reports/${reportId}/report.svg`);
      const coverSvg = await request(`/api/reports/${reportId}/cover.svg`);
      record("api:report-svg", reportSvg.response.ok && reportSvg.text.includes("发型推荐"), "GET report.svg returns readable report SVG", "Fix report SVG asset");
      record("api:cover-svg", coverSvg.response.ok && coverSvg.text.includes("AI 个人形象报告"), "GET cover.svg returns readable cover SVG", "Fix cover SVG asset");

      await stopServer();
      startServer();
      await waitForServer();
      const persisted = await request(`/api/reports/${reportId}`);
      record("api:persistence", persisted.response.ok && persisted.data.report_id === reportId, "Report survived server restart via JSON store", "Fix persistence store");
    }
  }

  for (const screenshot of ["screenshots/home-mobile.png", "screenshots/result-desktop.png", "screenshots/share-mobile.png"]) {
    try {
      const info = await stat(screenshot);
      record(`screenshot:${screenshot}`, info.size > 40_000, `${screenshot} size ${info.size}`, "Run npm run verify:screenshots");
    } catch {
      record(`screenshot:${screenshot}`, false, `${screenshot} missing`, "Run npm run verify:screenshots");
    }
  }

  const failed = criteria.filter((item) => !item.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, criteria, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
} finally {
  await stopServer();
  await rm(tempDir, { recursive: true, force: true });
}
