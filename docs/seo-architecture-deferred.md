# Ghi nhớ task SEO — để làm sau

Ngày lưu: 03/11/2026 (Asia/Saigon).

**Trạng thái:** người dùng yêu cầu lưu lại và hoãn triển khai. Chưa sửa code SEO trong cuộc trao đổi này. Không tự triển khai hoặc đặt lịch nhắc; tiếp tục khi người dùng yêu cầu.

## Nhu cầu và hướng kiến trúc đã bàn

- Người dùng muốn một cấu trúc SEO hoàn chỉnh, mỗi trang có config để các trang con tạo breadcrumb; không chỉ thêm breadcrumb giao diện riêng lẻ.
- Dùng chung dữ liệu để sinh metadata, canonical, breadcrumb giao diện, `BreadcrumbList` JSON-LD và sitemap, tránh lệch nhãn/URL giữa các đầu ra.
- Hướng đề xuất gồm ba lớp, chưa phải đặc tả đã triển khai:
  1. Site config: domain, thương hiệu, ngôn ngữ, ảnh mặc định, `WebSite` và thông tin doanh nghiệp có thật.
  2. Page config: ID ổn định, path, `parentId`, nhãn breadcrumb, title/description, ảnh chia sẻ, index/noindex và loại trang.
  3. Entity data: dữ liệu sản phẩm/bài viết/dịch vụ để sinh `Product`, `Article`, `Service` khi nội dung tương ứng có thật.
- Trang động lấy dữ liệu sản phẩm/bài viết và trang cha hoặc danh mục chính; không chỉ tách URL hay dựa vào lịch sử truy cập để tạo breadcrumb.
- `WebPage` mô tả trang, `Service`/`Product` mô tả thực thể chính. Một trang có thể có cả hai, liên kết qua `mainEntity`. Các hậu tố `#webpage`, `#service`, `#product`, `#breadcrumb`, `#website` là quy ước `@id`, không phải cơ chế xác định trang cha.
- Có thể coi config nhất quán là yêu cầu nội bộ của project. Không diễn giải thành Google bắt buộc mọi trang phải có các schema này mới được index hoặc xếp hạng.

## Hiện trạng đã xem — cần kiểm tra lại khi tiếp tục

- `src/lib/metadata.ts`: có helper tạo title/description, canonical, Open Graph và Twitter; ảnh chia sẻ vẫn có TODO.
- `src/app/layout.tsx`: khai báo `WebSite`; chưa thấy graph liên kết thực thể theo trang.
- `src/components/seo/json-ld.tsx`: đã escape `<` khi serialize JSON-LD; giữ xử lý này.
- `src/app/san-pham/[slug]/page.tsx`: có `generateMetadata` theo sản phẩm, dùng `await params`.
- `src/app/sitemap.ts`: lúc xem mới liệt kê trang chủ và FAQ.
- Chưa thấy cây config trang hoặc component breadcrumb dùng chung trong các file đã rà.
- Working tree đang có nhiều thay đổi sẵn có; khi tiếp tục phải đọc lại diff và giữ nguyên công việc khác.
- Phạm vi CMS hiện hành nằm ở `docs/cms-use-cases-solo.md`. `docs/cms-seo-parity.md` là tài liệu tham khảo, không phải toàn bộ backlog đã duyệt.

## Tham khảo người dùng cung cấp

- https://dminhvu.com/blog/nextjs-seo — đã đọc; bài cập nhật 20/09/2024, bao quát metadata, JSON-LD, sitemap, robots, link tags và tối ưu ảnh/script. Không sao chép nguyên các ví dụ API cũ.

Nguồn chính thức để đối chiếu khi triển khai:

- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- https://nextjs.org/docs/app/guides/json-ld
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/special-tags
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
- https://schema.org/WebPage
- https://schema.org/Service

## Điểm cần giữ khi tiếp tục

- Đọc hướng dẫn Next.js đi kèm phiên bản cài trong `node_modules/next/dist/docs/` và các hướng dẫn repo hiện hành trước khi sửa.
- Breadcrumb giao diện dùng nav có nhãn, danh sách có thứ tự, link thật về các cấp cha; đánh dấu trang hiện tại phù hợp và ẩn dấu phân cách trang trí khỏi screen reader.
- JSON-LD phải phản ánh nội dung thực; metadata và schema dùng URL nhất quán, tránh trùng thực thể.
- Google yêu cầu ít nhất hai `ListItem` cho breadcrumb structured data; `position` bắt đầu từ 1, mục cuối có thể bỏ `item`.
- `lastModified` phản ánh lần cập nhật nội dung thực, không tự đổi theo mỗi build; Google bỏ qua sitemap `priority` và `changefreq`.
- Google không dùng meta keywords để index/xếp hạng.
- `robots.txt` chặn crawl không thay thế `noindex`; crawler cần truy cập trang để đọc `noindex`.
- Khi triển khai, kiểm tra đầu ra HTML/metadata/JSON-LD, quan hệ cha–con và sitemap trên các loại trang thật; dùng Rich Results Test/URL Inspection khi có URL phù hợp. Không hứa tăng hạng hoặc được rich result chỉ vì schema hợp lệ.
