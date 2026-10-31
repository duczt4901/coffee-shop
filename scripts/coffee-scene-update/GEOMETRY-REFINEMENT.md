# Coffee bag geometry refinement — 2026-10-27

Đã chỉnh trực tiếp `public/images/3d/robusta-product-scene.glb`. Bản sao nguyên vẹn trước chỉnh sửa nằm tại `C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/before.glb`. Không thay đổi code homepage, camera, scroll orbit, DPR, khử răng cưa, lighting hoặc postprocessing.

## Thay đổi hình học

- Hiệu chỉnh vị trí đỉnh cục bộ quanh vai, góc dưới và chỗ nối từ thân vào gusset bằng các mảng cong bậc hai có giới hạn dịch chuyển. Giữ lại hình phồng và nếp chính; không làm phẳng toàn túi.
- Bảo vệ khóa miệng, đường ép, chân đứng, các điểm cực trị silhouette và các lớp gấp áp sát ở mép gusset. Các lớp gusset phía ngoài không bị remesh; chủ yếu chỉnh chuyển tiếp phía trong.
- Giữ nguyên tọa độ cao/rộng và UV của nhãn; relief độ sâu chỉ thay đổi có giới hạn ở vùng cần đi theo nếp. Không dựng lại hoặc bake lại artwork.
- Xoay lại 103 đường chéo ở các mảng thân ít cong, có kiểm tra hướng mặt, độ phẳng và ánh xạ UV. Không đổi material của mặt hoặc thêm draw call.
- Nối các T-junction tại cạnh cắt vùng nhãn: thêm 6 tam giác mỗi túi, không thêm đỉnh hoặc đổi UV. Cạnh hở theo phép kiểm tra weld giảm từ 18 xuống 0 trên mỗi túi.
- Loại 249 tam giác thân có diện tích hình học dưới 1e-12 và diện tích UV dưới 1e-14; chúng không đóng góp bề mặt nhìn thấy. Không giảm polygon theo một tỷ lệ tùy ý.
- Cập nhật vertex normals theo thay đổi hình học, giữ các khác biệt normals/smoothing seams từ bản gốc. Không dùng smoothing toàn cục để che hình dáng.

## Số liệu

| Mesh | Tam giác trước | Tam giác sau | Đỉnh đã dịch chuyển | Đường chéo đổi | Mặt suy biến bỏ |
|---|---:|---:|---:|---:|---:|
| Bag_1kg_Orange | 36,800 | 36,602 | 4,761 | 4 | 204 |
| Bag_500g_Blue | 18,608 | 18,595 | 3,249 | 44 | 19 |
| Bag_500g_Green | 18,638 | 18,618 | 3,339 | 55 | 26 |

Tổng ba túi: **74,046 → 73,815** tam giác. Số đỉnh, mesh, primitive và material giữ nguyên. Dung lượng GLB **6,952,268 → 6,949,460 bytes**. Không thêm runtime decoder/dependency. Mức giảm này không được dùng làm bằng chứng tăng FPS.

## UV, nhãn và asset khác

- UV buffer của cả ba túi giữ nguyên từng byte.
- Toàn bộ ảnh nhúng, texture/sampler, material definitions, scenes và node transforms giữ nguyên; kiểm tra bằng so sánh dữ liệu và SHA-256.
- Các vật thể ngoài ba túi (ly, bục, hạt, sàn) giữ nguyên geometry từng byte.
- Phân vùng UV theo material giữ nguyên tổng diện tích có hướng sau khi nối T-junction.
- Nhãn giữ nguyên tọa độ chiều cao và chiều rộng. Diện tích mặt cục bộ có thể thay đổi khi relief được chỉnh; giới hạn tối đa đã đo khoảng **3,5%** tại tam giác nhãn, không có UV reprojection hay texture resampling. Vùng chữ chính và thiết kế được đối chiếu trong ảnh vật liệu gốc.

## Kiểm tra

- Không phát hiện tam giác đảo hướng mới; dịch chuyển bị giới hạn theo hướng mặt và thay đổi diện tích.
- Sau chỉnh sửa: **0 tam giác suy biến theo ngưỡng 1e-12, 0 cạnh hở và 0 cạnh non-manifold theo kiểm tra weld 1e-5** trên mỗi túi.
- Kiểm tra BVH + segment/triangle không phát hiện giao cắt không đồng phẳng mới trong vùng đã chỉnh. Mặt tiếp xúc đồng phẳng và các lớp gusset áp sát nguyên bản không được gọi là một bảo đảm không giao nhau toàn cục.
- Đã tải cả hai GLB qua Three.js GLTFLoader và đối chiếu cùng camera/material/light ở front, góc ¾, side, cận vai, cận đáy. Có 30 ảnh: ba túi × hai chế độ × năm góc.
- Homepage: GLB mới đã tải và render trong implementation hiện tại trên desktop và viewport mobile 390×844; console không có lỗi. Ảnh `homepage-desktop-after.png` và `homepage-mobile-after.png` ghi lại kết quả.

## So sánh hình ảnh

Mỗi ảnh chia đôi: **trái là trước, phải là sau**. Chế độ bề mặt trơn không dùng texture, normal map hoặc AO. Chế độ vật liệu gốc dùng cùng ánh sáng giữa hai bản; viewer chẩn đoán không thay thế trình render homepage.

### Túi xanh lá

| Góc | Bề mặt trơn | Vật liệu gốc |
|---|---|---|
| Trực diện | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-smooth-front.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-beauty-front.png>) |
| Góc ¾ | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-smooth-quarter.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-beauty-quarter.png>) |
| Cạnh bên | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-smooth-side.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-beauty-side.png>) |
| Cận vai | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-smooth-shoulder.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-beauty-shoulder.png>) |
| Cận đáy | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-smooth-bottom.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/green-beauty-bottom.png>) |

### Túi xanh dương

| Góc | Bề mặt trơn | Vật liệu gốc |
|---|---|---|
| Trực diện | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-smooth-front.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-beauty-front.png>) |
| Góc ¾ | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-smooth-quarter.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-beauty-quarter.png>) |
| Cạnh bên | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-smooth-side.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-beauty-side.png>) |
| Cận vai | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-smooth-shoulder.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-beauty-shoulder.png>) |
| Cận đáy | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-smooth-bottom.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/blue-beauty-bottom.png>) |

### Túi cam

| Góc | Bề mặt trơn | Vật liệu gốc |
|---|---|---|
| Trực diện | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-smooth-front.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-beauty-front.png>) |
| Góc ¾ | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-smooth-quarter.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-beauty-quarter.png>) |
| Cạnh bên | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-smooth-side.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-beauty-side.png>) |
| Cận vai | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-smooth-shoulder.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-beauty-shoulder.png>) |
| Cận đáy | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-smooth-bottom.png>) | [Xem](<C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/10/26/01a176c9-97dd-7fa0-997b-851ca5e89174/geometry-refinement/orange-beauty-bottom.png>) |

## Giới hạn còn lại

Đây là refinement cục bộ trên lưới triangulated hiện có, không phải dựng lại toàn bộ topology quads như ảnh Sketchfab. Các tam giác mảnh còn hữu ích và cấu trúc gusset nhiều lớp được giữ lại. Thay đổi hình dáng vừa phải để bảo vệ thiết kế và silhouette; không tuyên bố đã tái tạo chính xác chất lượng hoặc topology của model tham chiếu. Chưa đo lại FPS/GPU timing hoặc benchmark trên điện thoại vật lý.

## Tái tạo và khôi phục

Chạy `scripts/coffee-scene-update/refine-geometry.py <before.glb> <candidate.glb> <report.json>` rồi `validate-refinement.py <before.glb> <candidate.glb> <validation.json>`, dùng Python có NumPy. Luôn bắt đầu từ bản backup; không chạy nối tiếp trên kết quả đã refine.

Khôi phục bằng cách sao chép `before.glb` trở lại asset runtime. File `final-report.json` và `validation.json` ghi hashes và các kiểm tra chi tiết.
