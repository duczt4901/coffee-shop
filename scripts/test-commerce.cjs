const { spawnSync } = require("node:child_process");
const path = require("node:path");

for (const args of [
    [
        path.resolve("node_modules/typescript/bin/tsc"),
        "tests/commerce.test.ts",
        "--outDir",
        ".next/commerce-tests",
        "--module",
        "commonjs",
        "--moduleResolution",
        "node",
        "--target",
        "es2022",
        "--esModuleInterop",
        "true",
        "--skipLibCheck",
        "true",
        "--strict",
        "true",
    ],
    ["--test", ".next/commerce-tests/tests/commerce.test.js"],
]) {
    const result = spawnSync(process.execPath, args, { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
}
