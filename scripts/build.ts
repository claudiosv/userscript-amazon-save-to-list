import { build } from "esbuild";
import { mkdirSync, readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
    version: string;
    repository: { url: string };
};

const repoUrl = pkg.repository?.url ?? "";
const repo = repoUrl.match(/github\.com\/([^/]+\/[^.]+)/)?.[1] ?? "OWNER/REPO";
const releaseBase = `https://github.com/${repo}/releases/latest/download`;

// Comprehensive list of active Amazon TLDs
const AMAZON_TLDS = [
    // North America
    "com",
    "ca",
    "com.mx",
    // Europe
    "co.uk",
    "de",
    "fr",
    "it",
    "es",
    "nl",
    "se",
    "pl",
    "com.be",
    // Asia & Pacific
    "co.jp",
    "in",
    "com.au",
    "sg",
    // Middle East & Africa
    "ae",
    "sa",
    "eg",
    "com.tr",
    "co.za",
    // South America
    "com.br",
];

// Dynamically generate the @match rules
const matchRules = AMAZON_TLDS.flatMap((tld) => [
    `// @match        https://www.amazon.${tld}/cart*`,
    `// @match        https://www.amazon.${tld}/gp/cart/*`,
]);

const banner = [
    "// ==UserScript==",
    "// @name         Amazon Saved to List Auto-Adder",
    `// @namespace    https://github.com/${repo}`,
    "// @license      MIT",
    `// @version      ${pkg.version}`,
    '// @description  Bulk add Amazon "Saved for later" items to a list with SPA refresh protection and lazy-load scrolling',
    "// @author       Claudios",
    ...matchRules, // Spread the generated rules here
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
