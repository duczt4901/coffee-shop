# Checklist chuẩn bị CMS Coffee Shop — waterfall

> **TÀI LIỆU CŨ — PHẠM VI ĐÃ ĐƯỢC THAY THẾ ngày 01/11/2026.** Phạm vi mới là một người vận hành coffee-shop, nội dung + bán hàng + SEO phù hợp; giỏ local, guest checkout qua SĐT/email; $0 ngoài domain. Mục tiêu “chỉ liên hệ để mua”, các quyết định cũ và yêu cầu quản trị rộng bên dưới không còn hiện hành. Xem [use case hiện hành v0.2](cms-use-cases-solo.md). Giữ tài liệu này để tham khảo cấu trúc waterfall, không dùng làm đầu vào triển khai.

Trạng thái: bản làm việc; chưa chốt toàn bộ yêu cầu. Ngày lập: 01/11/2026.

Mục tiêu phiên bản đầu đã được chủ dự án xác nhận: **quản lý nội dung thương hiệu và danh mục sản phẩm; khách liên hệ để mua**.

## Cách dùng và nguyên tắc giữ phạm vi

Đi theo thứ tự: **rễ — mục tiêu → gốc — người dùng và quy trình → thân — phạm vi và dữ liệu → cành — chức năng và màn hình → kiểm chứng → triển khai**.

- Ô chưa đánh dấu là việc cần làm hoặc quyết định cần chốt, không có nghĩa chức năng đó đã được duyệt để xây.
- Mỗi giai đoạn có đầu ra và điều kiện chốt. Chốt đầu ra của bước trước rồi mới chốt thiết kế bước sau.
- Một người phía kinh doanh chịu trách nhiệm chốt yêu cầu; người triển khai xác nhận tính khả thi. Ghi tên, ngày và phiên bản tại mỗi lần chốt.
- Mọi chức năng phải truy ngược được đến mục tiêu, người sử dụng và tình huống thực tế; mọi yêu cầu đã duyệt phải có cách nghiệm thu.
- Sau khi chốt, thay đổi phải ghi lý do, tác động đến dữ liệu/thời gian/chi phí và người duyệt. Nếu thay đổi giả định ở bước trước, mở lại bước đó rồi cập nhật các bước phụ thuộc.
- Các câu hỏi chưa có đáp án phải có người phụ trách và hạn trả lời. Không âm thầm biến giả định thành yêu cầu.

## 0. Kiểm kê hiện trạng — bằng chứng từ mã nguồn

Đã đọc mã nguồn, chưa kiểm tra website đang chạy hay môi trường production.

| Hạng mục | Hiện trạng | Việc cần quyết định |
|---|---|---|
| Website | Có trang chủ, câu chuyện, sản phẩm, chi tiết sản phẩm, liên hệ; trang về chúng tôi mới có tiêu đề | Trang nào cần quản lý trong bản đầu, trang nào cần hoàn thiện nội dung trước |
| Sản phẩm | 4 bản ghi trong `src/data/products.ts`; các gói có slug riêng; giá là chuỗi hiển thị | Một gói là một sản phẩm hay cần nhóm theo dòng sản phẩm |
| Nội dung chung | Có `src/data/db.json`, nhưng nhiều nội dung/ảnh vẫn viết trực tiếp trong component | Danh sách trường được biên tập và nơi đang sử dụng |
| Nhận diện | Có các tên Coffee Shop, la vuon, TrungToan ở những vị trí khác nhau | Tên thương hiệu, tên dòng sản phẩm và thông tin thật được duyệt |
| Mua hàng | Nút “Thêm vào giỏ hàng” trên trang chi tiết chưa có xử lý | Thay bằng lời kêu gọi liên hệ và đích liên hệ đã chốt |
| Tư vấn | Form footer chỉ `console.log`, chưa lưu hay chuyển thông tin | Dùng liên kết liên hệ trực tiếp hay thực sự cần tiếp nhận form |
| Xuất bản | `next.config.ts` dùng `output: "export"`; route sản phẩm tạo khi build | Cách nội dung từ CMS xuất hiện trên website và thời gian chờ chấp nhận được |
| SEO | Có metadata dùng chung; sitemap hiện mới có trang chủ | URL, metadata và sitemap phải theo nội dung được xuất bản |

- [ ] Kiểm tra các trang trên trình duyệt và đối chiếu với danh sách trên.
- [ ] Lập bảng kiểm kê từng khối nội dung: trang/vị trí, nội dung hiện tại, nguồn dữ liệu, người sở hữu, có cần sửa qua CMS, tần suất sửa.
- [ ] Xác nhận nội dung, giá, liên hệ và tài sản hình ảnh nào đang là mẫu.

**Đầu ra:** bảng kiểm kê hiện trạng. **Điều kiện chốt G0:** biết rõ cái đang có, cái chưa hoạt động và nội dung nào là dữ liệu mẫu.

## 1. Rễ — lý do cần CMS và kết quả cần đạt

- [x] Chốt loại website bản đầu: nội dung thương hiệu + danh mục; khách liên hệ để mua.
- [ ] Viết một câu vấn đề hiện tại: ai đang gặp khó khăn gì khi cập nhật website, hậu quả cụ thể là gì.
- [ ] Xác định người dùng chính của website: khách mua lẻ, khách sỉ, đối tác hay nhóm nào khác; chọn nhóm ưu tiên.
- [ ] Chốt hành động chính của khách sau khi xem sản phẩm: nhắn Zalo, gọi điện, gửi email hoặc kênh cụ thể khác; ghi rõ đầu mối nhận.
- [ ] Chốt người dùng CMS là ai, số người, mức quen công nghệ và thiết bị sử dụng.
- [ ] Chốt nhận diện chính thức, thông tin doanh nghiệp và người chịu trách nhiệm tính đúng của nội dung/giá.
- [ ] Chọn tiêu chí thành công có thể kiểm tra: ví dụ người phụ trách tự sửa sản phẩm mà không sửa code; điền thời gian thao tác và thời gian lên website mong muốn.
- [ ] Chốt giới hạn ngân sách thiết lập, chi phí vận hành định kỳ, thời hạn và người chăm sóc sau bàn giao.

**Đầu ra:** bản mục tiêu một trang, gồm vấn đề, đối tượng, kết quả, giới hạn và người quyết định.

**Điều kiện chốt G1:** cả hai phía trả lời thống nhất “CMS này giúp ai làm việc gì, thành công được nhận biết thế nào”.

## 2. Gốc — công việc thật và quy trình vận hành

Mô tả công việc trước khi đặt tên menu admin.

- [ ] Thu thập ví dụ thật cho từng công việc: thêm gói cà phê, sửa giá, thay ảnh, sửa câu chuyện, đổi số liên hệ, ngừng giới thiệu sản phẩm.
- [ ] Với mỗi việc, ghi người làm, tần suất, dữ liệu đầu vào, người kiểm tra và kết quả cần thấy trên website.
- [ ] Chốt quy trình nội dung: ai tạo/sửa, có cần người duyệt riêng không, ai được xuất bản; một người có thể đảm nhiệm nhiều bước.
- [ ] Chốt cách sửa sai sau xuất bản: ai xử lý và cần khôi phục đến mức nào.
- [ ] Chốt quy trình mua qua liên hệ: khách ở trang nào → bấm gì → tới kênh nào → ai tiếp nhận; xác định có cần kèm tên/link sản phẩm trong tin nhắn.
- [ ] Chốt form footer: thay bằng liên kết trực tiếp, bỏ, hoặc giữ vì có nhu cầu đã xác nhận. Nếu giữ, xác định nơi nhận, người xử lý, báo lỗi, chống spam và thời gian lưu dữ liệu.
- [ ] Chốt cách xử lý sản phẩm tạm ngừng giới thiệu; phân biệt với tồn kho thực tế.
- [ ] Chốt nhu cầu làm việc đồng thời và cách tránh người sau ghi đè thay đổi của người trước, nếu có nhiều người biên tập.
- [ ] Đi thử các quy trình bằng nội dung thật; bổ sung các trường hợp sai dữ liệu, thiếu ảnh, gửi thất bại hoặc xuất bản thất bại.

**Đầu ra:** sơ đồ quy trình, bảng vai trò/quyền và danh sách tình huống sử dụng.

**Điều kiện chốt G2:** mỗi công việc có người chịu trách nhiệm và có điểm bắt đầu/kết thúc rõ; không có yêu cầu duyệt nhiều cấp nếu thực tế không cần.

## 3. Thân — chốt ranh giới phiên bản đầu

### Các nhóm cần đánh giá theo kết quả G1–G2

- [ ] Nội dung thương hiệu: trang chủ, câu chuyện, về chúng tôi; chốt chính xác khối nào được sửa.
- [ ] Danh mục và chi tiết sản phẩm: chốt các thao tác và trường dữ liệu cần quản lý.
- [ ] Thông tin chung: thương hiệu, liên hệ, liên kết mạng xã hội, header/footer; chốt phần được sửa.
- [ ] Ảnh/video: chốt nhu cầu tải lên, chọn lại, thay thế và xử lý tài sản đang được dùng.
- [ ] Thông tin tìm kiếm/chia sẻ: chốt tiêu đề, mô tả, ảnh chia sẻ và quy tắc URL.
- [ ] Tài khoản, quyền, xuất bản, khôi phục: chọn mức cần thiết để vận hành an toàn theo quy trình đã chốt.
- [ ] Với từng nhóm, đánh dấu: bắt buộc bản đầu / để sau / ngoài phạm vi; ghi lý do và người quyết định.

### Ngoài phạm vi phiên bản đầu theo mục tiêu đã chọn

Giỏ hàng, checkout, thanh toán online, quản lý đơn hàng, vận chuyển, tồn kho, POS/thu ngân, bàn/đặt bàn, công thức nguyên liệu, kế toán, tích điểm và tài khoản khách hàng.

Blog, mã giảm giá, đa ngôn ngữ, đa chi nhánh, CRM, dashboard phân tích riêng và trình kéo thả tự do chưa có nhu cầu được xác nhận. Chỉ đưa vào khi có tình huống sử dụng và quyết định thay đổi phạm vi.

- [ ] Chốt cách thay các nút giỏ hàng hiện có bằng luồng liên hệ; rà lại lời hứa giao hàng/khuyến mãi đang hiển thị để xác nhận tính đúng và nơi quản lý.
- [ ] Lập danh sách chức năng để sau kèm điều kiện xem xét lại; không xây trước chỉ vì có thể cần.
- [ ] Ước lượng công sức và chi phí cho phạm vi đã chọn; giảm phạm vi hoặc điều chỉnh giới hạn nếu vượt G1.

**Đầu ra:** danh sách trong/ngoài phạm vi bản đầu được chốt, kèm ước lượng và giới hạn.

**Điều kiện chốt G3:** mọi hạng mục được xây có lý do; không diễn giải “CMS” thành toàn bộ hệ thống vận hành quán.

## 4. Thân — mô hình nội dung và quy tắc dữ liệu

- [ ] Chốt các loại nội dung từ bảng kiểm kê: thông tin chung, sản phẩm, nội dung trang và tài sản media; chỉ tách danh mục thành đối tượng riêng nếu có nhu cầu quản lý riêng.
- [ ] Lập từ điển dữ liệu: tên trường, ý nghĩa, kiểu, bắt buộc/tùy chọn, giới hạn, ví dụ, giá trị mặc định và nơi hiển thị.
- [ ] Đối chiếu trường sản phẩm đang có: tên, slug, loại, mô tả ngắn, khối lượng, giá, ảnh, màu nhấn, xuất xứ, sơ chế, giống, độ cao, mức rang, câu chuyện, nhãn nổi bật.
- [ ] Chốt cách biểu diễn gói 200 g/500 g/1000 g: bản ghi riêng hay biến thể; không tạo cấu trúc biến thể khi người vận hành chưa cần.
- [ ] Chốt giá có luôn hiển thị không, đơn vị tiền, quy tắc nhập/định dạng và trường hợp “liên hệ báo giá”.
- [ ] Chốt trạng thái và thứ tự hiển thị, cách chọn sản phẩm nổi bật, nơi nào dùng chung dữ liệu sản phẩm.
- [ ] Chốt nội dung chữ, ảnh và video nào được thay; nội dung nào có giới hạn để giữ bố cục; animation/layout/3D nào thuộc phần phát triển.
- [ ] Chốt định dạng, dung lượng, tỉ lệ media và văn bản thay thế cho ảnh có ý nghĩa; kiểm soát xóa media đang được tham chiếu.
- [ ] Chốt quy tắc slug duy nhất, đổi URL, ẩn/xóa sản phẩm và xử lý liên kết cũ.
- [ ] Chốt ngôn ngữ bản đầu, dữ liệu SEO dùng chung và dữ liệu ghi đè theo trang/sản phẩm.
- [ ] Chuẩn bị bộ dữ liệu mẫu thật: tên dài, thiếu trường tùy chọn, ảnh lỗi, giá thay đổi, sản phẩm ẩn.

**Đầu ra:** mô hình nội dung, từ điển dữ liệu và bảng ánh xạ từ mã nguồn hiện tại sang CMS.

**Điều kiện chốt G4:** dựng được các trang trong phạm vi bằng mô hình này; không cần nhập trùng cùng một thông tin ở nhiều nơi.

## 5. Cành — đặc tả chức năng, màn hình và nghiệm thu

- [ ] Đánh mã mục tiêu `MT`, quy trình `QT`, yêu cầu `YC`, ca nghiệm thu `NT`.
- [ ] Mỗi yêu cầu ghi: người dùng, mục đích, dữ liệu, thao tác, quyền, kết quả, lỗi có thể gặp và ca nghiệm thu.
- [ ] Phác thảo màn hình theo công việc đã chốt; chỉ thêm tìm kiếm/lọc/phân trang nếu khối lượng dữ liệu và thao tác cần đến.
- [ ] Đặc tả tạo/sửa/ẩn nội dung, lưu và xuất bản; kiểm tra đủ cả luồng thành công lẫn thất bại.
- [ ] Chốt cách xem trước, cách phân biệt thay đổi chưa xuất bản với nội dung đang công khai, theo nhu cầu G2.
- [ ] Đặc tả lời nhắc lỗi, xác nhận thao tác ảnh hưởng dữ liệu, trạng thái đang lưu và cách xử lý mất kết nối.
- [ ] Chốt tiêu chí sử dụng: thiết bị/trình duyệt hỗ trợ, nhãn dễ hiểu, bàn phím và khả năng đọc nội dung.
- [ ] Chốt chỉ tiêu đo được: thời gian xuất bản, quy mô sản phẩm/media, thời gian khôi phục và lượng dữ liệu có thể chấp nhận mất.
- [ ] Đối chiếu hai chiều: mọi nhu cầu trong phạm vi đều có yêu cầu; mọi màn hình/trường/nút đều phục vụ ít nhất một yêu cầu.

Mẫu bảng truy vết — ví dụ minh họa, chưa phải yêu cầu đã duyệt:

| Mục tiêu | Quy trình | Yêu cầu | Nghiệm thu |
|---|---|---|---|
| MT-01: tự cập nhật danh mục | QT-01: sửa thông tin gói cà phê | YC-01: người có quyền đổi giá và xuất bản | NT-01: giá mới đồng nhất ở trang chủ, danh sách và chi tiết trong thời gian đã chốt |
| MT-02: khách liên hệ mua | QT-02: xem sản phẩm rồi liên hệ | YC-02: CTA mở đúng kênh đã chọn | NT-02: kiểm tra đích đến trên thiết bị hỗ trợ và thông tin sản phẩm kèm theo nếu đã yêu cầu |

**Đầu ra:** đặc tả yêu cầu, bản phác thảo màn hình và bảng truy vết/nghiệm thu.

**Điều kiện chốt G5:** đủ chi tiết để triển khai và kiểm thử mà không tự đoán nghiệp vụ.

## 6. Thiết kế giải pháp — sau khi biết cần gì

- [ ] So sánh phương án CMS dựa trên phạm vi, người dùng, chi phí vận hành và khả năng bảo trì đã chốt; thử các thao tác quan trọng trước khi chọn.
- [ ] Chốt nơi lưu nội dung, media, tài khoản; quyền sở hữu tài khoản dịch vụ, dữ liệu và khả năng xuất dữ liệu khi chuyển hệ thống.
- [ ] Chốt tích hợp website: lấy nội dung lúc build hay thay đổi cách phục vụ trang; đánh giá tác động đến static export hiện tại.
- [ ] Chốt luồng xuất bản → cập nhật website → báo thành công/thất bại; xử lý cache, build lỗi, thử lại và tránh công khai nội dung dở dang.
- [ ] Chốt cơ chế preview/khôi phục phù hợp; không coi “lưu CMS thành công” là “website đã cập nhật”.
- [ ] Chốt đăng nhập, quyền ở phía máy chủ, quản lý khóa truy cập và giới hạn upload; bảo vệ đầu vào nội dung.
- [ ] Chốt staging/production, cấu hình domain, sao lưu/khôi phục và người nhận thông báo khi xuất bản lỗi.
- [ ] Nếu giữ form: chốt nơi xử lý ngoài website static, nơi lưu dữ liệu liên hệ, quyền đọc/xóa và chống spam; tính cả chi phí này vào phạm vi.
- [ ] Cập nhật ước lượng và ghi các đánh đổi so với yêu cầu; chốt lại các bước bị ảnh hưởng nếu có.

**Đầu ra:** quyết định giải pháp, sơ đồ tích hợp và kế hoạch triển khai/chuyển dữ liệu.

**Điều kiện chốt G6:** chứng minh được luồng sửa nội dung → website hiển thị, đáp ứng chỉ tiêu G5 và nằm trong giới hạn G1.

## 7. Triển khai, nghiệm thu và bàn giao

- [ ] Chia công việc theo yêu cầu đã duyệt; mỗi việc có người làm, phụ thuộc và tiêu chí hoàn thành.
- [ ] Chuyển nội dung/ảnh hiện tại, giữ URL hoặc thực hiện xử lý URL cũ theo quyết định G4; không ghi đè thay đổi đang có trong dự án.
- [ ] Kiểm tra sản phẩm mới, thay giá/ảnh, ẩn nội dung và tính đồng nhất giữa các trang dùng chung dữ liệu.
- [ ] Kiểm tra luồng liên hệ; nếu có form, xác minh thông tin tới đúng người và lỗi gửi không bị báo thành công.
- [ ] Kiểm tra người không đăng nhập/không đủ quyền không thể sửa hoặc xuất bản; draft không xuất hiện công khai nếu có draft.
- [ ] Kiểm tra build/xuất bản lỗi, media mất và quy trình khôi phục; không làm mất bản website đang hoạt động.
- [ ] Kiểm tra bố cục với nội dung biên dài/ngắn, ảnh thay thế, mobile và trải nghiệm hiện có.
- [ ] Kiểm tra title, description, canonical, ảnh chia sẻ, sitemap và URL theo dữ liệu xuất bản.
- [ ] Người vận hành tự hoàn thành các tình huống thật; lưu kết quả nghiệm thu theo mã NT và xử lý lỗi chặn phát hành.
- [ ] Chốt dữ liệu thật, lịch chuyển đổi, bản sao lưu trước chuyển đổi, người trực và điều kiện quay lại bản cũ.
- [ ] Bàn giao tài khoản, hướng dẫn ngắn, nơi xem lỗi, chi phí định kỳ, cách sao lưu và đầu mối hỗ trợ.

**Đầu ra:** kết quả nghiệm thu, nội dung đã đối chiếu, hướng dẫn vận hành và biên bản bàn giao.

**Điều kiện chốt G7:** người dùng tự vận hành được, các yêu cầu bản đầu đã đạt và đã kiểm chứng cách khôi phục.

## Nhật ký quyết định và thay đổi

| Mã | Quyết định / vấn đề | Trạng thái | Người chốt | Ngày / hạn |
|---|---|---|---|---|
| QD-01 | Bản đầu quản lý nội dung thương hiệu và danh mục; khách liên hệ để mua | Đã xác nhận | Chủ dự án | 01/11/2026 |
| QD-02 | Thương hiệu chính thức và quan hệ giữa các tên hiện có | Chờ chốt | Chưa giao | Chưa đặt |
| QD-03 | Kênh liên hệ mua chính và người tiếp nhận | Chờ chốt | Chưa giao | Chưa đặt |
| QD-04 | Người cập nhật nội dung và quyền xuất bản | Chờ chốt | Chưa giao | Chưa đặt |
| QD-05 | Form footer: thay/bỏ/giữ và xử lý thực tế | Chờ chốt | Chưa giao | Chưa đặt |

Mẫu thay đổi sau khi chốt: mã thay đổi → yêu cầu gốc → lý do → bước/tài liệu bị ảnh hưởng → chi phí/thời gian → duyệt hoặc để sau → cập nhật phiên bản phạm vi.

**Bước làm việc tiếp theo:** hoàn thành G0 và G1 bằng dữ liệu thật; chưa lựa chọn nền tảng CMS hay chốt danh sách màn hình admin.
