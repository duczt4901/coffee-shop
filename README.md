# Coffee Shop — Minimal Skeleton

Project Next.js static export tối giản. App hiện chỉ có:

- Header
- Footer
- SEO metadata
- `robots.txt`
- `sitemap.xml`
- JSON-LD `WebSite`
- `db.json` được kiểm tra bằng Zod
- Cloudflare Workers Static Assets

Không có page content, section mẫu hoặc animation đang chạy. Các vị trí làm tiếp đã được đánh dấu bằng `TODO` trong source code.

## Chạy local

```bash
pnpm install
pnpm dev
```

## Build static

```bash
pnpm build
```

Kết quả nằm trong thư mục `out/`.

## Preview bằng Cloudflare runtime

```bash
pnpm preview
```

## Deploy

```bash
pnpm deploy
```

## Việc cần đổi trước production

Sửa thông tin trong:

```text
src/data/db.json
```

Tối thiểu phải thay:

```json
"url": "https://coffee-shop.example"
```

bằng domain thật.
