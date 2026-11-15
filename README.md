# Là Vườn Coffee

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

Yêu cầu Node.js **22.12 trở lên** và pnpm theo `packageManager` trong `package.json`.

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

Canonical public đã đặt theo domain được chỉ định:

```json
"url": "https://lavuon.cafe"
```

DNS/custom domain/TLS trên Cloudflare vẫn cần được xác minh riêng; đổi canonical không tự cấu hình hosting.

## Headless WordPress

Xem [báo cáo tích hợp và cấu hình thủ công](docs/headless-wordpress.md). `WORDPRESS_API_BASE_URL` là biến **build-time**, để trống mặc định; chỉ bật sau khi môi trường build gọi được API JSON. Blog mới nằm ở `/bai-viet/`, không thay trang `/cau-chuyen/` hoặc menu hiện tại. Catalog hiện vẫn dùng dữ liệu local vì WooCommerce chưa được xác minh.

```bash
pnpm test:cms
pnpm build
pnpm check:static
```

Workflow `Validate static build` chạy khi mở PR hoặc bấm **Run workflow**, dùng Repository variable `WORDPRESS_API_BASE_URL`. Nội dung mới cần chạy lại build; workflow không deploy. Checkout và thanh toán tiếp tục bị khóa.
