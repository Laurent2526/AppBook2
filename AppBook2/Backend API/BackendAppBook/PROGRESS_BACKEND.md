# PROGRESS BACKEND APPBOOK

File này ghi lại tiến độ thực tế, quyết định kỹ thuật và ngữ cảnh cần giữ khi tiếp tục xây dựng backend.

- Kế hoạch tổng thể: `PROCESS_BACKEND.md`
- Đặc tả nghiệp vụ bắt buộc: `../../PhanTichNV_Mobile.md`
- Database source of truth: `../../BTL_Mobile.sql`
- Backend root: `Backend_web/BackendAppBook`

## 1. Trạng thái hiện tại

**Đang ở phase:** Phase 13 đã hoàn thiện phần Admin statistics và daily rollup cơ bản; Book/Chapter update-delete đã được bổ sung.

**Chức năng tiếp theo:** Background jobs vận hành, Socket.IO realtime và FCM retry.

**Công cụ kiểm thử API:** Swagger UI đã được bật tại `/api-docs` cho app `src`.

**Nguyên tắc làm việc:** hoàn thiện từng lát chức năng, viết test ngay sau khi triển khai, không mở rộng phase tiếp theo khi phase hiện tại chưa có kiểm chứng.

**Quy định bắt buộc:** mỗi khi hoàn thiện một chức năng, phải cập nhật file này ngay trong cùng lượt làm việc. Bản cập nhật tối thiểu phải ghi: tên chức năng, endpoint hoặc module liên quan, các file đã thay đổi, kết quả test/kiểm chứng và chức năng tiếp theo.

**Phạm vi nghiệp vụ bắt buộc:** backend phải xây dựng đầy đủ các chức năng được mô tả trong `PhanTichNV_Mobile.md`, bao gồm Mobile App, Web Admin, authentication, nội dung, moderation, tài chính, tương tác, tin nhắn, thông báo, báo cáo, thống kê và các yêu cầu bảo mật/vận hành. Không được coi project hoàn thiện chỉ dựa trên các chức năng MVP hiện tại; mỗi nhóm nghiệp vụ phải được triển khai, kiểm thử và ghi nhận tiến độ trước khi nghiệm thu cuối.

**Tiêu chuẩn hoàn thiện:** không được đánh dấu chức năng là hoàn thành nếu chưa kiểm thử kỹ. Mỗi chức năng phải có test cho luồng thành công, dữ liệu không hợp lệ, lỗi quyền/trạng thái và các trường hợp biên quan trọng; sau đó phải chạy regression test toàn bộ chức năng trước đó. Với chức năng có transaction, phải xác nhận dữ liệu database sau khi chạy và đảm bảo rollback/idempotency khi phù hợp.

**Quy trình nghiệm thu bắt buộc:**

1. Viết hoặc cập nhật test trước khi kết luận chức năng hoàn thiện.
2. Chạy test hẹp nhất cho chức năng vừa làm.
3. Sửa toàn bộ lỗi phát hiện và chạy lại test hẹp.
4. Chạy toàn bộ test suite để kiểm tra regression.
5. Kiểm tra trực tiếp response API, HTTP status và dữ liệu database quan trọng.
6. Chỉ sau khi tất cả kiểm tra đạt mới cập nhật trạng thái `hoàn thành` và nhật ký thay đổi.

**Thứ tự đối chiếu mỗi chức năng:**

1. Đọc nghiệp vụ tương ứng trong `PhanTichNV_Mobile.md`.
2. Đối chiếu bảng, constraint, trigger, procedure và view trong `BTL_Mobile.sql`.
3. Triển khai API/service theo đúng quyền và trạng thái nghiệp vụ.
4. Viết test thành công, lỗi, quyền, transaction và regression.
5. Cập nhật `PROGRESS_BACKEND.md` cùng phần nghiệp vụ đã đáp ứng.

## 2. Đã hoàn thiện

### 2.1. Môi trường và kiến trúc

- Node.js + Express CommonJS.
- MySQL 8.0+.
- Knex + mysql2 cho kết nối database.
- Cấu hình environment bằng `dotenv` và `zod`.
- Kết nối MySQL hiện tại:
  - host: `localhost`
  - port: `3306`
  - user: `root`
  - database: `web_sach`
  - password lấy từ `.env` local, không ghi secret vào tài liệu public.
- Pool database dùng UTC và `utf8mb4`.
- Có graceful shutdown trong `src/server.js`.
- Có `knexfile.js` cho development, test và production.
- Có Swagger UI/OpenAPI JSON cho API mới tại `/api-docs` và `/openapi.json`.

### 2.2. Package đã cài

Runtime:

- `express`
- `mysql2`
- `knex`
- `dotenv`
- `cors`
- `helmet`
- `express-rate-limit`
- `argon2`
- `jsonwebtoken`
- `decimal.js`
- `zod`
- `pino-http`
- `swagger-jsdoc`
- `swagger-ui-express`

Development/test:

- `nodemon`
- `supertest`
- `vitest`

### 2.3. Bootstrap API

Đã có:

- `GET /`
- `GET /api/health`
- CORS whitelist.
- Helmet.
- Global rate limit.
- Request logging bằng `pino-http`.
- JSON body limit `1mb`.
- Global `404` handler.
- Global error response dạng:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Message"
  }
}
```

### 2.4. Authentication

Đã triển khai các endpoint:

```text
POST /api/auth/register
POST /api/auth/verify-otp
POST /api/auth/login
POST /api/auth/refresh
GET  /api/me
```

Chi tiết:

- Register tạo account ở trạng thái `pending_verify`.
- Mật khẩu hash bằng Argon2.
- OTP 6 chữ số, chỉ lưu `code_hash` trong database.
- OTP có thời hạn 5 phút và tối đa 5 lần thử.
- Development trả `debugOtp` để test local; production không trả OTP.
- Verify OTP chuyển account sang `active`.
- Ghi `email_verified_at` hoặc `phone_verified_at`.
- Login nhận username, email hoặc phone.
- Sai mật khẩu tăng `failed_login_count`.
- Sau 5 lần sai, account bị tạm khóa 15 phút.
- Login tạo access token JWT và refresh token ngẫu nhiên.
- Chỉ hash refresh token bằng SHA-256 rồi lưu vào `user_sessions`.
- Refresh token rotation: token cũ bị revoke sau khi refresh thành công.
- Access token chứa `sub`, `role` và `sessionId`.
- `authenticate` kiểm tra JWT, session chưa revoke, session chưa hết hạn và account đang `active`.
- `/api/me` đã dùng middleware authenticate để kiểm tra protected route.

### 2.5. Refund và xử lý tranh chấp

Đã triển khai luồng hoàn tiền cơ bản theo mô hình backend hiện có:

```text
POST /api/me/refunds
GET  /api/me/refunds
GET  /api/admin/refunds
POST /api/admin/refunds/:id/approve
POST /api/admin/refunds/:id/reject
```

Chi tiết:

- Người dùng gửi yêu cầu hoàn tiền cho giao dịch mua đã tồn tại và chưa bị hoàn.
- Kiểm tra quyền sở hữu purchase và giao dịch gốc trước khi tạo refund request.
- Tạo refund request ở trạng thái `pending` và lưu evidence URLs.
- Admin duyệt/từ chối yêu cầu qua route riêng.
- Khi admin approve:
  - cộng lại số tiền cho buyer vào ví
  - ghi ledger `refund_in`
  - nếu có `seller_amount`, thực hiện clawback và ghi `refund_clawback`
  - đánh dấu purchase là `is_revoked = 1`
  - cập nhật giao dịch gốc thành `refunded`
- Module đã được kiểm thử bằng integration test hẹp.

## 3. File quan trọng hiện tại

```text
src/
├── app.js
├── server.js
├── config/
│   ├── env.js
│   └── db.js
├── middlewares/
│   ├── authenticate.js
│   ├── authorize.js
│   ├── errorHandler.js
│   └── notFound.js
├── modules/
│   ├── auth/
│       ├── auth.controller.js
│       ├── auth.repository.js
│       ├── auth.routes.js
│       ├── auth.schema.js
│       └── auth.service.js
│   ├── category/
│   │   ├── category.controller.js
│   │   ├── category.repository.js
│   │   └── category.routes.js
│   └── book/
│       ├── book.controller.js
│       ├── book.repository.js
│       ├── book.routes.js
│       ├── book.schema.js
│       ├── book.service.js
│       └── chapter.routes.js
│   └── moderation/
│       ├── moderation.controller.js
│       ├── moderation.repository.js
│       ├── moderation.routes.js
│       ├── moderation.schema.js
│       └── moderation.service.js
│   └── wallet/
│       ├── wallet.controller.js
│       ├── wallet.repository.js
│       ├── wallet.routes.js
│       ├── wallet.schema.js
│       └── wallet.service.js
│   └── bank/
│       ├── bank.controller.js
│       ├── bank.repository.js
│       ├── bank.routes.js
│       ├── bank.schema.js
│       └── bank.service.js
│   ├── kyc/
│   │   ├── kyc.controller.js
│   │   ├── kyc.repository.js
│   │   ├── kyc.routes.js
│   │   ├── kyc.schema.js
│   │   └── kyc.service.js
│   └── withdraw/
│       ├── withdraw.controller.js
│       ├── withdraw.repository.js
│       ├── withdraw.routes.js
│       ├── withdraw.schema.js
│       └── withdraw.service.js
│   └── topup/
│       ├── topup.controller.js
│       ├── topup.repository.js
│       ├── topup.routes.js
│       ├── topup.schema.js
│       └── topup.service.js
├── routes/
│   └── index.js
└── utils/
    ├── apiError.js
    └── tokens.js

tests/
├── auth.integration.test.js
├── content.integration.test.js
├── moderation.integration.test.js
├── wallet.integration.test.js
└── withdraw.integration.test.js

knexfile.js
vitest.config.js
.env.example
PROCESS_BACKEND.md
PROGRESS_BACKEND.md
```

## 4. Kiểm thử đã chạy

Lệnh chạy test:

```powershell
Set-Location D:\BTL_Mobile\Backend_web\BackendAppBook
npm test
```

Kết quả trước khi moderation:

```text
Test Files  1 passed
Tests       3 passed
```

Các test hiện có:

1. Reject registration payload không hợp lệ.
2. Register -> verify OTP -> account active.
3. Login -> protected `/api/me` -> refresh rotation -> access/refresh token cũ bị revoke.

Đã smoke test `/api/health` thành công với database `web_sach`.

Kết quả mới nhất sau withdraw/KYC:

```text
Test Files  5 passed
Tests       14 passed
```

## 5. Quyết định kỹ thuật cần giữ

1. `BTL_Mobile.sql` là source of truth; không dùng ORM tự tạo schema production.
2. Dùng Knex raw/query builder, không chuyển sang Prisma.
3. Giá tiền từ MySQL `DECIMAL` phải giữ dạng string; khi tính toán dùng `decimal.js`.
4. Mọi biến động ví phải nằm trong transaction và ghi `wallet_entries`.
5. Mua chương phải gọi stored procedure `sp_purchase_chapter`.
6. Không trust `role`, `owner_id` hoặc giá tiền do client gửi.
7. Author chỉ được thao tác nội dung thuộc mình.
8. Nội dung mới phải qua `moderation_requests` trước khi publish.
9. Xóa nội dung nghiệp vụ dùng soft delete hoặc yêu cầu moderation.
10. Auth test đang chạy trực tiếp trên MySQL local và tự dọn account test sau khi chạy.

## 6. Việc cần làm tiếp theo

### Bước kế tiếp: Category, Book, Chapter

Thứ tự triển khai:

1. Tạo module `category` đọc danh sách category active.
2. Tạo public book list từ view `v_public_books`.
3. Thêm pagination, search và filter category.
4. Tạo book cho author đã authenticate.
5. Kiểm tra ownership bằng `owner_id` từ JWT, không nhận từ body.
6. Tạo chapter thuộc book của author.
7. Validate giá theo `is_free` và `price`.
8. Public read chỉ trả sách/chương `published`.
9. Chương trả phí chưa mua chỉ trả `preview_text`.
10. Thêm test ownership và trạng thái public.

### Sau Category/Book/Chapter

1. Moderation books/chapters.
2. Public chapter reading và entitlement.
3. Wallet và gọi `sp_purchase_chapter`.
4. Topup webhook.
5. Withdraw và KYC.
6. Refund.
7. Follow, bookmark, reading history.
8. Rating, comment và report.
9. Notification và message.
10. Statistics và background jobs.

## 6.1. Category, Book và Chapter đã hoàn thiện

### Endpoint/module

```text
GET  /api/categories
GET  /api/books
GET  /api/books/:id
GET  /api/books/:bookId/chapters
GET  /api/chapters/:id
POST /api/books
POST /api/books/:bookId/chapters
```

### Quy tắc đã triển khai

- Category public chỉ trả category `is_active = 1`.
- Public book lấy từ view `v_public_books`.
- Public book hỗ trợ pagination, search bằng `LIKE`, filter writing status và category.
- Author tạo book bằng account trong JWT; không nhận `owner_id` từ body.
- Book mới tạo ở trạng thái `pending`.
- Chapter mới tạo ở trạng thái `pending`.
- Kiểm tra book ownership trước khi tạo chapter.
- Validate chapter free/paid theo `isFree` và `price`.
- Public chỉ trả book/chapter `published`.
- Paid chapter chưa có entitlement chỉ trả metadata và `preview_text`, không trả `content`/`content_url`.
- Tạo slug tự động từ title nếu client không gửi slug.
- Duplicate slug và duplicate chapter number trả lỗi `409`.
- Dùng transaction khi tạo book và gắn category.

### File đã thay đổi/thêm

- `src/utils/slug.js`
- `src/modules/category/category.repository.js`
- `src/modules/category/category.controller.js`
- `src/modules/category/category.routes.js`
- `src/modules/book/book.schema.js`
- `src/modules/book/book.repository.js`
- `src/modules/book/book.service.js`
- `src/modules/book/book.controller.js`
- `src/modules/book/book.routes.js`
- `src/modules/book/chapter.routes.js`
- `src/routes/index.js`
- `tests/content.integration.test.js`

### Kiểm chứng

```text
Test Files  2 passed
Tests       6 passed
```

- Auth regression vẫn pass 3 test.
- Content pass 3 test: category list, pending content/ownership và public paid chapter protection.
- Dữ liệu test tự dọn account/book sau khi chạy.

### Chức năng tiếp theo

- Xây moderation request khi tạo hoặc chỉnh sửa book/chapter.
- Tạo admin approve/reject và đồng bộ status trong transaction.

## 6.2. Moderation sách và chương đã hoàn thiện

### Endpoint/module

```text
GET  /api/admin/moderation
POST /api/admin/moderation/:id/approve
POST /api/admin/moderation/:id/reject
```

### Quy tắc đã triển khai

- Tạo book/chapter tự động tạo `moderation_requests` trong cùng transaction.
- Queue lấy từ view `v_moderation_queue`.
- Chỉ `support`, `admin`, `super_admin` được xem và xử lý queue.
- Approve chuyển target sang `published`, cập nhật `published_at` và request sang `approved`.
- Reject chuyển target sang `rejected`, lưu `reject_reason` và request sang `rejected`.
- Request đã xử lý không được xử lý lần hai, trả `409`.
- Approve/reject khóa moderation request và target bằng `FOR UPDATE` trong transaction.
- Mọi quyết định ghi `audit_logs` với actor, trạng thái cũ và trạng thái mới.
- Rate limit auth được bỏ qua trong `NODE_ENV=test`; development/production vẫn giới hạn.

### File đã thay đổi/thêm

- `src/middlewares/authorize.js`
- `src/modules/moderation/moderation.schema.js`
- `src/modules/moderation/moderation.repository.js`
- `src/modules/moderation/moderation.service.js`
- `src/modules/moderation/moderation.controller.js`
- `src/modules/moderation/moderation.routes.js`
- `src/modules/book/book.service.js`
- `src/modules/auth/auth.routes.js`
- `src/routes/index.js`
- `vitest.config.js`
- `tests/moderation.integration.test.js`

### Kiểm chứng

```text
Test moderation riêng: 3 passed
Regression toàn bộ: 3 test files, 9 tests passed
```

- User thường bị từ chối queue với `403`.
- Admin approve thành công và target chuyển `published`.
- Approve lần hai trả `409`.
- Super admin reject thành công và giữ đúng lý do.
- Audit log được tạo.
- Dữ liệu test được dọn sau khi chạy.

### Trạng thái tiếp theo

- Wallet và purchase đã được hoàn thiện ở mục 6.3.

## 6.3. Wallet và mua chương đã hoàn thiện

### Endpoint/module

```text
GET  /api/me/wallet
GET  /api/me/wallet/entries
GET  /api/me/purchases
GET  /api/transactions/:id
POST /api/chapters/:id/purchase
```

### Quy tắc đã triển khai

- Wallet, ledger, purchases và transaction chỉ đọc qua API; không sửa tiền trực tiếp từ controller.
- Purchase gọi `sp_purchase_chapter` trên cùng connection với OUT parameters.
- Bật `multipleStatements` cho connection Knex để gọi procedure và đọc kết quả.
- Mọi khóa dòng, trừ/cộng balance, ghi ledger và cấp entitlement do stored procedure xử lý.
- Map các mã `CHAPTER_NOT_FOUND`, `CHAPTER_NOT_AVAILABLE`, `FREE_CHAPTER`, `OWNER_CANNOT_BUY`, `ALREADY_PURCHASED`, `INSUFFICIENT_BALANCE` sang HTTP status.
- Buyer đã mua được đọc full `content`/`content_url`; người khác chỉ nhận preview metadata.
- Giao dịch chỉ được xem bởi buyer hoặc seller liên quan.
- Refresh và purchase không nhận giá tiền từ client.

### File đã thay đổi/thêm

- `src/config/db.js`
- `src/middlewares/optionalAuthenticate.js`
- `src/modules/wallet/wallet.schema.js`
- `src/modules/wallet/wallet.repository.js`
- `src/modules/wallet/wallet.service.js`
- `src/modules/wallet/wallet.controller.js`
- `src/modules/wallet/wallet.routes.js`
- `src/modules/book/book.repository.js`
- `src/modules/book/book.service.js`
- `src/modules/book/book.controller.js`
- `src/modules/book/chapter.routes.js`
- `src/routes/index.js`
- `tests/wallet.integration.test.js`

### Kiểm chứng

```text
Wallet test riêng: 2 passed
Regression toàn bộ: 4 test files, 11 tests passed
```

- Purchase thành công với chia doanh thu 5%/95%.
- Buyer balance về đúng `0.00`, seller nhận đúng `9500.00` khi giá `10000.00`.
- Có đúng 2 wallet ledger entries: `purchase` và `earning`.
- Entitlement và transaction được tạo.
- Buyer đọc được full chapter sau purchase.
- Duplicate, insufficient balance, owner, free chapter và missing chapter đều trả lỗi đúng.
- Dữ liệu test tự dọn sau khi chạy.

### Chức năng tiếp theo

- Xây topup order và webhook idempotent.
- Cộng ví trong transaction, ghi `wallet_entries` và tạo `transactions`.
- Test webhook thành công, chữ ký sai, duplicate callback và order hết hạn.

## 6.4. Topup order và webhook idempotent đã hoàn thiện

### Endpoint/module

```text
POST /api/topups
GET  /api/topups
GET  /api/topups/:id
POST /api/topups/:provider/webhook
```

### Quy tắc đã triển khai

- Tạo order nạp tiền với `status = pending` và timeout theo `system_settings.topup_timeout_minutes`.
- Xác minh chữ ký webhook bằng HMAC SHA-256 trước khi xử lý payload.
- Tìm order theo `code` hoặc `gateway_txn_id` và lock `topup_orders` + `wallets` trong transaction.
- Tránh xử lý callback trùng: nếu order đã `success`, trả về idempotent response.
- Tạo `transactions` loại `topup` và cập nhật `wallets.balance`, `wallets.total_topup` trong cùng transaction.
- Ghi `wallet_entries` với reason `topup` và snapshot payload nạp từ gateway.
- Chỉ webhook hợp lệ mới được cộng tiền; không tin tưởng redirect từ client.

### File đã thay đổi/thêm

- `src/modules/topup/topup.service.js`
- `src/modules/topup/topup.repository.js`
- `src/modules/topup/topup.controller.js`
- `src/modules/topup/topup.schema.js`
- `src/modules/topup/topup.routes.js`
- `src/routes/index.js`
- `tests/topup.integration.test.js`

### Kiểm chứng

```text
Topup test riêng: 1 passed
```

- Order nạp tiền tạo thành công với trạng thái pending.
- Webhook hợp lệ cập nhật order thành success, tăng ví và tạo transaction.
- Callback trùng trả về response thành công mà không cộng tiền lần hai.
- Chữ ký sai trả 401 và không thay đổi dữ liệu.

### Chức năng tiếp theo

- Refund và xử lý tranh chấp.

## 6.5. Bank, KYC và Withdraw đã hoàn thiện

### Endpoint/module

```text
GET  /api/me/bank-accounts
POST /api/me/bank-accounts
DELETE /api/me/bank-accounts/:id
GET  /api/me/kyc
POST /api/me/kyc
POST /api/admin/kyc/:id/review
POST /api/me/withdrawals
GET  /api/me/withdrawals
GET  /api/admin/withdrawals
POST /api/admin/withdrawals/:id/approve
POST /api/admin/withdrawals/:id/reject
POST /api/admin/withdrawals/:id/complete
```

### Quy tắc đã triển khai

- Tài khoản ngân hàng thuộc đúng user và được soft delete.
- Withdrawal lưu snapshot thông tin ngân hàng.
- Số tiền rút tối thiểu đọc từ `system_settings`.
- KYC bắt buộc trước khi rút; `id_number` được mã hóa AES-GCM ở application layer.
- Ciphertext CCCD không được trả về API.
- Tạo withdrawal lock wallet, trừ balance, tăng `pending_withdraw` và ghi `withdraw_hold`.
- Approve giảm `pending_withdraw`, ghi trạng thái approved và audit log.
- Reject cộng lại balance, giảm pending và ghi `withdraw_refund`.
- Complete chỉ thực hiện sau approve, lưu `transfer_ref` và tăng `total_withdrawn`.
- Chỉ role `support`, `admin`, `super_admin` được xử lý KYC/withdraw admin.
- Cột `kyc_verifications.id_number` đã đổi thành `VARCHAR(255)` để đủ lưu ciphertext.

### File đã thay đổi/thêm

- `BTL_Mobile.sql`
- `.env.example`
- `src/config/env.js`
- `src/utils/kycCrypto.js`
- `src/modules/bank/*`
- `src/modules/kyc/*`
- `src/modules/withdraw/*`
- `src/config/swagger.js`
- `src/app.js`
- `src/routes/index.js`
- `tests/withdraw.integration.test.js`

### Kiểm chứng

```text
Withdraw/KYC test riêng: 3 passed
Regression toàn bộ: 5 test files, 14 tests passed
```

- KYC được tạo và review.
- Ciphertext được lưu nhưng không lộ qua response.
- Balance/pending balance đúng sau hold.
- Approve/complete cập nhật đúng trạng thái và tổng tiền rút.
- Reject hoàn tiền và ghi đủ ledger.
- Amount thấp, thiếu KYC và các lỗi nghiệp vụ trả đúng status.

### Chức năng tiếp theo

- Topup order và webhook idempotent, hiện đang tạm hoãn.
- Sau đó triển khai Refund và xử lý tranh chấp.

## 6.6. Follow, reading history và bookmark đã hoàn thiện

### Endpoint/module

```text
POST   /api/follows
DELETE /api/follows/:type/:id
GET    /api/me/follows
PUT    /api/me/reading-history/:bookId
GET    /api/me/reading-history
POST   /api/bookmarks
DELETE /api/bookmarks/:bookId
GET    /api/me/bookmarks
```

### Quy tắc đã triển khai

- Follow được polymorphic theo `target_type` là `account` hoặc `book`.
- Follow và bookmark chống request trùng bằng kiểm tra nghiệp vụ kết hợp unique key database.
- Chỉ follow account/book tồn tại; bookmark chỉ nhận sách đang `published` và chưa bị xoá.
- Reading history upsert một dòng cho mỗi cặp `(account_id, book_id)`.
- Progress phần trăm được chuẩn hoá bằng `decimal.js`, không tính bằng float.
- Unfollow và xoá bookmark chỉ tác động dữ liệu thuộc user hiện tại.
- Các thao tác ghi dùng transaction và response tuân theo format API chung.

### File đã thay đổi/thêm

- `src/modules/follow/*`
- `src/modules/bookmark/*`
- `src/routes/index.js`
- `tests/follow_history.integration.test.js`
- `tests/bookmark.integration.test.js`

### Kiểm chứng

```text
Follow/history test riêng: 1 passed
Bookmark test riêng: 1 passed
Regression toàn bộ: 9 test files, 18 tests passed
```

### Chức năng tiếp theo

- Rating và comment cho book, bao gồm quyền sửa/xoá comment và soft delete.

## 6.7. Rating và comment đã hoàn thiện

### Endpoint/module

```text
POST  /api/books/:id/ratings
POST  /api/books/:id/comments
GET   /api/books/:id/comments
PATCH /api/comments/:id
DELETE /api/comments/:id
```

### Quy tắc đã triển khai

- Rating hỗ trợ tạo mới và cập nhật rating hiện tại của cùng user/book.
- Score chỉ nhận giá trị nguyên từ 1 đến 5.
- Aggregate `rating_avg` và `rating_count` được tính lại trong transaction.
- Chỉ sách published, chưa xoá mới nhận rating/comment.
- Comment có thể gắn với chapter published và hỗ trợ comment trả lời qua `parentId`.
- Chỉ chủ comment hoặc role moderation/admin được sửa/xoá.
- Xoá comment dùng `status = deleted` và `deleted_at`, không xoá vật lý.
- Danh sách public chỉ trả comment visible và chưa bị soft delete.
- `comment_count` và `reply_count` được cập nhật khi tạo/xoá comment.

### File đã thay đổi/thêm

- `src/modules/interaction/*`
- `src/routes/index.js`
- `tests/rating_comment.integration.test.js`
- `PROGRESS_BACKEND.md`

### Kiểm chứng

```text
Rating/comment test riêng: 1 passed
Regression toàn bộ: 10 test files, 19 tests passed
```

### Chức năng tiếp theo

- Report và auto-hide nội dung theo ngưỡng report trong `system_settings`.

## 6.8. Report và auto-hide đã hoàn thiện

### Endpoint/module

```text
POST /api/reports
GET  /api/admin/reports
POST /api/admin/reports/:id/resolve
POST /api/admin/reports/:id/dismiss
```

### Quy tắc đã triển khai

- Validate target `book`, `chapter`, `comment`, `account` và `message` trước khi tạo report.
- Chống report trùng theo unique key `(reporter_id, target_type, target_id)`.
- Đếm report ở trạng thái `pending/reviewing` theo từng target.
- Đọc ngưỡng auto-hide từ `system_settings.auto_hide_report_count`.
- Khi đạt ngưỡng, tự động chuyển nội dung sang `hidden` và ghi `audit_logs` với actor `system`.
- Admin/support/super_admin được xem queue và xử lý report.
- Resolve hỗ trợ `none`, `hidden`, `deleted`, `account_locked`, `warning`.
- Dismiss/resolve cập nhật reviewer, thời gian, ghi chú và audit log trong transaction.

### File đã thay đổi/thêm

- `src/modules/report/*`
- `src/routes/index.js`
- `tests/report.integration.test.js`
- `PROGRESS_BACKEND.md`

### Kiểm chứng

```text
Report test riêng: 1 passed
Regression toàn bộ: 11 test files, 20 tests passed
```

### Chức năng tiếp theo

- Message và notification, lưu dữ liệu MySQL trước khi phát realtime/push.

## 6.9. Message và notification REST đã hoàn thiện

### Endpoint/module

```text
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
PATCH  /api/messages/:id/read
POST   /api/users/:id/block
DELETE /api/users/:id/block
GET    /api/me/notifications
GET    /api/me/notifications/unread-count
PATCH  /api/notifications/:id/read
```

### Quy tắc đã triển khai

- Conversation 1-1 luôn lưu `user_a_id < user_b_id` và request lặp trả lại conversation cũ.
- Chỉ thành viên conversation được đọc/gửi message.
- Message ghi MySQL trước; có loại `text`, `image`, `book_share` và trạng thái read.
- Block được kiểm tra ở cả hai chiều trước khi tạo conversation hoặc gửi message.
- Block/unblock chống trùng và chỉ tác động tài khoản hiện tại.
- Notification được lưu với nhóm, deep-link reference, trạng thái đọc và thời gian đọc.
- Có API unread count và đánh dấu notification/message đã đọc.
- Có service nội bộ `createNotification` để các module nghiệp vụ phát sinh notification dùng chung.

### File đã thay đổi/thêm

- `src/modules/messaging/*`
- `src/routes/index.js`
- `tests/message_notification.integration.test.js`
- `PROGRESS_BACKEND.md`

### Kiểm chứng

```text
Message/notification test riêng: 1 passed
Regression toàn bộ: 12 test files, 21 tests passed
```

### Phần vận hành tiếp theo

- Tích hợp Socket.IO làm kênh realtime.
- Tích hợp FCM và job retry cho notification có `pushed_at IS NULL`.

## 6.10. Admin statistics và daily rollup đã hoàn thiện

### Endpoint/module

```text
GET /api/admin/statistics/platform
GET /api/admin/statistics/books
GET /api/admin/statistics/authors
```

### Quy tắc đã triển khai

- Chỉ `support`, `admin`, `super_admin` được truy cập API statistics.
- API đọc trực tiếp các bảng aggregate `daily_platform_stats`, `daily_book_stats`, `daily_author_stats`.
- Hỗ trợ lọc `from`, `to`, `bookId`, `accountId` và kiểm tra khoảng ngày.
- Job `rollupDailyStats` tổng hợp views, readers, books, chapters, sales, revenue, follow và comment.
- Job nhận ngày tùy chọn để chạy lại deterministic; khi chạy thật mặc định tổng hợp ngày hôm trước.
- Upsert theo khóa chính aggregate, chạy lặp không tạo bản ghi trùng.
- Doanh thu được giữ dạng Decimal/string, không dùng float cho giá trị tiền.
- Test file được chạy tuần tự vì các integration test dùng chung database local và tự đóng pool ở `afterAll`.
- Rate limit được bỏ qua trong `NODE_ENV=test` để tránh làm sai kết quả integration suite.

### File đã thay đổi/thêm

- `src/modules/statistics/*`
- `src/jobs/rollupDailyStats.js`
- `src/routes/index.js`
- `src/modules/statistics/statistics.routes.js`
- `src/modules/messaging/messaging.routes.js`
- `src/app.js`
- `vitest.config.js`
- `tests/statistics.integration.test.js`
- `PROGRESS_BACKEND.md`

### Kiểm chứng

```text
Statistics/rollup test riêng: 2 passed
Regression toàn bộ: 13 test files, 23 tests passed
```

### Chức năng tiếp theo

- Hoàn thiện background jobs: expired OTP, expired topup, push notification retry, category affinity và scheduler.
- Sau đó tích hợp Socket.IO/FCM cho realtime delivery.

## 6.11. Book và Chapter update/delete đã hoàn thiện

### Endpoint/module

```text
PATCH /api/books/:id
POST  /api/books/:id/delete-request
PATCH /api/chapters/:id
POST  /api/chapters/:id/delete-request
```

### Quy tắc đã triển khai

- Chỉ owner được tạo yêu cầu update/delete.
- Update không sửa trực tiếp nội dung public; payload được lưu trong `moderation_requests`.
- Admin approve mới apply thay đổi book/chapter.
- Chapter update tạo snapshot vào `chapter_versions` trước khi apply nội dung mới.
- Delete dùng `pending_delete` rồi `deleted`/`deleted_at`, không xóa vật lý.
- Reject delete khôi phục trạng thái trước đó.
- Chống yêu cầu moderation trùng khi request cũ còn `pending`.

### File đã thay đổi/thêm

- `src/modules/book/book.schema.js`
- `src/modules/book/book.repository.js`
- `src/modules/book/book.service.js`
- `src/modules/book/book.controller.js`
- `src/modules/book/book.routes.js`
- `src/modules/book/chapter.routes.js`
- `src/modules/moderation/moderation.service.js`
- `tests/book_update_delete.integration.test.js`
- `API_FEATURES.md`

### Kiểm chứng

```text
Book/chapter update-delete test: 1 passed
Content + moderation regression: 6 tests passed
Regression toàn bộ: 14 test files, 24 tests passed
```

### Chức năng tiếp theo

- Background jobs vận hành, Socket.IO realtime và FCM retry.

## 7. Ngữ cảnh khi bắt đầu phiên tiếp theo

Bắt đầu bằng các bước sau:

1. Đọc file này và `PROCESS_BACKEND.md`.
2. Kiểm tra các file trong `src/modules/auth` vì người dùng có thể đã chỉnh sửa.
3. Chạy `npm test` từ `D:\BTL_Mobile\Backend_web\BackendAppBook`.
4. Không sửa ngược hoặc xóa route cũ trong root nếu chưa có yêu cầu.
5. Triển khai module tiếp theo trong `src`, không trộn với code CRUD cũ.
6. Sau mỗi edit phải chạy test hẹp nhất có thể, rồi chạy regression toàn bộ trước khi ghi hoàn thành.
7. Khi test cần database, dùng dữ liệu có hậu tố thời gian và dọn dữ liệu sau test.

## 8. Quy ước response và lỗi

Response thành công:

```json
{
  "success": true,
  "data": {}
}
```

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR",
    "message": "Mô tả lỗi"
  }
}
```

HTTP status cần giữ:

- `200`: đọc/cập nhật thành công.
- `201`: tạo thành công.
- `400`: payload không hợp lệ.
- `401`: chưa xác thực hoặc token không hợp lệ.
- `403`: không đủ quyền.
- `404`: không tìm thấy.
- `409`: trùng dữ liệu hoặc xung đột trạng thái.
- `429`: vượt giới hạn request.
- `500`: lỗi hệ thống.

## 9. Nhật ký thay đổi

Mỗi chức năng mới phải thêm một mục vào nhật ký theo mẫu:

```text
### YYYY-MM-DD - Tên chức năng

- Trạng thái: hoàn thành/chưa hoàn thành.
- Endpoint/module:
- File đã thay đổi:
- Kiểm chứng:
- Chức năng tiếp theo:
```

### 2026-09-19

- Dựng kiến trúc `src` và package backend.
- Cấu hình MySQL local `root` / `web_sach`.
- Hoàn thiện register và OTP.
- Hoàn thiện login, JWT, refresh token rotation.
- Thêm middleware kiểm tra session và protected endpoint `/api/me`.
- Thêm 3 integration tests cho auth; tất cả pass.
- Tạo file này để giữ tiến độ và ngữ cảnh triển khai.
- Hoàn thiện Category, Book và Chapter cơ bản; thêm public reading metadata và ownership test.
- Toàn bộ test suite đạt 6/6.
- Hoàn thiện moderation book/chapter, phân quyền admin và audit log.
- Toàn bộ test suite đạt 9/9.
- Hoàn thiện wallet, ledger read APIs và purchase qua `sp_purchase_chapter`.
- Toàn bộ test suite đạt 11/11.
- Hoàn thiện bank account, KYC mã hóa và withdraw workflow.
- Cập nhật `kyc_verifications.id_number` lên `VARCHAR(255)` để lưu ciphertext.
- Toàn bộ test suite đạt 14/14.
