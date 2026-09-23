# PROCESS BACKEND APPBOOK

Tài liệu này là kế hoạch triển khai backend hoàn chỉnh cho APPBOOK - nền tảng đọc và đăng tải sách/truyện trực tuyến.

## 1. Mục tiêu và nguyên tắc

### 1.1. Mục tiêu

- Cung cấp REST API cho Mobile App và Web Admin.
- Hỗ trợ người đọc, người đăng và quản trị viên trên cùng một tài khoản.
- Đảm bảo quy trình kiểm duyệt nội dung trước khi công khai.
- Đảm bảo tính toàn vẹn của tiền, số dư ví, giao dịch và quyền đọc.
- Cung cấp thông báo, tin nhắn, báo cáo và thống kê.
- Có nền tảng đủ rõ ràng để mở rộng lên Redis, CDN, FCM, cổng thanh toán và search engine.

### 1.2. Nguyên tắc bắt buộc

1. `BTL_Mobile.sql` là source of truth của cơ sở dữ liệu.
2. Backend dùng Node.js, Express, Knex và mysql2.
3. Không để ORM tự tạo hoặc tự thay đổi schema production.
4. Không viết lại logic mua chương bằng JavaScript; phải gọi `sp_purchase_chapter`.
5. Mọi thay đổi số dư ví phải nằm trong transaction và ghi `wallet_entries`.
6. Không dùng `Number` hoặc `parseFloat` để tính tiền; dùng `decimal.js`.
7. Tất cả dữ liệu đầu vào phải được validate ở server.
8. Author không được xóa trực tiếp sách/chương bằng hard delete.
9. Mọi thay đổi quan trọng phải có audit log.
10. API phải kiểm tra authentication, authorization và ownership riêng biệt.

## 2. Hiện trạng cần xử lý

Backend hiện tại nằm trong `Backend_web/BackendAppBook` và đang có:

- Express app cơ bản.
- Kết nối trực tiếp bằng `mysql2/promise`.
- CRUD sinh tự động cho books, chapters, users và views.
- Swagger cơ bản.
- Middleware `notFound` và `errorHandler`.

Các vấn đề cần giải quyết trước khi mở rộng:

- Controller hiện dùng khóa `book_id`, trong khi schema dùng khóa chính `id`.
- CRUD hiện tại cho phép update/delete tự do, chưa có ownership và moderation.
- Chưa có authentication, JWT, refresh token và phân quyền.
- Chưa có validation schema.
- Chưa có transaction service cho topup, withdraw và refund.
- Cấu hình DB đang có giá trị mặc định nhạy cảm trong source code.
- Chưa có test, migration kiểm tra schema, logging chuẩn và background jobs.

## 3. Kiến trúc thư mục mục tiêu

```text
BackendAppBook/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── env.js
│   │   ├── db.js
│   │   └── swagger.js
│   ├── middlewares/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── validate.js
│   │   ├── rateLimit.js
│   │   ├── notFound.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── apiError.js
│   │   ├── asyncHandler.js
│   │   ├── decimal.js
│   │   ├── pagination.js
│   │   ├── tokens.js
│   │   └── audit.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── account/
│   │   ├── kyc/
│   │   ├── category/
│   │   ├── book/
│   │   ├── chapter/
│   │   ├── moderation/
│   │   ├── wallet/
│   │   ├── transaction/
│   │   ├── topup/
│   │   ├── withdraw/
│   │   ├── refund/
│   │   ├── follow/
│   │   ├── reading/
│   │   ├── rating/
│   │   ├── comment/
│   │   ├── message/
│   │   ├── notification/
│   │   ├── report/
│   │   ├── statistics/
│   │   └── recommendation/
│   ├── jobs/
│   └── routes/
├── tests/
├── docs/
├── .env.example
├── package.json
└── PROCESS_BACKEND.md
```

Mỗi module nghiệp vụ nên có:

```text
module/
├── module.routes.js
├── module.controller.js
├── module.service.js
├── module.repository.js
├── module.schema.js
└── module.errors.js
```

## 4. Chuẩn bị môi trường và phụ thuộc

### 4.1. Công cụ

- Node.js LTS.
- MySQL 8.0+.
- npm.
- MySQL Workbench hoặc client tương đương.
- Postman/Insomnia.
- Git.

### 4.2. Phụ thuộc runtime đề xuất

- `express`
- `mysql2`
- `knex`
- `dotenv`
- `cors`
- `helmet`
- `express-rate-limit`
- `jsonwebtoken`
- `bcrypt` hoặc `argon2`
- `decimal.js`
- `zod`
- `swagger-jsdoc`
- `swagger-ui-express`
- `pino` hoặc `morgan`
- `socket.io`
- `node-cron` hoặc queue worker

### 4.3. Phụ thuộc test

- `vitest` hoặc `jest`
- `supertest`
- `testcontainers` nếu môi trường cho phép chạy MySQL test container

### 4.4. Biến môi trường

Tạo `.env.example` với các nhóm biến:

```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api

DB_HOST=localhost
DB_PORT=3306
DB_NAME=web_sach
DB_USER=root
DB_PASSWORD=
DB_CONNECTION_LIMIT=10

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=30

CORS_ORIGINS=http://localhost:3001

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
```

Không commit `.env`, mật khẩu DB, JWT secret, API key hoặc private key.

## 5. Phase 0 - Kiểm tra cơ sở dữ liệu

### Công việc

- Tạo database bằng `BTL_Mobile.sql` trên MySQL 8.0+.
- Kiểm tra tất cả bảng, foreign key, index và `CHECK` constraint.
- Kiểm tra trigger tự tạo wallet sau khi insert account.
- Kiểm tra procedure `sp_purchase_chapter` bằng dữ liệu test.
- Kiểm tra ba view:
  - `v_public_books`
  - `v_moderation_queue`
  - `v_author_revenue`
- Kiểm tra partition hiện tại của `chapter_views`.
- Ghi lại phiên bản MySQL đã dùng.

### Tiêu chí hoàn thành

- Schema chạy từ đầu không lỗi.
- Insert account tạo được wallet.
- Dữ liệu test có thể tạo sách, chương và giao dịch mua.
- Rollback xảy ra khi procedure mua chương gặp lỗi.

## 6. Phase 1 - Nền tảng Express và database

### Công việc

- Tách `app.js` và `server.js` vào cấu trúc mới.
- Tạo Knex connection pool.
- Thêm endpoint `GET /health` kiểm tra API và DB.
- Chuẩn hóa response thành công và lỗi.
- Dùng `asyncHandler` để tránh lặp `try/catch`.
- Thêm `helmet`, CORS whitelist, request logging và giới hạn kích thước body.
- Chuẩn hóa lỗi MySQL thành lỗi API không lộ SQL nội bộ.
- Cấu hình Swagger theo biến môi trường.

### Tiêu chí hoàn thành

- API khởi động được khi thiếu biến môi trường bắt buộc thì báo lỗi rõ ràng.
- `GET /health` trả về trạng thái API và database.
- Unknown route trả HTTP 404 thống nhất.
- Lỗi server không trả stack trace ở production.

## 7. Phase 2 - Authentication và account

### API chính

```text
POST /api/auth/register
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/me
PATCH /api/me
GET  /api/me/sessions
DELETE /api/me/sessions/:id
```

### Quy tắc

- Username, email hoặc phone phải unique.
- Tài khoản mới có `pending_verify`.
- OTP chỉ lưu `code_hash`, không lưu mã gốc.
- OTP có giới hạn số lần thử và thời hạn.
- Mật khẩu tối thiểu 8 ký tự, gồm chữ và số.
- Access token ngắn hạn; refresh token lưu hash trong `user_sessions`.
- Logout thu hồi đúng session.
- Reset password thu hồi toàn bộ session cũ.
- Khóa tài khoản thu hồi toàn bộ session.
- Không cho đăng ký role admin/support từ public API.

### Tiêu chí hoàn thành

- Đăng ký, verify OTP, login và refresh hoạt động.
- Sai mật khẩu nhiều lần sẽ tạm khóa.
- Không thể dùng refresh token đã revoke.
- Endpoint protected từ chối request không có token hợp lệ.

## 8. Phase 3 - Phân quyền và validation

### Middleware

- `authenticate`: xác thực JWT và kiểm tra account còn active.
- `authorize`: kiểm tra `user`, `support`, `admin`, `super_admin`.
- `requireOwner`: kiểm tra `books.owner_id` hoặc tài nguyên liên quan.
- `validate`: chạy schema Zod cho params, query và body.

### Quy tắc quyền

- Reader có thể đọc, follow, bookmark, comment, rating và mua.
- Author có quyền quản lý nội dung do mình sở hữu.
- Admin duyệt nội dung, tài chính, report và tài khoản.
- Super admin quản lý admin/support và cấu hình nhạy cảm.
- Không tin role hoặc owner ID do client gửi lên.

## 9. Phase 4 - Category, book và chapter

### API công khai

```text
GET /api/books
GET /api/books/:id
GET /api/books/:id/chapters
GET /api/chapters/:id
GET /api/categories
GET /api/books/search
```

### API author

```text
POST   /api/author/books
PATCH  /api/author/books/:id
POST   /api/author/books/:id/chapters
PATCH  /api/author/chapters/:id
POST   /api/author/books/:id/delete-request
POST   /api/author/books/:id/combos
PATCH  /api/author/combos/:id
```

### Quy tắc

- Danh sách public chỉ lấy sách `published` và chưa bị soft delete.
- Sách mới tạo phải ở `pending` khi gửi duyệt.
- Chương mới tạo phải ở `pending`.
- `is_free = 1` thì `price = 0`; chương trả phí phải có giá dương.
- Nội dung trả phí chỉ trả toàn bộ content khi user có quyền đọc.
- User chưa mua chỉ được nhận `preview_text` hoặc preview giới hạn.
- Author chỉ được truy cập sách/chương thuộc mình.
- Xóa là soft delete hoặc tạo yêu cầu xóa tùy nghiệp vụ.
- Không cho sửa tùy ý các trường dẫn xuất như `purchase_count`, `total_revenue`.

## 10. Phase 5 - Moderation

### API admin

```text
GET  /api/admin/moderation
GET  /api/admin/moderation/:id
POST /api/admin/moderation/:id/approve
POST /api/admin/moderation/:id/reject
```

### Luồng duyệt

1. Author gửi sách/chương.
2. Backend đặt trạng thái `pending`.
3. Backend tạo `moderation_requests`.
4. Admin duyệt hoặc từ chối trong một DB transaction.
5. Cập nhật status nội dung và request cùng lúc.
6. Ghi audit log.
7. Tạo notification cho author.

### Versioning chương

- Nếu chương chưa public và chưa bán, có thể update thông thường.
- Nếu chương đã public hoặc đã có purchase, lưu bản cũ vào `chapter_versions` trước khi update.
- Thay đổi nội dung hoặc giá quan trọng phải tạo moderation request.

## 11. Phase 6 - Wallet và mua chương

### API

```text
GET  /api/me/wallet
GET  /api/me/wallet/entries
GET  /api/me/purchases
POST /api/chapters/:id/purchase
GET  /api/transactions/:id
```

### Mua chương

- Controller nhận `buyerId` từ JWT và `chapterId` từ params.
- Service gọi `sp_purchase_chapter`.
- Không nhận giá từ client.
- Không tự trừ/cộng ví bằng JS.
- Map kết quả procedure:
  - `SUCCESS` -> 201 hoặc 200.
  - `CHAPTER_NOT_FOUND` -> 404.
  - `CHAPTER_NOT_AVAILABLE` -> 409.
  - `FREE_CHAPTER` -> 409.
  - `OWNER_CANNOT_BUY` -> 403.
  - `ALREADY_PURCHASED` -> 409 hoặc trả entitlement hiện tại.
  - `INSUFFICIENT_BALANCE` -> 402.
  - `ERROR` -> 500.

### Quy tắc tiền

- mysql2 trả `DECIMAL` dạng string và phải giữ nguyên.
- Dùng `decimal.js` khi cần tính hoặc so sánh.
- Ledger amount luôn dương; hướng nằm trong `direction`.
- Không update balance mà không tạo ledger entry tương ứng.

## 12. Phase 7 - Topup

### API

```text
POST /api/topups
GET  /api/topups
GET  /api/topups/:id
POST /api/topups/:provider/webhook
```

### Luồng webhook

1. Xác minh chữ ký gateway.
2. Tìm order theo code hoặc gateway transaction ID.
3. Lock order và wallet trong transaction.
4. Nếu order đã success, trả 200 idempotent.
5. Cập nhật order.
6. Tạo transaction `topup`.
7. Cộng wallet balance và `total_topup`.
8. Ghi `wallet_entries` với reason `topup`.
9. Commit.
10. Tạo notification.

Không cộng tiền chỉ dựa vào redirect từ client; chỉ webhook hợp lệ mới có quyền xác nhận.

## 13. Phase 8 - Withdraw và KYC

### API

```text
GET  /api/me/bank-accounts
POST /api/me/bank-accounts
PATCH /api/me/bank-accounts/:id
POST /api/me/withdrawals
GET  /api/me/withdrawals
GET  /api/admin/withdrawals
POST /api/admin/withdrawals/:id/approve
POST /api/admin/withdrawals/:id/reject
POST /api/me/kyc
GET  /api/me/kyc
```

### Tạo yêu cầu rút

- Kiểm tra role/author, KYC và hạn mức cấu hình.
- Lock wallet bằng `FOR UPDATE`.
- Kiểm tra balance khả dụng.
- Snapshot thông tin ngân hàng vào `bank_snapshot`.
- Trừ balance, tăng `pending_withdraw`.
- Ghi ledger `withdraw_hold`.
- Tạo `withdraw_requests` và transaction tương ứng.

### Duyệt hoặc từ chối

- Lock withdrawal request và wallet.
- Chỉ xử lý request đang `pending` hoặc trạng thái hợp lệ kế tiếp.
- Duyệt: giảm `pending_withdraw`, ghi `withdraw_done`.
- Từ chối: giảm `pending_withdraw`, cộng lại balance, ghi `withdraw_refund`.
- Ghi reviewer, thời gian, lý do và audit log.
- Không lưu CCCD dạng plain text; mã hóa ở application layer.

## 14. Phase 9 - Refund

### API

```text
POST /api/me/refunds
GET  /api/me/refunds
GET  /api/admin/refunds
POST /api/admin/refunds/:id/approve
POST /api/admin/refunds/:id/reject
```

### Luồng hoàn tiền

- Kiểm tra transaction mua hợp lệ và chưa refund.
- Lock refund request, transaction, purchase và các wallet liên quan.
- Cộng tiền cho buyer.
- Nếu `clawback_from_seller = 1`, trừ phần seller đã nhận.
- Đánh dấu purchase `is_revoked = 1`.
- Tạo transaction refund liên kết bằng `ref_transaction_id`.
- Ghi ledger `refund_in` và `refund_clawback`.
- Đổi transaction gốc thành `refunded`.
- Gửi notification và audit log.

## 15. Phase 10 - Follow, library, rating và comment

### API

```text
POST   /api/follows
DELETE /api/follows/:type/:id
GET    /api/me/follows
POST   /api/bookmarks
DELETE /api/bookmarks/:bookId
GET    /api/me/bookmarks
PUT    /api/me/reading-history/:bookId
GET    /api/me/reading-history
POST   /api/books/:id/ratings
POST   /api/books/:id/comments
GET    /api/books/:id/comments
PATCH  /api/comments/:id
DELETE /api/comments/:id
```

### Quy tắc

- Tôn trọng unique key để xử lý request lặp.
- Dùng transaction khi rating thay đổi cần cập nhật aggregate.
- Comment dùng soft delete.
- Kiểm tra book/chapter tồn tại và đang hiển thị.
- Chỉ chủ comment hoặc admin được sửa/xóa.
- Ghi `chapter_views` cho lượt đọc hợp lệ, không làm lộ toàn bộ thông tin khách.

## 16. Phase 11 - Report và auto-hide

### API

```text
POST /api/reports
GET  /api/admin/reports
POST /api/admin/reports/:id/resolve
POST /api/admin/reports/:id/dismiss
```

### Luồng

1. Validate target và lý do report.
2. Chống report trùng nhờ unique key.
3. Tạo report.
4. Đếm report `pending/reviewing` theo target.
5. Đọc ngưỡng từ `system_settings`.
6. Nếu đạt ngưỡng, đổi nội dung sang `hidden`.
7. Ghi audit log với actor `system`.
8. Admin xử lý và khôi phục/giữ ẩn theo kết quả.

## 17. Phase 12 - Message và notification

### Message API

```text
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/:id/messages
POST /api/conversations/:id/messages
POST /api/users/:id/block
DELETE /api/users/:id/block
```

### Quy tắc

- Sắp xếp hai account ID trước khi tạo conversation.
- Kiểm tra người gửi thuộc conversation.
- Không gửi tin cho user đã block.
- Socket.IO chỉ là kênh realtime; dữ liệu chính vẫn lưu MySQL.
- Notification luôn được lưu DB trước khi push FCM.
- Push thất bại không được làm mất notification.

## 18. Phase 13 - Admin và statistics

### Admin API

```text
GET  /api/admin/accounts
PATCH /api/admin/accounts/:id/lock
PATCH /api/admin/accounts/:id/unlock
PATCH /api/admin/accounts/:id/delete
GET  /api/admin/transactions
GET  /api/admin/audit-logs
GET  /api/admin/settings
PATCH /api/admin/settings/:key
GET  /api/admin/statistics/platform
GET  /api/admin/statistics/books
GET  /api/admin/statistics/authors
```

### Quy tắc

- Admin không được tự nâng quyền lên super admin.
- Khóa account phải revoke tất cả session.
- Xóa account là soft delete và phải xử lý sách đang published.
- Dashboard đọc bảng `daily_*_stats`, không scan trực tiếp bảng log lớn.
- Các giá trị business như phí nền tảng, hạn mức rút, timeout OTP đọc từ `system_settings`.

## 19. Background jobs

| Job                        |        Tần suất | Công việc                                 |
| -------------------------- | --------------: | ----------------------------------------- |
| `cleanExpiredOtp`          |         Mỗi giờ | Dọn OTP hết hạn hoặc đánh dấu không dùng  |
| `expireTopupOrders`        |          5 phút | Đổi topup pending quá hạn thành expired   |
| `rollupDailyStats`         | 00:05 hằng ngày | Tổng hợp platform/book/author stats       |
| `addChapterViewPartition`  |       Đầu tháng | Thêm partition cho tháng kế tiếp          |
| `updateCategoryAffinity`   |       Hằng ngày | Tính sở thích thể loại từ reading history |
| `pushPendingNotifications` |        Liên tục | Gửi FCM cho notification chưa push        |

Mỗi job phải có log bắt đầu, kết thúc, số bản ghi xử lý và lỗi. Job có thể chạy lại mà không tạo dữ liệu trùng.

## 20. Bảo mật và vận hành

- Dùng HTTPS khi deploy.
- Hash mật khẩu bằng bcrypt/argon2.
- Hash refresh token trước khi lưu.
- Rate limit login, OTP, register, topup, withdraw và report.
- Validate MIME type, kích thước file và quyền truy cập khi upload.
- Không đưa `password_hash`, token hash, CCCD, gateway secret vào response.
- Dùng parameterized query, không nối chuỗi input vào SQL.
- Cấu hình CORS theo whitelist.
- Dùng helmet và giới hạn JSON body.
- Sanitize nội dung comment và dữ liệu hiển thị.
- Ghi audit cho tài chính, moderation, account lock và setting changes.
- Backup MySQL định kỳ; ưu tiên backup transaction và ledger.
- Theo dõi lỗi bằng log tập trung và Sentry khi deploy production.

## 21. Kiểm thử

### Unit test

- Password và OTP hashing.
- JWT access/refresh.
- Permission và ownership.
- Decimal calculation.
- Mapping lỗi stored procedure.
- Validate payload và trạng thái nghiệp vụ.

### Integration test

- Register -> verify -> login.
- Refresh token và revoke session.
- Tạo sách -> moderation -> publish.
- Tạo chương -> preview -> purchase.
- Purchase đồng thời cùng một chương.
- Webhook topup lặp nhiều lần.
- Withdraw approve/reject.
- Refund có và không có clawback.
- Auto-hide report.

### Security test

- Không truy cập tài nguyên của account khác.
- Không bỏ qua moderation bằng request giả.
- Không tin giá tiền từ client.
- Không dùng token đã revoke.
- Không SQL injection qua filter/search.
- Không lộ dữ liệu tài khoản hoặc tài chính trong response.

## 22. Swagger và quy ước API

- Prefix API: `/api`.
- Dùng HTTP status thống nhất:
  - `200` đọc/cập nhật thành công.
  - `201` tạo thành công.
  - `204` xóa thành công không có body.
  - `400` payload không hợp lệ.
  - `401` chưa xác thực.
  - `403` không đủ quyền.
  - `404` không tìm thấy.
  - `409` xung đột trạng thái hoặc dữ liệu trùng.
  - `422` nghiệp vụ không thể thực hiện.
  - `429` vượt rate limit.
  - `500` lỗi hệ thống.
- Response lỗi nên có dạng:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Số dư không đủ để mua chương"
  }
}
```

- Bổ sung OpenAPI cho toàn bộ endpoint trước khi tích hợp Mobile App hoặc Web Admin.

## 23. Lộ trình MVP đề xuất

### Mốc 1 - Backend chạy được

- Database.
- Express chuẩn hóa.
- Health check.
- Auth cơ bản.
- Swagger.

### Mốc 2 - Nội dung

- Categories.
- Books.
- Chapters.
- Public reading.
- Author ownership.
- Moderation.

### Mốc 3 - Tài chính lõi

- Wallet.
- Purchase procedure.
- Transaction history.
- Topup mock webhook.
- Ledger verification.

### Mốc 4 - Admin và tương tác

- Account management.
- Withdraw.
- Refund.
- Report.
- Bookmark.
- Reading history.
- Rating/comment.

### Mốc 5 - Production readiness

- Jobs.
- FCM.
- Socket.IO.
- Real payment gateway.
- Redis cache.
- Object storage/CDN.
- Monitoring, backup và CI/CD.

## 24. Checklist nghiệm thu cuối

- [ ] Schema MySQL chạy sạch từ đầu.
- [ ] Backend dùng biến môi trường, không có secret hard-code.
- [ ] Auth và refresh token hoạt động.
- [ ] Role và ownership được kiểm tra ở server.
- [ ] Sách/chương mới luôn qua moderation.
- [ ] Chương đã mua được cấp quyền đúng.
- [ ] Purchase chỉ gọi stored procedure.
- [ ] Mọi thay đổi ví đều có ledger.
- [ ] Topup webhook idempotent.
- [ ] Withdraw và refund có transaction/locking.
- [ ] Tiền không bị tính bằng floating point.
- [ ] Soft delete được dùng cho dữ liệu nghiệp vụ.
- [ ] Report có auto-hide theo setting.
- [ ] Notification được lưu trước khi push.
- [ ] Jobs có thể chạy lại an toàn.
- [ ] Swagger đầy đủ.
- [ ] Unit, integration và security test đạt.
- [ ] Có logging, audit log, backup và hướng dẫn deploy.
