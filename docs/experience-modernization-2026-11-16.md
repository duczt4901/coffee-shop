# Là Vườn Coffee — nhật ký triển khai trải nghiệm 16/11/2026

> Cập nhật theo yêu cầu ngày17/11: đã bỏ nút pause/play video và state/listener riêng của nó. Các mục F13/QA playback control bên dưới ghi lại lần nghiệm thu trước khi bỏ nút; bản hiện tại chỉ giữ autoplay theo visibility/reduced motion và poster fallback. Không coi pause control còn tồn tại trong bản hiện tại.

## Phạm vi và quyền quyết định

Tiếp tục audit Modern Web Guidance F1–F13; không audit lại toàn bộ, không deploy, không bật checkout, không phục hồi WebGL. Bảo toàn thay đổi có trước trong working tree.

- Mode A: giữ geometry, chữ, màu, responsive, scroll semantics, reveal và menu choreography đã duyệt; so cùng viewport/state/progress.
- Mode B: chỉ thêm phản hồi có mục đích cho menu, nút và giỏ; spec trước khi sửa, không spinner/delay giả cho thao tác đồng bộ.
- Trang chủ: giữ curtain 900ms, loading/handoff/logo/hero text như baseline. Không thêm transition owner cạnh tranh.
- `/cau-chuyen/`: hoãn F4/F9 và mọi tối ưu visual riêng; vẫn nghiệm thu navigation dùng chung.

## Phân công

| Agent | Phạm vi | Quyền ghi |
|---|---|---|
| Lead | Baseline/build, integration, shared disclosure/reveal, F6/F13, quyết định F5/F8/F10–F12 | Shared helper/runtime, test liên quan, ledger này |
| B | F1/F2/F3/F7 | Image/footer runtime, font, FAQ; tests accessibility/parallax |
| F | Motion và phản hồi thật | Menu/button CSS, product/cart/quantity controls; tests feedback |
| E | QA độc lập | scripts/experience-qa, output/experience-2026-11-16, báo cáo QA; không sửa app |

Không agent sửa ứng dụng trước khi baseline được chụp. Không build đồng thời trên cùng `.next/out`.

## Remediation tracker

| ID | Nội dung | Quyết định / trạng thái |
|---|---|---|
| F1 | Reduced motion ảnh/footer | Đã gate cả subscription/measurement; unit và QA browser đổi preference đạt |
| F2 | Montserrat preload thừa | Đã bỏ font không dùng; CSS artifact cuối không còn Montserrat, vẫn có Lexend/Cormorant. Không suy diễn số preload vì hai bundler khác nhau |
| F3 | FAQ React Lenis không có provider | Đã bỏ nhánh chết, giữ native scroll |
| F4 | Cache card geometry Câu chuyện | Hoãn theo yêu cầu redesign |
| F5 | Native dialog cho menu | KEEP: baseline focus/Escape/rapid toggle đã đạt; thay modality + native fallback không đủ lợi ích trong đợt polish. Không dựng thêm modal owner |
| F6 | Responsive ảnh | Đã tạo 320/640/960 + original cho 4 packshot WebP; native picture/srcset và sizes; bỏ preload original cạnh tranh. Giữ 3 ảnh ngang eager vì reload/scroll nhanh |
| F7 | FAQ semantics/native state | Đã sửa summary semantics và sync native toggle; unit + browser native toggle đạt |
| F8 | IO cho text reveal | Phát hiện bug thật: scope display:contents rect0×0 nên observer không fire. Đã observe child có box; giữ thuật toán trigger/stagger/footer clipping; H1 chỉ do PageReveal quản lý |
| F9 | Client boundary Câu chuyện | Hoãn theo yêu cầu redesign |
| F10 | CSS scroll timelines | Chưa áp dụng diện rộng; giữ một owner và fallback hiện có |
| F11 | View Transitions routing | Chưa thay router nếu không chứng minh parity; sửa lifecycle hiện tại trước |
| F12 | Content visibility blog | Hoãn: chưa có workload blog thật để xác minh |
| F13 | Người dùng pause video | Đã thêm control ngoài media aria-hidden; subscribe trạng thái media thật; user pause không bị visibility tự bật lại; poster/error SR giữ; reduced dùng poster |

## Experience enhancement backlog

| ID | Trước / cơ hội | Spec và tiêu chí chấp nhận |
|---|---|---|
| E1 | Hamburger/close chưa liên kết rõ với menu state | Dùng state hiện có; giữ drawer 400ms và text stagger; transform icon không dịch hitbox; reduced không spatial motion; rapid toggle/Escape/nav không kẹt |
| E2 | Add-to-cart phản hồi chung, giới hạn số lượng có thể gây hiểu nhầm | Phản hồi số lượng thật; lặp hành động announce lại được; không pending giả; clamp không báo thêm thành công khi không tăng; cart count chính xác |
| E3 | Phản hồi press giữa control chưa đồng bộ | Nhấn nhẹ, không đổi layout; focus-visible giữ rõ; reduced bỏ spatial transform; không thêm animation cho mọi text |
| E4 | Reveal các route thường cần kiểm tra owner/cleanup | Giữ home hoàn toàn; nonhome tránh chờ giả, duplicate H1 animation/overlay; điều hướng nhanh/history không khóa scroll hoặc để cover đè nội dung |

## Bằng chứng và tolerance

QA lưu baseline/post, computed animation state, geometry và screenshots trong `output/experience-2026-11-16/`. Tolerance phải xuất phát từ các lần baseline lặp; không lấy ngưỡng pixel/thời gian tùy ý. Filmstrip theo progress Animation API ưu tiên hơn wall-clock timeout. Emulation không được báo là điện thoại thật.

## Nhật ký

- Đã đọc directive mới và phân quyền ba agent B/F/E. Không có tiến độ remediation cũ được giả định đã hoàn tất.
- `pnpm.cmd build` không chạy được vì Corepack cần tải package manager, DNS trong sandbox thất bại; dùng script build tương đương qua npm đã cài, không cài dependency ứng dụng.
- Đang dựng baseline từ source hiện tại trước mọi thay đổi ứng dụng.
- Build baseline sandbox lỗi Google Fonts; build có quyền mạng gặp Turbopack worker CSS panic trước khi sửa source. Đã giữ snapshot bất biến `baseline-site` của export 14:44 ngày16/11; không gọi đó là fresh source build.
- QA E baseline18scenarios + probes, không pageerror; ba mẫu geometry cùng viewport có spread0 và bốn cặp PNG lặp diff0. Chứng minh F1/F7/MAX99 và display:contents IO bug thực.
- B hoàn tất F1/F2/F3/F7; F hoàn tất E1/E2/E3. Lead thêm native toggle sync, sửa observer anchor, một owner H1, gate editorial chờ reveal-done, F6 và F13. Không sửa visual riêng của Câu chuyện.
- Production Webpack build + TypeScript + static export đã đạt. Lựa chọn CLI build để chẩn đoán môi trường, chưa đổi default script/config/hosting. Baseline Turbopack và post Webpack làm số đo bundle/CPU có yếu tố nhiễu.
- QA phát hiện focus sau remove có thể vào link ảnh aria-hidden; F sửa selector và fixture. QA phát hiện source metadata thành flex item tạo gap12px; Lead đặt source display:none. Cả hai cần được nghiệm thu trên artifact cuối.
- Một helper legacy không phải React hook được đổi tên usePlaceholder→applyPlaceholderFallback để gỡ false-positive chặn lint; không đổi hành vi/khôi phục 3D.

## Motion specification / quyết định thiết kế

| Enhancement | Trigger / trạng thái | Duration / easing / thuộc tính | Accessibility / interruption / chi phí |
|---|---|---|---|
| E1 menu controls | menu open hiện có; hai nét ngang→X; close X cuối giữ geometry cũ | 400ms cubic-bezier(0.6,0,0.2,1); transform nét; drawer/text vẫn400/325ms | Không state machine mới, CSS reversal nhận toggle liên tiếp; reduced transition none; focus trap/lock owner cũ |
| E2 add/cart | mutation đồng bộ trả added/count thật; success/limit/error cụ thể; không pending giả | Phản hồi text ngay, live region aria-atomic; badge240ms ease-out scale1→1.2→1 | Không animate hydrate; animation trước bị cancel khi update nhanh; reduced không pulse; focus sau xóa vào control hữu dụng/CTA empty |
| E3 press/focus | pointer press trên control thật, hitbox/layout không thêm wrapper | translateY1px /120ms; focus ring2tone; không áp dụng cho mọi text | Chỉ spatial press khi no-preference; keyboard focus luôn rõ; không timer/reflow loop |
| E4 ordinary reveal | route arrival có cover và H1 entry; bỏ min450ms giả cho cold nonhome | Giữ fade600ms, H1 800ms delay100ms; reduced100ms. Editorial1600ms/stagger40ms/180ms bắt đầu khi reveal-done | Một owner H1; fail-safe/scroll-lock cleanup giữ. Home min450ms/curtain900ms/logo/text timeline không đổi |
| F13 video | button phản ánh native paused; explicit user pause/play | Không thêm animation, không layout shift, không loading giả | Button ngoài aria-hidden; sync native play/pause; rejection announce SR; reduced control hidden và poster; no fetch MP4 trong SSR |

Chấp nhận Mode A bằng geometry và controlled progress, không bằng một screenshot đang chạy transition. Restored editorial là sửa functional defect/Mode B, không giả vờ mọi frame giống baseline (baseline không chạy hiệu ứng này). Responsive ảnh phải giữ crop/aspect/geometry; final image pixels có thể khác vì encode/resample và không được lấy raw pixel noise để che layout drift.

## Hiệu năng và giới hạn đo

- Bốn packshot gốc tổng294.666byte; bản320 tổng36.974byte; bản640 tổng99.076byte. Đây là kích thước asset, không đồng nghĩa mọi viewport đều tải320 hoặc toàn trang giảm cùng tỷ lệ.
- Mẫu CPU×6 đầu tiên post có long-task/event timing xấu hơn baseline. Ba lượt baseline lặp có longtask1194/1381/926ms; ba lượt artifact cuối1297/1063/1015ms. Các khoảng chồng lấp và bundler khác nhau: chưa chứng minh cải thiện hoặc regression lặp lại về FPS/INP.
- Firefox/WebKit không có executable; không install thêm. Chrome headless157 + mobile emulation không phải xác minh điện thoại thật.

## Nghiệm thu hợp nhất A–H — 17/11/2026

### A. Bảo toàn trải nghiệm

**Đạt trong các trạng thái Chromium đã đo.** Home desktop1280×800 và mobile390×844 được lặp ba lần; geometry baseline spread0. Artifact cuối giữ geometry đã đo, vị trí pin, scrollY và slide matrices khi reload sâu trong section ngang. Curtain được khóa tại0/50/100% bằng Animation API:900ms, keyframes, logo rect/matrix khớp sau bỏ timestamp. Menu giữ drawer400ms, text325ms và stagger; không thay hitbox/navigation structure.

Không tuyên bố mọi frame/pixel giống tuyệt đối. Video control là bổ sung có chủ đích; reduced footer bỏ transform là sửa accessibility; ảnh responsive có resample; horizontal còn sai khác raster nhỏ dù cùng hash/geometry. Baseline là export có sẵn, không phải fresh build cùng bundler. Chính sách so sánh và toàn bộ delta được giữ trong báo cáo QA.

### B. Cải thiện motion và tương tác

Các thời lượng ở phần motion specification là thông số thiết kế/đo Animation API, không phải ngưỡng FPS hay dung sai tự đặt. Các thay đổi đều nhỏ, có thể revert theo nhóm file; không thêm dependency hoặc state machine animation thứ hai.

| Nhóm | Trước → sau / lợi ích | File ứng dụng chính | Nghiệm thu / hỗ trợ |
|---|---|---|---|
| E1 menu | Icon chưa nối trạng thái → hai nét chuyển thành X theo cùng state menu400ms; phản hồi nguyên nhân/kết quả rõ hơn | `C:/coffee-shop/src/components/layout/SiteHeader.module.css`, `SiteMenu.module.css`, `SiteMenu.tsx` | Rapid toggle, Escape, Tab, focus restore, history, reduced, mobile touch emulation đạt; giữ CSS transform fallback hiện có |
| E2 product/cart | Feedback có thể báo thành công khi cart đã99 → mutation trả số thêm thật và tổng thật; badge chỉ pulse khi count đổi | `C:/coffee-shop/src/components/commerce/useCart.ts`, `ProductPurchase.tsx`, `CartLink.tsx`, `CartPage.tsx`, `Commerce.module.css` | Add1+2=count3; MAX99 không báo thêm giả; localStorage bị chặn dùng memory; xóa giữ focus hữu dụng; live status; reduced không pulse |
| E3 press/focus | Một số control thiếu press/focus rõ → press1px/120ms và ring hai màu, không đổi layout | `C:/coffee-shop/src/components/ui/Button.module.css`, header/menu/commerce CSS trên | Không thêm wrapper/hitbox, keyboard focus không mất khi hover đổi màu; chỉ animate press khi no-preference |
| E4 ordinary reveal | Cold nonhome chờ tối thiểu450ms; editorial không khởi tạo → bỏ chờ giả, sửa observer; chỉ PageReveal sở hữu H1 | `C:/coffee-shop/src/lib/page-reveal-runtime.ts`, `src/components/ui/EditorialReveal.tsx`, `editorial-reveal-runtime.ts`, `src/lib/enhance-when-visible.ts` | FAQ cold/SPA/history có một H1 owner; text còn lại chỉ bắt đầu sau reveal-done; không hidden content/cover/lock sót |
| F13 video | Video tự chạy không có nút dừng → pause/play theo trạng thái native media; giữ ý định người dùng | `C:/coffee-shop/src/components/sections/home-page/HeroVideo.tsx`, `src/app/page.tsx` | Playback thật, pause qua viewport, lỗi play, accessible name, width nhãn, reduced và no-JS đạt; poster là fallback |

Chi phí mới: icon/press dùng CSS transform; badge một WAAPI240ms khi count đổi, hủy pulse cũ; media chỉ subscribe play/pause. Editorial nay thực sự chạy, do đó có công việc main-thread mà baseline lỗi đã không thực hiện. Không thể lấy việc sửa bug này làm bằng chứng tăng FPS. Browser thực chạy mới có Chromium; API/CSS có fallback hiện hữu không đồng nghĩa đã nghiệm thu Firefox/Safari.

Các candidate đã xem và **giữ nguyên**: quantity/khối lượng dùng control và router hiện có; dropdown không đổi thành widget mới; contact form không thêm spinner nếu chưa có request thật; image reveal giữ pattern hiện tại. Không thêm motion đại trà cho product cards/text để tránh nhiễu.

### C. Modernization DOM/CSS

- Giữ native `details/summary` của FAQ, bỏ heading trong summary nhưng giữ typography/trigger delay. Shared helper đồng bộ sự kiện native `toggle`, không chỉ click; cleanup cả RAF/timer/listener. Bỏ nhánh React Lenis không có provider.
- Wrapper editorial vẫn `display:contents`; observer theo child có box thật thay vì wrapper0×0. Không thêm layout wrapper làm đổi geometry. Loại H1 khỏi editorial để không cạnh tranh PageReveal.
- Responsive packshot dùng native `picture/source/srcset/sizes`; browser tự chọn, original là fallback. `source` explicitly display:none để metadata không tạo flex gap12px. Generator dùng Sharp đã cài, kiểm tra aspect/dimensions, chỉ tạo variant của bốn WebP thực dùng.
- Reduced motion không chỉ đặt transform0: không tạo scroll subscription/measurement của image/footer; đổi preference và unmount đều cleanup. Không phục hồi WebGL.
- Bỏ Montserrat không dùng. CSS cuối còn41 font-face cho Lexend/Cormorant và không còn Montserrat. Webpack artifact không xuất font preload HTML, manifest app rỗng; ghi nhận khác biệt bundler, không kết luận cải thiện font readiness/preload/LCP và chưa sửa cấu hình font ngoài phạm vi này.

Giữ custom menu, Lenis, routing, fixed pin và WAAPI vì thay bằng dialog/scroll-timeline/View Transitions chưa chứng minh parity với choreography/fallback hiện tại. Không thêm content-visibility khi chưa có workload blog thật. Đây là KEEP/defer có lý do, không báo là đã hiện đại hóa hết bằng API mới.

### D. Page reveal

**Shared:** chỉ cold nonhome bỏ min450ms; giữ arrival fade600ms và H1 entry800ms/delay100ms. Route vẫn reveal kể cả tài nguyên/cache nhanh. Editorial chuẩn bị dưới cover nhưng chỉ chạy sau `lavuon:reveal-done`; native no-JS không bị bỏ nội dung ẩn.

**Home:** không đổi min450ms, curtain900ms, keyframes/logo/hero text timeline; không áp generic H1 reveal thứ hai. Nút video ngoài media aria-hidden không làm thay parent hero geometry.

**Đi vào/ra home:** dùng routing/scroll-lock lifecycle cũ, không overlay owner mới. Menu đóng khi popstate; disclosure cleanup khi đóng/ngắt. QA rapid navigation/history, reload section ngang, JS chậm3s, network delay và no-JS xác nhận không còn cover/lock/inert sót trong chuỗi thử. Mẫu network là150ms/200000Bps, không gọi nó là đo mạng3G thật. Playback rejection có status và poster; chưa mô phỏng đầy đủ mọi HTTP failure của CDN/Worker.

### E. Product interaction

`add()` tính từ snapshot storage mới nhất qua validation/clamp hiện có, trả `{added,count}` từ cùng mutation. Vì đây là thao tác đồng bộ, không spinner/delay giả; CTA chỉ disabled trước khi giỏ sẵn sàng. Cả CTA chính và sticky dùng cùng action. Feedback hiển thị số thêm thật, giới hạn99 hoặc lỗi thật; live region có vùng cao tối thiểu để không đẩy layout. Badge không pulse do hydrate và không pulse khi count không đổi.

Xóa sản phẩm announce và chuyển focus sang button/input của dòng còn lại hoặc CTA giỏ trống; không chọn link ảnh aria-hidden. Memory fallback giữ giỏ khi storage bị chặn, không hứa tồn tại sau đóng phiên. Không thay logic WooCommerce, checkout, thanh toán hay production data.

### F. Bằng chứng số và validation

Tất cả đường dẫn dưới đây là trong `C:/coffee-shop/`; giữ cả first-post và final-post để không ghi đè bằng chứng phát hiện lỗi.

| Bằng chứng | Đường dẫn |
|---|---|
| Baseline bất biến / captures | `output/experience-2026-11-16/baseline-site/`, `baseline/results.json` |
| Capture cuối / tương tác | `output/experience-2026-11-16/final-post/results.json` và PNG cùng thư mục |
| Pixel diff và geometry | `output/experience-2026-11-16/final-comparison/comparison.json`, `final-comparison-settled/` |
| Controlled animation/heading | `output/experience-2026-11-16/final-curtain-probe/results.json`, `final-heading-probe/results.json` |
| No-JS / settled | `output/experience-2026-11-16/final-nojs-probe/results.json`, `final-settled-probe/results.json` |
| Performance/LoAF/CLS | `output/experience-2026-11-16/baseline-cpu-probe/results.json`, `final-cpu-probe/results.json` |
| Artifact identity | `output/experience-2026-11-16/final-artifact.json` |
| QA độc lập/cross-platform | `docs/experience-qa-2026-11-16.md` |
| Unit / lint / typecheck | `output/experience-2026-11-16/post-unit-tests.txt`, `lint.txt`, `typecheck.txt` |

Không có video recording/trace ZIP được tạo; các filmstrip là ảnh theo progress, animation state/computed styles/geometry/event timing nằm trong JSON, không giả gọi chúng là browser trace.

**Kết quả:**144/144 unit tests; ESLint scoped `src worker scripts/generate-image-placeholders.mjs`; TypeScript noEmit; style checker26CSS modules; static checker15HTML/10sitemap URLs đều đạt. QA cuối22/22 scenario, bốn probe, ba CPU runs,0pageerror. CPU×6 cuối total longtask1297/1063/1015ms; max event112/120/104ms; CLS loại recentInput0/0/0. Có shift rất nhỏ trong recentInput, không tuyên bố tuyệt đối không dịch chuyển. Đây không phải INP/CWV p75 người dùng thật.

**Build:** Webpack production/static export đã thành công. Turbopack mặc định vẫn panic ở PostCSS worker trước và sau source changes; không sửa script/config để che lỗi. Để tái lập artifact đã nghiệm thu, chạy các bước generate/check của build hiện có, sau đó:

```powershell
node node_modules/next/dist/bin/next build --webpack
node scripts/finalize-static-export.mjs
node scripts/check-static-export.mjs
```

Không thể ghi default `pnpm build` là đã đạt. Artifact cuối `out/index.html`10:18:44 ngày17/11 có SHA256 `d058052ebd841eb0f9154e818ebbfedcb0228aa9bb4ed4b5c77789caaded1e67`. Không thay package dependency, commit, push hoặc deploy trong đợt này.

### G. Multi-agent delivery

- **B:** reduced motion image/footer, font, FAQ semantics/nhánh Lenis; unit và browser preference/native checks. Hoàn tất F1/F2/F3/F7 trong ownership đã giao.
- **F:** menu icon/press/focus, cart mutation result/feedback/pulse và focus after remove. Sửa finding độc lập chọn nhầm link ảnh sau xóa; không tự đổi shared reveal.
- **E:** snapshot, harness, calibration,22scenario, controlled probes/diff và CPU runs; chỉ ghi QA scripts/output/docs, không sửa app. Phát hiện editorial wrapper0×0, focus aria-hidden và responsive12px drift. Các lỗi đã sửa và QA lại artifact cuối.
- **Lead:** integrated helper/reveal/observer, F6/F13, typography/image artifact check, build/static/unit/lint, phân biệt ModeA/B và quyết định KEEP/defer. Không agent build cạnh tranh `.next/out`; các phép đo CPU cuối chạy tuần tự.

### H. Verdict cuối

| Câu hỏi | Kết luận |
|---|---|
|1. Mượt/nhanh hơn ở đâu? | Ordinary cold route bớt450ms chờ giả; feedback đồng bộ chính xác hơn; packshot có nguồn nhỏ hơn. Chưa chứng minh FPS/INP tổng thể tốt hơn |
|2. Trải nghiệm quan trọng được giữ? | Có ở geometry/scroll/menu và controlled curtain states đã đo; không khẳng định mọi pixel/frame |
|3. Visual nào cố ý thêm? | Hamburger↔X, press/focus, badge pulse và video pause; restored editorial nay bắt đầu sau reveal |
|4. Feedback nào tốt hơn? | Add/limit/error/count, focus sau remove, native FAQ state, playback failure |
|5. Shared reveal đáng tin hơn? | Observer chạy đúng, một H1 owner, không reveal text xong sau cover; chuỗi history/rapid đã thử đạt |
|6. Home custom reveal còn nguyên? | Có;900ms/keyframes/logo tại0/50/100% khớp baseline |
|7. Animation nào bỏ qua? | Spinner giả, delay giả nonhome, motion đại trà, generic reveal phủ home; không thêm spring/transition framework |
|8. Trùng lặp nào gỡ? | Owner H1 cạnh tranh được ngăn, nhánh Lenis chết và Montserrat thừa bỏ; giữ một state/lock owner hiện có |
|9. Regression còn? | Không còn functional/layout finding mở trong states đã đo. Default Turbopack build và khác biệt font preload/bundler vẫn là giới hạn chưa xử lý, không được coi full production-ready |
|10. Chưa xác minh thật? | Firefox/WebKit, Safari/Chrome iOS, mobile yếu thật, toolbar/rubber-banding, Worker/CDN/API, RUM/CWV p75; Câu chuyện visual F4/F9 hoãn |

**Quyết định giao:** hoàn tất remediation/polish đã chọn và có artifact Chromium kiểm chứng để review. Chưa chứng nhận toàn hệ thống sẵn sàng production; chưa deploy.

## Bản đồ file để đối chiếu code

- Menu/state/history: [SiteHeader.tsx](C:/coffee-shop/src/components/layout/SiteHeader.tsx), [SiteHeader.module.css](C:/coffee-shop/src/components/layout/SiteHeader.module.css), [SiteMenu.tsx](C:/coffee-shop/src/components/layout/SiteMenu.tsx), [SiteMenu.module.css](C:/coffee-shop/src/components/layout/SiteMenu.module.css).
- Product/cart feedback: [useCart.ts](C:/coffee-shop/src/components/commerce/useCart.ts), [ProductPurchase.tsx](C:/coffee-shop/src/components/commerce/ProductPurchase.tsx), [CartLink.tsx](C:/coffee-shop/src/components/commerce/CartLink.tsx), [CartPage.tsx](C:/coffee-shop/src/components/commerce/CartPage.tsx), [Commerce.module.css](C:/coffee-shop/src/components/commerce/Commerce.module.css), [Button.module.css](C:/coffee-shop/src/components/ui/Button.module.css).
- Reveal/FAQ: [page-reveal-runtime.ts](C:/coffee-shop/src/lib/page-reveal-runtime.ts), [EditorialReveal.tsx](C:/coffee-shop/src/components/ui/EditorialReveal.tsx), [editorial-reveal-runtime.ts](C:/coffee-shop/src/components/ui/editorial-reveal-runtime.ts), [enhance-when-visible.ts](C:/coffee-shop/src/lib/enhance-when-visible.ts), [useEnhancedDisclosure.ts](C:/coffee-shop/src/components/ui/useEnhancedDisclosure.ts), [FaqContent.tsx](C:/coffee-shop/src/app/faq/FaqContent.tsx).
- Reduced motion/font: [image-reveal-runtime.ts](C:/coffee-shop/src/components/ui/image-reveal-runtime.ts), [footer-parallax-runtime.ts](C:/coffee-shop/src/components/layout/footer-parallax-runtime.ts), [font.ts](C:/coffee-shop/src/styles/font.ts).
- Responsive image: [SkeletonImage.tsx](C:/coffee-shop/src/components/ui/SkeletonImage.tsx), [catalog](C:/coffee-shop/src/app/san-pham/page.tsx), [generator](C:/coffee-shop/scripts/generate-image-placeholders.mjs), [manifest](C:/coffee-shop/src/data/responsive-images.json).
- Video control: [HeroVideo.tsx](C:/coffee-shop/src/components/sections/home-page/HeroVideo.tsx), [home](C:/coffee-shop/src/app/page.tsx).
- Lint callback rename, không đổi behavior: [LocalCoffeeModel.tsx](C:/coffee-shop/src/components/experience/coffee-bag/LocalCoffeeModel.tsx).

Danh sách này chỉ mô tả phạm vi đợt tích hợp; diff Git còn chứa thay đổi người dùng có trước. Không gán toàn bộ working tree cho đợt này.
