# Component và CSS naming

- Tên file component và export dùng PascalCase, mô tả chức năng: `SiteHeader`, `SiteFooter`, `CoffeeOriginSection`, `CoffeeProcessSlideshow`, `FeaturedProductsSection`, `ContactForm`.
- CSS riêng đặt trong `<Component>.module.css`; class dùng camelCase và mô tả vai trò trong component (`logo`, `mobilePanel`, `slideTrack`, `locationLabel`). Không cần lặp tên component trong mỗi class vì CSS Modules đã tạo scope.
- CSS của route đặt trong `page.module.css`. Dùng tên theo nội dung như `harvestCard`, `processingCard`, `brewingLayout`, tránh `one`, `two`, `six`.
- `globals.css` chỉ giữ Tailwind, theme token và các quy tắc nền cho tài liệu.
- Trong cùng component, selector JS dùng `styles.<name>` hoặc ref. Quan hệ giữa component, hook kiểm tra và phần tử SplitText dùng `data-*` có ý nghĩa, không phụ thuộc tên CSS đã hash.
- Trạng thái giao diện ưu tiên thuộc tính có sẵn (`aria-hidden`, `aria-expanded`); hook animation riêng như `data-title-visible` chỉ dùng khi cần.
- Giữ class do thư viện tạo khi tích hợp yêu cầu, ví dụ `.pin-spacer` của GSAP. Không coi các selector đó là CSS thừa chỉ vì không có JSX khai báo.

## Kiểm tra

Chạy `pnpm test:styles` hoặc `node scripts/check-style-references.mjs` để kiểm tra CSS Module bị thiếu import, tham chiếu class không tồn tại và local class không có nơi sử dụng. Script đọc AST TypeScript và selector CSS, bao gồm class được truyền cho GSAP qua `styles.<name>`.

Kiểm tra này yêu cầu truy cập class bằng `styles.name`; nếu bổ sung cách truy cập động bằng `styles[key]`, cần cập nhật kiểm tra tương ứng. Nó không kết luận một khai báo CSS là thừa do cascade hay tương đương thị giác; các trường hợp đó cần xem code và kiểm tra trình duyệt.

`scripts/check-editorial-preview.js` kiểm tra đầu ra trên trình duyệt qua các hook `data-*`, bao gồm text mask đã mở sau reveal, bố cục và reduced motion.

## Đã loại bỏ trong lần rà soát 03/11/2026

- Class hook `s-link-border`, các class reveal global và các selector test dựa vào một phần tên class đã hash.
- CSS không còn nơi dùng: `hero-video`, `hero-overlay`, `hero-content`, hero của trang sản phẩm/câu chuyện cũ, `home-reveal`, `home-model-copy`, `site-header__mobile-cta`, `productsLink`, `line` cũ của CoffeeBagExperience và button cũ của trang sản phẩm.
- Các khai báo reduced-motion lặp lại giá trị nền của slideshow; token `--black`, `--container` không còn được dùng và khai báo grid trên body không có grid layout.
- Placeholder `HeroContent` không có caller; phần featured products được chuyển từ barrel sang file riêng.
