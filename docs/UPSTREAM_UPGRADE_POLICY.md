# Quy trình nâng cấp fork 9Router

Người dùng yêu cầu từ ngày 11/11/2026: mỗi lần nâng cấp phải kết hợp tính năng mới của tác giả với những sửa đổi riêng đã được chấp nhận. Có thể điều chỉnh cách triển khai theo kiến trúc mới, nhưng phải giữ hành vi cần thiết hoặc ghi rõ lý do thay thế và kiểm chứng tương đương.

## Những hành vi cần bảo toàn

| Hành vi | Vị trí chính và kiểm tra |
|---|---|
| Hủy request xuyên suốt MITM, handler, core và transport | Kiểm tra client disconnect trước/trong DNS, TCP/TLS, chờ headers và đọc stream |
| Không gửi lại request sau khi client hủy | Backoff có hủy; chặn trước dispatch; kiểm tra keep-alive replay và proxy adapter |
| DNS bypass vẫn xác thực TLS/hostname và tôn trọng AbortSignal | `open-sse/utils/bypassRequest.js`, đường gọi trong `proxyFetch.js` |
| Antigravity không lặp nhiều header deadline trên cùng account | Hook executor; lỗi capacity rõ ràng được chuyển sang account fallback |
| Lượt Gemini có lịch sử tool dài được chờ headers lâu hơn | Helper prefill và hook base executor; mặc định 200 giây, có cấu hình; client vẫn hủy ngay |
| Giữ đúng model và thinking tier | Mapping Antigravity chính xác; model lạ không được chọn bằng tiền tố mơ hồ; thêm model mới phải có test tier |
| Không cắt đầu ra bằng guard 8.192 token đã bị loại bỏ | Giữ ngân sách hợp lệ của client và kiểm tra tool call hoàn chỉnh, không chỉ headers hoặc thinking |
| Bảo toàn dữ liệu và cấu hình người dùng | Không thay account activation/priority, credentials, mapping, hosts hoặc CA ngoài thay đổi đã được yêu cầu |

## Các bước cho mỗi lần nâng cấp

1. Đọc `info.md`, `progress.md`, trạng thái Git và manifest ứng dụng cài. Phân biệt mã nguồn local, fork trên GitHub và binary đang chạy.
2. Ghim commit upstream; đối chiếu tag, npm và version của cả root/CLI package. Nếu tác giả ghi version không đồng nhất, ghi rõ và chuẩn hóa bản fork có chủ đích.
3. Lưu các thay đổi local hợp lệ trước khi ghép và tạo nhánh baseline. Không đưa token, DB, log riêng, backup hoặc dữ liệu cá nhân lên GitHub.
4. Đọc diff và mô phỏng merge. Xung đột Git chỉ là một phần; rà thêm những thay đổi về routing, timeout, cancellation, cache, proxy, SSE, tool signatures, usage và dependency.
5. Ghép theo hành vi, không chọn nguyên một phía để hết conflict. Có thể thay helper cũ nếu upstream có giải pháp tương đương đã được kiểm chứng; không giữ mã cũ một cách máy móc.
6. Đồng bộ dependency/lockfile. Chạy các test riêng và các test chịu ảnh hưởng của upstream; phân biệt passed, skipped và TODO. Chạy production build và smoke test với cổng/`DATA_DIR` riêng.
7. Khi triển khai đã được yêu cầu: sao lưu DB nhất quán và binary/CLI/MITM/config; xác minh PID và đường dẫn hiện tại; chuẩn bị rollback. Không dùng PID cũ từ báo cáo làm trạng thái hiện tại.
8. Triển khai bundle MITM tự chứa cùng launcher/app. Xác minh version, manifest, health, TLS và một lượt inference tổng hợp qua MITM thật; kiểm tra dữ liệu/cấu hình không bị đổi ngoài ý muốn.
9. Cập nhật records và báo đúng phạm vi kiểm chứng. Không coi push GitHub là đã nâng cấp ứng dụng cài, hoặc một probe nhỏ là bằng chứng mọi hội thoại dài đều hoạt động.

## Các giới hạn cần ghi rõ

- Tăng timeout tránh hủy sớm một số request hợp lệ, không làm Google xử lý nhanh hơn và không thay thế compaction.
- Auto-compaction riêng của gateway hiện là đề xuất, chưa phải tính năng đã triển khai.
- Không tự tắt hoặc bật tài khoản chậm. Thay chiến lược routing/cooldown phải có bằng chứng và nằm trong phạm vi người dùng yêu cầu.
- Nếu Windows UAC bị hủy, không lặp elevation tự động; ghi trạng thái đang chạy, khôi phục nếu cần và chờ chỉ dẫn tiếp theo.
