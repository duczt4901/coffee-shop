# Các kết nối cần hoàn tất

Danh sách duy nhất để theo dõi kết nối nghiệp vụ. Cập nhật trạng thái, đích nhận và bước kiểm chứng ở đây mỗi khi nối thêm dịch vụ; không lưu token, mật khẩu hoặc dữ liệu khách hàng trong tài liệu.

## Trạng thái hiện tại

Frontend vẫn là Next static export. Nội dung sản phẩm lấy từ `src/data/products.ts`, thông tin site từ `src/data/db.json`. Cập nhật headless ngày 14/11/2026: canonical đã đặt `https://lavuon.cafe`; client WordPress và blog build-time được thêm, nhưng kết nối live chưa được xác minh lại do DNS của `lavuon.cu.ma` thất bại trong phiên này. Biến CMS để trống mặc định. Chi tiết endpoint, giới hạn và các bước nghiệm thu: [headless-wordpress.md](headless-wordpress.md). Chưa deploy hoặc kích hoạt thanh toán.

| Trạng thái | Hạng mục | Điểm nối / cấu hình | Cần chốt và nghiệm thu |
|---|---|---|---|
| Một phần | Domain website | `src/data/db.json` → `https://lavuon.cafe`; Cloudflare custom domain/DNS/TLS | Canonical được cấu hình; DNS, TLS và www redirect chưa được kiểm chứng. Rebuild static sau khi đổi. |
| Một phần / BLOCKED live | WordPress | `src/lib/wordpress.ts`, blog `/bai-viet/`, `WORDPRESS_API_BASE_URL` build-time | Hỗ trợ `/index.php/wp-json/` và `?rest_route=/`; chưa bật mặc định do không xác minh được DNS. Kiểm tra JSON từ CI rồi cấu hình biến và rebuild. WooCommerce, Rank Math/Yoast chưa xác minh. Catalog vẫn local. |
| Chờ | Form tư vấn | `NEXT_PUBLIC_CONTACT_ENDPOINT` (build-time, để trống mặc định) | URL nhận native `POST` form-urlencoded trường `contactInfo`; xác thực, chống spam/rate limit, consent, trang phản hồi thành công/thất bại và chính sách lưu dữ liệu ở receiver. Có thể nối WordPress hoặc proxy cùng domain sau khi có hợp đồng API. Chưa cấu hình thì input/submit bị vô hiệu hóa, không gửi GET hoặc báo thành công giả. |
| Chờ | Database đơn hàng | Binding `DB` đang comment trong `wrangler.jsonc`; schema trong `migrations/` | Chốt D1 hay backend WordPress. Nếu dùng D1: database thật, binding, migrations, quyền truy cập và backup. Không chạy migration production trước khi chốt. |
| Tạm tắt | API checkout | `CHECKOUT_ENABLED = false`; `/thanh-toan/`, `GET /api/checkout-config` và `POST /api/orders` trả 404 | Giữ code COD để dùng lại; giỏ chuyển sang Zalo. Chốt backend và hoàn tất database/email trước khi bật lại, rebuild cả site và Worker. |
| Chờ | Phí vận chuyển | Worker `SHIPPING_FEE_VND` | Phí thực tế và cách thể hiện khi cần gọi xác nhận; không tự coi giá trị trống là miễn phí. |
| Chờ | Email đơn hàng | Worker `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `ORDER_NOTIFICATION_TO` | Domain gửi đã xác minh, DNS SPF/DKIM/DMARC, người nhận thật, secret môi trường, retry/crons. Thay thông tin mẫu trong cấu hình trước production. |
| Một phần | Liên hệ/social | `src/data/contact.ts`: Zalo/điện thoại `0356597539`, dùng trong giỏ, footer và trang liên hệ | Đã gắn `https://zalo.me/0356597539` theo số client cung cấp; chưa xác minh tài khoản Zalo. Email, Facebook và địa chỉ vẫn chờ thông tin thật. |
| Một phần | Hosting / rebuild | Cloudflare Static Assets + Worker; `out/`; `.github/workflows/static-build.yml` | Có workflow kiểm tra/build thủ công và PR, chưa chạy trên GitHub hoặc deploy. Cần biến CMS tại CI, DNS, quy trình publish/rollback và webhook nếu cần tự động. Không đưa secret vào `NEXT_PUBLIC_*`. |

## Cách hoàn tất một kết nối

1. Chốt đích nhận và hợp đồng request/response trước khi bật control.
2. Cấu hình trên staging; rebuild nếu biến dùng trong static HTML/client bundle.
3. Kiểm tra thành công, lỗi, timeout, submit lặp và refresh; không gửi dữ liệu khách thật khi test.
4. Chỉ đánh dấu **Đã kết nối** khi đã xác minh đích nhận thực sự lưu/nhận dữ liệu; ghi ngày và bằng chứng không chứa thông tin nhạy cảm.
5. Ghi cách rollback và cập nhật dòng tương ứng trong bảng này.
