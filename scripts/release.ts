import { execSync } from "child_process";
import { readFileSync } from "fs";

const BUMP_TYPES = ["patch", "minor", "major"] as const;
type BumpType = (typeof BUMP_TYPES)[number];

const bumpType = (process.argv[2] ?? "patch") as BumpType;

if (!BUMP_TYPES.includes(bumpType)) {
    console.error(`Usage: pnpm release [${BUMP_TYPES.join("|")}]`);
    process.exit(1);
}

const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });
const capture = (cmd: string) => execSync(cmd, { encoding: "utf-8" }).trim();

const dirty = capture("git status --porcelain");
if (dirty) {
    console.error("Working tree is not clean. Commit or stash changes first.");
    process.exit(1);
}

// Bump version in package.json only (no git commit/tag yet)
run(`npm version ${bumpType} --no-git-tag-version`);

const { version } = JSON.parse(readFileSync("package.json", "utf-8")) as { version: string };
console.log(`\nReleasing v${version}...`);

// Commit, tag, push — the release workflow handles creating the GitHub release
run("git add package.json");
run(`git commit -m "release: v${version}"`);
run(`git tag v${version}`);
run("git push && git push --tags");

console.log(`\nv${version} pushed. GitHub Actions will build and publish the release.`);
