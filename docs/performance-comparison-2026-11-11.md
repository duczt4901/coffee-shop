# So sánh performance — 11/11/2026

Kết quả: chi phí render scene 3D giảm rõ; dung lượng tải trang gần như giữ nguyên và startup vẫn có long task. Lượt này chỉ build/đo/lập báo cáo, không sửa source ứng dụng.

## Điều kiện và nguồn

- Bản production static export mới build, qua preview gzip cho JS/CSS/text, hỗ trợ byte-range video. Không dùng dev server để kết luận.
- Windows, Chrome 157, ANGLE D3D11, RTX 3050 Laptop 6 GB. Desktop CSS 1920×911, DPR thiết bị 1; canvas CSS vẫn 1920×1626.
- Audit ban đầu: `docs/ui-readiness-measurements.json` và raw `ui-readiness/home-production.json`, `gpu-timing-desktop.json`.
- Mốc ngay trước tối ưu: `docs/coffee-scene-benchmark.json → before`. Mốc sau WebP trước lượt đo này: `offlineAtlas.desktopWebP`.
- Các số mới lấy trong phiên đo này, ngày 11/11/2026. Metadata cuối ghi 21:07:57 giờ Việt Nam. Có 208 mẫu GPU trong ba lượt chốt, không disjoint/context loss; WebGL error = 0.
- Script đối chiếu chính: `scripts/profile-coffee-webgl.js`, scroll 2,4 giây, điểm bắt đầu canvas +250 px, biên độ 0,45 chiều cao viewport, chờ ổn định rồi kiểm tra idle 1 giây. Đây cũng là script của mốc ngay trước tối ưu.

## Scene 3D

| Chỉ số | Audit ban đầu | Ngay trước tối ưu | Đo hiện tại |
|---|---:|---:|---:|
| Draw call/render | 61 | 61 | **20** |
| Drawing buffer | 2880×2439 | 2880×2439 | **1920×1626** |
| Pixel/render | 7.024.320 | 7.024.320 | **3.121.920** |
| GPU median, ms | 5,964 | 4,728 | **2,254** |
| GPU P95, ms | 7,662 | 5,414 | **4,194**, khoảng **3,750–7,118** giữa các lượt |
| Mẫu GPU | 89 | 378 | 208 trong 3 lượt |
| Draw khi idle 1 giây | 0 | 0 | **0** |
| Composer passes khai báo | 3 | 3 | **0** |
| Transmission replay cho cốc kính | Có | Có | Không |
| Shadow map | 2048², tĩnh | 2048², tĩnh | 2048², tĩnh |

Ba lượt chốt mới:

| Lượt | Số mẫu | GPU median | GPU P95 | Draw/render |
|---|---:|---:|---:|---:|
| 1 | 98 | 2,413 ms | 3,750 ms | 20 |
| 2 | 79 | 2,102 ms | 4,194 ms | 20 |
| 3 | 31 | 2,254 ms | 7,118 ms | 20 |

Giá trị đại diện là median của ba median/P95 từng lượt, không phải percentile gộp toàn bộ 208 mẫu. Số mẫu giữa các lượt khác nhau; không suy ra FPS từ số rAF/draw này.

Mức thay đổi:

- Draw call: **−67,2%**.
- Pixel/render: **−55,6%**.
- GPU median so với mốc 4,728 ms dùng cùng script: **−52,3%**. So với số 5,964 ms của audit ban đầu: **−62,2%** về giá trị đo, dùng như tham chiếu vì capture cũ khác lượt/script.
- P95 đại diện giảm so với 5,414 ms, nhưng lượt xấu nhất vẫn lên 7,118 ms. Chưa đủ bằng chứng để nói mọi frame chậm đã được xử lý.
- Mốc WebP trước phiên này là 2,235 ms; giá trị mới 2,254 ms gần tương đương. Không quy dao động giữa các lượt thành một tối ưu mới.

Một biến thể scroll 1,8 giây, bắt đầu ở canvas thay vì +250 px, cho median khoảng 0,54–0,56 ms. Đã lưu riêng và không dùng để tính mức giảm của kịch bản đối chiếu chính. Vị trí/góc camera ảnh hưởng workload.

## Dung lượng tải

Giữ cùng cách tính Resource Timing như audit cũ: cộng resource entries, không tính main HTML. Dùng capture mới trong phiên có đầy đủ video 8.216.560 byte; các capture media cache hoặc tải dở không dùng để khẳng định trang nhẹ hơn.

| Nhóm/chỉ số | Audit trước | Capture mới | Thay đổi |
|---|---:|---:|---:|
| Tổng resource transfer | 15.737.976 B / 15,009 MiB | 15.759.850 B / 15,030 MiB | **+0,14%, gần như giữ nguyên** |
| JavaScript transfer, gzip | 401.875 B / 392,46 KiB | 396.241 B / 386,95 KiB | −1,40% |
| JavaScript decoded | 1.495.297 B | 1.471.233 B | −24.064 B |
| Video transfer khi ghi nhận đầy đủ | 8.216.560 B | 8.216.560 B | Giữ nguyên |
| GLB transfer | 4.959.992 B | 4.959.992 B | Giữ nguyên |
| Font transfer | 330.404 B, 17 request | 330.404 B, 17 request | Giữ nguyên |
| CSS transfer | 18.437 B | 18.437 B | Giữ nguyên |
| Atlas offline | Chưa có | 27.172 B file WebP, 27.472 B transfer trong capture | Request mới, thay công việc bake trên client |

Video + GLB vẫn chiếm khoảng **83,6%** transfer. Texture tem và GLB giữ nguyên; chưa tối ưu video hoặc kích thước GLB trong các thay đổi này.

## Startup và độ ổn định layout

| Chỉ số lab cục bộ | Audit trước, một lượt | Các lượt hiện tại sau khi ổn định từ đầu trang |
|---|---:|---:|
| LCP | 344 ms | 432–644 ms |
| Tổng long task trong 3 giây đầu | 431 ms | 334–609 ms |
| Long task lớn nhất từng lượt | 268 ms | 226–296 ms |
| CLS | 0,02010047 | **0,02010047** |
| `will-change` khác auto | 12 phần tử | 12 phần tử |

LCP/long task mới có dao động lớn do trạng thái cold/warm và tải máy. Chưa có bằng chứng startup cải thiện ổn định; không quy mức LCP tăng ở localhost thành regression trên Internet hoặc chỉ riêng thay đổi atlas. Đây không phải Core Web Vitals p75 hoặc INP thực tế.

Các lượt reload/scroll quá sớm khi model/layout chưa ổn định ghi nhận CLS 0,727–0,746 và video không có đầy đủ Resource Timing. Đã lưu vào nhóm loại khỏi phép đối chiếu đầu trang. Kịch bản scroll restoration/cuộn sớm cần kiểm tra riêng; không có baseline tương ứng để kết luận đó là regression mới.

## Mobile và giới hạn

Mobile emulation 390×844, DPR thiết bị 3: buffer 780×1688, 20 draw/render, GPU median 0,502 ms/P95 2,688 ms trong 376 mẫu, idle 0. Vẫn là RTX 3050. Audit mobile ban đầu chỉ có 4 mẫu, không đủ để tính mức cải thiện hoặc kết luận điện thoại thật.

Timer GPU chỉ đo phạm vi lệnh WebGL. Nó không bao gồm toàn bộ CPU, video/DOM/compositor hoặc MSAA resolve của framebuffer mặc định sau callback; composer trước đây resolve render target bên trong render path. Số draw/pixel giảm là phép đếm trực tiếp; số ms không đại diện toàn bộ chi phí GPU của trang.

Không đo VRAM thực tế, FPS trình bày, INP hoặc thiết bị yếu/Safari/Firefox thật. Không chấm lại điểm readiness 58/100 vì lượt này không tái audit các nhóm UI còn lại.

Số tổng hợp và từng lượt GPU: `docs/performance-comparison-2026-11-11.json`. Raw traces, collector và các lượt bị loại nằm trong thư mục `performance-comparison` của evidence phiên làm việc.

Ưu tiên tiếp theo theo số liệu: giảm tải video/hoãn GLB gần viewport, đo nguồn long task khởi tạo, rồi kiểm tra trên GPU yếu thật. Giữ nguyên chất lượng texture tem.
