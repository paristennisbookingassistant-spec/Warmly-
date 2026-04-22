/**
 * esbuild build script for the AI Networking Coach Chrome extension.
 *
 * Outputs to dist/ — load that folder as an unpacked extension in Chrome.
 *
 * Usage:
 *   npm run build          → builds against localhost:3000 (dev)
 *   npm run build:prod     → builds against https://ai-networking-coach.vercel.app
 *   npm run watch          → rebuilds on file changes (dev)
 */

import esbuild from "esbuild";
import { cpSync, mkdirSync, writeFileSync, readFileSync } from "fs";

const watch = process.argv.includes("--watch");
const backendUrl =
  process.env.BACKEND_URL ?? "https://ai-networking-coach.vercel.app";

const dist = "dist";
mkdirSync(dist, { recursive: true });
mkdirSync(`${dist}/content-script`, { recursive: true });
mkdirSync(`${dist}/service-worker`, { recursive: true });
mkdirSync(`${dist}/popup`, { recursive: true });

/** Shared esbuild options */
const shared = {
  bundle: true,
  target: "chrome120",
  define: {
    // Injects the backend URL at build time so the extension talks to the right server
    __BACKEND_URL__: JSON.stringify(backendUrl),
  },
};

/** Build context factory */
async function buildAll() {
  const contexts = await Promise.all([
    // Content script — runs inside LinkedIn pages.
    // Must be IIFE (not ESM) because content scripts don't support import().
    esbuild.context({
      ...shared,
      entryPoints: ["content-script/index.ts"],
      outfile: `${dist}/content-script/index.js`,
      format: "iife",
    }),

    // Auth bridge — runs on the web app's pages to forward the session to the extension.
    esbuild.context({
      ...shared,
      entryPoints: ["content-script/auth-bridge.ts"],
      outfile: `${dist}/content-script/auth-bridge.js`,
      format: "iife",
    }),

    // Service worker — the extension's background process.
    // Uses ESM (manifest.json sets "type": "module").
    esbuild.context({
      ...shared,
      entryPoints: ["service-worker/index.ts"],
      outfile: `${dist}/service-worker/index.js`,
      format: "esm",
    }),

    // Popup — a React app loaded in the extension toolbar popup.
    // IIFE so it runs inline in the HTML page without import().
    esbuild.context({
      ...shared,
      entryPoints: ["popup/index.tsx"],
      outfile: `${dist}/popup/index.js`,
      format: "iife",
      jsx: "automatic",
    }),
  ]);

  if (watch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log(`Watching for changes... (backend: ${backendUrl})`);
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    copyStatic();
    console.log(`Built to ./${dist}/ (backend: ${backendUrl})`);
  }
}

function copyStatic() {
  // manifest.json
  cpSync("manifest.json", `${dist}/manifest.json`);

  // Popup HTML
  cpSync("popup/index.html", `${dist}/popup/index.html`);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
