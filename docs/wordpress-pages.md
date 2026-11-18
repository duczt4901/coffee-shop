# Nội dung trang và Yoast

WordPress quản lý chữ và ảnh; React giữ bố cục, liên kết, hiệu ứng và thứ bậc heading. `pnpm build` lấy dữ liệu, tải ảnh được chọn về asset cục bộ, lưu snapshot `src/data/page-content.ts` và `src/data/page-images.ts` rồi xuất HTML. Khách truy cập không cần kết nối WordPress để đọc các trang này.

Đã cấu hình ACF 6.8.11, Yoast và 179 field trên 6 Pages; build với CMS thật đã qua ngày 18/11/2026. Chưa cấu hình webhook tự rebuild hoặc deploy production.

| Trang website | WordPress Page ID |
| --- | --- |
| `/` | 24 — Trang chủ |
| `/ve-chung-toi/` | 28 — Về chúng tôi |
| `/cau-chuyen/` | 31 — Câu chuyện |
| `/san-pham/` | 34 — Sản phẩm |
| `/lien-he/` | 37 — Liên hệ |
| `/faq/` | 40 — Câu hỏi thường gặp |

## Sửa nội dung

1. Vào **Pages → chọn trang → Edit**.
2. Tìm nhóm **Coffee-shop · tên trang** ở phần Meta Boxes phía dưới editor. Sửa các field text/textarea. Nhãn có đoạn chữ hiện tại giúp tìm đúng vị trí; `h1`, `h2`, `em` chỉ vị trí hoặc phần chữ nghiêng trong giao diện.
3. Trong Yoast, sửa **SEO title**, **Meta description**, và tiêu đề/mô tả chia sẻ mạng xã hội nếu cần.
4. Bấm **Save**, rồi chạy build/deploy coffee-shop. Save ở WordPress chưa tự kích hoạt deploy.

Các phần heading có chữ nghiêng hoặc xuống dòng được chia thành nhiều field để giữ nguyên thiết kế. Chỉ nhập chữ, không nhập HTML. Có thể để trống một field để bỏ đoạn chữ đó; thiếu field hoặc lỗi API sẽ dừng build, không xuất snapshot dở dang.

Phần sản phẩm nổi bật ở Trang chủ và Câu chuyện dùng chung các field `featured_*` trên **Trang chủ**. Tên/giá/thông tin và ảnh từng sản phẩm vẫn sửa trong WooCommerce. Menu, footer, số điện thoại/Zalo dùng chung và logic đặt hàng chưa thuộc nhóm field trang. Trang Liên hệ vẫn giữ email/địa chỉ mẫu hiện có để bạn thay bằng thông tin thật.

## Sửa ảnh

1. Mở **Pages → Edit → Meta Boxes → Coffee-shop · Ảnh · tên trang**.
2. Chọn **Add Image** hoặc sửa ảnh đang có; tải file hoặc chọn từ Media Library. Để trống dùng ảnh mặc định trong code.
3. **Save**, sau đó kích hoạt build/deploy Cloudflare thủ công. WordPress Save chưa tự kích hoạt build.

Có 43 ô ảnh trên sáu trang. Ảnh lặp lại trong cùng trang dùng chung một ô. Trang chủ có cảnh ba túi/phin, ảnh chờ video, slideshow, ảnh nội dung và ba lớp hạt desktop/mobile. Liên hệ/FAQ có ảnh đầu trang tuỳ chọn; bỏ trống thì không hiển thị. Ảnh nội dung phụ ở trang chi tiết sản phẩm dùng nhóm ảnh trang Sản phẩm; ảnh chính từng SKU dùng WooCommerce.

Ảnh cảnh túi là một ảnh chụp chung để giữ bóng đổ trên cùng mặt bàn; ba nhóm hạt tiếp tục parallax riêng. Giữ tỷ lệ và khoảng trống khi thay ảnh cảnh/lớp hạt, dùng PNG/WebP nền trong suốt cho các nhóm hạt. Build kiểm tra attachment ID, nguồn cùng CMS, định dạng JPEG/PNG/WebP, giới hạn 10MB và 40 megapixel; lỗi ảnh dừng build, giữ bản deploy trước.

`wordpress/page-image-fields.json` định nghĩa các vị trí ảnh. `pnpm export:fields` sinh thêm `wordpress/acf-page-images.json`; nhập file này qua ACF → Tools. Nhóm ảnh đã được nhập và ảnh cảnh trang chủ đã chọn trong WordPress, ngày 18/11/2026.

## Tạm ngưng lập chỉ mục

Frontend đang đặt `noindex, nofollow` trong metadata và `public/_headers`; robots.txt cho crawler đọc các chỉ thị đó nhưng không quảng bá sitemap. WordPress đã bật **Settings → Reading → Discourage search engines**. Khi mở index lại, cần đổi cả metadata/headers và thiết lập WordPress, rồi rebuild/deploy. Không dùng robots.txt Disallow toàn site thay cho noindex vì crawler sẽ không đọc được chỉ thị loại khỏi kết quả tìm kiếm.

## Cấu hình

- `wordpress/page-fields.json`: Page ID, đường dẫn frontend, tên field và nội dung ban đầu. Đổi slug WordPress không ảnh hưởng đường dẫn frontend; xóa/tạo lại Page cần cập nhật ID ở đây.
- `pnpm export:fields`: sinh `wordpress/acf-page-fields.json`; nhập qua **ACF → Tools → Import Field Groups**. Mỗi nhóm chỉ áp dụng cho đúng Page và bật **Show in REST API**. File chỉ định nghĩa field/default, không ghi đè nội dung đã lưu.
- Dùng ACF miễn phí từ nhà phát triển chính thức và Yoast SEO; không cần repeater hoặc page builder. Sau khi nhập nhóm field, mở từng Page và Save một lần để lưu các giá trị mặc định.
- API cùng `WOOCOMMERCE_API_BASE_URL`, mặc định `https://lavuon.cu.ma/index.php/wp-json/`. Không cần khóa WooCommerce hoặc tài khoản quản trị trong build.
- `pnpm sync:pages`: cập nhật snapshot để kiểm tra mà chưa deploy.

Yoast được đọc từ `yoast_head_json` của từng Page. Chỉ lấy title/description và title/description mạng xã hội; canonical, robots và JSON-LD vẫn do frontend quản lý để tránh dùng nhầm domain hoặc cấu hình WordPress. Nếu Yoast chưa có meta description, frontend dùng mô tả đang có trong code. Ảnh chia sẻ/Yoast schema và Yoast sản phẩm/bài viết chưa được nhập vào nhóm tích hợp trang này.

Kiểm tra: `pnpm test:pages`, `pnpm test:cms-export`, `pnpm build`, `pnpm check:static`. Bài kiểm tra export dùng CMS fixture và khôi phục snapshot nguồn; cần build lại bằng CMS thật trước khi deploy.
