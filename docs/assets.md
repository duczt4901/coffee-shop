# Tổ chức ảnh và video

Tên file dùng chữ thường, không dấu, nối bằng dấu gạch ngang; mô tả nội dung thay vì số thứ tự như `img_1` hoặc `video-3`.

| Thư mục                   | Nội dung                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `public/images/brand/`    | Wordmark và ảnh logo tạm                                                                |
| `public/images/coffee/`   | Vùng trồng, thu hái, sơ chế, rang và đồ uống                                            |
| `public/images/products/` | Ảnh sản phẩm, bao bì và mockup; tên sản phẩm khớp với slug trong `src/data/products.ts` |
| `public/images/maps/`     | Bản đồ SVG nguồn, SVG dùng trên trang và ảnh xem trước                                  |
| `public/images/icons/`    | Biểu tượng SVG                                                                          |
| `public/videos/coffee/`   | Video quy trình và video hero                                                           |
| `public/images/3d/`       | Model 3D và giấy phép hiện có                                                           |
| `assets/archive/maps/`    | Bản sao lưu bản đồ, không xuất bản cùng website                                         |
| `assets/archive/images/`  | Ảnh gốc trước khi tối ưu WebP, không xuất bản cùng website                              |

Video hero hiện tại: `/videos/coffee/coffee-cherry-sorting-hero.mp4`.

Ảnh vùng trồng ngang: `/images/coffee/lam-dong-coffee-farm-panorama.webp`, chuyển từ `slider_1.png`; thay đường dẫn `lamdong/img_2.png` đã thiếu file. Bản `lam-dong-coffee-farm.webp` có khung hình khác và được giữ riêng.

Script `scripts/generate-south-vietnam-knockout.mjs` đọc và ghi bản đồ trong `public/images/maps/`.

## Tối ưu ảnh ngày 2026-11-02

17 ảnh đang dùng được chuyển sang WebP; cập nhật đường dẫn trong TSX, dữ liệu sản phẩm và CSS. Quality 80 cho ảnh cà phê, 88 cho ảnh sản phẩm; alpha quality 100. Riêng ảnh vùng trồng panorama và ảnh phơi sấy trong slider dùng quality 92, giới hạn chiều ngang 1920 px, lần lượt 1920×1080 và 1920×970, để cân bằng độ nét và dung lượng khi slider zoom 1,2 lần. Ảnh thu hái trong slider giữ nguyên file WebP nguồn 1920×1280. Logo và các ảnh chưa được mã nguồn tham chiếu được giữ nguyên.

Resize theo tỷ lệ rộng/cao gốc, tự tính chiều cao và làm tròn đến pixel gần nhất, không crop hoặc phóng lớn. Alpha sau resize được đối chiếu từng pixel với bản WebP để xác nhận nền trong suốt được giữ nguyên. Bản gốc nằm trong `assets/archive/images/`, giữ cấu trúc thư mục `coffee/` và `products/`, đối chiếu bằng SHA-256.

Tổng 19 ảnh đang dùng giảm từ 88.203.590 byte xuống 6.122.384 byte (93,06%). Đây là tổng dung lượng các file, không phải lượng tải của một trang. Chi tiết kích thước, quality, dung lượng và mã SHA-256 có trong [`image-optimization.json`](./image-optimization.json).

Website xuất tĩnh với `images.unoptimized: true`, nên các file WebP được tối ưu sẵn; `next/image` không tự tạo thêm các resolution theo thiết bị.

## Các đường dẫn được đổi

Bảng dưới ghi lại bước tổ chức thư mục ban đầu: nội dung nhị phân của 32 file được giữ nguyên khi di chuyển, đối chiếu bằng SHA-256. Những ảnh đã được tối ưu sau đó dùng đuôi `.webp` như báo cáo ở trên; các bản gốc tương ứng được lưu trong `assets/archive/images/`.

| Cũ                                                                    | Mới                                                            |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `public/logo.png`                                                     | `public/images/brand/trung-toan-wordmark.png`                  |
| `public/logo.svg`                                                     | `public/images/icons/plus-minus.svg`                           |
| `public/images/logo-placeholder.jpg`                                  | `public/images/brand/logo-placeholder.jpg`                     |
| `public/images/coffee1.jpg`                                           | `public/images/coffee/sun-dried-coffee-cherries.jpg`           |
| `public/images/coffee2.webp`                                          | `public/images/coffee/coffee-cherry-harvest.webp`              |
| `public/images/img.png`                                               | `public/images/coffee/coffee-drinks-assortment.png`            |
| `public/images/img_1.png`                                             | `public/images/coffee/ripe-coffee-cherries.png`                |
| `public/images/img_2.png`                                             | `public/images/coffee/lam-dong-coffee-farm.png`                |
| `public/images/lamdong/slider_1.png`                                  | `public/images/coffee/lam-dong-coffee-farm-panorama.png`       |
| `public/images/lamdong/img.png`                                       | `public/images/coffee/coffee-drying-beds-aerial.png`           |
| `public/images/lamdong/img_1.png`                                     | `public/images/products/coffee-bag-on-burlap.png`              |
| `public/images/product.png`                                           | `public/images/products/kraft-coffee-bag-mockup.png`           |
| `public/images/product/coffee1.png`                                   | `public/images/products/trung-toan-robusta-200g.png`           |
| `public/images/product/coffee2.png`                                   | `public/images/products/trung-toan-arabica-200g.png`           |
| `public/images/product/coffee3.png`                                   | `public/images/products/trung-toan-robusta-500g.png`           |
| `public/images/product/coffee4.png`                                   | `public/images/products/trung-toan-robusta-1000g.png`          |
| `public/sections/coffee3.jpeg`                                        | `public/images/coffee/coffee-processing-stages.jpeg`           |
| `public/sections/img.png`                                             | `public/images/coffee/coffee-harvest-bucket.png`               |
| `public/sections/img_1.png`                                           | `public/images/coffee/coffee-roast-levels.png`                 |
| `public/sections/img_2.png`                                           | `public/images/coffee/coffee-parchment-drying.png`             |
| `public/sections/img_3.png`                                           | `public/images/coffee/coffee-drying-raking.png`                |
| `public/sections/img_4.png`                                           | `public/images/coffee/raised-coffee-drying-beds.png`           |
| `public/sections/img_5.png`                                           | `public/images/coffee/coffee-beans-winnowing.png`              |
| `public/images/south-vietnam-context.svg`                             | `public/images/maps/south-vietnam-context.svg`                 |
| `public/images/south-vietnam-knockout.svg`                            | `public/images/maps/south-vietnam-knockout.svg`                |
| `public/images/south-vietnam-knockout.png`                            | `public/images/maps/south-vietnam-knockout-preview.png`        |
| `public/images/old-vietnam-lam-dong-binh-thuan-dak-nong-outlines.svg` | `public/images/maps/lam-dong-binh-thuan-dak-nong-outlines.svg` |
| `public/images/south-vietnam-knockout.backup.svg`                     | `assets/archive/maps/south-vietnam-knockout-backup.svg`        |
| `public/images/landingpage-hero.mp4`                                  | `public/videos/coffee/coffee-roasting-production-line.mp4`     |
| `public/images/lamdong/video.mp4`                                     | `public/videos/coffee/coffee-roasting-drum-portrait.mp4`       |
| `public/images/lamdong/video-2.mp4`                                   | `public/videos/coffee/roasted-coffee-beans-closeup.mp4`        |
| `public/images/lamdong/video-3.mp4`                                   | `public/videos/coffee/coffee-cherry-sorting-hero.mp4`          |
