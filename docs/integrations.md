# Các kết nối cần hoàn tất

Danh sách duy nhất để theo dõi kết nối nghiệp vụ. Cập nhật trạng thái, đích nhận và bước kiểm chứng ở đây mỗi khi nối thêm dịch vụ; không lưu token, mật khẩu hoặc dữ liệu khách hàng trong tài liệu.

## Trạng thái hiện tại

Frontend vẫn là Next static export. Nội dung sản phẩm lấy từ `src/data/products.ts`, thông tin site từ `src/data/db.json`. WordPress, domain production và database production chưa được chốt. Chưa triển khai hoặc gửi thử kết nối thật trong đợt sửa UI này.

| Trạng thái | Hạng mục | Điểm nối / cấu hình | Cần chốt và nghiệm thu |
|---|---|---|---|
| Chờ | Domain website | `src/data/db.json` → site URL; Cloudflare custom domain/DNS/TLS | Domain canonical, www redirect, robots/sitemap/metadata và URL ảnh tuyệt đối. Rebuild static sau khi đổi. |
| Chờ | WordPress | Chưa gắn endpoint CMS | Domain WordPress, REST API, dữ liệu/slug/media cần xuất lúc build, webhook rebuild. Giữ một nguồn cho catalog; không duy trì giá độc lập ở WP và file local. Token chỉ ở môi trường build/server. |
| Chờ | Form tư vấn | `NEXT_PUBLIC_CONTACT_ENDPOINT` (build-time, để trống mặc định) | URL nhận native `POST` form-urlencoded trường `contactInfo`; xác thực, chống spam/rate limit, consent, trang phản hồi thành công/thất bại và chính sách lưu dữ liệu ở receiver. Có thể nối WordPress hoặc proxy cùng domain sau khi có hợp đồng API. Chưa cấu hình thì input/submit bị vô hiệu hóa, không gửi GET hoặc báo thành công giả. |
| Chờ | Database đơn hàng | Binding `DB` đang comment trong `wrangler.jsonc`; schema trong `migrations/` | Chốt D1 hay backend WordPress. Nếu dùng D1: database thật, binding, migrations, quyền truy cập và backup. Không chạy migration production trước khi chốt. |
| Chờ | API checkout | `GET /api/checkout-config`, `POST /api/orders` tại `worker/index.ts` | Chốt backend giữ Worker hay thay bằng WordPress/proxy; routing `/api/*`, origin/CORS nếu khác domain, validation, pricing server, idempotency và phản hồi lỗi. |
| Chờ | Phí vận chuyển | Worker `SHIPPING_FEE_VND` | Phí thực tế và cách thể hiện khi cần gọi xác nhận; không tự coi giá trị trống là miễn phí. |
| Chờ | Email đơn hàng | Worker `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `ORDER_NOTIFICATION_TO` | Domain gửi đã xác minh, DNS SPF/DKIM/DMARC, người nhận thật, secret môi trường, retry/crons. Thay thông tin mẫu trong cấu hình trước production. |
| Chờ | Liên hệ/social | `SiteFooter.tsx`, nội dung trang liên hệ | Email, số điện thoại, Zalo/Facebook thật; thay links `#` và thông tin mẫu. |
| Chờ | Hosting / rebuild | Cloudflare Static Assets + Worker; `out/` | Domain môi trường, biến build/public, secrets riêng môi trường, webhook CMS và rollback bản export. Không đưa secret vào `NEXT_PUBLIC_*`. |

## Cách hoàn tất một kết nối

1. Chốt đích nhận và hợp đồng request/response trước khi bật control.
2. Cấu hình trên staging; rebuild nếu biến dùng trong static HTML/client bundle.
3. Kiểm tra thành công, lỗi, timeout, submit lặp và refresh; không gửi dữ liệu khách thật khi test.
4. Chỉ đánh dấu **Đã kết nối** khi đã xác minh đích nhận thực sự lưu/nhận dữ liệu; ghi ngày và bằng chứng không chứa thông tin nhạy cảm.
5. Ghi cách rollback và cập nhật dòng tương ứng trong bảng này.
