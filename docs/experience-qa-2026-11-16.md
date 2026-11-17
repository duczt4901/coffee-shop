# QA trải nghiệm — 16/11/2026

## Phạm vi và công cụ

Agent E kiểm tra độc lập bản export trước/sau thay đổi, không sửa source ứng dụng. Script dùng Playwright, pngjs và pixelmatch đã có trong runtime Codex; không thêm dependency ứng dụng. Browser headless riêng, không dùng profile hoặc tab Chrome của người dùng.

- Chromium: Chrome cài trên máy, phiên bản launch đã xác minh `157.0.8103.51`.
- Firefox/WebKit: thiếu executable trong cache Playwright; chưa kiểm tra, không tự cài.
- Mobile: viewport/touch emulation của Chromium trên Windows; không phải điện thoại thật hoặc Safari.
- Server QA: chỉ GET/HEAD đọc static export, có byte ranges cho media; không thay thế Worker/CDN production.
- Ảnh so sánh Mode A dùng poster video cố định bằng cách chặn MP4 ở context kiểm thử, tránh nhiễu khung hình video; không sửa ứng dụng. Không dùng lượt này để kết luận hiệu năng decode video.

## Tái lập

Sau khi lead cung cấp export baseline bất biến:

```powershell
node scripts/experience-qa/run.mjs output/experience-2026-11-16/baseline-site baseline
```

Sau build tích hợp:

```powershell
node scripts/experience-qa/run.mjs out post
node scripts/experience-qa/compare.mjs
```

Đợt nghiệm thu cuối dùng phase riêng để giữ bằng chứng first post:

```powershell
node scripts/experience-qa/run.mjs out final-post
node scripts/experience-qa/run.mjs out final-heading-probe
node scripts/experience-qa/run.mjs out final-curtain-probe
node scripts/experience-qa/run.mjs out final-settled-probe
node scripts/experience-qa/run.mjs out final-nojs-probe
node scripts/experience-qa/run.mjs out final-cpu-probe
node scripts/experience-qa/compare.mjs baseline final-post final-comparison
node scripts/experience-qa/compare.mjs baseline-settled-probe final-settled-probe final-comparison-settled
```

Khi so hiệu năng CPU, chạy riêng sau khi các browser/probe/diff khác đã hoàn tất; tránh để công việc QA cạnh tranh CPU với phép đo.

Các lệnh cần quyền launch browser headless và bind loopback nếu sandbox chặn. Tất cả output nằm dưới `output/experience-2026-11-16/`. Không chạy `playwright install`, không deploy và không commit.

## Chính sách so sánh

Mode A giữ geometry, typography, scroll pin và choreography. Trang chủ được chụp lặp ba lần ở desktop 1280×800 và mobile 390×844 để ghi min/max biến thiên thực tế; không tự đặt ngưỡng pixel cho cả site. Các trạng thái khác báo toàn bộ delta để engineering review. Menu giữa animation dùng cùng clock `drawer.duration/2` cho mọi transition, giữ delay/stagger; không lấy ảnh theo thời gian sleep tùy ý.

Pixel diff dùng exact RGBA, có ảnh chênh lệch, không biến tỷ lệ pixel thành điểm thẩm mỹ. Thay đổi icon và phản hồi control có spec được đánh giá Mode B; không coi mọi pixel khác là regression.

Assertions ưu tiên trạng thái (aria/inert, active element, cart count, route, lock cleanup, Animation API timing) thay vì thời gian wall-clock. Event Timing và long tasks được lưu làm mẫu lab, không gọi là INP p75 hoặc chứng minh máy yếu thật.

## Baseline đã thu thập

Snapshot `output/experience-2026-11-16/baseline-site` giữ export đã có từ 14:44 ngày 16/11/2026. Build baseline mới bị chặn bởi fetch Google Fonts rồi lỗi xử lý CSS của tiến trình build escalated; vì vậy đây là bằng chứng trải nghiệm của artifact có sẵn, không phải xác nhận source hiện tại build đạt.

Harness hoàn tất 18 kịch bản thu thập với 0 lỗi pageerror. Các case baseline về reduced motion, native toggle và MAX99 cố ý chỉ ghi nhận trạng thái để chứng minh defect; không gọi trạng thái lỗi đó là nghiệm thu đúng.

| Mẫu | Kết quả baseline |
|---|---|
| Home desktop ba lượt | Document height 11886px, header101px, H1 geometry giống hệt cả ba lượt |
| Home mobile ba lượt | Document height11794px, header73px, H1 geometry giống hệt cả ba lượt |
| Menu desktop/mobile | Có transition entry;400ms drawer,325ms text với stagger; Escape/Tab/rapid reopen và restore focus/lock đạt |
| Section ngang reload | Pin, scrollY, stage top và slide transforms giữ nguyên trước/sau reload cả hai viewport |
| Product/cart | Add1 rồi add2 → count3; update và remove được; memory fallback hoạt động |
| Native FAQ sau hydrate | `open=true`, `aria-expanded=false`, answer `inert=true`: xác nhận F7 |
| Giỏ đã99 | Cart vẫn99 nhưng status cũ báo thêm thành công: xác nhận lỗi feedback |
| Reduced motion | ImageReveal và footer vẫn transform; video pause |
| No-JS | Native FAQ và menu mở được |
| CPU×6 / JS chậm | Reveal kết thúc, menu còn dùng được, không khóa scroll sau hoàn tất trong mẫu này |
| Smoke320px | Các route đã thử không tràn ngang; blog404 do CMS tắt |

### Phát hiện độc lập: display:contents làm editorial reveal không khởi tạo

Probe cold-load FAQ và SPA cho thấy wrapper editorial có `display:contents`, bounding box0×0 và IntersectionObserver báo `isIntersecting=false` trong khi header con đang hiển thị (desktop child1164.8×188.14px ởy96). Runtime editorial không được tải, H1 còn nguyên text không split và không có pending target.

Trong artifact baseline, Animation API chỉ ghi H1 của page reveal800ms/delay100ms; không xác nhận được hai animation owner đồng thời vì editorial hiện không chạy. Khi sửa observer, cần tránh tạo duplicate owner mới cho H1 arrival. Bằng chứng: `output/experience-2026-11-16/heading-probe/results.json`.

Probe còn ghi404 của các request prefetch segment `__next.<route>.__PAGE__.txt`; snapshot có `_full/_tree/index.txt`. Navigation vẫn phục hồi thành công. Không nhầm các request này với lỗi tải dynamic JS runtime.

## Post build 09:52 ngày 17/11/2026

Lead cung cấp export production bằng Webpack sau khi build/finalize thành công; đường build Turbopack mặc định bị lỗi môi trường worker. Khác bundler là biến gây nhiễu khi so bootstrap timing với baseline cũ. Không diễn giải số đo này thành chứng nhận build Turbopack hay tốc độ production.

Full harness: **22/22 kịch bản đạt, 0 pageerror**. Hai probe ownership/curtain và hai targeted settled probes cũng hoàn tất. Bằng chứng chính: `post/results.json`, `post-heading-probe/results.json`, `post-curtain-probe/results.json`, `comparison/comparison.json`.

| Kiểm tra | Kết quả thực đo |
|---|---|
| Home desktop/mobile, ba lượt | Toàn bộ geometry được đo giữ nguyên so baseline; pixel khác chỉ trong vùng control video mới |
| Curtain tại 0/50/100% | 900ms, clip-path, logo rect/matrix và toàn bộ keyframes/timing giống baseline chính xác sau bỏ timestamp |
| Menu | Drawer400ms, text325ms/stagger giữ; hai nét hamburger400ms; Escape/Tab/focus restore/rapid reopen không để lock/inert |
| Horizontal và reload sâu | ScrollY, pin, stage top và slide matrices trước/sau reload giống nhau ở desktop/mobile |
| FAQ và history | Route cover opacity0; không lock/inert; H1 mỗi arrival chỉ có PageReveal800ms/delay100, không owner editorial thứ hai |
| Editorial observer | Nay runtime chạy thật trên FAQ; H1 không bị split. Các text khác có animation1600ms/stagger40ms |
| Reduced motion | ImageReveal/footer transform none; đổi preference về normal rồi reduce gỡ transform đúng; video dừng |
| Native/no-JS | FAQ/menu native dùng được; native FAQ toggle sau hydrate đồng bộ aria-expanded/inert |
| Add/cart | Add1 rồi add2 cho count3, đúng hai badge pulses240ms; status số lượng thật, status24px và hero không resize |
| MAX99/storage | Không tăng số lượng thì không báo thêm thành công; localStorage bị chặn vẫn dùng giỏ bộ nhớ phiên |
| Focus sau xóa | Giỏ trống focus CTA; xóa dòng đầu của giỏ hai dòng focus control của dòng còn lại, không focus vùng aria-hidden |
| Responsive ảnh | Chrome chọn nguồn640w ở hai viewport; crop và main product media rect giữ nguyên |
| Playback thật | Autoplay có currentTime>0; pause/play đổi label đúng; rời và trở lại viewport giữ pause người dùng; reduce dừng và ẩn control |
| Playback bị từ chối | Nhãn giữ “Phát video”, poster còn, SR status báo lỗi thật, không khóa trang |
| Mạng/JS/320px | JS trễ3s và mạng150ms/200000Bps vẫn đến trạng thái dùng được; các route smoke không tràn ngang; blog404 giống baseline khi CMS tắt |

Các ảnh Mode A chặn MP4 để so poster tĩnh; playback dùng context riêng không chặn video. Viewport mobile cố định không tái hiện thanh địa chỉ Chrome iOS co giãn hoặc rubber-banding trên điện thoại thật.

### Finding độc lập trong tích hợp

Selector focus sau xóa giỏ ban đầu chọn nhầm link ảnh `aria-hidden=true`, `tabindex=-1` ở dòng còn lại. Agent F đổi selector sang button/input cho dòng sản phẩm, giữ link cho CTA trống; browser case hai dòng đã xác nhận fix.

Targeted settled comparison phát hiện responsive `<picture style="display:contents">` làm thumbnail ở sticky product bar lệch **12px** ở cả desktop/mobile, dù main product media và các geometry tổng thể giữ nguyên. Desktop x57.59375→69.59375; mobile16→28. Đây là drift ngoài spec Mode B, không được coi là enhancement. Lead sửa `<source>` thành `display:none`; kết quả kiểm tra lại artifact cuối ở phần nghiệm thu bên dưới.

Caption horizontal sau chờ finite CSS transitions có rect, transform, opacity và các child rect giống baseline chính xác. Các ảnh horizontal là cùng file hash; vẫn có khác biệt pixel raster/composite nhỏ (mobile mỗi channel tối đa2 mức; desktop phần lớn1 mức), nên không gọi pixel-equivalent tuyệt đối. Screenshot baseline ban đầu còn caption transition, không dùng ảnh đó kết luận caption regression. Bằng chứng ổn định riêng nằm ở `baseline-settled-probe`, `post-settled-probe`, `comparison-settled`.

### CPU×6: có đo, chưa chứng minh nhanh hơn

Một lượt full post có longtask tổng3506ms, tệ hơn lượt baseline1391ms. QA lặp lại ba lần tuần tự, có LoAF attribution:

| Mẫu CPU×6 | Tổng longtask ba lượt (ms) | Max event duration ba lượt (ms) |
|---|---|---|
| Baseline | 1194 /1381 /926 | 112 /160 /128 |
| Post09:52 | 959 /1150 /1255 | 168 /152 /192 |

Các khoảng longtask chồng lấp; mẫu xấu3506ms không lặp lại. Chưa đủ để claim gain hoặc regression về INP. Hotspot LoAF post gồm Webpack bootstrap365–406ms, React scheduling108–175ms, một lượt page-reveal95.6ms với forced style/layout82.5ms. Baseline dùng bundler khác. Post có CLS nhỏ lặp lại0.0012678 so baseline0; chưa có attribution ở lượt đầu. Dữ liệu này là lab n3 trên desktop throttle, không đại diện phân phối thiết bị thật, không phải CWV p75.

Bằng chứng: `baseline-cpu-probe/results.json`, `post-cpu-probe/results.json`. Lead còn dành sẵn chiều rộng hai nhãn video bằng hai span cùng grid cell để tránh shift khi đổi play/pause. Harness đã thêm assert accessible name, width ổn định và CLS source attribution; kết quả artifact cuối ở phần dưới.

## Nghiệm thu cuối — export 10:18:44 ngày17/11/2026

**22/22 kịch bản full suite đạt, 0 pageerror; bốn probe riêng đạt; ba lượt CPU riêng đạt.** Các process browser/server QA đã đóng sau khi lưu bằng chứng. Không commit/deploy hoặc chỉnh app source trong quá trình QA.

- Fix layout responsive đã được xác nhận: thumbnail sticky bar desktop x57.59375 và mobile x16, rect44×44 giống baseline chính xác; `<source>` computed `display:none`, không tạo flex gap. Caption horizontal rect/transform/child opacity giữ đúng khi đo cùng trạng thái ổn định.
- Editorial FAQ chỉ chạy khi reveal state đã `done`; H1 vẫn một owner PageReveal mỗi arrival,800ms/delay100. Không phát hiện cover che route, scroll lock hay inert còn sót trong menu/navigation/history đã thử.
- Curtain trang chủ tại 0/50/100% giữ toàn bộ keyframes, timing900ms, logo rect/matrix giống baseline sau bỏ timestamp. Không suy rộng phép đo ba mốc thành kiểm chứng mọi frame/GPU trên mọi máy.
- Nút video có accessible name đúng cho từng trạng thái, pause/play giữ nguyên width. Context playback thật xác nhận currentTime tăng và user pause được giữ khi rời/trở lại viewport. No-JS home ẩn control và vẫn hiển thị H1; reduced motion dừng video/ẩn control.
- Add feedback, MAX99, memory fallback, badge pulse, native FAQ và focus sau remove vẫn đạt sau build cuối. Các route smoke320px không tràn ngang; blog vẫn404 đúng trạng thái CMS tắt giống baseline.

Ba lượt cuối CPU×6 chạy tuần tự, không chạy browser/probe/diff khác đồng thời:

| Lượt | Tổng longtask (ms) | Max longtask (ms) | Max event duration (ms) | CLS loại recentInput |
|---|---|---|---|---|
|1|1297|497|112|0|
|2|1063|451|120|0|
|3|1015|423|104|0|

Vẫn ghi nhận shift rất nhỏ khoảng0.00075 trong cửa sổ `hadRecentInput=true`, gồm text brand và một node browser không expose; phép tính CLS loại đúng các entry này. **CLS0 trong ba lượt không có nghĩa là trang không bao giờ dịch chuyển**, cũng không thay thế dữ liệu người dùng thật. Chưa có bằng chứng để tuyên bố tốc độ cải thiện so baseline khác bundler.

So sánh21 ảnh và4 ảnh ổn định có JSON cùng PNG diff tại `final-comparison` và `final-comparison-settled`. Home giữ geometry trong vùng baseline calibration0; pixel thay đổi chủ yếu là control video mới, có ít khác biệt raster ở mép phải mobile. Các delta geometry chính khác là icon hamburger Mode B và reduced footer bỏ parallax theo F1. Font fallback list khác giữa hai bundler được ghi lại, không che khỏi dữ liệu. Không tuyên bố toàn site pixel-equivalent tuyệt đối.

Trong phạm vi Chromium headless và các trạng thái đã đo, **không còn regression chức năng/layout được xác định mà chưa xử lý**. Chưa kiểm tra Firefox/WebKit, Safari/Chrome iOS hoặc thiết bị mobile thật, toolbar co giãn/rubber-banding, Worker API/CDN production, RUM/CWV p75. Chưa nghiệm thu riêng visual/performance `/cau-chuyen/` ngoài navigation/smoke chung như phạm vi đã hoãn.
