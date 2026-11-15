import assert from "node:assert/strict";
import { existsSync, realpathSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const nextRequire = createRequire(import.meta.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), false);

if (!process.env.WORDPRESS_API_BASE_URL?.trim()) {
    // Next 16 requires one catch-all path, but exports its notFound HTML with HTTP 200 on static hosts.
    const output = resolve("out");
    assert.equal(realpathSync(output), output, "Refuse cleanup through a symlinked output directory");
    const blog = join(output, "bai-viet");
    assert.equal(dirname(blog), output, "Cleanup must stay inside the static export");
    rmSync(blog, { recursive: true, force: true });
    assert.equal(existsSync(blog), false, "Disabled CMS pages must not be served as soft 404s");
}
