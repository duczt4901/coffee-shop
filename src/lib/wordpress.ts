import { z } from "zod";

const rendered = z.object({ rendered: z.string(), protected: z.boolean().optional() });
const id = z.number().int().positive();
const slug = z
    .string()
    .min(1)
    .refine((value) => !/[/?#\\\u0000-\u001f]/.test(value) && ![".", ".."].includes(value), "Unsafe WordPress slug");
const postSchema = z.object({
    id,
    slug,
    title: rendered,
    content: rendered,
    excerpt: rendered,
    date: z.string().optional(),
    modified: z.string().optional(),
    status: z.string().optional(),
    categories: z.array(id).default([]),
    tags: z.array(id).default([]),
    featured_media: z.number().int().nonnegative().default(0),
});
const termSchema = z.object({ id, slug, name: z.string(), description: z.string(), count: z.number().int().nonnegative().optional() });
const mediaSchema = z.object({
    id,
    slug,
    source_url: z.url(),
    alt_text: z.string(),
    title: rendered,
    caption: rendered.optional(),
    description: rendered.optional(),
    media_details: z.object({ width: z.number().optional(), height: z.number().optional() }).optional(),
});

export type WordPressPost = z.infer<typeof postSchema>;
export type WordPressTerm = z.infer<typeof termSchema>;
export type WordPressMedia = z.infer<typeof mediaSchema>;
export type WordPressPage<T> = { items: T[]; total: number; totalPages: number };
type Pagination = { page?: number; perPage?: number };
type PostQuery = Pagination & { slug?: string; categories?: number; tags?: number };

export class WordPressApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly retryAfter?: string | null,
    ) {
        super(message);
        this.name = "WordPressApiError";
    }
}

export function isWordPressConfigured() {
    return Boolean(process.env.WORDPRESS_API_BASE_URL?.trim());
}

export function createWordPressClient(options: { baseUrl?: string; timeoutMs?: number; fetch?: typeof fetch } = {}) {
    const send = options.fetch ?? fetch;
    const timeoutMs = options.timeoutMs ?? 15000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error("Invalid WordPress request timeout");
    // Cache only within this build client; rejected requests remain retryable.
    const requests = new Map<string, Promise<{ body: unknown; headers: Headers; status: number }>>();

    function urlFor(path: string, query: Record<string, string | number> = {}) {
        const configured = options.baseUrl ?? process.env.WORDPRESS_API_BASE_URL;
        if (!configured?.trim()) throw new WordPressApiError("WORDPRESS_API_BASE_URL is not configured");
        let url: URL;
        try {
            url = new URL(configured);
        } catch {
            throw new WordPressApiError("Invalid WORDPRESS_API_BASE_URL");
        }
        const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
        if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.hash)
            throw new WordPressApiError("WordPress API requires HTTPS without embedded credentials or fragments");
        if ([...url.searchParams.keys()].some((key) => key !== "rest_route")) throw new WordPressApiError("WordPress API base must not contain credentials or unrelated query parameters");
        if (url.searchParams.has("rest_route")) {
            const base = url.searchParams.get("rest_route")!.replace(/\/$/, "");
            url.searchParams.set("rest_route", `${base}/${path}`.replace(/^\/?/, "/"));
        } else {
            url.pathname = `${url.pathname.replace(/\/$/, "")}/${path}`;
        }
        for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
        return url;
    }

    async function request<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string | number>) {
        const url = urlFor(path, query).toString();
        let pending = requests.get(url);
        if (!pending) {
            pending = send(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs), redirect: "error", cache: "no-store" })
                .then(async (response) => {
                    if (!response.ok) throw new WordPressApiError(`WordPress API returned HTTP ${response.status}`, response.status, response.headers.get("Retry-After"));
                    let body: unknown;
                    try {
                        body = await response.json();
                    } catch {
                        throw new WordPressApiError("WordPress API returned invalid JSON", response.status);
                    }
                    return { body, headers: response.headers, status: response.status };
                })
                .catch((error: unknown) => {
                    requests.delete(url);
                    if (error instanceof WordPressApiError) throw error;
                    throw new WordPressApiError("WordPress API network request failed or timed out");
                });
            requests.set(url, pending);
        }
        const response = await pending;
        const parsed = schema.safeParse(response.body);
        if (!parsed.success) {
            requests.delete(url);
            throw new WordPressApiError("WordPress API response did not match its public schema", response.status);
        }
        return { data: parsed.data, headers: response.headers };
    }

    function pagination(input: Pagination = {}) {
        const page = input.page ?? 1;
        const per_page = input.perPage ?? 20;
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(per_page) || per_page < 1 || per_page > 100) throw new Error("Invalid WordPress pagination");
        return { page, per_page };
    }

    async function list<T>(path: string, schema: z.ZodType<T>, query: Record<string, string | number>): Promise<WordPressPage<T>> {
        const { data, headers } = await request(path, z.array(schema), query);
        const totals = [headers.get("X-WP-Total"), headers.get("X-WP-TotalPages")];
        if (totals.some((value) => value === null || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) {
            requests.delete(urlFor(path, query).toString());
            throw new WordPressApiError("WordPress API pagination headers are missing or invalid");
        }
        return { items: data, total: Number(totals[0]), totalPages: Number(totals[1]) };
    }

    function positiveId(value: number) {
        return id.parse(value);
    }

    return {
        getPosts(input: PostQuery = {}) {
            const query: Record<string, string | number> = { ...pagination(input), status: "publish" };
            if (input.slug !== undefined) query.slug = slug.parse(input.slug);
            if (input.categories !== undefined) query.categories = positiveId(input.categories);
            if (input.tags !== undefined) query.tags = positiveId(input.tags);
            return list("wp/v2/posts", postSchema, query);
        },
        async getPost(postId: number) {
            return (await request(`wp/v2/posts/${positiveId(postId)}`, postSchema)).data;
        },
        getCategories(input: Pagination = {}) {
            return list("wp/v2/categories", termSchema, pagination(input));
        },
        getTags(input: Pagination = {}) {
            return list("wp/v2/tags", termSchema, pagination(input));
        },
        getMedia(input: Pagination = {}) {
            return list("wp/v2/media", mediaSchema, pagination(input));
        },
        async getMediaItem(mediaId: number) {
            return (await request(`wp/v2/media/${positiveId(mediaId)}`, mediaSchema)).data;
        },
    };
}

export const wordpress = createWordPressClient();
