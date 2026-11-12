# Phân tích video hero — 11/11/2026

Nguồn: `public/videos/coffee/coffee-cherry-sorting-hero.mp4`. Đọc trực tiếp sample tables/timestamps MP4, đối chiếu kích thước/thời lượng bằng Chrome và xem frame gốc không có CSS filter. Không sửa video hoặc mã ứng dụng trong lượt này.

## Số liệu thực tế

| Chỉ số | Giá trị |
|---|---:|
| Dung lượng file | 8.216.260 byte ≈ 8,22 MB / 7,84 MiB |
| Thời lượng trình duyệt | 32,390 giây |
| Độ phân giải mã hóa | 1280×720 |
| Codec | H.264/AVC, High profile, level 3.1 |
| Số frame | 648 |
| FPS trung bình của video track | 20,0206 |
| Khoảng cách PTS liên tiếp | 324 khoảng 33,333 ms; 323 khoảng 66,667 ms |
| Bitrate video trung bình | 2.023.580 bit/s ≈ 2,02 Mbps |
| Dữ liệu video | 8.187.068 byte, khoảng 99,64% file |
| Dữ liệu audio AAC | 8.382 byte, khoảng 0,10% file |
| Keyframe | 5; cách nhau khoảng 148–150 frame |
| MP4 progressive/fast start | `moov` ở đầu file, trước `mdat` |

648 frame / 32,3667 giây video track ≈ 20,02 FPS. Đã cộng composition offsets `ctts` và sắp presentation timestamps trước khi đếm khoảng cách, nên kết quả 33/67 ms không chỉ là thứ tự decode của B-frame. Nhịp frame không phải 50 ms đều của một video CFR 20 FPS.

## Vì sao thấp FPS nhưng vẫn nặng?

Dung lượng phụ thuộc bitrate nhân thời lượng: 2,02 Mbps × khoảng 32,4 giây / 8 ≈ 8,2 MB. Bitrate này không phải một mức lớn bất thường cho cảnh 720p có nhiều chuyển động, nhưng clip quá dài cho mục đích nền hero lặp. Số FPS thấp không tự bảo đảm file nhẹ hoặc hình sắc nét.

Audio/metadata chiếm rất ít; bỏ audio chỉ tiết kiệm khoảng 8 KB. File đã có `moov` ở đầu; đổi fast-start không làm dung lượng giảm đáng kể. Gần như toàn bộ byte nằm trong video thực sự.

## Vì sao hình mềm/bể hơn trên web?

- Frame 720p gốc đã mềm, đặc biệt cảnh băng chuyền/quả cà phê chuyển động ở mốc 12 giây. Có nhòe chuyển động và thiếu chi tiết ngay cả trước CSS. Chưa có master để phân tách định lượng lỗi lấy nét, motion blur, giảm kích thước và nén trước đó.
- `ImmersivePage` tăng chiều cao backdrop bằng `-inset-y-[16svh]`: khoảng 132% viewport. `object-cover` phải phóng/crop video để phủ vùng này.
- Ở viewport desktop 1920×911, video source 1280×720 bị scale tối thiểu `max(1920/1280, 911×1,32/720) × 1,02 ≈ 1,704` lần theo mỗi chiều CSS. Màn hình DPR 2 đòi hỏi nhiều pixel thiết bị hơn nữa. Đây là tính toán từ CSS; chưa phải kiểm kê GPU texture allocation.
- `HeroVideo` tiếp tục áp `blur(2px)` và `brightness(.55)`. Có thêm overlay đen 20% và các gradient đen trong `ImmersivePage`. Chi tiết bị mềm và tối đi thêm trước khi người xem thấy nó.
- Blur trên vùng lớn hơn viewport cũng thêm chi phí xử lý hiển thị; chưa đo riêng chi phí GPU của filter.

## Phát thử riêng video

Chrome/RTX 3050 ghi nhận 128 frame xử lý trong 6,510 giây và `droppedVideoFrames` tăng 0 trong lần thử riêng, tương đương khoảng 19,66 frame/giây theo bộ đếm. Kích thước 1280×720, thời lượng 32,390385 giây khớp dữ liệu MP4.

`requestVideoFrameCallback` chỉ gọi 27 lần, có các khoảng 1 giây trong môi trường browser automation. Không dùng tốc độ callback ~4,15 Hz này làm FPS hiển thị thực tế. Không kết luận rằng GPU yếu không thể làm video giật thêm; phép thử này chỉ đối chiếu file nguồn trên RTX.

## Hướng xử lý phù hợp

1. Chọn một đoạn loop 6–8 giây có nội dung phù hợp. Với bitrate hiện tại, 8 giây tương đương khoảng 2 MB dữ liệu video; kích thước encode thực tế còn tùy chuyển động/keyframe.
2. Nếu cần nét và mượt hơn, ưu tiên master có chi tiết thật và nhịp frame đều, chẳng hạn nguồn 1080p/30 FPS. Encode lại file 20 FPS thành 30 FPS không tự tạo lại các khoảnh khắc/chi tiết đã mất.
3. Đánh giá lại phần backdrop dư 32% chiều cao và blur 2 px theo visual mong muốn. Tăng chất lượng file trong khi vẫn phóng và blur mạnh sẽ có lợi ích thị giác hạn chế.
4. Đo bản xuất trên thiết bị mục tiêu trước khi chốt codec/bitrate; giữ hardware decode và chi phí compositing trong phạm vi kiểm tra.

Số đo máy đọc được: `docs/hero-video-audit.json`. Frame gốc tại 4 và 12 giây, bộ đếm phát thử và script đọc MP4 được lưu trong thư mục `video-audit` của evidence phiên làm việc.
