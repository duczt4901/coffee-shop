# Frontend CSS-first và native scrolling — 10/11/2026

Phạm vi: frontend trong `C:/coffee-shop`, tính từ trạng thái làm việc đầu yêu cầu này. Các thay đổi bỏ GSAP/Lenis và xóa component ở yêu cầu trước được giữ nguyên, không tính thành kết quả mới. Không sửa backend, commerce, dữ liệu, SEO hoặc triển khai.

Hai quyết định đã được người dùng xác nhận: giữ wheel/touchpad native; cho phép hiện scrollbar trình duyệt trước hydration hoặc khi custom scrollbar không khởi tạo được.

Trong lúc kiểm tra, người dùng bổ sung hai thay đổi giao diện: hover link phải rõ hơn; footer và khung reveal phải phủ đủ chiều ngang, footer cao tối thiểu bằng màn hình và nội dung không để khoảng trống cuối do parallax. Đây là ngoại lệ UI đã được yêu cầu trực tiếp, không áp dụng chính sách giữ nguyên cho hai phần này.

## A. CSS-First Assessment

Next App Router/React đang kết hợp Tailwind, 19 CSS Modules, Web Animations API, CSS sticky và các callback cuộn native. GSAP/Lenis đã vắng khỏi mã ứng dụng và manifest trước khi bắt đầu đợt này.

Layout, breakpoint, trạng thái hover/focus, phần lớn transition và sticky đã thuộc CSS. Những phép tính camera/khung hình 3D, nội suy SVG, phối hợp slideshow và trạng thái hướng cuộn header có trách nhiệm cụ thể. Chuyển toàn bộ chúng sang CSS sẽ cần fallback song song hoặc đổi cách thể hiện; chưa có bằng chứng rằng hệ thống sẽ đơn giản hơn.

Hai phần thừa rõ nhất là context của loader đã bỏ và dependency React Spring không có nơi sử dụng. Scrollbar custom còn đo lại kích thước trên mọi sự kiện cuộn, dù kích thước chỉ cần cập nhật khi layout đổi.

## B. Over-Engineering Findings

| Phát hiện và tham chiếu | Phân loại | Giải pháp / lợi ích | Rủi ro và quyết định |
|---|---|---|---|
| `ExperienceRuntime` giữ state, context, pathname, callback và memo nhưng `started` luôn true; bảy consumer chỉ đọc giá trị này | Unnecessary/dead | Xóa provider; bỏ nhánh hằng true; đưa nguyên phần tử đo `100svh` vào [layout](C:/coffee-shop/src/app/layout.tsx:43) | Thấp sau kiểm chứng biến đổi nguồn và UI. **Remove** |
| [PageScrollbar](C:/coffee-shop/src/components/layout/PageScrollbar.tsx:11) đọc viewport/document height và ghi thumb height mỗi scroll | Accidental | Tách đo geometry sang resize/ResizeObserver; scroll chỉ đồng bộ tiến độ và ARIA | Layout động có thể làm cache cũ; đã kiểm tra accordion/resize và unit test. **Simplify** |
| Hai dependency React Spring trong [manifest](C:/coffee-shop/package.json) nhưng không được import trong ứng dụng | Unnecessary/dead | Gỡ hai root và bảy package chỉ phục vụ subtree đó khỏi lockfile | Không đổi resolution/integrity của package khác. **Remove**; không suy diễn rằng bundle trước đó đã chứa chúng |
| [Scrollbar CSS](C:/coffee-shop/src/styles/globals.css:33) trước đây ẩn scrollbar native kể cả khi custom chưa sẵn sàng | Accidental coupling | Chỉ ẩn khi có `data-custom-scrollbar`; custom mặc định hidden; lỗi setup trả về native | Có thể thay đổi gutter trước hydration. **Simplify**, đã được duyệt riêng |
| Footer ngắn hơn viewport nhưng parallax chỉ kết thúc khi boundary top chạm 0 | Accidental sizing mismatch | CSS min-height theo viewport và phân bố flex hiện có; không thêm JS để vá điểm cuối | Footer tăng theo content trên màn hình thấp; đã đo full width và điểm cuối. **Simplify**, theo yêu cầu mới |
| Underline đặt trên label chứa các word/mask inline-block | Accidental presentation | Underline ngay word span, tăng border opacity và dịch SVG theo X | Chỉ hover/focus đổi; reduced motion giữ cue tĩnh. **Simplify**, theo yêu cầu mới |
| [native-motion](C:/coffee-shop/src/lib/native-motion.ts) chia sẻ RAF và ResizeObserver giữa các hiệu ứng | Justified engineering | Giữ một lượt cập nhật theo sự kiện; không có vòng RAF chạy khi idle | Viết thêm framework observer không đem lại lợi ích rõ ràng. **Keep** |
| [EditorialReveal](C:/coffee-shop/src/components/ui/EditorialReveal.tsx), [ImageReveal](C:/coffee-shop/src/components/ui/ImageReveal.tsx), [footer](C:/coffee-shop/src/components/layout/SiteFooter.tsx) | Justified engineering | Giữ timing, easing, threshold, once/focus behavior và cleanup của reveal; sửa sizing footer bằng CSS theo yêu cầu mới | CSS timeline/IntersectionObserver thay thế có thể khác ngưỡng và lifecycle. **Keep** coordination |
| [Header](C:/coffee-shop/src/components/layout/SiteHeader.tsx) có trạng thái hướng cuộn và đo logo | Justified engineering | CSS tiếp tục xử lý layout; JS xử lý hướng cuộn và kích thước chuyển động thực tế | Chuyển sang CSS thuần chưa chứng minh tương đương. **Keep** |
| [Camera/render loop](C:/coffee-shop/src/components/experience/coffee-bag/LocalCoffeeModel.tsx), [bản đồ](C:/coffee-shop/src/components/sections/home-page/CoffeeOriginSection.tsx), [slideshow](C:/coffee-shop/src/components/sections/home-page/CoffeeProcessSlideshow.tsx) | Essential cho thiết kế hiện tại | Giữ tính toán và renderer; chỉ bỏ gate loader hằng true ở consumer | Cao nếu thay thuật toán/scroll range. **Keep** |

Không thêm cache hình học cho bản đồ, observer mới hoặc abstraction mới chỉ để giảm số dòng. Không hợp nhất các listener có thời điểm đồng bộ khác nhau khi chưa chứng minh được tương đương.

## C. CSS vs JavaScript Decision Matrix

| Area | Current implementation tại baseline | Preferred approach | Benefit | Risk | Decision |
|---|---|---|---|---|---|
| Wheel, touchpad, touch | Native document scroll | Giữ native | Giữ momentum/input của browser, không double-smooth | Cảm giác phụ thuộc thiết bị | Keep |
| FAQ programmatic scroll | `scrollIntoView` với smooth/instant theo reduced motion | Giữ API native tường minh | Không tác động restoration toàn document | Easing/thời lượng do browser chọn | Keep |
| Anchor `#bo-suu-tap` | Native/Next hash navigation | API smooth tại `onNavigate`, router `scroll: false` | Một lần cuộn; giữ URL/focus/history | Cần test Back và reduced motion | Implement |
| Smooth CSS toàn document | Chưa có | Không đưa thử nghiệm vào bản cuối | Tránh regression Back đã quan sát | Phải giữ lựa chọn API ở nơi thực sự cần | Reject experiment |
| Layout / sticky | CSS Grid, Flexbox, media query, sticky | Giữ CSS | Không thêm đo layout bằng JS | Breakpoint cũ còn lỗi riêng | Keep |
| Loader runtime | Context/state luôn true | Bỏ provider và branch thừa | Giảm coupling lúc mount | Giữ nguyên viewport marker | Remove |
| Scrollbar geometry | Đo và ghi height mỗi scroll | Đo khi resize/layout đổi | Giảm DOM reads/writes lặp lại | Cache phải cập nhật đúng | Simplify |
| Scrollbar availability | Native bị ẩn vô điều kiện | CSS opt-in sau setup | Có fallback khi thiếu/lỗi JS | Gutter lúc tải, đã duyệt | Implement |
| Footer và reveal frame | Footer content-height, viewport scrub | CSS min-height 100dvh, width 100%, flex phân bố content | Hết khoảng hụt Y, reveal đủ chiều ngang | Màn hình thấp cần scroll content cao hơn | Implement |
| Hover border link | Underline trên label | CSS trực tiếp word/border/SVG, X=3px và Y=0 | Cue rõ, không thêm JS | Chuyển động được bỏ khi reduced motion | Implement |
| Animation / 3D | WAAPI, CSS transition, JS interpolation, demand rendering | Giữ trách nhiệm hiện tại | Bảo toàn thiết kế | CSS thay thế chưa đủ bằng chứng | Keep |

## D. Smooth Scrolling Architecture

1. Nền tảng vẫn là scroll thật của document và `window.scrollY`. Không transform toàn trang, không tạo virtual scroll và không thay `history.scrollRestoration`.
2. Người dùng chọn ưu tiên native wheel. Vì vậy không thêm wheel listener, không `preventDefault` wheel/touch, không nhận diện chuột bằng heuristic delta và không thêm physics engine.
3. CSS `scroll-behavior: smooth` không làm mượt wheel/touchpad; easing và thời lượng của CSS/native smooth thuộc browser. Đây là giới hạn nền tảng, không thể cam kết cảm giác Lenis trên mọi thiết bị. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-behavior), [WheelEvent](https://w3c.github.io/uievents/#interface-wheelevent).
4. FAQ vốn đã gọi `scrollIntoView({behavior: reduced ? "instant" : "smooth"})`. Bản cuối giữ đúng API đó. RevealLink chỉ bổ sung `onNavigate` cho hash có target thực: Next router giữ URL/history với `scroll: false`, browser thực hiện một lần `scrollIntoView`. Không tự viết history hoặc focus manager. Link trang khác, bare `#` và target không tồn tại tiếp tục navigation mặc định. Modifier/new-tab behavior thuộc Next `onNavigate`; HTML vẫn giữ nguyên href khi JS tắt. Keyboard, scrollbar drag và các thao tác cuộn khác giữ hành vi cũ.
5. Đã thử CSS smooth toàn document kèm flag `data-scroll-behavior="smooth"` theo tài liệu Next 16. Khi Back về home, một lượt thử trả về y=10518 thay vì vị trí gần cuối trang. Lượt đối chứng `auto` khôi phục đúng y=11705. Chưa quy kết toàn bộ nguyên nhân cho CSS hay tải chiều cao 3D, nhưng bằng chứng không đủ để giữ thay đổi toàn cục. Rule, flag và lần đơn giản hóa FAQ dựa vào rule này đều đã được bỏ. Không viết một bộ quản lý restoration mới để bù cho thử nghiệm.
6. Scrollbar custom là enhancement riêng: HTML ban đầu giữ nó hidden; CSS không ẩn scrollbar browser. Sau khi observer, listener và geometry setup thành công mới bật attribute ẩn scrollbar native.
7. Thiếu ResizeObserver, lỗi constructor hoặc lỗi observe đều giữ native. Cleanup disconnect observer, gỡ listener, xóa attribute và ẩn custom. Không ghi `overflow: hidden` trong enhancement này.
8. Không có RAF/animation loop mới. Các hiệu ứng cũ vẫn dùng callback sự kiện và demand loop. Unit test mô phỏng 100 scroll: scrollbar đọc geometry một lần và ghi height một lần ở setup; cập nhật layout vẫn đo lại. Đây là phép kiểm tra số thao tác, không phải benchmark FPS/latency trên máy thật.
9. Không có nhánh nhận diện Windows. Browser thiếu API được dùng native. Độ tin cậy trên Windows 10 thật vẫn cần kiểm thử phần cứng/driver; chưa có dữ liệu để cam kết.
10. Menu hiện có một owner của overflow lock, khôi phục giá trị cũ khi cleanup và đóng khi sang desktop. Đã kiểm tra mở/đóng và resize. Việc ứng dụng JS chết trong lúc menu đang mở là hạn chế riêng của menu hiện tại; scrollbar fallback không tự sửa mọi lỗi overlay.

## E. Changes Implemented

- **Xóa runtime loader không còn dùng:** xóa `C:/coffee-shop/src/components/experience/ExperienceRuntime.tsx`; sửa [layout](C:/coffee-shop/src/app/layout.tsx) và bảy consumer nêu ở B. Phần tử đo viewport giữ nguyên thuộc tính/class và thứ tự DOM. Phần rút gọn context được kiểm tra với phép biến đổi xác định trước; preset reveal không đổi. Ngoại lệ có chủ đích: RevealLink thêm anchor smooth và footer thêm class sizing theo hai yêu cầu đã được phép.
- **Tối ưu scrollbar:** [PageScrollbar](C:/coffee-shop/src/components/layout/PageScrollbar.tsx) tách geometry/progress. Không đổi công thức thumb, ARIA, khoảng cuộn bàn phím hoặc pointer capture. Kiểm tra trực tiếp sau accordion mở cho geometry đúng với document mới.
- **Fallback đã được duyệt:** [globals.css](C:/coffee-shop/src/styles/globals.css:33) chỉ ẩn scrollbar native khi custom đã sẵn sàng; setup/cleanup ở PageScrollbar có rollback. JS tắt vẫn cuộn bằng wheel, Home và kéo scrollbar native.
- **Dọn dependency:** [package.json](C:/coffee-shop/package.json) và [pnpm-lock.yaml](C:/coffee-shop/pnpm-lock.yaml) bỏ `@react-spring/parallax`, `@react-spring/web` và subtree độc quyền gồm bảy package. Các resolution/integrity khác được so sánh bằng YAML parser và giữ nguyên. Không thêm thư viện.
- **Anchor smooth có phạm vi:** [RevealLink](C:/coffee-shop/src/components/ui/EditorialReveal.tsx) dùng API browser tại điểm tương tác, không bật smooth cho document. Target, URL, focus và Back được so sánh với baseline. Anchor `#bo-suu-tap` kết thúc tại cùng y=259/top=96.140625; Back về y=3007 như cũ.
- **Hover rõ hơn theo yêu cầu mới:** [EditorialReveal.module.css](C:/coffee-shop/src/components/ui/EditorialReveal.module.css) tăng độ rõ của border, underline trực tiếp từng word span và dịch marker SVG 3px theo X, không dịch Y theo chỉnh sửa tiếp theo của người dùng. Underline trên label trước đây khó hiện qua các inline-block split word, phù hợp quy tắc propagation của [CSS Text Decoration](https://www.w3.org/TR/css-text-decor-4/#line-decoration). Hover không dùng state/listener JS; focus-visible có cùng cue, reduced motion bỏ dịch chuyển/transition.
- **Footer theo yêu cầu mới:** [SiteFooter.module.css](C:/coffee-shop/src/components/layout/SiteFooter.module.css) dùng min-block-size 100dvh, có fallback 100svh/100vh; footer và reveal boundary rộng 100%, nội dung vẫn có page padding. Flex justify-between hiện có phân bố nội dung theo chiều cao mới; min-height cho phép footer tăng khi nội dung mobile cao hơn viewport. Parallax cũ giữ nguyên, nhưng điểm cuối top=0 nay đạt được vì footer không ngắn hơn viewport.
- **Kiểm thử:** thêm [page-scrollbar.test.mjs](C:/coffee-shop/tests/page-scrollbar.test.mjs) và [native-anchor.test.mjs](C:/coffee-shop/tests/native-anchor.test.mjs); `test:motion` chạy cả test cũ và mới. Test dùng component thật được transpile với hook/DOM boundary giả lập, kiểm tra setup, cache, resize, cleanup, ba kiểu lỗi khởi tạo, reduced motion và nguyên tắc chỉ có một controller cuộn anchor.

## F. Regression Verification

### Kiểm tra tự động

- Production build: 17 trang tạo thành công; TypeScript của build qua.
- `node --test tests/native-motion.test.mjs tests/page-scrollbar.test.mjs tests/native-anchor.test.mjs`: 9 test qua.
- `node --experimental-strip-types --test tests/coffee-render-loop.test.mjs`: test demand loop qua.
- `node scripts/check-style-references.mjs`: 19 CSS Modules qua.
- ESLint nguồn và test mới: không có lỗi sau khi sửa định dạng module của test; còn cảnh báo `<img>` đã có ở slideshow.
- 34 public assets giữ nguyên SHA-256; 17 CSS Modules giữ nguyên nội dung. Hai module được sửa theo yêu cầu mới là hover link và sizing footer. Tám đầu vào animation/rendering quan trọng giữ nguyên; phần context được đối chiếu với phép rút gọn trạng thái hằng true.

### Trình duyệt và tương tác

Chrome kết nối qua desktop, viewport mô phỏng 1280×800, 768×1024 và 390×844. Kiểm tra footer bổ sung tại 1920×855, 1920×1080 và 667×375. Đây không phải kiểm thử điện thoại hay Windows 10 thật.

Trước yêu cầu sửa hover/footer, baseline và bản sau refactor khớp toàn bộ trường đã đo ở FAQ mobile, menu mở, sản phẩm tablet, card story tại y=3200 và footer tại cùng y=11699. Ma trận SVG tại y=4000 khớp số chính xác. Đã kiểm tra wheel mô phỏng, kéo custom scrollbar, PageUp/PageDown, Home/End, Space, FAQ dropdown/accordion, đổi breakpoint khi menu mở, reduced motion, route transition và đối chứng Back. Anchor mới khớp baseline về hash, focus, tọa độ đích và vị trí Back; chỉ thêm hành trình cuộn mượt đã được cho phép.

Sau yêu cầu UI bổ sung, footer được đo riêng thay vì đòi khớp chiều cao cũ: 1920×855 → footer cao 855px, 1920×1080 → 1080px, 1280×800 → 800px, 390×844 → 844px. 667×375 → footer tự nở 764.84px, không ép cắt content. Trong mọi case, boundary/footer rộng bằng layout viewport, không tràn ngang; đáy footer khớp đáy viewport trong sai số pixel rounding dưới 1px, khoảng cuối content bằng padding 48px. Reveal đầu/giữa tại viewport rộng giữ x=0 và width=1920px. Hover đo được border opacity 0.35→1, word decoration none→underline và SVG delta (3px, 0px); reduced motion bỏ transform và transition.

Trong baseline home, card còn ngoài viewport đã tự đổi kích thước và tổng chiều cao từ 12499 lên 12505 trước khi sửa nguồn. Không gọi phần dao động này là kết quả tối ưu. Footer/card khi ổn định khớp lại. Không khẳng định pixel-perfect ở mọi thời điểm, đặc biệt video đang chạy và WebGL.

Với JS tắt sau reload: native attribute không được bật, custom hidden, scrollbar browser có `scrollbar-width: auto`; Home về 0, wheel tới 320 và kéo native scrollbar tới 5349. Các module UI/3D vốn cần JS không được biến thành no-JS components trong phạm vi này.

### Giới hạn

Chưa kiểm tra Firefox, Safari, precision touchpad thật, touch device thật, driver chuột Windows 10, FPS/CPU trên máy yếu hoặc nested region đang overflow bằng phần cứng. Không kết luận các môi trường này đã tương thích. Dropdown và quản lý focus hiện tại được giữ; không có bộ chặn scroll mới ảnh hưởng container lồng nhau.

Lỗi layout sản phẩm 768px và các hạn chế menu/hero đã ghi nhận ở baseline không được sửa lẫn vào refactor. Không thay dữ liệu giỏ, gửi form hoặc tạo đơn.

## G. Changes Requiring Approval

Các mục dưới đây chưa áp dụng; mỗi mục cần duyệt UX riêng theo yêu cầu giữ nguyên giao diện.

| Đề xuất | Hiện tại / điều người dùng sẽ thấy | Lý do, phương án và rủi ro |
|---|---|---|
| Sửa product layout ở 768px | Giữ grid ba cột hiện tại có thể clip controls; sửa sẽ đổi vị trí/kích thước image, copy và CTA | Có thể stack sớm hơn hoặc giảm min-size. CSS đơn giản nhưng bố cục nhìn thấy thay đổi; cần duyệt và test tablet |
| Menu keyboard/failure recovery | Chưa thêm Escape/focus trap hoặc chuyển sang native dialog; JS chết khi menu mở có thể giữ lock hiện tại | Dialog có thể quản lý focus/đóng tốt hơn nhưng thay tương tác, markup và animation; phương án nhỏ hơn là thêm Escape/focus handling bằng JS, vẫn không giải quyết mọi lỗi JS |
| Hero khi reduced motion hoặc thiếu hỗ trợ scroll timeline | Video/autoplay và fallback hiện tại giữ nguyên | Dừng video, thêm ảnh fallback hoặc guard CSS timeline sẽ đổi chuyển động/trạng thái tải. Cần chọn trải nghiệm mong muốn và kiểm tra browser |

Fallback scrollbar native trước hydration đã được duyệt và đã làm, không còn là mục chờ duyệt.

## H. Final Senior Engineering Verdict

Frontend có một ít phần thừa sau khi bỏ loader/thư viện; không phải mọi logic nâng cao đều over-engineering. Đã bỏ context/state chết, dependency animation không dùng và phép đo/ghi geometry lặp lại. Camera 3D, phối hợp animation, trạng thái tương tác, accessibility và các phép đo có ý nghĩa vẫn nên ở JS.

CSS Modules/Tailwind hiện có thể bảo trì nếu giữ ranh giới layout/presentation và coordination như hiện tại. Không chuyển animation sang CSS chỉ để đạt một tỷ lệ CSS cao hơn.

Phương án cuối không thêm scrolling engine và vẫn giữ native wheel/momentum. API smooth của FAQ được giữ, anchor được làm mượt tại nơi gọi với một controller; document không bật smooth toàn cục vì regression verification chưa đủ. Fallback scrollbar nay hoạt động khi JS tắt hoặc setup lỗi. Đây là thay đổi độ tin cậy đã có bằng chứng, không phải lời bảo đảm mọi thiết bị hay mọi lỗi overlay đều đã được xử lý.

Ngoài hover/footer được yêu cầu mới và native scrollbar trước hydration/fallback được duyệt, không đổi thiết kế, assets hoặc thuật toán 3D. Cần kiểm thử Windows 10 và thiết bị đầu vào thật trước khi tuyên bố production compatibility rộng. Chưa deploy.
