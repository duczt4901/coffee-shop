# Logo mặt trời — chờ hạn mức tạo ảnh

Yêu cầu của người dùng ngày 2026-11-12:

- Chỉ dùng **mặt trời xoắn ốc và các tia nắng** trong logo Là Vườn; không dùng chữ V, nhánh hoặc lá.
- Đã tách ảnh gốc màu vàng tại `public/images/brand/lavuon-sun-source.png`. Giữ nguyên hình và tỷ lệ, chưa đổi màu.
- Mẫu màu: `public/images/brand/muted-logo-color-reference.png`. Dùng một màu be nhạt tương tự mẫu; màu dự kiến `#c8bfb0`.
- Nền phải khớp nền chung website: `--background: #f4f1ea` trong `src/styles/globals.css`, không lấy màu nền của ảnh mẫu.
- Khi người dùng quay lại sau khi hạn mức làm mới: dùng imagegen chỉnh ảnh mặt trời đã tách, giữ đúng xoắn ốc và tia nắng, chỉ đổi màu. Không thiết kế lại, không thêm chữ.
- Lần gọi imagegen trước bị `usage_limit_reached`; chưa có bản be cuối cùng, chưa thay logo trên website. Không tự lên lịch hoặc kiểm tra hạn mức nền.
- Mặt trời sẽ dùng như icon trang trí cho ba mục benefits dưới hero. `BenefitsSection.tsx` đã chừa ba `<span data-benefit-icon>` trống, chưa gắn ảnh theo yêu cầu. Khi có ảnh được duyệt mới điền vào các slot này; không thay logo header/loading chỉ vì đã tạo icon benefits.
- Section benefits hiện tạm ẩn: import và chỗ gọi trong `src/app/page.tsx` được comment theo yêu cầu. Giữ component, CSS và test để dùng lại; tạo xong icon không tự bật lại section.
