UI production readiness — 11/11/2026

Kết luận hiện tại: **58/100, chưa sẵn sàng phát hành UI cho tập thiết bị rộng**. Đây là điểm đánh giá kỹ thuật để ưu tiên công việc, không phải điểm Lighthouse hay chứng nhận tương thích. GPU/tốc độ, thiết bị và nguồn cấu hình chiếm 75% trọng số theo ưu tiên của chủ dự án. Các sửa reveal mô tả bên dưới đã được thực hiện; những vấn đề còn lại là kết quả audit, chưa tự động đổi thiết kế hoặc chất lượng 3D.

Phạm vi là hiển thị, tương tác, animation, tài nguyên frontend và khả năng sử dụng. Không đánh giá database, API, bảo mật hay tính đúng đắn nghiệp vụ đặt hàng.

| Khía cạnh | Trọng số | Điểm /5 | Quy đổi /100 | Căn cứ chính |
|---|---:|---:|---:|---|
| GPU và tốc độ | 30% | 2,5 | 15 | Trang chủ nhiều media; DPR tối thiểu 1,5, MSAA 4× và SSAO; chưa có profile nhẹ/fallback model |
| Thiết bị và tương thích | 25% | 3 | 15 | Layout đạt các kích thước đã thử; chưa xác nhận Safari, Firefox, GPU tích hợp và điện thoại thật |
| Nguồn cấu hình UI | 20% | 3 | 12 | Reveal đã có một preset; quality 3D và các lifecycle animation khác còn phân tán |
| Tương tác và animation | 10% | 3,5 | 7 | Reveal, FAQ, dropdown hoạt động; menu mobile còn lỗi keyboard |
| Trạng thái UI | 5% | 2,5 | 2,5 | Có empty/loading cart; form footer không phản hồi thành công/lỗi |
| Accessibility | 5% | 3 | 3 | Reduced motion tốt với reveal; menu không giữ focus; home thiếu h1 nội dung |
| Visual và nội dung | 5% | 3,5 | 3,5 | Typography/ảnh nhất quán hơn; logo placeholder, About và Contact chưa hoàn chỉnh |
| **Tổng** | **100%** | | **58** | Lỗi chức năng/nội dung vẫn chặn phát hành dù layout không tràn ngang |

Đã kiểm tra bản `next build`/static export, không dùng số đo development để kết luận hiệu năng production. Preview chạy cục bộ, phục vụ gzip cho text/JS/CSS và hỗ trợ byte-range cho video. Máy đo dùng Chrome/ANGLE với RTX 3050 Laptop 6 GB; không throttle mạng hoặc giả định rằng CPU throttle đại diện cho GPU yếu. Kích thước mobile chỉ là emulation trên cùng GPU desktop.

| Phạm vi kiểm tra | Kết quả |
|---|---|
| Route UI được xem | 9: home, sản phẩm, chi tiết Robusta, câu chuyện, FAQ, giỏ hàng, thanh toán, về chúng tôi, liên hệ |
| Trường hợp ghi nhận | 23: một lượt home hiệu năng và 22 snapshot layout |
| Kích thước | 1920×911, 390×844, 320×568, 768×1024, 1024×600 |
| Tràn ngang document | 0 ở cả 22 snapshot layout |
| Text đang trong vùng trigger nhưng còn pending | 0 ở cả 22 snapshot layout |
| Ảnh đã load nhưng bị broken | 0 ở cả 22 snapshot layout; chưa coi ảnh lazy chưa load là đã kiểm chứng |
| FAQ | Click mở; Enter đóng; `aria-expanded`, `aria-hidden`, `inert` cập nhật đúng |
| Dropdown mobile | End + Enter chọn “Hợp tác”, listbox đóng |
| Reduced motion | 0 word-mask, 0 reveal pending, clip ảnh về `none`; video hero vẫn chạy |

Các snapshot không thay thế việc cuộn qua mọi vị trí, zoom hệ điều hành, screen reader hoặc kiểm thử trên thiết bị thật. Safari/iOS, Firefox, GPU tích hợp, WebGL bị tắt/mất context và mạng chậm vẫn là khoảng trống xác nhận.

Phần reveal đã sửa trước khi chấm điểm:

- [reveal.ts](/C:/coffee-shop/src/lib/reveal.ts:4) là nguồn cấu hình chung: 1600 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, trigger top 90% / bottom 10%. Image CSS nhận timing qua custom properties suy ra từ cùng preset; text WAAPI đọc trực tiếp preset đó.
- Bỏ `start`, `data-reveal-at` và delay rải rác ở 10 caller. Target text xét vị trí của chính nó, thay vì chờ tâm của cả section vào 85% màn hình.
- Word stagger 40 ms, chặn ở 240 ms: heading dài không kéo thêm nhiều giây trước khi đọc đủ chữ.
- [EditorialReveal](/C:/coffee-shop/src/components/ui/EditorialReveal.tsx:35) chỉ tách từ và tạo animation khi target vào vùng reveal. Trong kiểm tra home, 40 target ngoài màn hình còn nguyên text, không có word-mask ngoài màn hình và không tạo hàng loạt animation paused.
- [Mask chữ](/C:/coffee-shop/src/components/ui/EditorialReveal.module.css:9) có khoảng đệm block 0,3em và inline 0,25em, bù lại bằng margin âm để giữ layout. Vẫn dùng clip trong lúc reveal và mở overflow sau khi hoàn tất.
- Với heading nghiêng cỡ 160 px, overhang phải lớn nhất đã đo khoảng 21,52 px, nhỏ hơn đệm 40 px; dấu và descender cũng nằm trong mask. Đã xem ảnh render khi animation đang pause ở 1100 ms, trước khi bỏ clip.
- Giữ fallback cuối trang: text/ảnh đang nhìn thấy vẫn được reveal khi không còn đủ quãng cuộn để chạm trigger. Khi reduced motion bật, không tách chữ và không ẩn target.

Chi phí trang chủ trong lượt truy cập đã đo, bao gồm cuộn đến vùng 3D:

| Nhóm | Transfer | Ghi chú |
|---|---:|---|
| Video hero | 8.216.560 byte | Autoplay nên `preload="metadata"` không giới hạn toàn bộ lưu lượng |
| GLB | 4.959.992 byte | Loader khởi động khi component mount, không đợi người dùng đến model |
| Ảnh | 1.759.367 byte | 5 resource trong lượt đo; ảnh lazy khác chưa nằm trong tổng này |
| JavaScript | 401.875 byte transfer / 1.495.297 byte decoded | Có Three và postprocessing |
| Font | 330.404 byte, 17 request | Nhiều weight/subset được tải |
| CSS + khác | 69.778 byte | Gồm tài nguyên/prefetch đã ghi nhận |
| **Tổng** | **15.737.976 byte ≈ 15,01 MiB** | Video + GLB chiếm **83,7%** |

LCP home trong lab cục bộ là 344 ms, CLS khoảng 0,0201; có hai long task 163 ms và 268 ms ở giai đoạn đầu. Không dùng LCP localhost này để suy ra tốc độ trên Internet hoặc Core Web Vitals p75. Chưa đo INP thực tế; dữ liệu Event Timing ở lượt này không đủ để chấm INP.

GPU được đo riêng bằng `EXT_disjoint_timer_query_webgl2`, bọc các lệnh draw của đúng context WebGL hiện có, đọc kết quả bất đồng bộ và gỡ instrumentation sau kiểm tra. 89 mẫu hợp lệ, GPU disjoint=false. Số đo gồm công việc WebGL giữa draw đầu và cuối mỗi lần render, không gồm toàn bộ compositor/video/DOM của trình duyệt.

| Số đo desktop | Giá trị |
|---|---:|
| Canvas CSS | 1920×1626 |
| Drawing buffer | 2880×2439 = **7.024.320 pixel** |
| GPU median / lần render | **5,96 ms** |
| GPU P95 / lớn nhất | **7,66 / 8,90 ms** |
| Draw call trong 1 giây đứng yên sau khi ổn định | **0** |
| Video khi đã ra khỏi hero | Đã pause |

Không có bằng chứng model đang render liên tục khi đứng yên. Điểm nghẽn đáng ưu tiên là giá mỗi lần render khi cuộn và tài nguyên tải sớm. Một sample mobile emulation chỉ có 4 lần render hợp lệ trên cùng RTX; không dùng mẫu đó để kết luận hiệu năng điện thoại.

Các yếu tố làm tăng áp lực GPU, xác nhận từ source:

- [LocalCoffeeModel](/C:/coffee-shop/src/components/experience/coffee-bag/LocalCoffeeModel.tsx:133) ép DPR tối thiểu 1,5, nên màn hình DPR 1 vẫn render **2,25 lần số pixel CSS**; DPR 2 là 4 lần.
- [Render target](/C:/coffee-shop/src/components/experience/coffee-bag/LocalCoffeeModel.tsx:76) dùng MSAA tới 4×, cộng normal/AO/blur/output passes. Một texture RGBA8 toàn buffer đang đo đã khoảng **26,8 MiB**. Đây là phép tính dung lượng attachment, không phải phép đo VRAM thực tế. Không coi hai render target được tạo bởi composer là hai allocation chắc chắn: Three cấp phát khi target được sử dụng.
- [Studio shadow](/C:/coffee-shop/src/components/experience/coffee-bag/createCoffeeStudio.ts:23) là 2048². Shadow tắt auto-update nên không cần tính lại mỗi scroll frame, một điểm tốt cần giữ.
- [HeroVideo](/C:/coffee-shop/src/components/sections/home-page/HeroVideo.tsx:40) decode video lớn, blur và brightness trên diện tích rộng. Reduced motion chưa chặn playback.
- Transition có 4 panel và 4 word luôn khai báo `will-change`; Story card và backdrop cũng có hint lâu dài. Đã thấy 12 phần tử có `will-change` khác auto trong một trạng thái home. Đây là số hint CSS, không phải 12 GPU layer đã xác nhận hoặc số VRAM đã đo.

Những vấn đề còn lại, theo thứ tự ưu tiên:

| Mức | Vấn đề và bằng chứng | Hướng xử lý nhỏ nhất |
|---|---|---|
| P1 | Một profile 3D nặng cho mọi máy; forced DPR 1,5 + MSAA4 + SSAO, không có model fallback khi WebGL không dùng được | Gom DPR/AA/AO/shadow thành một budget đồ họa; bắt đầu bằng profile nhẹ cố định và ảnh fallback, đo lại trên máy yếu trước khi nâng chất lượng |
| P1 | Video + GLB chiếm 83,7% transfer của lượt home; tải model ngay khi mount | Hoãn tải 3D gần viewport; ưu tiên poster trước video, giảm/đổi phiên bản video thay vì chỉ thêm loader |
| P1 | Menu mobile vẫn `aria-expanded=true` sau Escape; Tab đi qua menu xuống link sản phẩm trong `main` phía sau overlay | Quản lý focus khi mở/đóng, Escape và trạng thái inert của nội dung nền; giữ một owner của scroll lock |
| P1 | Footer “Gửi” chỉ `console.log`, không có trạng thái success/error; Contact còn Lorem/example.com; About chỉ có h1; logo là `logo-placeholder.jpg` | Hoàn thiện nội dung và phản hồi UI; không hiển thị hành động có vẻ hoàn thành nhưng không có kết quả cho người dùng |
| P2 | Reduced motion bỏ reveal nhưng video hero vẫn chạy, đã xác nhận `videoPaused=false` | Dùng cùng quyết định motion để tắt autoplay và hiển thị poster |
| P2 | Homepage không có h1 nội dung; FAQ nhảy từ h2 xuống h6 | Chỉnh semantic heading, giữ visual bằng CSS |
| P2 | CSS backdrop khai báo animation 1 ms với scroll timeline mà không có guard hỗ trợ | Có fallback CSS không animation khi timeline không được hỗ trợ; xác nhận trên Safari/Firefox thật |
| P2 | Quality và lịch cập nhật còn rải ở renderer, studio, header, FAQ, route transition, image parallax | Giữ preset entry reveal vừa gom; bổ sung một budget graphics và dùng chung scheduler khi lifecycle tương đương, không gom các hành vi khác nghĩa vào một mega-component |
| P3 | Quantity không cho để trống tạm thời: xóa nội dung lập tức trở về 1; nhập 2 trực tiếp vẫn được | Cho phép draft input rồi validate lúc blur/commit |

Đề xuất trình tự tiếp theo: xử lý budget GPU và tải media trước, rồi menu/fallback/reduced motion, rồi nội dung và semantic. Với DPR 1 thay cho 1,5, số pixel giảm 55,6%; đó là giảm workload lý thuyết, không phải cam kết tăng FPS tương ứng. Chưa thay profile 3D trong lượt sửa reveal này vì cần so hình và đo trên máy yếu; không dùng `hardwareConcurrency` hoặc `deviceMemory` như bằng chứng rằng một GPU mạnh/yếu.

Về nguồn cấu hình, nên có ba trách nhiệm rõ: preset entry reveal chung; budget đồ họa chung; lifecycle riêng cho tương tác như camera scrub, slideshow và navigation. Duration/trigger của entry reveal không nên được copy lại ở từng page. Những cơ chế độc lập có lý do không cần biến thành một nguồn cấu hình khổng lồ.

Validation đã chạy: production build thành công, typecheck, ESLint source không lỗi (còn 1 cảnh báo `<img>` ở slideshow), style references, motion/reveal tests, và assert dữ liệu browser cho layout, trigger, lazy allocation, timing/easing và khoảng đệm ink. Chưa kiểm tra điện thoại/GPU yếu thật, Safari/Firefox, bfcache toàn bộ flow, screen reader hay thử nghiệm mất WebGL context.

Số tổng hợp có thể đọc lại ở [ui-readiness-measurements.json](/C:/coffee-shop/docs/ui-readiness-measurements.json). Raw JSON và ảnh render được lưu trong thư mục local `C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/11/11/01a1c964-aa68-7830-b901-2858c1f368d6/ui-readiness/`.
