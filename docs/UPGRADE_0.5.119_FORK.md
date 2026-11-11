# Nâng cấp fork lên 0.5.119 — 11/11/2026

## Phạm vi

Ghép upstream `54a88d0498ffea4e52576950235562ea420dc761` vào bản fork 0.5.116 tại `29253306`. Giữ các tính năng mới của tác giả và hành vi riêng đã được kiểm chứng. Root package được đồng bộ version 0.5.119 với CLI; đây là bản build của fork từ source đã ghim, không phải tuyên bố npm của tác giả đã phát hành 119.

## Tích hợp và tương thích

- Giải quyết xung đột `proxyFetch.js` bằng cách giữ kiểm tra AbortSignal trước dispatch, sau đó áp dụng cập nhật header Claude ở nền. Giữ proxy adapter, keep-alive recovery và Undici 7.30.2 của upstream.
- Giữ cancellation xuyên MITM/core/DNS/HTTPS và backoff có hủy, xác thực TLS, ánh xạ model chính xác, một header deadline trên mỗi tài khoản Antigravity và fallback khi capacity bị từ chối rõ ràng.
- Giữ deadline 200 giây cho lượt Gemini có lịch sử tool dài; không đưa lại guard giới hạn output 8.192 token.
- Bổ sung trích xuất thinking tier cho tên Carbon không kèm mức: high/medium/low được giữ đúng, mặc định medium. Model Carbon chưa có alias mapping vẫn đi native; không tự thay mapping hoặc cấu hình tài khoản đang lưu.
- Các cập nhật model/catalog/quota, SSE, proxy pools, STT, Codex, NVIDIA và routing của tác giả được giữ trong merge.

## Kiểm chứng

- 947 kiểm thử Vitest qua trong 84 file; 3 kiểm thử bỏ qua và 1 TODO được ghi riêng, không tính là passed.
- 6 kiểm thử NVIDIA dùng `node:test` chạy riêng đều qua.
- Hai test Anthropic còn kỳ vọng got-scraping đã được cập nhật để kiểm tra transport Undici hiện tại, strict TLS và hủy trước dispatch bằng mock, tránh gọi mạng thật. Test Read arguments được sửa để kiểm tra ở thời điểm finish, khi translator phát các tham số đã sanitize.
- Production build Next.js 16.4.4 và bundle MITM qua. Smoke và kết quả triển khai được ghi trong hồ sơ local của lần nâng cấp.
- Dependency đã cài và kiểm thử là Undici 7.30.2. Repository upstream bỏ qua `package-lock.json`; lockfile được đồng bộ local và không tự thay quy ước Git này.

## Quy tắc cho các lần sau

Thực hiện theo [quy trình nâng cấp fork](UPSTREAM_UPGRADE_POLICY.md). Có thể thay đổi cách triển khai khi kiến trúc upstream đổi, nhưng phải bảo toàn hành vi cần thiết bằng kiểm thử tương đương; không chọn nguyên một phía để xóa conflict và không cài đè làm mất bản vá riêng.

Auto-compaction trong gateway vẫn là đề xuất, chưa được thêm ở lần nâng cấp này. Thời hạn dài hơn không bảo đảm mọi request trả nhanh hoặc mọi account đều khỏe.
