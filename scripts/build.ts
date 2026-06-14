import { build } from "esbuild";
import { mkdirSync, readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
    version: string;
    repository: { url: string };
};

const repoUrl = pkg.repository?.url ?? "";
const repo = repoUrl.match(/github\.com\/([^/]+\/[^.]+)/)?.[1] ?? "OWNER/REPO";
const releaseBase = `https://github.com/${repo}/releases/latest/download`;

const banner = [
    "// ==UserScript==",
    "// @name         Amazon Saved to List Auto-Adder",
    `// @namespace    https://github.com/${repo}`,
    `// @version      ${pkg.version}`,
    '// @description  Bulk add Amazon "Saved for later" items to a list with SPA refresh protection and lazy-load scrolling',
    "// @author       Claudios",
    "// @match        https://www.amazon.*/cart*",
    "// @match        https://www.amazon.*/gp/cart/*",
    "// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com",
    `// @updateURL    ${releaseBase}/save-to-list.user.js`,
    `// @downloadURL  ${releaseBase}/save-to-list.user.js`,
    "// @grant        none",
    "// ==/UserScript==\n",
].join("\n");

mkdirSync("dist", { recursive: true });

await build({
    entryPoints: ["src/save-to-list.ts"],
    bundle: true,
    format: "iife",
    outfile: "dist/save-to-list.user.js",
    banner: { js: banner },
    platform: "browser",
    target: ["es2025"],
});

console.log(`Built dist/save-to-list.user.js (v${pkg.version})`);
