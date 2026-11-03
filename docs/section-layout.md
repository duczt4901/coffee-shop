# Nền tảng layout section

## Nội dung và media

- Section nội dung tự tăng chiều cao theo chữ và các phần tử con. Dùng `--section-space` / `--section-space-large` (hoặc `py-section` / `py-section-large`) để tạo nhịp nghỉ, không đặt chiều cao tối thiểu theo màn hình cho từng heading/quote.
- Khung ảnh dùng `aspect-ratio`. Ảnh sản phẩm dùng `object-fit: contain`, ảnh editorial có thể crop bằng `object-fit: cover`.
- Giỏ hàng, checkout và footer theo chiều cao nội dung; trang ít nội dung có thể đưa footer lên sớm hơn.
- Trải nghiệm 3D tách sân khấu `100svh` khỏi đoạn cuộn dài thêm `112.5rem`. Sân khấu sticky trong section; canvas dịch chuyển dọc qua sân khấu và sản phẩm quay theo scroll. Một ScrollTrigger cung cấp chung tiến độ cho camera và các pha chữ; không có vòng render liên tục khi đứng yên.
- Framing 3D fit theo chiều ngang của bounds cụm sản phẩm trên đường orbit: từ 1920px trở lên chiếm khoảng 80% chiều rộng; từ 480px trở xuống là 120%, nội suy tuyến tính giữa hai mốc. Khoảng cách camera được tính tại 33 góc quay khi resize và nội suy theo scroll để giữ tỷ lệ ngang; chiều dọc được phép đi qua mép sân khấu, không ép toàn bộ model vừa chiều cao.
- Đáy của từng mesh sản phẩm được chiếu về mép dưới **canvas** ở mọi góc quay. Scroll dịch chuyển phần tử canvas bằng `translate` bên ngoài phép căn model; canvas có thể đi qua mép viewport, không khóa model vào đáy viewport. Không dùng các góc rỗng của bounding box toàn cụm để căn đáy. Sàn/bóng không quyết định điểm neo; căn đáy không làm thay đổi tỷ lệ ngang hoặc giới hạn ngân sách pixel.
- Canvas có chiều cao theo bounds chiếu của các mesh trên toàn đường quay, tối thiểu bằng sân khấu; không ép canvas bằng chiều cao viewport. FOV bù theo chiều cao canvas để giữ nguyên tỷ lệ ngang 80%–120%. Buffer được giới hạn theo ngân sách pixel cũ dù canvas CSS cao hơn sân khấu. Scroll đưa canvas từ dưới sân khấu lên trên; ở giữa, canvas có thể lớn hơn vùng nhìn thấy.
- Drawing buffer dùng DPR 1 và không vượt ngân sách pixel của cách tính chiều cao canvas trước đây (dùng `svh` ổn định làm tham chiếu); AO vẫn chạy ở nửa độ phân giải. Khung CSS đầy màn hình không bắt buộc buffer phải có cùng số pixel.

## Những nơi giữ viewport height có chủ đích

- Hero mở đầu, hero giới thiệu, sân khấu sticky bản đồ/slideshow và các card câu chuyện được pin trên desktop giữ `svh` ổn định.
- Ảnh chính trong `ProcessGallerySection` giữ nguyên breakpoint sticky từ 48rem; chiều cao là `100svh` trừ hai gutter ảnh, kể cả khi cửa sổ desktop thấp. Dưới breakpoint đó, ảnh cuộn tự nhiên với tỷ lệ 4:5.
- Chữ mở đầu của trải nghiệm 3D nằm giữa sân khấu, chữ kết ở phía dưới. Hai pha dùng cùng tiến độ với camera, có khoảng nghỉ giữa lúc chữ đầu rời đi và chữ sau xuất hiện. Khi giảm chuyển động, nội dung trở về luồng tự nhiên và model đứng yên.
- Overlay điều hướng/chuyển trang nằm ngoài luồng nội dung và phủ bằng `position: fixed; inset: 0`. Thanh mua hàng có thể bám vùng nhìn thấy hiện tại; nó không quyết định chiều cao các section.

## JavaScript và resize

- `ExperienceRuntime` cung cấp phần tử đo `100svh` có hook `data-scroll-viewport`, nằm ngoài luồng layout.
- Dùng `getScrollViewportHeight()` cho hình học animation và vị trí logo để thống nhất với CSS. Không dùng chiều cao động của thanh URL làm đầu vào cho hình học trang.
- Canvas chỉ resize khi kích thước container đổi. Giữ phép tính viewport động của thanh cuộn/keyboard vì đây là điều khiển UI, không phải hình học section.
- Vẫn xử lý resize thực, xoay máy và thay đổi kích thước nội dung; không đóng băng viewport bằng một số pixel chụp duy nhất lúc tải trang.

## Xác minh

- `node scripts/check-style-references.mjs`
- `node scripts/check-editorial-preview.js <browser-snapshots.json>`
- `node scripts/check-viewport-layout.mjs <viewport-snapshots.json>`
- `node --experimental-strip-types scripts/check-coffee-framing.mjs` (Node 22; kiểm tra bounds GLB trên 27 kích thước và toàn bộ đường quay)
- `node scripts/check-coffee-scroll.mjs <coffee-scroll-snapshots.json>`

Bộ kiểm tra viewport xác minh tỷ lệ ảnh mobile, khung sticky desktop, kích thước canvas và vị trí nội dung khi giả lập `innerHeight` đổi nhưng `svh` giữ nguyên. Kiểm tra đó không thay thế thử thanh URL thật trên Chrome iOS/Android; cần test trên thiết bị thật sau khi triển khai.
