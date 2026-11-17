# Audit trước phát hành — 16/11/2026

Repo này là website giới thiệu/catalog Là Vườn Coffee, xuất HTML tĩnh bằng Next.js và phục vụ qua Cloudflare Static Assets. Giả định khách truy cập công khai, nhiều người cùng xem; trang nội dung không cần server Next.js hoặc database lúc chạy. Giỏ hàng là trạng thái local của trình duyệt.

Phạm vi: UI, mobile, loading/hydration, navigation, scroll, ảnh, accessibility, build/preview và rà dependency. Không chấm SEO hoặc tính đúng đắn nghiệp vụ thanh toán. Không đổi video theo yêu cầu trước đó. Audit chỉ ghi nhận vấn đề; các sửa trong lượt này thuộc phần tách ảnh/parallax đã được yêu cầu.

**Kết luận: UI khoảng 82/100, tăng từ 58/100 theo cùng trọng số cũ. Chưa nên ký nghiệm thu phát hành công khai.** Bản mới có thể đưa lên staging; nội dung liên hệ/về chúng tôi và CI còn việc phải hoàn tất. Điểm này là đánh giá kỹ thuật có chủ đích, không phải Lighthouse hoặc chứng nhận bảo mật. Các điểm deployment/bảo mật được ghi riêng, không trộn vào thang UI cũ.

| Nhóm theo audit 11/11 | Trọng số | Cũ /5 | Hiện tại /5 | Điểm quy đổi | Căn cứ |
|---|---:|---:|---:|---:|---|
| GPU và tốc độ | 30% | 2,5 | 4,5 | 27 | Không còn WebGL/GLB trên home; chỉ ảnh crop và CSS transform; chưa xác nhận GPU điện thoại thật |
| Thiết bị và tương thích | 25% | 3 | 3,5 | 17,5 | 36 kiểm tra layout, reload sâu mobile đạt; chưa có Safari/iOS/Firefox thật |
| Nguồn cấu hình UI | 20% | 3 | 4,5 | 18 | Reveal chung, scheduler dùng chung, một progress/bảng cấu hình cho cụm sản phẩm; còn đường motion chưa thống nhất |
| Tương tác và animation | 10% | 3,5 | 4,5 | 9 | Menu trap focus/Escape, FAQ, dropdown, route reveal và scroll unlock đạt |
| Trạng thái UI | 5% | 2,5 | 3,5 | 3,5 | Ảnh lỗi có fallback, HTML trước hydrate usable, form chưa kết nối được vô hiệu hóa rõ ràng |
| Accessibility | 5% | 3 | 3,5 | 3,5 | Menu/h1/video tốt hơn; reduced motion của ảnh/footer và heading FAQ còn lỗi |
| Visual và nội dung | 5% | 3,5 | 3,5 | 3,5 | Brand/ảnh đã cải thiện; Contact và About vẫn chưa đủ để phát hành thương hiệu |
| **Tổng** | **100%** | | | **82** | Không tính SEO, thanh toán; không yêu cầu đổi video trong lượt này |

## Phần tách ảnh đã hoàn tất

- Bốn ảnh sản phẩm: túi xanh lam cùng bục/bóng sàn, túi cam, bộ phin/ly, túi xanh lá. Cả scene được render đầy đủ trước, sau đó dùng mask cùng camera để lấy pixel từng vật thể. Túi cam giữ bóng của túi xanh; không render từng túi trong scene trống.
- Cả cụm dùng một tiến độ scroll và bảng `sceneLayers` trong [CoffeeParallaxScene.tsx](C:/coffee-shop/src/components/experience/CoffeeParallaxScene.tsx:12). Mỗi ảnh có hướng/biên độ riêng, nhỏ hơn hạt; không tạo listener hoặc vòng RAF riêng cho từng sản phẩm.
- Bảy ảnh hiển thị gồm bốn sản phẩm và ba lớp hạt. Mobile 158.510 byte; desktop 373.200 byte. Ảnh tổng chỉ là fallback khi ảnh sản phẩm lỗi, không tải trong lượt bình thường.
- Crop giảm tổng pixel của bốn sản phẩm mobile từ 11.849.760 xuống 2.090.755, khoảng 82%; desktop từ 27.136.000 xuống 7.107.719, khoảng 74%. Đây là phép tính pixel ảnh, không phải phép đo VRAM thực tế.
- Bóng/che khuất đã bake cố định; khi từng ảnh dịch chuyển, ánh sáng không được tính lại như 3D. Biên độ nhẹ giữ chúng gần bố cục gốc. Nền vẫn trong suốt.

## Bằng chứng đã chạy

| Kiểm tra | Kết quả và giới hạn |
|---|---|
| Production build | Đạt; Next 16.3.0, static export 18 routes/variants theo build output |
| TypeScript | Đạt qua build và lệnh typecheck |
| Node tests | 128/128 `.test.mjs` đạt; thêm regression đối chiếu pixel từng sản phẩm với ảnh scene chung để giữ bóng/ánh sáng hậu tương tác |
| WordPress client tests | 5/5 đạt với mock; không phải xác nhận CMS live |
| CSS references | 26 modules đạt |
| Export check | 15 HTML files gồm 404; không thấy mẫu WooCommerce credential mà checker tìm |
| Link nội bộ | 279 link trong 14 trang `index.html`, không thấy đích route bị thiếu trên filesystem; không xác nhận dịch vụ bên ngoài |
| Layout | 9 route × 320×568, 390×844, 768×1024, 1280×720: 0 tràn ngang document, 0 ảnh đã tải bị broken, 0 loading giữ inert sau khi kết thúc |
| Phạm vi route | Home, sản phẩm, chi tiết Robusta, câu chuyện, FAQ, giỏ hàng, về chúng tôi, liên hệ, blog chưa cấu hình CMS |
| Ảnh lazy | Không coi ảnh ngoài view/chưa tải trong matrix là đã kiểm chứng; bảy ảnh scene đã kiểm tra tải xong riêng trên mobile và desktop |
| Home scene | 0 canvas, 0 request GLB; bốn ảnh có transform khác nhau từ cùng progress; fallback tổng không bị tải thừa |
| Menu mobile | Mở khóa nền bằng inert/overflow; Shift+Tab giữ focus trong panel; Escape đóng; sau transition trả focus, bỏ inert và mở scroll |
| Điều hướng từ menu | `/faq/` chạy `waiting → opening → done`, scroll lock count về 0, main không còn inert |
| FAQ | Click mở, Enter đóng; combobox End + Enter đến “Hợp tác”, dropdown đóng sau scroll ổn định |
| Reload sâu mobile | Trước/sau reload: scrollY=3756, stageTop=0, pin=active, transforms slide giống nhau |
| Scroll mobile synthetic | 59 khoảng RAF: bình thường median 7 ms/P95 7,2 ms; CPU×6 median 21 ms/P95 28,1 ms; 0 khoảng trên 50 ms; stageTop luôn 0 |
| Giới hạn số đo scroll | Đây là điều khiển scroll bằng RAF trong Chrome trên GPU desktop; không phải FPS trình bày hoặc bằng chứng thanh địa chỉ iPhone không giật |
| Home lab ban đầu | LCP 448 ms, CLS 0, long task 170/56 ms trong một lượt localhost; không suy ra CWV p75/INP hoặc tốc độ mạng Internet |
| Không chạy JavaScript | Nội dung HTML vẫn đọc được, menu details mở/đóng bằng keyboard; đã bật lại JS và reload sau kiểm tra |
| Reduced motion | Scene mới: 7 transform `none`; video pause. Ảnh nội dung và footer vẫn parallax: finding 5 |
| Console | Không thấy warn/error trong các lượt browser kiểm tra được ghi nhận |
| ESLint src/worker | **Không đạt**: 4 errors, 1 warning, finding 2 |
| Cloudflare preview | Cấu hình gốc không khởi động với workerd cài hiện tại; đã dùng override local 2026-08-06 để kiểm tra UI, finding 4 |

Browser evidence và ảnh nằm tại `C:/Users/Nguyen Viet Duc/.codex/visualizations/2026/11/12/01a1cef4-a8c2-73e2-878e-51fc5d8f183a/production-audit-browser-2026-11-16.json`, `coffee-flock-mobile.png`, `coffee-flock-desktop.png`, `production-horizontal-mobile.png`. Số đo artifact ở [production-artifacts-2026-11-16.json](performance/production-artifacts-2026-11-16.json). Khoảng 220.956 byte gzip từ tất cả script tags của home, gồm legacy script; chỉ là ước tính gzip file, không phải network timing.

## Phải xử lý trước nghiệm thu công khai

1. **P1 — Khách gặp thông tin liên hệ giả và trang About gần trống.**
   - **Đây là gì:** Các đích liên hệ được đưa vào menu/footer và trang liên hệ công khai. [Contact](C:/coffee-shop/src/app/lien-he/page.tsx:13), [Footer](C:/coffee-shop/src/components/layout/SiteFooter.tsx:35), [About](C:/coffee-shop/src/app/ve-chung-toi/page.tsx:9).
   - **Vấn đề:** Contact còn Lorem Ipsum, địa chỉ mẫu và bốn email `example.com`. Facebook/Email footer trỏ `#`; About chỉ có tiêu đề. Matrix thấy các trang mở được nhưng đó chưa phải nội dung hoàn chỉnh.
   - **Sửa nhỏ nhất:** Điền thông tin client đã duyệt; ẩn link chưa có đích thật; hoàn thiện About hoặc tạm gỡ trang khỏi navigation. Zalo/số điện thoại đã có thể làm kênh liên hệ chính trong lúc chờ email.
   - **Nếu bỏ qua:** Khách không liên hệ được qua các kênh được quảng bá và website trông như bản thử nghiệm. Không tự bịa địa chỉ/email để lấp chỗ trống.

2. **P1 — CI lint đang đỏ dù build thành công.**
   - **Đây là gì:** Workflow có bước ESLint `src`; code 3D giữ để rollback vẫn nằm trong phạm vi lint. [LocalCoffeeModel](C:/coffee-shop/src/components/experience/coffee-bag/LocalCoffeeModel.tsx:31), [workflow](C:/coffee-shop/.github/workflows/static-build.yml:28).
   - **Vấn đề:** Helper thông thường tên `usePlaceholder` bị nhận nhầm là React Hook; các call ở dòng 40/44/49/52 gây bốn lỗi rules-of-hooks. SkeletonImage có thêm một warning alt vì prop đang được truyền qua spread.
   - **Sửa nhỏ nhất:** Đổi helper thành `applyPlaceholder` và đổi các caller, giữ nguyên code 3D. Khai báo truyền `alt` tường minh ở SkeletonImage để dọn warning, không tắt rule.
   - **Nếu bỏ qua:** PR không qua workflow kiểm tra, dù export thủ công thành công; đường rollback không đạt cùng tiêu chuẩn kiểm tra.

## Nên xử lý trong lượt chốt release

3. **P1 maintenance — Lockfile có dependency production chưa vá.**
   - **Đây là gì:** `pnpm audit --prod --json` ngày 16/11 ghi 18 advisory: 5 critical, 7 high, 5 moderate, 1 low. Đây là advisory theo package, không phải 18 lỗ hổng đã chứng minh khai thác được trên website.
   - **Vấn đề:** Next cài 16.3.0; Zod 4.4.3. Cảnh báo gồm Next server trên Windows và image optimizer; nhà phát hành xác nhận điều kiện đó trong [Windows server advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF optimizer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4). Theo cấu hình repo, production chỉ phục vụ static export, `images.unoptimized=true`, không chạy các endpoint Next server này; không suy luận rằng Worker đang có RCE từ số critical thô.
   - **Sửa nhỏ nhất:** Nâng Next/eslint-config-next đồng bộ và cập nhật transitive dependencies bằng lockfile có review, rồi chạy build/tests/audit lại. Registry report hiện chỉ ra các mốc vá Next ≥16.4.1, Sharp ≥0.35.5, Zod ≥4.6.6 cho những advisory tương ứng; kiểm tra lại advisory còn lại sau nâng.
   - **Nếu bỏ qua:** Toolchain phát triển/build tiếp tục mang phiên bản có cảnh báo, và một thay đổi sau này sang Next server/image optimization có thể mở đúng đường bị ảnh hưởng. Raw report được lưu cạnh browser evidence ở `production-dependencies-2026-11-16.json`; không thử khai thác.

4. **P2 — Preview mặc định dùng workerd quá cũ so với cấu hình deploy.**
   - **Đây là gì:** [wrangler.jsonc](C:/coffee-shop/wrangler.jsonc:5) yêu cầu 2026-08-21, nhưng workerd cài theo lockfile chỉ hỗ trợ tối đa 2026-08-06.
   - **Vấn đề:** Khởi động preview với config nguyên bản thất bại ngay. UI trong audit này được chạy từ output production qua Cloudflare local nhưng override date 2026-08-06; chưa xác nhận runtime đúng ngày cấu hình.
   - **Sửa nhỏ nhất:** Cập nhật Wrangler/workerd cùng lượt cập nhật dependencies, rồi chạy lại preview bằng config gốc. Không hạ ngày deploy chỉ để che lỗi công cụ local.
   - **Nếu bỏ qua:** Người khác chạy preview không tái hiện được quy trình nghiệm thu mặc định; kết quả local chưa bảo đảm đầy đủ cho ngày tương thích production.

5. **P2 — Reduced motion chưa được áp dụng cho ảnh nội dung và footer.**
   - **Đây là gì:** [image-reveal-runtime](C:/coffee-shop/src/components/ui/image-reveal-runtime.ts:10) luôn tính transform parallax; [footer-parallax-runtime](C:/coffee-shop/src/components/layout/footer-parallax-runtime.ts:7) chỉ kiểm tra kích thước màn hình.
   - **Vấn đề:** Khi emulation `reduce`, ảnh nội dung vẫn có matrix scale 1,11429 và dịch Y −15,69 px; footer desktop còn `translateY(-26.7307%)`. Scene sản phẩm và video đã tôn trọng tùy chọn này.
   - **Sửa nhỏ nhất:** Giới hạn hai parallax trang trí theo `prefers-reduced-motion: no-preference`, cleanup transform khi đổi preference; giữ sticky copy và chức năng scroll ngang theo ý đồ đã chốt.
   - **Nếu bỏ qua:** Người chọn giảm chuyển động vẫn gặp parallax ở các section khác, nên tùy chọn này chưa nhất quán trên toàn trang.

6. **P2 — Câu hỏi FAQ dùng heading h6 sau h2.**
   - **Đây là gì:** [FaqContent](C:/coffee-shop/src/app/faq/FaqContent.tsx:123) dùng h6 cho câu hỏi trong từng nhóm h2.
   - **Vấn đề:** Người điều hướng bằng cấu trúc heading gặp bước nhảy h2 → h6. Click/keyboard vẫn làm việc, nhưng thứ bậc nội dung không phản ánh quan hệ nhóm/câu hỏi.
   - **Sửa nhỏ nhất:** Đổi câu hỏi thành h3, giữ class/style hiện có. Đây là accessibility, không phải chấm SEO.
   - **Nếu bỏ qua:** Cấu trúc đọc bằng heading tiếp tục gây khó hiểu cho người dùng công nghệ hỗ trợ.

## Điều chưa được ký xác nhận

- Chưa test điện thoại yếu thật, Chrome trên iPhone, Safari/iOS, Firefox, screen reader hoặc thao tác toolbar/overscroll bằng ngón tay trên máy thật. Cần một lượt smoke test mobile thật trước nghiệm thu rộng; CPU×6 không đại diện cho GPU/decoder/network của điện thoại.
- Không đo INP ngoài thực tế hoặc CWV p75. Không chứng minh video đã nhẹ; giữ nguyên video là phạm vi đã chốt.
- Không kiểm tra nghiệp vụ thanh toán, SEO, backend nhận form, CMS live, email/Zalo nhận tin, DNS/TLS/custom domain, CI trên GitHub hoặc deployment Cloudflare thật. Form tư vấn hiện vô hiệu hóa có thông báo, không báo gửi thành công giả.
- Đọc sâu các luồng frontend đang dùng, loading/scroll/lock, sanitization CMS, config/build/tests; không đọc từng dòng vendor Three hoặc toàn bộ script chỉnh hình học 3D/archive. Các script offline không được chạy trên client.
- Audit không tự nâng dependency hoặc sửa nội dung client; không push/deploy trong lượt này.

**Verdict:** Các thay đổi parallax/ảnh đã hoạt động và giảm đáng kể tải render 3D. Hoàn tất nội dung công khai và CI trước khi gọi đây là bản phát hành; chốt dependency/preview, reduced motion và mobile thật trong lượt nghiệm thu cuối.
