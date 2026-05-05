import { execFile } from "node:child_process";
import { access, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 4181);
const host = "127.0.0.1";
const base = `http://${host}:${port}`;
const outputDir = process.env.SCREENSHOT_DIR || join(process.cwd(), "screenshots");
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
].filter(Boolean);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      if (!candidate.startsWith("/")) return candidate;
    }
  }
  throw new Error("Chrome executable not found. Set CHROME_BIN to enable screenshots.");
}

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await wait(150);
  }
  throw new Error("Vite server did not become ready");
}

async function capture(chrome, name, size, url) {
  const file = join(outputDir, `${name}.png`);
  const profileDir = join(tmpdir(), `aisea-chrome-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await execFileAsync(chrome, [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=2500",
    `--user-data-dir=${profileDir}`,
    "--hide-scrollbars",
    `--window-size=${size}`,
    `--screenshot=${file}`,
    url,
  ], { timeout: 15000 });
  const info = await stat(file);
  if (info.size < 40_000) throw new Error(`${file} looks too small`);
  return file;
}

let server;
try {
  await mkdir(outputDir, { recursive: true });
  const chrome = await findChrome();
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", host, "--port", String(port)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();
  const shots = [
    await capture(chrome, "home-mobile", "390,1400", `${base}/#/home`),
    await capture(chrome, "purchase-mobile", "390,1600", `${base}/#/purchase`),
    await capture(chrome, "success-mobile", "390,1400", `${base}/?demo=full#/success`),
    await capture(chrome, "select-mobile", "390,1700", `${base}/?demo=full#/select`),
    await capture(chrome, "upload-mobile", "390,1600", `${base}/?demo=full#/upload`),
    await capture(chrome, "preferences-mobile", "390,1700", `${base}/?demo=full#/preferences`),
    await capture(chrome, "confirm-mobile", "390,1700", `${base}/?demo=full#/confirm`),
    await capture(chrome, "progress-mobile", "390,1400", `${base}/#/progress`),
    await capture(chrome, "admin-mobile", "390,1400", `${base}/#/admin`),
    await capture(chrome, "admin-dashboard-mobile", "390,1800", `${base}/?demo=admin#/admin`),
    await capture(chrome, "result-mobile", "390,1400", `${base}/?demo=full#/result`),
    await capture(chrome, "home-desktop", "1365,1200", `${base}/#/home`),
  ];
  console.log("AISea screenshot verification passed");
  for (const shot of shots) console.log(shot);
} finally {
  if (server) server.kill("SIGTERM");
}
