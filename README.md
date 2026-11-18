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

Nội dung 6 trang và title/description Yoast cũng được lấy lúc build. Sửa trong **Pages → Coffee-shop fields / Yoast → Save**, rồi build/deploy lại. Xem [hướng dẫn sửa nội dung trang](docs/wordpress-pages.md).

Catalog sản phẩm và ảnh được lấy từ WooCommerce **ở bước build**, rồi dùng chung snapshot `src/data/products.ts` cho HTML, giỏ hàng và Worker COD. Khách truy cập không gọi WordPress để lấy catalog hoặc ảnh sản phẩm. Sửa sản phẩm cần build/deploy lại. Xem [cấu hình catalog và giới hạn snapshot](docs/wordpress-catalog.md).

Blog dùng riêng `WORDPRESS_API_BASE_URL`, để trống mặc định; cấu hình catalog không tự bật blog. Blog nằm ở `/bai-viet/`, không thay `/cau-chuyen/` hoặc menu hiện tại. Báo cáo CMS ban đầu: [headless-wordpress.md](docs/headless-wordpress.md).

```bash
pnpm test:cms
pnpm build
pnpm check:static
```

Workflow `Validate static build` chạy khi mở PR hoặc bấm **Run workflow**; `WOOCOMMERCE_API_BASE_URL` tùy chọn ghi đè catalog mặc định, `WORDPRESS_API_BASE_URL` tùy chọn bật blog. Workflow chỉ kiểm tra, không deploy. Checkout COD hiện có vẫn cần DB/email/phí vận chuyển riêng; tích hợp catalog không bật thanh toán WooCommerce.
