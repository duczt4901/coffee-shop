# Catalog WooCommerce ở bước build

## Luồng dữ liệu

`pnpm build` chạy `scripts/generate-products.mjs` trước Next.js:

1. Đọc toàn bộ trang của Store API `/wc/store/v1/products`, sắp xếp theo thứ tự sản phẩm trong WooCommerce.
2. Kiểm tra schema, VND/đơn vị tiền tệ, slug, thuộc tính bắt buộc, ID/slug trùng và tổng phân trang.
3. Tải ảnh sản phẩm từ cùng origin WordPress, kiểm tra định dạng/kích thước và lưu vào `public/images/products/wp-{id}-{hash}.{extension}`.
4. Chỉ khi tất cả sản phẩm/ảnh hợp lệ mới thay snapshot `src/data/products.ts`. File này được sinh tự động; sửa nội dung ở WooCommerce.
5. Next xuất trang chủ, danh sách, chi tiết và sitemap. Giỏ hàng và Worker COD cùng import snapshot này; không gọi WordPress ở runtime. Script ảnh hiện có tạo thumbnail responsive và blur preview cho ảnh mirror.

HTML có sẵn tên, giá, mô tả và đường dẫn ảnh nội bộ. Browser tải HTML, JS và ảnh từ Cloudflare. Endpoint/catalog client chỉ nằm trong công cụ build, không nằm trong browser bundle.

Client WordPress dùng fetch cache tương thích static export, với query key mới cho mỗi tiến trình build để Next không tái sử dụng dữ liệu CMS cũ từ lần build trước.

## Cấu hình

Mặc định dùng endpoint đã xác minh:

```text
https://lavuon.cu.ma/index.php/wp-json/
```

Có thể đổi bằng `WOOCOMMERCE_API_BASE_URL` trong `.env.local` hoặc biến môi trường build của Cloudflare Workers Builds. Hỗ trợ cả dạng `https://host/?rest_route=/`. Không cần API key cho Store API công khai. `WORDPRESS_API_BASE_URL` dành riêng cho blog và vẫn tùy chọn; cấu hình catalog không tự bật blog.

```bash
pnpm sync:products  # làm mới snapshot/ảnh cho dev hoặc Worker nếu cần
pnpm dev           # đồng bộ catalog/ảnh rồi khởi động Next dev
pnpm build         # đồng bộ catalog/ảnh và xuất out/
pnpm check:static
```

Không bỏ qua bước sync bằng cách gọi `next build` trực tiếp. Ảnh `wp-*` là build artifacts được gitignore, phải được tải lại trên checkout sạch. Snapshot được giữ trong Git để typecheck và test không phụ thuộc mạng. Không dùng snapshot cũ như fallback nếu build đã bắt đầu đồng bộ và WordPress lỗi.

Cloudflare phải deploy cả `out/` và Worker từ cùng lần build để dữ liệu hiển thị và tính tiền khớp nhau. Khi cấu hình Build command, dùng `pnpm build`; lệnh `pnpm deploy` của repo cũng build trước khi deploy.

## Nhập sản phẩm trong WooCommerce

Hiện hỗ trợ **Simple product** công khai, không đặt mật khẩu, giá VND nguyên đồng, có ảnh và ít nhất một danh mục. Danh mục đầu tiên được dùng làm loại cà phê trên giao diện. Slug dùng chữ thường không dấu, số và dấu gạch nối; giữ slug cũ nếu không muốn đổi URL.

| Trường | Nguồn WooCommerce |
|---|---|
| Tên, slug | Tên và permalink sản phẩm |
| Giá | Giá hiện tại của Store API, gồm giá sale đang có hiệu lực tại lúc build |
| Tagline | Mô tả ngắn |
| Câu chuyện | Mô tả chính, chuyển sang text sạch |
| Ảnh | Ảnh sản phẩm đầu tiên, mirror về Cloudflare |
| Khối lượng | Thuộc tính `Khối lượng` |
| Xuất xứ | Thuộc tính `Xuất xứ` |
| Sơ chế | Thuộc tính `Sơ chế` |
| Giống | Thuộc tính `Giống` |
| Độ cao | Thuộc tính `Độ cao` |
| Mức rang | Thuộc tính `Mức rang` |
| Màu nền | Thuộc tính `Màu nền`, mã hex 6 ký tự như `#c85b3c` |
| Badge tùy chọn | Thuộc tính `Nhãn`, ví dụ `BEST SELLER` |

Các thuộc tính trên phải bật **Visible on the product page** để Store API trả về. Đã bật cho bốn sản phẩm ngày 18/11/2026, gồm màu nền và nhãn. Đây là dữ liệu public.

## Hành vi và giới hạn

- Sửa/thêm/xóa sản phẩm, giá, ảnh hoặc tồn kho cần **build và deploy lại**. Chưa thêm webhook/automation.
- Giá, giá sale và trạng thái bán được là **snapshot tại lúc build**. Sale theo lịch hoặc tồn kho thay đổi không tự phản ánh trên website đang chạy.
- Sản phẩm hết hàng/không mua được vẫn có trang, nhưng nút mua bị khóa, giỏ bỏ dòng không còn mua được và Worker từ chối đặt hàng theo cùng snapshot.
- Build dừng khi CMS lỗi, thiếu phân trang, catalog rỗng, dữ liệu không hợp lệ hoặc tải ảnh lỗi. Chưa deploy thì bản production hiện có không đổi. Catalog rỗng cần kiểm tra quyền/visibility hoặc chủ động đổi chính sách này nếu cửa hàng thực sự đóng toàn bộ sản phẩm.
- Ảnh hỗ trợ JPEG/PNG/WebP, cùng origin CMS, tối đa 10 MB và 40 triệu pixel. Không theo redirect ảnh.
- Bước này chỉ đọc catalog công khai. Đơn COD vẫn dùng backend Worker hiện có; chưa tạo đơn WooCommerce, xử lý thanh toán hay kiểm tra kho live. DB/email cần cấu hình riêng.

## Kiểm tra

- `pnpm test:products`: phân trang, text/HTML an toàn, ảnh mirror, cập nhật giá giữa hai build, tồn kho và giữ snapshot cũ khi lỗi.
- `pnpm test:cms-export`: API fixture cục bộ, xuất HTML có dữ liệu sản phẩm trước khi khách truy cập, một lần fetch catalog/ảnh; khôi phục snapshot source sau test. `out/` lúc này là fixture, phải build thật trước deploy.
- `pnpm check:static`: có trang/ảnh của từng sản phẩm, sitemap đúng domain và không đưa code Store API/biến cấu hình catalog vào browser bundle.

Giao thức tham khảo: [Products Store API](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/products/).
