# Page reveal theo The Damai — 17/11/2026

Ghi chép đợt triển khai đầu. Follow-up cùng ngày đã đổi ownership từ nhóm sang từng text/divider, bỏ marker `data-page-entry`, dùng preset editorial1600ms và bổ sung bàn giao logo khi quay về home. Spec hiện tại xem [page-reveal.md](C:/coffee-shop/docs/page-reveal.md); các số đo phía dưới là bằng chứng của đợt đầu, không đại diện cho follow-up.

## Tham chiếu đã kiểm tra

Quan sát trực tiếp [The Damai](https://thedamai.com/) bằng Chrome, thử điều hướng Dining/Stay/Relax và đọc [client script của họ](https://thedamai.com/assets/js/index-v4.js). CPU throttle tạm thời đã trả về1× sau quan sát.

Script tham chiếu xác nhận họ vẫn fade lớp loading/transition; màu nền làm fade khó nhận thấy. Departure400ms; cover rút bằng opacity800ms. Nội dung được animate theo từng `.col-row`/section: opacity, dịch1em, scale0.975→1, khoảng1400ms và stagger100ms; họ còn có blur được dọn trong2000ms. Các số này được đọc từ script, không giả là phép đo chính xác từng frame từ mắt/screenshot. Không sao chép GSAP/Barba hoặc toàn bộ implementation vào ứng dụng.

## Phạm vi triển khai

- **Chỉ route thường:** cùng nhịp400/800ms, nền loading hiện có, fade/nhích1rem/scale từng nhóm1400ms, delay200ms/stagger100ms. Không blur các nhóm lớn để giữ chi phí thấp. Đây là bản thích ứng theo cấu trúc Là Vườn, không tuyên bố pixel-identical với The Damai.
- **Home được bảo vệ:** controller mới nằm hoàn toàn trong nhánh `!home`. Trang chủ không truy vấn nhóm entry; curtain900ms, keyframes, logo handoff, text/header timings, min loading450ms và các phần hero không sửa. Departure có đầu đi/đến `/` vẫn250ms; cả hai đầu là route thường mới400ms.
- Marker `data-page-entry` nằm trên nhóm semantic hiện có của catalog, product detail, FAQ, contact, story intro, cart và blog. H1 là fallback tự động. Chỉ nhóm đang trong viewport được chọn; nhóm lồng nhau do nhóm ngoài sở hữu. Các nhóm chưa được arrival chọn vẫn dùng scroll/editorial hiện có. Không animate main/scroll owner, không gắn style ẩn vào SSR.
- Ownership dùng WeakSet và sự kiện entry-ready để bỏ mask editorial của nhóm đã được arrival quản lý. Hydration muộn đọc cùng ownership, tránh animation thứ hai hoặc chữ bị ẩn sau reveal.
- Cover xong800ms thì trả input/scroll; không bắt người dùng đợi mọi nhóm hoàn tất. Content animation tự hủy fill khi kết thúc; navigation/unmount/Escape lúc cover/lỗi/watchdog đều có cleanup. Reduced cover100ms, không animate nhóm; no-JS đọc HTML bình thường.

## Code để đối chiếu

- [Runtime và nhánh `!home`](C:/coffee-shop/src/lib/page-reveal-runtime.ts).
- [Departure guard theo from/to](C:/coffee-shop/src/providers/TransitionProvider.tsx).
- [Editorial ownership/cleanup](C:/coffee-shop/src/components/ui/editorial-reveal-runtime.ts).
- [Tài liệu lifecycle chung](C:/coffee-shop/docs/page-reveal.md).

Không đổi `src/app/page.tsx`, `ImmersivePage`, `HeroVideo`, `BrandIntro`, `PageReveal.tsx` hoặc CSS curtain home trong đợt này. Story chỉ thêm marker cho entry chung, không sửa scroll/card stack riêng. Bộ ảnh studio và các hạt cà phê không thay đổi.

## Kiểm chứng và ngân sách

- 148/148 unit tests; TypeScript, ESLint src/worker,26CSS-module checks, production Webpack build và static export15HTML/10sitemap URLs đạt.
- Full browser regression22/22 đạt: desktop/mobile emulation, menu, history, reload sâu section ngang, cart/focus, reduced/no-JS, video và mạng/JS chậm.
- Probe tập trung22case và6lượt CPU×6: tất cả route entry, cover không transform/clip ở route thường, không animation main, không mask editorial sót trong nhóm sở hữu, no-JS, reduced, SPA/Back và hydration JS trễ2500ms đạt.
- Home trước/sau cùng export, chỉ đổi early script: toàn bộ animation frames/timing trong capture0/50/100% khớp qua deep equality. Các ảnh progress là mốc điều khiển riêng từng animation, không phải video timeline theo wall clock; không dùng sai khác raster để kết luận thay đổi choreography.
- Early script11.633→13.626byte raw; gzip2.928→3.305byte, tăng377byte gzip. Không thêm dependency, observer/listener scroll mới hoặc word splitting cho entry. Chỉ đo kích thước early script, không coi đây là tổng delta JS toàn ứng dụng.

| Lượt CPU×6, FAQ mobile | Longtask tổng trước/sau (ms) | Trong cửa sổ cover trước/sau (ms) | Shift sum loại recentInput |
|---|---|---|---|
|1|759 /776|235 /228|0 /0|
|2|620 /939|238 /229|0 /0|
|3|1108 /610|235 /164|0 /0|

Mẫu nhỏ và bootstrap vẫn dao động: không tuyên bố FPS/INP nhanh hơn hoặc đạt CWV p75. Shift sum không phải toàn bộ phép tính session-window CLS. Chưa kiểm tra Firefox/WebKit, điện thoại thật, GPU memory, CDN hoặc bài blog dài thực tế (CMS đang tắt).

Lượt QA đầu21/22: test chụp menu hỏi animation sau nhiều round-trip, bỏ lỡ transition400ms ở desktop. Đã sửa **harness** để dừng ngay tại sự kiện transitionrun; không sửa animation/menu ứng dụng để che kết quả. Lượt cuối22/22, gồm first-open thật và rapid toggle.

## Bằng chứng và tái lập

- `C:/coffee-shop/output/damai-reveal-2026-11-17/`: unit/build/probe logs,22case JSON, CPU samples, PNG progress và script tham chiếu.
- `C:/coffee-shop/output/experience-2026-11-16/damai-final/`:22case đầy đủ, screenshots và traces; `damai-post/` giữ lượt đầu để không mất finding harness.
- `node scripts/test-motion.mjs`
- `node scripts/experience-qa/run.mjs out damai-final`
- `node output/damai-reveal-2026-11-17/probe.mjs`

Đã regenerate early script và build/static export để thử. Chưa commit, push hoặc deploy thay đổi này.

## Follow-up: text/divider toàn trang và quay về home

Đã bỏ marker nhóm cũ, dùng discovery semantic không sửa DOM trước hydration và chung ownership/preset editorial. Arrival chỉ animate nội dung trong viewport; các scope nested không animate lần hai. Paragraph/label không split words, delay được giới hạn; đọc geometry trước khi ghi animation. Live status và các vùng đang có choreography riêng giữ nguyên; tiêu đề giỏ hàng dùng lines để không split DOM của bộ đếm. CSS escape đã mở trang thì late hydration đánh dấu copy hiện tại là đã vào, không ẩn lại.

Departure về home dùng cùng nền nâu, logo giữa và spinner với incoming loading; cover chỉ bỏ khi callback opening tới. Logo home chạy handoff cả khi quay lại, timing curtain/text/video vẫn giữ. Không can thiệp assets/parallax.

Kiểm chứng follow-up:150/150 unit tests, TypeScript/ESLint,26CSS modules, production Webpack build và static export15HTML/10sitemap URLs đạt. Full browser22/22 đạt ở `output/experience-2026-11-16/reveal-followup-verified/`, có mobile, reduced/no-JS, reload section ngang, history, CPU×6, delayedJS, mạng chậm và video. Probe riêng10case ở `output/reveal-followup-2026-11-17/` kiểm tra desktop/mobile của contact/catalog/product/FAQ không duplicate/hidden copy; frame samples về home không có waiting frame giấu logo hoặc cover opaque sai màu. Probe này dùng bản trước bổ sung guard CSS-expired và cleanup unmount; hai guard có unit tests, full regression cuối dùng bản cuối.

Early script cuối15.978byte raw/3.934byte gzip. Không thêm dependency hoặc MutationObserver toàn trang; chưa đo FPS/INP trên điện thoại thật hoặc RUM production. Imagegen thử lại vẫn HTTP429, reset18/11/2026 08:49:14 Asia/Saigon; brief mới lưu trong `output/imagegen/lavuon-parallax-2026-11-17/request-latest.md`, chưa thay ảnh đang dùng. Follow-up chưa push/deploy.
