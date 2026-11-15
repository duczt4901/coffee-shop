import assert from "node:assert/strict";
import { test } from "node:test";
import { createWordPressClient, WordPressApiError } from "../src/lib/wordpress";

const post = { id: 1, slug: "ca-phe", title: { rendered: "Coffee" }, content: { rendered: "<p>Content</p>" }, excerpt: { rendered: "Excerpt" }, categories: [2] };
const page = (data: unknown = [post]) => Response.json(data, { headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" } });

test("both WordPress base URL formats preserve public pagination and cache repeated build reads", async () => {
    for (const baseUrl of ["https://cms.example/index.php/wp-json/", "https://cms.example/?rest_route=/"]) {
        let count = 0;
        const client = createWordPressClient({
            baseUrl,
            fetch: async (input, init) => {
                count++;
                const url = new URL(String(input));
                assert.equal(baseUrl.includes("rest_route") ? url.searchParams.get("rest_route") : url.pathname, baseUrl.includes("rest_route") ? "/wp/v2/posts" : "/index.php/wp-json/wp/v2/posts");
                assert.equal(url.searchParams.get("status"), "publish");
                assert.equal(url.searchParams.get("page"), "2");
                assert.equal(url.searchParams.get("per_page"), "10");
                assert.equal(init?.redirect, "error");
                assert.equal(init?.cache, "no-store");
                return page();
            },
        });
        assert.deepEqual((await client.getPosts({ page: 2, perPage: 10 })).items[0].title, post.title);
        assert.equal((await client.getPosts({ page: 2, perPage: 10 })).totalPages, 1);
        assert.equal(count, 1);
    }
});

test("HTTP errors retain status, Retry-After, and permit retry without logging response details", async () => {
    for (const status of [403, 404, 429, 500]) {
        let count = 0;
        const client = createWordPressClient({
            baseUrl: "https://cms.example/index.php/wp-json",
            fetch: async () => (++count === 1 ? new Response("private upstream details", { status, headers: { "Retry-After": "30" } }) : page()),
        });
        await assert.rejects(client.getPosts(), (error: unknown) => error instanceof WordPressApiError && error.status === status && error.retryAfter === "30" && !error.message.includes("private"));
        assert.equal((await client.getPosts()).total, 1);
    }
});

test("network, timeout, malformed JSON, invalid schema, and absent totals never become empty posts", async () => {
    for (const send of [
        async () => {
            throw new TypeError("network error with sensitive details");
        },
        async (_input: unknown, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
            }),
        async () => new Response("<html>host failure</html>"),
        async () => page([{ id: "wrong" }]),
        async () => Response.json([post]),
    ]) {
        const client = createWordPressClient({ baseUrl: "https://cms.example/index.php/wp-json", timeoutMs: 10, fetch: send as typeof fetch });
        const keepAlive = setTimeout(() => {}, 1000);
        try {
            await assert.rejects(client.getPosts(), WordPressApiError);
        } finally {
            clearTimeout(keepAlive);
        }
    }
});

test("invalid configuration, paging, IDs and unsafe slugs fail before network", async () => {
    const send: typeof fetch = async () => {
        throw new Error("must not fetch");
    };
    for (const baseUrl of ["invalid", "http://cms.example", "https://key:secret@cms.example", "https://cms.example/?consumer_key=secret"]) {
        await assert.rejects(createWordPressClient({ baseUrl, fetch: send }).getPosts(), WordPressApiError);
    }
    const client = createWordPressClient({ baseUrl: "https://cms.example/index.php/wp-json", fetch: send });
    assert.throws(() => client.getPosts({ perPage: 101 }));
    assert.throws(() => client.getPosts({ slug: "../bad" }));
    assert.throws(() => client.getPosts({ categories: -1 }));
    await assert.rejects(client.getPost(0));
});

test("single posts, taxonomies and media use their public routes and validate output", async () => {
    const seen: string[] = [];
    const media = { id: 3, slug: "bean", source_url: "https://cms.example/bean.jpg", alt_text: "Coffee bean", title: { rendered: "Bean" } };
    const client = createWordPressClient({
        baseUrl: "https://cms.example/index.php/wp-json",
        fetch: async (input) => {
            const route = new URL(String(input)).pathname;
            seen.push(route);
            if (route.endsWith("/posts/1")) return Response.json(post);
            if (route.endsWith("/media/3")) return Response.json(media);
            if (route.endsWith("/media")) return page([media]);
            return page([{ id: 2, slug: "coffee", name: "Coffee", description: "" }]);
        },
    });
    assert.equal((await client.getPost(1)).id, 1);
    assert.equal((await client.getCategories()).items[0].name, "Coffee");
    assert.equal((await client.getTags()).items[0].slug, "coffee");
    assert.equal((await client.getMedia()).items[0].alt_text, "Coffee bean");
    assert.equal((await client.getMediaItem(3)).id, 3);
    assert.equal(seen.length, 5);
});
