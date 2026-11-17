# Bản thử 2.5D

Trang chủ dùng `CoffeeParallaxScene` thay cho `LocalCoffeeModel`. Bản 3D và các bài test của nó vẫn được giữ nguyên; đổi component trong `CoffeeBagExperience.tsx` để quay lại.

- Bảy ảnh hiển thị theo thứ tự: hạt xa, túi xanh lam cùng bục/bóng sàn, túi cam, bộ phin/ly, túi xanh lá, hạt nét và hạt gần. Bốn sản phẩm có hướng/biên độ nhỏ khác nhau, dùng chung một tiến độ cuộn và bảng `sceneLayers` trong `CoffeeParallaxScene.tsx`; mỗi tick chỉ cập nhật một biến CSS ở gốc. Lớp hạt nét parallax chậm hơn lớp hạt xa 25%. Không có lớp nền.
- Ảnh xuất từ scene GLB, camera tại progress 0.5. Lớp sản phẩm dùng studio riêng, phản xạ môi trường, bề mặt satin, shadow map 4096, 16 mẫu SSAA và bóng mềm tích lũy trong buffer half-float; Neutral tone mapping giữ màu bao bì. Không đổi model gốc. Màu và blur được bake sẵn; trang chỉ đổi CSS transform theo tiến độ scroll có sẵn.
- Cả scene render desktop 3840×3975 rồi xuất theo tỷ lệ WebP 2560×2650; mobile render 1560×3376 rồi xuất theo tỷ lệ 1170×2532. Sau khi mọi vật thể đã đổ bóng/che nhau, mask từng vật thể tách pixel từ cùng ảnh tổng: túi cam giữ bóng của túi xanh. Mỗi ảnh được cắt phần trong suốt dư; manifest lưu vị trí trên artboard gốc. Downsample Lanczos, sharpen nhẹ, WebP quality 96. Hạt giữ độ phân giải thấp hơn. Ảnh tổng chỉ dùng khi một ảnh sản phẩm lỗi, không tải đồng thời trong lượt bình thường.
- Reduced motion giữ ảnh tĩnh và các câu sticky. Bốn sản phẩm có trong HTML trước hydration; hạt hiện sau khi cả bốn đã tải. Lỗi một ảnh sản phẩm dùng ảnh tổng của cùng scene. Chuyển động nhẹ giữ gần bố cục gốc; bóng/che khuất là kết quả bake cố định, không tính lại như 3D.
- Giữ CSS framing có sẵn để chiều cao section và vị trí các câu không đổi. Không import Three.js hoặc tải GLB trong phiên bản 2D.

Xuất lại khi đổi model/material/camera:

```powershell
node scripts/coffee-scene-update/generate-parallax-scene.mjs
```

Mở địa chỉ localhost được in ra và bấm **Render transparent layers**. Generator ghi 16 ảnh (desktop/mobile, gồm ảnh tổng dự phòng) vào `public/images/parallax/` và manifest vào `src/data/coffee-parallax.json`; alpha, camera mask và kích thước được kiểm tra trước khi ghi. Renderer này chỉ dùng khi xuất ảnh, không chạy trên website.
