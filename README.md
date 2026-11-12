# Coffee Shop

Website Next.js static export với nội dung cà phê, motion và trải nghiệm WebGL. Các nền tảng có sẵn:

- Header
- Footer
- SEO metadata
- `robots.txt`
- `sitemap.xml`
- JSON-LD `WebSite`
- `db.json` được kiểm tra bằng Zod
- Cloudflare Workers Static Assets

Các kết nối nghiệp vụ chưa hoàn tất được theo dõi tại [docs/integrations.md](docs/integrations.md). Luôn cập nhật danh sách đó khi nối domain, WordPress, database, API hoặc email; không dùng báo cáo audit cũ làm trạng thái kết nối hiện tại.

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
