import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tests = readdirSync("tests").filter(name => name.endsWith(".test.mjs")).sort().map(name => `tests/${name}`);
const result = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
