# Các kết nối cần hoàn tất

Danh sách duy nhất để theo dõi kết nối nghiệp vụ. Cập nhật trạng thái, đích nhận và bước kiểm chứng ở đây mỗi khi nối thêm dịch vụ; không lưu token, mật khẩu hoặc dữ liệu khách hàng trong tài liệu.

## Trạng thái hiện tại

Frontend vẫn là Next static export. Ngày 18/11/2026 đã đọc thành công Store API của `lavuon.cu.ma`: bốn sản phẩm, đúng giá/slug/thuộc tính và ảnh. `pnpm build` lấy catalog và mirror ảnh trước khi xuất trang; snapshot `src/data/products.ts` dùng chung cho UI, giỏ và Worker. Đồng thời lấy 179 text field ACF, 43 vị trí ảnh và Yoast từ 6 Pages vào `src/data/page-content.ts` / `src/data/page-images.ts`; ảnh được mirror cục bộ khi build. Đã nhập các nhóm ACF ảnh và lưu ảnh cảnh mới trên Trang chủ. Frontend tạm noindex/nofollow; WordPress đã bật Discourage search engines. Xem [catalog WooCommerce build-time](wordpress-catalog.md) và [nội dung trang](wordpress-pages.md). Blog vẫn opt-in qua biến riêng; báo cáo [headless-wordpress.md](headless-wordpress.md) ghi trạng thái lịch sử ngày 14/11. Theo dõi phiên bản triển khai trong Git/Cloudflare Builds; thanh toán chưa tích hợp.

| Trạng thái | Hạng mục | Điểm nối / cấu hình | Cần chốt và nghiệm thu |
|---|---|---|---|
| Một phần | Domain website | `src/data/db.json` → `https://lavuon.cafe`; Cloudflare custom domain/DNS/TLS | Canonical được cấu hình; DNS, TLS và www redirect chưa được kiểm chứng. Rebuild static sau khi đổi. |
| Đã nối catalog và nội dung trang / blog tùy chọn | WordPress/WooCommerce | `scripts/generate-products.mjs`, `scripts/generate-pages.mjs`, `src/lib/wordpress.ts`; `WOOCOMMERCE_API_BASE_URL` build-time | Catalog/ảnh, 179 field chữ, 43 vị trí ảnh trên 6 Pages và title/description Yoast đã xác minh qua API thật và static build. Sửa trong Pages → Coffee-shop fields / Yoast → Save, rồi rebuild/deploy. Blog dùng `WORDPRESS_API_BASE_URL` riêng; checkout WooCommerce chưa tích hợp. |
| Chờ | Form tư vấn | `NEXT_PUBLIC_CONTACT_ENDPOINT` (build-time, để trống mặc định) | URL nhận native `POST` form-urlencoded trường `contactInfo`; xác thực, chống spam/rate limit, consent, trang phản hồi thành công/thất bại và chính sách lưu dữ liệu ở receiver. Có thể nối WordPress hoặc proxy cùng domain sau khi có hợp đồng API. Chưa cấu hình thì input/submit bị vô hiệu hóa, không gửi GET hoặc báo thành công giả. |
| Chờ | Database đơn hàng | Binding `DB` đang comment trong `wrangler.jsonc`; schema trong `migrations/` | Chốt D1 hay backend WordPress. Nếu dùng D1: database thật, binding, migrations, quyền truy cập và backup. Không chạy migration production trước khi chốt. |
| Code COD đang bật / thiếu backend production | API checkout | `CHECKOUT_ENABLED = true`; `/thanh-toan/`, `GET /api/checkout-config`, `POST /api/orders` | Worker dùng giá/trạng thái bán từ cùng snapshot build; không gọi WordPress khi đặt hàng. Binding DB vẫn thiếu trong repo; hoàn tất database/email trước nghiệm thu COD. Chưa có đơn hàng/thanh toán WooCommerce. |
| Chờ | Phí vận chuyển | Worker `SHIPPING_FEE_VND` | Phí thực tế và cách thể hiện khi cần gọi xác nhận; không tự coi giá trị trống là miễn phí. |
| Chờ | Email đơn hàng | Worker `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `ORDER_NOTIFICATION_TO` | Domain gửi đã xác minh, DNS SPF/DKIM/DMARC, người nhận thật, secret môi trường, retry/crons. Thay thông tin mẫu trong cấu hình trước production. |
| Một phần | Liên hệ/social | `src/data/contact.ts`: Zalo/điện thoại `0356597539`, dùng trong giỏ, footer và trang liên hệ | Đã gắn `https://zalo.me/0356597539` theo số client cung cấp; chưa xác minh tài khoản Zalo. Email, Facebook và địa chỉ vẫn chờ thông tin thật. |
| Một phần | Hosting / rebuild | Cloudflare Static Assets + Worker; `out/`; `.github/workflows/static-build.yml` | Cloudflare Builds nối `duczt4901/coffee-shop`, production branch `main`, build `pnpm run build`, deploy `pnpm exec wrangler deploy`; đã kiểm tra trong dashboard. API công khai có mặc định trong prebuild, không cần secret. Không đưa secret vào `NEXT_PUBLIC_*`. |

## Cách hoàn tất một kết nối

1. Chốt đích nhận và hợp đồng request/response trước khi bật control.
2. Cấu hình trên staging; rebuild nếu biến dùng trong static HTML/client bundle.
3. Kiểm tra thành công, lỗi, timeout, submit lặp và refresh; không gửi dữ liệu khách thật khi test.
4. Chỉ đánh dấu **Đã kết nối** khi đã xác minh đích nhận thực sự lưu/nhận dữ liệu; ghi ngày và bằng chứng không chứa thông tin nhạy cảm.
5. Ghi cách rollback và cập nhật dòng tương ứng trong bảng này.
