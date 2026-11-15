# Báo cáo tích hợp Headless WordPress — 14/11/2026

Phạm vi: giữ Next.js static export, Cloudflare Workers Static Assets và thiết kế các trang hiện có. Không triển khai production, commit, push, thay cấu hình máy chủ WordPress hoặc bật thanh toán.

Quy ước: **IMPLEMENTED** = đã có mã; **VERIFIED** = đã kiểm tra với bằng chứng được nêu; **BLOCKED** = thiếu điều kiện kiểm chứng/hoạt động; **NOT IMPLEMENTED** = chưa có chức năng. Kiểm thử fixture không chứng minh CMS thật hoạt động.

## A. Kiến trúc repository

- **VERIFIED:** phiên bản Next.js cài thực tế là **16.3.0**; TypeScript, React 19 và App Router trong `src/app/`.
- **VERIFIED:** `next.config.ts` giữ `output: "export"` khi production, `trailingSlash: true`, ảnh không qua Next image optimizer. Kết quả build nằm trong `out/`.
- **VERIFIED:** `worker/index.ts` nhận `/api/*` và phục vụ static assets qua binding `ASSETS`; `wrangler.jsonc` giữ kiến trúc hosting hiện tại.
- **VERIFIED:** thông tin site qua `src/data/db.json` → Zod → `src/lib/database.ts`; catalog đang lấy từ `src/data/products.ts`, giỏ hàng dùng cùng catalog. Chưa chuyển catalog sang WooCommerce.
- **VERIFIED:** SEO sẵn có dùng `createMetadata`, `JsonLd`, `robots.ts`, `sitemap.ts`. Các trang cũ, header, animation, WebGL và nguồn ảnh sản phẩm không được thiết kế lại trong tích hợp này.
- **IMPLEMENTED:** các trang CMS biệt lập tại `/bai-viet/`, `/bai-viet/{slug}/`, `/bai-viet/chuyen-muc/{slug}/`. Không thêm mục điều hướng; `/cau-chuyen/` giữ vai trò trang thương hiệu hiện có.
- **IMPLEMENTED:** yêu cầu Node.js được nâng lên **>=22.12.0** để dùng phiên bản `sanitize-html` hiện hành; môi trường CI dùng Node 22. Cần nâng môi trường build nếu đang chạy Node 20.
- Khi khám phá ban đầu không có `.github/workflows/`; workflow mới chỉ kiểm tra/build, không deploy.

## B. Endpoint và bằng chứng thực tế

Đích CMS: `https://lavuon.cu.ma`. Kiểm tra chỉ đọc ngày 14/11/2026 từ môi trường làm việc này.

Người dùng cung cấp bằng chứng trước đó: `/index.php/wp-json/wp/v2/posts` và `/?rest_route=/wp/v2/posts` trả JSON; `/wp-json/wp/v2/posts` từng trả 404. Đây là thông tin đầu vào, **không phải lần kiểm chứng lại thành công trong phiên này**.

Trong phiên này, `web.open` không truy cập được posts/API root. Toàn bộ phép thử PowerShell công khai bên dưới dừng ở DNS với lỗi `No such host is known. (lavuon.cu.ma:443)`. Không nhận được HTTP status, `Content-Type`, JSON, header phân trang hoặc HTML. Lần chạy lại ngoài sandbox yêu cầu phê duyệt nhưng bị ngắt trước khi có kết quả. Vì vậy chưa thể phân biệt DNS của môi trường, tình trạng hosting hay cấu hình CMS.

| Route đã thử, tương đối với CMS | Kết quả | Phân loại |
|---|---|---|
| `/index.php/wp-json/` | Không phân giải DNS; chưa đọc được namespaces | BLOCKED |
| `/index.php/wp-json/wp/v2/posts?per_page=1` | Không phân giải DNS | BLOCKED |
| `/?rest_route=/wp/v2/posts&per_page=1` | Không phân giải DNS | BLOCKED |
| `/wp-json/wp/v2/posts?per_page=1` | Không phân giải DNS; không xác nhận lại 404 | BLOCKED |
| `/index.php/wp-json/wp/v2/categories?per_page=1` | Không phân giải DNS | BLOCKED |
| `/index.php/wp-json/wp/v2/tags?per_page=1` | Không phân giải DNS | BLOCKED |
| `/index.php/wp-json/wp/v2/media?per_page=1` | Không phân giải DNS | BLOCKED |
| `/index.php/wp-json/wc/store/v1/products?per_page=1` | Không phân giải DNS | BLOCKED |
| `/index.php/wp-json/wc/store/v1/products/categories?per_page=1` | Không phân giải DNS | BLOCKED |
| `/index.php/wp-json/wc/v3/products?per_page=1` | Không phân giải DNS; chưa kiểm chứng auth | BLOCKED |
| `/index.php/wp-json/wc/v3/orders?per_page=1` | Không phân giải DNS; không nhận dữ liệu đơn hàng | BLOCKED |
| `/index.php/wp-json/rankmath/v1/getHead?url=https%3A%2F%2Flavuon.cu.ma%2F` | Không phân giải DNS | BLOCKED |
| `/index.php/wp-json/yoast/v1/get_head?url=https%3A%2F%2Flavuon.cu.ma%2F` | Không phân giải DNS | BLOCKED |

Chưa thử `/posts/{id}` hoặc `/wc/store/v1/products/{id}` với một ID thật vì chưa đọc được danh sách để xác định ID. Không suy đoán ID hay response sản phẩm. Không kết luận WooCommerce, Rank Math hoặc Yoast đã cài, chưa cài hay bị tắt.

## C. Xác thực API

- **IMPLEMENTED:** client nội dung công khai không nhận username, password, Consumer Key hoặc Consumer Secret. `WORDPRESS_API_BASE_URL` là biến build, không có tiền tố `NEXT_PUBLIC_`.
- **NOT IMPLEMENTED:** client quản trị WooCommerce và nội dung WordPress riêng tư. Chưa có credentials và chưa có nhu cầu đưa dữ liệu riêng tư vào static export.
- Với API quản trị WooCommerce tương lai, tạo key quyền tối thiểu tại **WooCommerce → Settings → Advanced → REST API**, dùng tài khoản có quyền phù hợp. Consumer Key/Secret chỉ đi trong header qua HTTPS; không đặt trong URL. Đây là yêu cầu triển khai tiếp theo, không phải kết nối hiện đã hoạt động. Xem [tài liệu xác thực chính thức WooCommerce](https://developer.woocommerce.com/docs/apis/rest-api/authentication/).
- Application Passwords chỉ cần nếu sau này đọc nội dung không công khai bằng API WordPress. Không cần thêm để xuất bài đã publish.
- Secret runtime lưu qua Worker secrets; secret chỉ dùng trong build lưu GitHub Actions secrets. Không khai báo credential trong `NEXT_PUBLIC_*`, file JSON public hoặc `wrangler.vars`.

## D. File và phạm vi thay đổi

Danh sách dưới đây chỉ thuộc tích hợp này. Repository đã có nhiều thay đổi chưa commit trước khi bắt đầu; không coi toàn bộ `git diff` là thay đổi CMS.

| File | Vai trò |
|---|---|
| `src/lib/wordpress.ts` | Client WordPress public có kiểu dữ liệu, phân trang, timeout và lỗi |
| `src/lib/wordpress-blog.ts` | Dữ liệu blog build-time, tập hợp trang API và đường dẫn frontend |
| `src/lib/wordpress-content.ts` | Làm sạch HTML CMS và chuyển nội dung HTML sang text |
| `src/app/bai-viet/[[...slug]]/page.tsx` | Xuất tĩnh danh sách, bài viết, chuyên mục và metadata |
| `src/app/bai-viet/[[...slug]]/page.module.css` | Style riêng cho các trang bài viết mới |
| `src/app/sitemap.ts` | URL trang public và các bài/chuyên mục được xuất |
| `src/app/ve-chung-toi/page.tsx`, `src/app/cau-chuyen/layout.tsx` | Metadata riêng đúng canonical cho trang giới thiệu/câu chuyện; không đổi UI |
| `src/data/db.json` | Domain public canonical `https://lavuon.cafe` |
| `worker/index.ts` | Khóa cron commerce khi checkout chưa bật |
| `.env.example` | Hướng dẫn `WORDPRESS_API_BASE_URL` |
| `package.json`, `pnpm-lock.yaml` | HTML sanitizer, phiên bản Node tối thiểu và lệnh kiểm tra |
| `.github/workflows/static-build.yml` | CI kiểm tra và build static, không deploy |
| `scripts/check-static-export.mjs` | Kiểm tra file xuất, canonical, sitemap, schema và mẫu key WooCommerce |
| `scripts/finalize-static-export.mjs` | Dọn thư mục blog trong bản export khi CMS chưa cấu hình, tránh trang 404 HTML bị static host trả HTTP 200 |
| `scripts/test-wordpress.mjs`, `tests/wordpress.test.ts` | Runner và kiểm tra client public, hai kiểu API base và các lỗi |
| `scripts/test-cms-export.mjs` | Chạy production build với HTTP fixture local, kiểm tra bài/chuyên mục và lọc HTML; không gọi CMS thật |
| `tests/wordpress-blog.test.mjs`, `tests/worker-safety.test.mjs` | Kiểm tra HTML/blog, dữ liệu riêng tư và khóa cron |
| `README.md`, `docs/integrations.md`, `docs/headless-wordpress.md` | Cách cấu hình và trạng thái vận hành |

Không sửa các route sản phẩm/commerce hoặc CSS đang có để tích hợp WordPress. Các thay đổi có sẵn trước phiên này vẫn được giữ nguyên.

## E. Luồng dữ liệu và rebuild

```text
WordPress public REST API
    ↓ HTTPS, chỉ ở build, khi WORDPRESS_API_BASE_URL được cấu hình
GitHub Actions / máy build → Next.js static generation
    ↓ validate response, làm sạch HTML, tạo metadata/JSON-LD
out/ (HTML, assets, robots.txt, sitemap.xml)
    ↓ deploy riêng sau khi người vận hành phê duyệt
Cloudflare Worker + Static Assets → trình duyệt
```

- **IMPLEMENTED:** URL API tập trung, hỗ trợ cấu trúc `/index.php/wp-json/` và `?rest_route=/`; không giả định rewrite `/wp-json/` hoạt động.
- **IMPLEMENTED:** để trống `WORDPRESS_API_BASE_URL` thì chưa bật trang CMS. Đây là trạng thái cấu hình rõ ràng, không phải nuốt lỗi API. Khi đã cấu hình mà CMS lỗi, build phải thất bại để tránh xuất nội dung rỗng thay bản đang chạy.
- Next.js 16.3 yêu cầu catch-all xuất ít nhất một path. Khi CMS tắt, bước cuối của `pnpm build` loại thư mục blog khỏi `out/`; Worker Static Assets sẽ xử lý URL đó như route không tồn tại. Script nạp cùng quy tắc `.env*` của Next và kiểm tra đường dẫn trước khi dọn output.
- **IMPLEMENTED:** dữ liệu CMS được đọc lúc build. Không thêm Next API route/server runtime hoặc ISR vào static export.
- **IMPLEMENTED:** request dùng `no-store`, memoize trong client của build để tránh gọi lại cùng URL. Không dùng persistent fetch cache có thể làm rebuild giữ nội dung WordPress cũ. Các trang blog và sitemap khai báo `force-static`.
- **IMPLEMENTED:** workflow kiểm tra qua `pull_request` hoặc `workflow_dispatch`, lấy URL public từ repository variable `WORDPRESS_API_BASE_URL`. Không đưa credential cho PR không đáng tin.
- **NOT IMPLEMENTED:** webhook publish tự kích hoạt build/deploy. Sau khi publish/sửa/xóa bài, chạy workflow thủ công hoặc build lại theo quy trình hosting hiện có. Workflow mới chỉ xác nhận build; chưa upload artifact hoặc phát hành site.
- API timeout/outage khiến lần build mới thất bại; bản static đã phát hành vẫn là bản phục vụ. Không dùng snapshot nội dung cũ âm thầm và chưa có đồng bộ delta/persistent cache. Rebuild tải nội dung public theo trang, tránh chạy build thường xuyên trên hosting free.

## F. SEO

- **IMPLEMENTED:** canonical lấy từ domain public `https://lavuon.cafe`, không dùng `link`/canonical CMS để quyết định URL public. Sitemap và robots dùng cùng nguồn `database.site.url`.
- **IMPLEMENTED:** tiếp tục dùng hệ thống `createMetadata` và `JsonLd` sẵn có. Bài viết lấy tiêu đề/mô tả từ nội dung public, có Open Graph dạng article và một schema `Article`; schema `WebSite` của layout vẫn có vai trò riêng.
- **BLOCKED:** chưa xác minh plugin SEO thật; chưa map title, description, OG image, Twitter, robots hoặc schema từ plugin. Không chèn nguyên khối `yoast_head`/Rank Math HTML vào `<head>` để tránh canonical CMS và schema trùng.
- Yoast có thể trả `yoast_head_json` trên response WordPress khi plugin/API được bật; đây là khả năng trong [tài liệu Yoast](https://developer.yoast.com/customization/apis/rest-api/), không phải bằng chứng site đã bật plugin. Cần kiểm tra dữ liệu thật trước khi thêm adapter.
- **NOT IMPLEMENTED:** Product schema theo WooCommerce vì catalog/API sản phẩm chưa được xác minh. Không tạo offer tồn kho/giá động bằng dữ liệu giả.
- DNS/TLS/custom domain `lavuon.cafe`, www redirect và chính sách indexing WordPress phải được nghiệm thu ngoài repo. Không đổi URL WordPress Address/Site Address sang domain frontend.

## G. Kiểm tra

Các lệnh nghiệm thu cho phần tích hợp:

```bash
pnpm typecheck
pnpm test:cms
pnpm test:commerce
pnpm lint
pnpm test:cms-export
pnpm build
pnpm check:static
```

Kết quả cục bộ ngày 14/11/2026:

| Kiểm tra | Kết quả | Phân loại |
|---|---|---|
| TypeScript toàn repo và TypeScript trong production build | Đạt | VERIFIED |
| Client WordPress (`scripts/test-wordpress.mjs`) | 5/5 nhóm test đạt, hai dạng base URL, HTTP/network/timeout/schema/pagination | VERIFIED bằng fixture |
| Blog/sanitizer/cron (`wordpress-blog.test.mjs`, `worker-safety.test.mjs`) | 8/8 đạt, bao gồm không xuất private/password-protected content | VERIFIED bằng fixture |
| Bộ kiểm tra UI/motion hiện có (`scripts/test-motion.mjs`) | 103/103 đạt, gồm các test `.mjs` mới | VERIFIED |
| Commerce hiện có | 9/9 đạt, checkout vẫn khóa | VERIFIED bằng test |
| Style references | 25 CSS modules đạt kiểm tra tham chiếu/class thừa | VERIFIED |
| ESLint app và files mới | 0 lỗi; 1 warning `<img>` sẵn có trong CoffeeProcessSlideshow | VERIFIED |
| Production static build với HTTP CMS fixture | Đạt; 19 HTML, 14 sitemap URLs; có bài tiếng Việt, chuyên mục, canonical và HTML đã lọc | VERIFIED bằng fixture |
| Production static build mặc định, CMS tắt | Đạt; 15 HTML, 10 sitemap URLs; thư mục blog/fixture đã bị loại, static checks đạt | VERIFIED |
| API CMS/WooCommerce/plugin SEO thật | Không phân giải DNS, chưa nhận HTTP/JSON | BLOCKED |
| Workflow trên GitHub, Cloudflare production và kiểm tra ảnh chụp trình duyệt | Chưa chạy trong phiên này | NOT IMPLEMENTED trong nghiệm thu |

Build trong sandbox bị kẹt ở compile và đã dừng. Build chạy lại ngoài sandbox hoàn tất, có tải font qua mạng theo kiến trúc hiện có. Các kiểm tra dùng trực tiếp binary Node cục bộ khi wrapper pnpm trong sandbox không tải được Corepack; build cuối chạy bằng `pnpm build`. Kiểm tra fixture không chứng minh CMS thật hoạt động; vẫn cần live build sau khi DNS/API truy cập được.

**BLOCKED (baseline lint toàn repo):** `pnpm lint` hiện thất bại với 54 errors/319 warnings, chủ yếu ở Three.js vendored, output `.wrangler`, CommonJS và alias của tests có sẵn. Workflow chạy lint phạm vi `src`, `worker` và các scripts/tests mới; không sửa mã vendor hoặc cấu hình lint ngoài phạm vi chỉ để làm sạch baseline. Workflow chưa được chạy thật trên GitHub trong phiên này.

Kiểm tra static quét một mẫu hình Consumer Key/Secret WooCommerce; không thay thế secret scanning đầy đủ. Không khẳng định đã kiểm tra screenshot, pixel parity, hiệu năng CMS hoặc checkout/payment thực tế.

`test:cms-export` ghi dữ liệu mô phỏng vào `out/`. Sau khi kiểm thử phải chạy lại `pnpm build` với cấu hình thật hoặc CMS để trống trước khi phát hành. Workflow đã sắp thứ tự fixture build → build theo cấu hình → kiểm tra static và không deploy.

## H. Bảo mật và commerce động

- **IMPLEMENTED:** HTML bài viết được lọc bằng `sanitize-html` tại build, whitelist thẻ/attribute, loại script/handler, iframe và scheme URL nguy hiểm trước khi render HTML.
- **IMPLEMENTED:** blog không xuất bài có status private/draft hoặc content/excerpt được bảo vệ mật khẩu; slug được giải mã và kiểm tra trước khi tạo đường dẫn static. Không yêu cầu credentials để vượt giới hạn public.
- **IMPLEMENTED:** cron đơn hàng dừng khi `CHECKOUT_ENABLED = false`, tránh đọc dữ liệu khách/email và lỗi binding D1 trong cấu hình checkout đang tắt. Các route checkout/order hiện vẫn khóa; không tự bật lại.
- **BLOCKED:** WooCommerce chưa thể xác minh giá, kho, sản phẩm biến thể hoặc quyền admin. Catalog local chỉ là catalog hiện có, chưa phải bản đồng bộ WooCommerce.
- **NOT IMPLEMENTED:** Worker proxy WooCommerce, xác minh giá/kho hiện tại, session cart, checkout và tạo đơn WooCommerce. Không tạo đơn D1 để thay WooCommerce trong kiến trúc mới.
- Thiết kế tối thiểu cho giai đoạn tiếp theo: Worker chỉ mở route allowlist, kiểm tra origin và body, gọi WooCommerce để lấy giá/kho; dùng token giỏ riêng từng khách và không dùng một giỏ upstream dùng chung. Với Cart-Token, WooCommerce cho phép nhận diện giỏ headless thay cookie và không yêu cầu Nonce Token, theo [tài liệu Cart Tokens](https://developer.woocommerce.com/docs/apis/store-api/cart-tokens/). Cần xác nhận đúng plugin/version thực tế trước triển khai.
- Response cart/checkout/order/customer phải `Cache-Control: no-store`, không cache chung. Không chuyển token/credential vào log. Submit đơn cần cơ chế chống gửi trùng đã nghiệm thu với backend. Không tin giá/kho/tổng tiền browser gửi lên.
- Cổng thanh toán, webhook xác nhận, vận chuyển/thuế, khôi phục lỗi checkout và đối soát vẫn cần nghiệm thu riêng. Không bật live payments trong đợt này.

## I. Giới hạn hosting/API

- CMS đang ở GoogieHost Free; giới hạn khoảng 1 GB SSD/100 GB bandwidth là thông tin người dùng cung cấp, chưa được kiểm chứng lại. Không có benchmark hoặc cam kết uptime được suy ra từ đó.
- DNS không truy cập được trong lần kiểm tra này là blocker hiện tại; chưa có bằng chứng HTTP 403/429/500 hoặc HTML challenge. Khi API khôi phục, cần xác nhận JSON và header phân trang từ chính runner build.
- Rebuild cần dữ liệu CMS public đầy đủ; chưa có đồng bộ delta. Với lượng bài tăng, đánh giá số request/thời gian build thực tế rồi mới bổ sung cache có quy tắc invalidation. Không thêm cron/plugin WordPress chỉ để làm cache.
- Thay đổi WordPress chưa xuất hiện trên site cho đến khi có rebuild và deploy được phê duyệt. Thay đổi giá/kho không được xem là thời gian thực từ HTML static.
- Ảnh trong nội dung CMS vẫn có thể tải từ CMS sau khi trang được xuất. Cần kiểm tra HTTPS, kích thước, availability và ngân sách bandwidth trước public launch.

## J. Bước thủ công trên WordPress/GitHub/Cloudflare

1. Kiểm tra DNS và HTTPS của `lavuon.cu.ma` từ mạng thường và môi trường build. Mở `/wp-admin/`; không sửa server rewrite từ frontend repo.
2. Kiểm tra `/index.php/wp-json/` và các route public trong bảng B. Lưu status, `Content-Type`, JSON tối thiểu và header `X-WP-Total`, `X-WP-TotalPages`; không lưu token/dữ liệu khách hàng. Nếu response là HTML challenge, xử lý ở hosting trước khi bật build tự động.
3. Đăng nhập WordPress → Plugins để xác nhận WooCommerce và một plugin SEO duy nhất thực sự active. Không cài cả Rank Math và Yoast để làm hai nguồn SEO cạnh tranh. Kiểm tra namespaces thay vì chỉ nhìn tên plugin.
4. Publish một bài thử không chứa dữ liệu riêng tư; kiểm tra title/content/excerpt/slug/categories, ID bài và media thật. Thử `/posts/{id}` với ID quan sát được.
5. Với WooCommerce, tạo sản phẩm thử ở staging và kiểm tra Store API list/detail/categories, pagination, đơn vị tiền tệ, sale/regular price, tồn kho, thuộc tính/variation. Giữ slug frontend hiện có khi map catalog. Chưa bật kết nối nếu chỉ nhận HTML hoặc lỗi.
6. Nếu cần dữ liệu quản trị, tạo Consumer Key/Secret theo bước C, quyền tối thiểu. Kiểm tra `/wc/v3/products`; không xuất `/wc/v3/orders` hoặc dữ liệu khách hàng vào build. Không gửi secret qua URL.
7. Với Yoast/Rank Math, xác minh API public thực tế và payload trước khi cấu hình adapter; bảo đảm canonical/output cuối là `lavuon.cafe`. Giữ CMS chỉ làm backend và quyết định chính sách noindex/redirect CMS riêng, không chặn REST API cần cho build.
8. Dùng Node >=22.12; đặt `WORDPRESS_API_BASE_URL=https://lavuon.cu.ma/index.php/wp-json/` trong local environment hoặc repository variable GitHub. Có thể dùng `https://lavuon.cu.ma/?rest_route=/` nếu chỉ route đó hoạt động. Không có nhu cầu credentials cho public posts.
9. Chạy các lệnh ở G; kiểm tra HTML bài/chuyên mục, canonical, robots/sitemap và nội dung thực tế. Kiểm tra API lỗi làm build thất bại, không thay site bằng nội dung rỗng.
10. Chốt custom domain/DNS/TLS trên Cloudflare và luồng deploy hiện có; chạy phát hành riêng sau phê duyệt. Publish bài mới → rebuild → review artifact → deploy. Chưa có webhook tự động.
11. Chỉ thiết kế/bật commerce sau khi WooCommerce API, từng session giỏ, giá/kho, gateway staging, chống trùng đơn, thuế/vận chuyển và log riêng tư đã nghiệm thu. Worker secrets và quyền admin cấu hình ngoài repo.

## K. Đánh giá production readiness

**BLOCKED** đối với tích hợp WordPress/WooCommerce production: chưa có lần lấy dữ liệu live thành công trong phiên này, plugin SEO/WooCommerce và checkout/payment chưa được kiểm chứng. Mã CMS opt-in và kiểm thử cục bộ không thay thế nghiệm thu backend.

Giữ API base trống để frontend hiện có build độc lập; chỉ bật CMS sau khi kiểm tra public JSON từ runner build. Không phát hành hoặc bật thanh toán tự động.

## L. Việc còn lại theo ưu tiên

| Ưu tiên | Công việc | Trạng thái |
|---|---|---|
| P0 | Khôi phục/xác minh DNS và public JSON từ runner; nghiệm thu live posts/categories/tags/media/detail | BLOCKED |
| P0 | Kiểm tra cục bộ và static build hai chế độ | VERIFIED bằng fixture và cấu hình CMS tắt; cần live build riêng |
| P0 | Nghiệm thu domain public, TLS, canonical và quy trình deploy/rebuild | BLOCKED |
| P1 | Xác minh WooCommerce và payload thật rồi map catalog mà không đổi UI/slug | BLOCKED |
| P1 | Xác minh plugin SEO đang active rồi map metadata được hỗ trợ, giữ một nguồn schema | BLOCKED |
| P1 | Worker kiểm tra giá/kho, cart riêng từng khách; chỉ triển khai sau xác minh API | NOT IMPLEMENTED |
| P1 | Checkout/order WooCommerce, gateway staging, idempotency và payment webhooks | NOT IMPLEMENTED |
| P2 | Webhook rebuild có xác thực, giới hạn tần suất và chống rebuild trùng | NOT IMPLEMENTED |
| P2 | Đo số request/thời gian build để quyết định incremental sync/cache | NOT IMPLEMENTED |

Tài liệu giao thức tham khảo: [WordPress Posts REST API](https://developer.wordpress.org/rest-api/reference/posts/), [WooCommerce Store API](https://developer.woocommerce.com/docs/apis/store-api/), [WooCommerce Cart Tokens](https://developer.woocommerce.com/docs/apis/store-api/cart-tokens/), [WooCommerce Authentication](https://developer.woocommerce.com/docs/apis/rest-api/authentication/), [Yoast REST API](https://developer.yoast.com/customization/apis/rest-api/). Tài liệu chính thức giải thích hợp đồng giao thức, không xác nhận plugin hoặc tính năng trên CMS này.
