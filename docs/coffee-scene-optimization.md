# Tối ưu scene cà phê — 11/11/2026

## Cập nhật: atlas offline

Atlas hiện được bake trước trên máy phát triển và lưu tại `public/images/3d/coffee-beans-atlas.webp`: WebP lossless RGBA8 512×512, 27.172 byte, 13 ô hạt. Website tải ảnh tĩnh, không tạo atlas/render target/blur shader lúc người dùng mở scene. Tất cả texture tem và GLB giữ nguyên; cấu hình DPR và ánh sáng cũng không đổi trong bước chuyển offline này.

Quy trình tạo lại khi đổi asset/ánh sáng/cấu hình hạt:

1. Chạy `pnpm bake:coffee-atlas`.
2. Mở URL loopback công cụ in ra, bấm **Generate atlas**. Cần trình duyệt WebGL2 và GPU hỗ trợ 4× MSAA để giữ cấu hình bake hiện tại.
3. Công cụ dùng chính scene, lighting, camera và bean plan trong source; lưu WebP lossless và `coffee-bean-atlas.generated.json`. Kết quả thành công phải có `gpuRoundTripMaxByteError: 0`.
4. Commit WebP lossless và manifest cùng source thay đổi. Chạy `pnpm check:coffee-atlas` hoặc `pnpm build`.

Build chỉ kiểm tra checksum của nguồn, phiên bản Three.js, WebP lossless và kích thước ảnh; không chạy browser hoặc WebGL. Nếu input đổi mà chưa bake lại, build báo atlas cũ. Vì vậy CI/deploy vẫn hoàn toàn là static export. Generator chỉ chạy trên máy phát triển; nó dùng Sharp đã có qua Next, không thêm dependency.

WebP lossless giữ nguyên mọi byte RGBA từ bake, không qua canvas hoặc palette quantization. Loader giữ dữ liệu màu linear/alpha của atlas và có cache key từ checksum ảnh. Đã kiểm tra toàn bộ chuỗi bake → WebP lossless → ImageBitmap → GPU: sai lệch tối đa **0 byte**. Không tự tối ưu lại WebP lossless bằng công cụ thay đổi màu/alpha; build sẽ phát hiện asset bị sửa.

Đo trên bản PNG offline trước khi chuyển định dạng (cùng dữ liệu RGBA), desktop DPR 1: 20 draw/frame, idle 0, GPU median 2,273 ms/P95 3,583 ms trong 76 mẫu hợp lệ trên cùng RTX 3050. Đây vẫn là phép đo WebGL khi scene đã tải; chưa đo mức cải thiện thời gian khởi tạo trên GPU yếu. Lợi ích xác định là bỏ 39 lượt vẽ bake và các buffer/shader bake trên client, đổi lấy một request ảnh 27.172 byte. Số đo lịch sử ở mục E được giữ để so sánh đợt tối ưu pipeline trước đó.

Đã thử chặn request atlas ở bản PNG trung gian: hero vẫn render, scene quay về 26 hạt 3D gốc; cơ chế fallback được giữ nguyên khi đổi định dạng. Unmount giải phóng texture và ImageBitmap, kể cả khi ảnh tải xong muộn. Test checksum bắt cả atlas cũ lẫn WebP lossless bị sửa; production build xuất đủ 17 trang.

WebP lossless nhỏ hơn PNG gốc từ 55.880 xuống 27.172 byte (−51,4%). Hash RGBA giữ nguyên qua hai định dạng; kiểm tra GPU của bản WebP cũng có sai lệch tối đa 0 byte. Đây là giảm dung lượng tải xuống, không giảm thêm bộ nhớ GPU của atlas.

Bản WebP trong static export được kiểm tra lại trên desktop/mobile: request 27.172 byte, không lỗi WebGL hoặc tràn ngang. Desktop giữ 20 draw/frame và idle 0; GPU median 2,235 ms/P95 2,690 ms trong 378 mẫu hợp lệ. Không suy ra lợi ích render mỗi frame từ chênh lệch nhỏ với lượt đo PNG; workload GPU và dữ liệu texture vẫn như nhau.

## A. Đánh giá trước sửa

Scene triển khai trong `src/components/experience/coffee-bag/LocalCoffeeModel.tsx`. Asset `robusta-product-scene.glb` nặng 4.959.692 byte, có khoảng 49.822 tam giác theo số instance đang sử dụng, 13 material và 26 hạt bay trong 4 batch instancing. Geometry hero, silhouette, UV và các normal/AO texture đáng giữ lại; không cần decimate túi để giải quyết nút thắt chính.

Chi phí lớn nằm ở pipeline: ép DPR tối thiểu 1.5, composer với RenderPass + SSAOPass + OutputPass, cùng transmission của cốc kính dưới phin. SSAO phát sinh render normals và các bước AO/blur/composite; transmission vẽ lại các vật thể opaque. Nhãn và thân túi đã có normal/AO map. Các texture nhãn 1024×2048 được giữ để bảo vệ chữ và nhận diện.

Điểm tốt: render theo nhu cầu, tắt khi ngoài viewport/tab ẩn, bóng đổ tĩnh, các hạt đã dùng instancing. Không đổi các cơ chế này.

## B. Kế hoạch đã thực hiện

- Giữ nguyên GLB, camera FOV/orbit/distance/offset, framing và kích thước bố cục, saturation, ánh sáng studio, môi trường phản xạ kim loại và shadow map tĩnh.
- Thay composer/SSAO bằng renderer trực tiếp với MSAA của trình duyệt; dùng normal/AO có sẵn cho chi tiết bề mặt.
- Dùng DPR thiết bị, trần 2 và ngân sách mềm 4,5 triệu pixel. Giữ DPR tối thiểu 1 để không kéo giãn buffer dưới độ phân giải CSS. Vì thế viewport CSS lớn hơn ngân sách, như 4K, có thể vượt 4,5 triệu pixel.
- Thay khúc xạ vật lý của riêng cốc kính nhỏ bằng transparency + reflection, để tránh replay cả scene. Không thay chất liệu túi hoặc kim loại.
- Bake 13 hạt từ chính geometry/material/rotation và ánh sáng hiện có, blur trong atlas nhỏ một lần; vẽ lại bằng một batch billboard có depth test. 13 hạt còn lại giữ 3D instancing.

Áp dụng bài học từ Vero ở pixel budget, số lượt render và chi tiết từ asset. Không cố ép scene nhiều sản phẩm xuống một mesh/draw call vì sẽ đánh đổi nhận diện, vật liệu và khả năng bảo trì.

## C. Các thay đổi áp dụng

| File | Thay đổi và tác động |
|---|---|
| `src/components/experience/coffee-bag/LocalCoffeeModel.tsx` | Bỏ composer và SSAO; bật native MSAA; gọi pixel budget và bean depth; đổi riêng glass transmission; giữ render lifecycle và framing gốc. |
| `src/components/experience/coffee-bag/coffee-render-quality.ts` | Một nơi quyết định DPR và ngân sách pixel. Không thêm cấu hình rải rác trong CSS/component. |
| `src/components/experience/coffee-bag/coffee-bean-depth-plan.ts` | Chọn đúng một nửa số hạt, phân lớp/depth/blur, vị trí cho khung rộng và hẹp; kết quả xác định, không random lại khi remount. |
| `src/components/experience/coffee-bag/coffee-bean-depth.ts` | Dùng atlas offline; compact các instance nét; billboard instancing, sắp xếp xa→gần, depth test; giải phóng material/geometry khi unmount. |
| `src/components/experience/coffee-bag/coffee-bean-atlas.ts` | Đọc WebP lossless thành texture với màu/alpha và filtering khớp bake; không làm render/blur. |
| `scripts/coffee-scene-update/bake-bean-atlas.ts` | Code render/blur chuyển khỏi runtime, chỉ dùng trong công cụ bake trên máy phát triển. |
| `scripts/coffee-scene-update/generate-bean-atlas.mjs` | Công cụ loopback tạo WebP lossless và manifest; kiểm tra toàn bộ byte WebP lossless. |
| `scripts/check-coffee-bean-atlas.mjs` | Kiểm tra source hash, image hash và định dạng WebP lossless trước production build. |
| `tests/coffee-bean-depth.test.mjs` | Kiểm tra asset thật: số hạt, độ sâu/blur đa dạng, cả hai phía, nhãn không bị foreground blur che, vẫn thấy foreground qua orbit và các kích thước. |
| `scripts/profile-coffee-webgl.js` | Phép đo dùng trong preview/DevTools, không được import vào ứng dụng. Đếm draw call, query GPU, pixel và idle; khôi phục các hàm WebGL sau đo. |

Không thêm dependency; không sửa asset hero hoặc section/animation ngoài phạm vi 3D. Asset SHA256 giữ nguyên: `1517d83a0b4dfd2df7f86780da61d1f91ac640210b0687ce6abe69d7b9421063`.

## D. DOF và hạt cà phê

Focal point là ba túi cà phê; shader blur không bao giờ nhận hình ảnh của túi. Đây là selective baked blur, không phải mô phỏng DOF quang học toàn cảnh.

Trong 26 hạt: **13 hạt nét, 4 hạt mờ foreground, 9 hạt mờ background**. Chọn hạt dựa trên vị trí hiện có: foreground ở ngoại vi, background ưu tiên xa hơn. Giữ khác biệt rotation, kích thước và khoảng cách có sẵn; thêm depth và mức blur không đồng đều. Cả foreground lẫn background đều có hạt ở hai phía, không tạo grid/vòng tròn/đối xứng. Khung dưới 1440 px đưa hai hạt foreground vào vùng phía trên để lớp gần còn nhìn thấy khi hai mép composition bị crop.

Atlas RGBA8 512×512 chia 16 ô 128×128, sử dụng 13 ô. Mỗi hạt bake một lượt và blur tách hai chiều: 39 draw nhỏ **trên máy phát triển**, không chạy lúc người dùng tải trang. Texture atlas giữ lại khoảng 1 MiB trên GPU và thêm một request WebP lossless 27.172 byte. Runtime có một batch 13 plane; các hạt mờ không cast shadow, không có vòng animation riêng. Alpha được lọc cùng màu để hạn chế viền đen; depth test giữ che khuất với vật thể opaque, và instance được sắp xếp xa→gần khi camera đổi.

Framing đo từ toàn bộ geometry/instance gốc **trước** khi compact hoặc thay hạt. Hero không đổi scale, camera hoặc khoảng scroll. Các vùng chữ trong artwork hiện tại được kiểm tra theo UV, có khoảng đệm; phần kiểm tra này cần cập nhật nếu thiết kế nhãn đổi.

## E. Kết quả trước/sau

Chrome, ANGLE D3D11, RTX 3050 Laptop 6 GB. Viewport desktop 1920×911, DPR thiết bị 1. Canvas CSS giữ 1920×1626. Cùng kịch bản scroll có kiểm soát 2,4 giây, sau khi tải/warm shader.

| Chỉ số | Trước | Sau | Thay đổi |
|---|---:|---:|---:|
| Drawing buffer | 2880×2439 | 1920×1626 | Giữ kích thước CSS |
| Pixel/frame | 7.024.320 | 3.121.920 | −55,6% |
| Draw call/frame ổn định | 61 | 20 | −67,2% |
| GPU median theo timer query | 4,728 ms | 2,339 ms | −50,5% |
| GPU P95 | 5,414 ms | 3,368 ms | −37,8% |
| Số mẫu GPU hợp lệ | 378 | 432 | Disjoint = false |
| Composer passes khai báo | 3 | 0 | SSAO còn chứa các bước nội bộ |
| Transmission prepass | Có | Không | Loại bỏ replay cho cốc kính |
| Draw call khi idle, 1 giây | 0 | 0 | Giữ on-demand |

Renderer chính còn một lượt render scene; shadow map chỉ cập nhật khi cần. Atlas hiện bake offline, không phải post-process trên client. Geometry hạt được submit giảm từ 7.800 xuống 3.926 tam giác, tính cả plane; tổng geometry theo instance khoảng 49,8k → 45,9k tam giác, chưa nhân các lượt vẽ hai mặt. Geometry/material của các hạt nét và hero không bị sửa.

Đo bổ sung bản cuối:

- Desktop DPR 2: buffer 2305×1952 = 4.499.360 pixel, 20 draw/frame; median 2,154 ms, P95 3,091 ms, 137 mẫu.
- Mobile giả lập 390×844, DPR thiết bị 3: buffer 780×1688, 20 draw/frame; median 2,471 ms, P95 3,218 ms, 82 mẫu; idle 0 draw.
- Khung 320×568: buffer 640×1136; không tràn ngang, không lỗi WebGL/context loss trong lượt kiểm tra.
- Khi scroll model ra khỏi viewport: 0 draw trong 1 giây quan sát.
- Native antialias bật; context kiểm tra được 4 samples, `gl.getError() = 0`.

Không so GPU giữa các viewport như cùng một workload: góc nhìn, tải và trạng thái xung GPU có thể khác. Không có baseline mobile nguyên bản mới đủ mẫu để đưa tỷ lệ giảm trên mobile.

**Giới hạn phép đo:** timer query bao quanh các lệnh vẽ WebGL, không đo toàn bộ FPS/trang web. Không gồm CPU, tải/compile lần đầu, bake atlas, PMREM, shadow khởi tạo, video, compositor hoặc MSAA resolve của framebuffer mặc định diễn ra sau callback. Pipeline cũ resolve render target trong composer, nên số ms không đại diện chính xác mọi chi phí resolve trước/sau. Số draw/pixel giảm là phép đếm trực tiếp; không suy ra “website nhanh gấp hai” từ timer query.

Validation đã đạt:

- Production build và TypeScript, xuất đủ 17 trang.
- ESLint các file sửa/thêm; `git diff --check`.
- 4 test: checksum/freshness atlas offline, bean depth/nhãn, pixel budget và render lifecycle.
- Framing: 27 layout từ 320 đến 3840 px, 257 góc mỗi layout, trên GLB thật.
- DOF/nhãn/foreground còn nhìn thấy: 8 layout (320, 390, 480, 768, 1024, 1200, 1440, 1920), 65 góc mỗi layout.
- Quan sát ảnh desktop, phin và mobile 320/390; console không ghi lỗi trong lần kiểm tra.

Số đo máy đọc được nằm tại `docs/coffee-scene-benchmark.json`. Ảnh và raw JSON nằm trong thư mục evidence `coffee-optimization` của phiên làm việc, ngoài source ứng dụng.

## F. Tradeoff và điều chưa kiểm chứng

- Cốc kính còn transparency/reflection nhưng không còn khúc xạ vật lý. Đây là thay đổi thị giác chính để đổi lấy bớt 17 draw/frame so với bản trung gian còn transmission.
- Hạt mờ là card bake theo góc giữa orbit; không xoay hình học đầy đủ theo camera như hạt thật. Phạm vi orbit hiện tại hẹp và blur che bớt khác biệt; mở orbit rộng cần atlas nhiều góc hoặc cách khác.
- Bake đã chuyển offline. Client vẫn phải decode/upload WebP lossless, compile shader hiển thị, tạo PMREM và shadow khởi tạo. Chưa đo startup spike trên GPU yếu hoặc thiết bị thật.
- Bỏ SSAO làm giảm một phần contact shading màn hình; AO texture, ánh sáng và bóng tĩnh vẫn giữ form. Không tuyên bố chất lượng pixel-identical với bản supersample 1.5×.
- Chưa kiểm tra điện thoại Android/iOS thật, Safari/Firefox hoặc GPU tích hợp yếu. Giả lập kích thước/DPR trên RTX không thay thế kiểm tra này.
- Chưa giảm dung lượng GLB/texture tải mạng, chưa thêm KTX2 hoặc mức chất lượng thích ứng theo thiết bị. Giữ nguyên texture hero trong đợt này để bảo vệ readability.

## G. Kết luận kỹ thuật

1. **Nguồn nặng:** buffer bị supersample trên màn hình 1×, SSAO/composer và transmission replay. Số tam giác của hero không phải nút thắt chính của lượt audit này.
2. **Tối ưu hiệu quả nhất:** render trực tiếp, bỏ replay cho kính nhỏ và giảm pixel budget; 61 → 20 draw/frame, 7,02 → 3,12 triệu pixel ở desktop DPR 1.
3. **Hero được giữ chất lượng:** giữ nguyên byte GLB, geometry, UV, texture/material túi, ánh sáng, saturation và camera; MSAA 4 samples trong context đo. Có tradeoff supersampling/contact shading như mục F.
4. **Chiều sâu tốt hơn:** có lớp gần mờ rõ, lớp xa mờ nhẹ/vừa và lớp nét xen kẽ, với bố cục riêng cho khung hẹp. Đã kiểm tra trực quan; mức “premium” cuối cùng vẫn là nhận định thẩm mỹ.
5. **50% out-of-focus đạt:** đúng 13/26 hạt trong scene; 4 foreground và 9 background, các mức blur khác nhau. Không phải tất cả 26 hạt đều nhìn thấy ở mọi viewport/góc vì vẫn có crop và che khuất.
6. **Tối ưu tiếp:** atlas offline đã áp dụng; tiếp theo là đo startup trên GPU yếu thật, rồi cân nhắc texture KTX2 cho phần phụ hoặc profile DPR phù hợp. Texture tem giữ nguyên. Tiếp tục giữ on-demand rendering; không cần thay hero để có thêm lợi ích.
