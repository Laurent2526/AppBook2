# APPBOOK - Chuc nang da hoan thien va API

Tai lieu nay tong hop cac chuc nang da duoc trien khai trong backend APPBOOK va cac API tuong ung.

- Backend root: `Backend_web/BackendAppBook`
- Runtime: Node.js + Express CommonJS
- API prefix mac dinh: `/api`
- Database: MySQL + Knex + mysql2
- Validation: Zod
- Authentication: JWT access token + refresh token
- Test: Vitest + Supertest
- Database source of truth: `BTL_Mobile.sql`

> Message/notification duoc luu trong MySQL va expose qua REST; Socket.IO realtime da duoc bat cho authenticated sessions. Push delivery dung Expo Push Service (FCM tren Android/APNs tren iOS) khi device session co Expo push token.

## 1. Quy uoc chung

### Response thanh cong

```json
{
  "success": true,
  "data": {}
}
```

### Response loi

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mo ta loi"
  }
}
```

### Quyen

- `user`: nguoi doc va nguoi dang noi dung.
- `support`: nhan vien xu ly moderation, report va mot so tac vu admin.
- `admin`: quan tri vien.
- `super_admin`: quan tri cap cao.
- Cac API co dau `authenticate` yeu cau header:

```text
Authorization: Bearer <accessToken>
```

## 2. He thong va health check

| Method | Endpoint        | Quyen  | Mo ta                            |
| ------ | --------------- | ------ | -------------------------------- |
| `GET`  | `/`             | Public | Thong tin ten va version API     |
| `GET`  | `/api/health`   | Public | Kiem tra API va ket noi database |
| `GET`  | `/openapi.json` | Public | OpenAPI specification            |
| `GET`  | `/api-docs`     | Public | Swagger UI                       |

## 3. Authentication va tai khoan co ban

Module: `src/modules/auth`

| Method | Endpoint               | Quyen         | Mo ta                               |
| ------ | ---------------------- | ------------- | ----------------------------------- |
| `POST` | `/api/auth/register`   | Public        | Dang ky bang email/phone, tao OTP   |
| `POST` | `/api/auth/verify-otp` | Public        | Xac minh OTP va kich hoat tai khoan |
| `POST` | `/api/auth/login`      | Public        | Dang nhap, tao access/refresh token |
| `POST` | `/api/auth/refresh`    | Public        | Refresh token rotation              |
| `GET`  | `/api/me`              | Authenticated | Lay thong tin tai khoan hien tai    |

Da hoan thien:

- Hash password bang Argon2.
- OTP co han su dung va gioi han so lan thu.
- JWT access token va refresh token rotation.
- Quan ly session theo thiet bi.
- Kiem tra session bi revoke/het han.
- Gioi han login sai va khoa tam thoi.

## 4. Category, book va chapter

Module: `src/modules/category`, `src/modules/book`

### Category

| Method | Endpoint          | Quyen  | Mo ta                              |
| ------ | ----------------- | ------ | ---------------------------------- |
| `GET`  | `/api/categories` | Public | Lay danh sach category dang active |

### Book

| Method  | Endpoint                           | Quyen                | Mo ta                                           |
| ------- | ---------------------------------- | -------------------- | ----------------------------------------------- |
| `GET`   | `/api/books`                       | Public               | Danh sach sach public, pagination/search/filter |
| `GET`   | `/api/books/:id`                   | Public               | Chi tiet sach public                            |
| `POST`  | `/api/books`                       | Authenticated        | Tao book, owner lay tu JWT                      |
| `PATCH` | `/api/books/:id`                   | Owner                | Tao yeu cau cap nhat book                       |
| `POST`  | `/api/books/:id/delete-request`    | Owner                | Tao yeu cau xoa mem book                        |
| `GET`   | `/api/books/:bookId/chapters`      | Public               | Danh sach chapter public                        |
| `POST`  | `/api/books/:bookId/chapters`      | Owner                | Tao chapter thuoc book cua author               |
| `PATCH` | `/api/chapters/:id`                | Owner                | Tao yeu cau cap nhat chapter                    |
| `POST`  | `/api/chapters/:id/delete-request` | Owner                | Tao yeu cau xoa mem chapter                     |
| `GET`   | `/api/chapters/:id`                | Public/Authenticated | Doc chapter theo entitlement                    |

Da hoan thien:

- Book/chapter moi mac dinh o trang thai `pending`.
- Kiem tra ownership khi tao chapter.
- Validate gia chapter free/paid.
- Public chi thay noi dung `published`.
- Book list ho tro search theo title/author/description/category va `sortBy=latest|hot`; hot xep theo views, purchases va followers.
- Chapter paid chua mua chi tra preview, khong tra content day du.
- Tao slug tu dong va chong trung slug/chapter number.
- Update luu payload vao moderation request, khong sua truc tiep noi dung public.
- Chapter update tao snapshot vao `chapter_versions` truoc khi apply.
- Delete chuyen qua `pending_delete` va `deleted_at`, khong xoa vat ly.
- Author xem chi tiet va bo dem luot doc/ban/doanh thu sach cua minh qua `GET /api/me/books/:id` va `GET /api/me/books/:id/statistics`.

## 4.1. Discovery, recommendation va featured authors

Module: `src/modules/discovery` va `src/modules/book`

| Method | Endpoint                             | Quyen                | Mo ta                                                                                                    |
| ------ | ------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET`  | `/api/books?search=...&sortBy=latest | hot`                 | Public                                                                                                   | Search sach theo title/author/description/category; xep moi hoac hot theo counter that |
| `GET`  | `/api/discovery/featured-authors`    | Public               | Xep hang author theo views, followers va so sach; ho tro search, `limit`                                 |
| `GET`  | `/api/discovery/recommendations`     | Public/Authenticated | Gợi ý theo categoryIds tuy chon hoac reading history; anonymous/khong co history fallback sang hot books |
| `GET`  | `/api/discovery/following`           | Authenticated        | Tra account follow, book follow va bookmark thanh ba danh sach rieng                                     |

Da hoan thien:

- Recommendations lay category tu reading history, uu tien category cua sach co chapters_read cao va loai cac sach da co trong history.
- User co the chon nhieu category de filter; neu khong chon, API dung reading history.
- Featured authors va hot books dung counters/views/sales/followers/revenue trong DB, khong dung so lieu sinh o client.
- Following feed join target account/book va bookmarks cua user; khong tra danh sach book bat ky lam saved.
- Search tren Home mo Explore voi tu khoa; Explore gui search/category/status sort len API.

## 5. Moderation book va chapter

Module: `src/modules/moderation`

| Method | Endpoint                            | Quyen                       | Mo ta                |
| ------ | ----------------------------------- | --------------------------- | -------------------- |
| `GET`  | `/api/admin/moderation`             | `support/admin/super_admin` | Lay moderation queue |
| `POST` | `/api/admin/moderation/:id/approve` | `support/admin/super_admin` | Duyet noi dung       |
| `POST` | `/api/admin/moderation/:id/reject`  | `support/admin/super_admin` | Tu choi noi dung     |

Da hoan thien:

- Tao moderation request trong cung transaction voi book/chapter.
- Khoa request va target bang `FOR UPDATE`.
- Approve chuyen target sang `published`.
- Reject luu ly do va chuyen target sang `rejected`.
- Ghi audit log.
- Khong cho xu ly lai request da co ket qua.

## 5.1. Admin account va book management

Module: `src/modules/admin`

Tat ca endpoint can role `admin` hoac `super_admin`.

| Method   | Endpoint                         | Mo ta                                                                                |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `GET`    | `/api/admin/accounts`            | Tim kiem/lọc tai khoan theo ten, username, email, phone, role, status; co pagination |
| `PATCH`  | `/api/admin/accounts/:id/status` | Khoa/mo khoa account; khoa revoke session va ghi audit log                           |
| `DELETE` | `/api/admin/accounts/:id`        | Xoa mem, an danh PII, revoke session; chan neu con sach published                    |
| `GET`    | `/api/admin/books`               | Tim sach toan he thong, xem owner, status, views, sales, revenue                     |
| `GET`    | `/api/admin/books/:id`           | Xem chi tiet sach va danh sach chapter                                               |
| `PATCH`  | `/api/admin/books/:id`           | Admin sua metadata sach va ghi audit log                                             |
| `PATCH`  | `/api/admin/books/:id/status`    | Chuyen published/hidden/rejected; reject bat buoc co ly do                           |
| `DELETE` | `/api/admin/books/:id`           | Xoa mem sach, dong moderation request dang cho va ghi audit log                      |

Author book management:

| Method  | Endpoint                        | Mo ta                                              |
| ------- | ------------------------------- | -------------------------------------------------- |
| `GET`   | `/api/me/books/:id`             | Chi owner xem chi tiet sach                        |
| `GET`   | `/api/me/books/:id/statistics`  | Chi owner xem views, purchases, revenue, followers |
| `PATCH` | `/api/books/:id`                | Tao moderation request cap nhat sach               |
| `POST`  | `/api/books/:id/delete-request` | Tao moderation request xoa sach                    |

Da hoan thien:

- Account list khong tra password hash; lock revoke session voi enum reason `admin_lock`.
- Khong cho admin tu khoa/xoa chinh minh; chi super_admin duoc quan ly account admin/super_admin.
- Soft delete account an danh profile va giu khoa lich su giao dich.
- Admin book changes/status/delete ghi `audit_logs`; public chapter endpoint chan sach hidden/deleted, nguoi da mua van doc duoc chapter tra phi.
- Mobile author co UI gui edit/delete request; edit can moderation duyet truoc khi ap dung.

## 6. Wallet, purchase va transaction

Module: `src/modules/wallet` va `src/modules/book`

| Method | Endpoint                     | Quyen         | Mo ta                        |
| ------ | ---------------------------- | ------------- | ---------------------------- |
| `GET`  | `/api/me/wallet`             | Authenticated | Xem so du va tong hop wallet |
| `GET`  | `/api/me/wallet/entries`     | Authenticated | Xem wallet ledger            |
| `GET`  | `/api/me/purchases`          | Authenticated | Xem cac chapter da mua       |
| `GET`  | `/api/transactions/:id`      | Buyer/Seller  | Xem transaction lien quan    |
| `POST` | `/api/chapters/:id/purchase` | Authenticated | Mua chapter paid             |

Da hoan thien:

- Purchase goi stored procedure `sp_purchase_chapter`.
- Lock va cap entitlement trong transaction database.
- Trừ đủ giá chương từ ví người mua; ghi có 95% cho người đăng và 5% vào ví admin chính (cấu hình `platform_admin_account_id`, mặc định ưu tiên super_admin rồi admin đang hoạt động).
- Ghi đủ ba bút toán `purchase`, `earning` và `platform_fee` trong cùng transaction.
- Xu ly duplicate purchase, insufficient balance, owner va free chapter.
- Moi bien dong wallet co ledger.
- Khong tin gia tien tu client.

## 7. Bank account, KYC va withdrawal

Module: `src/modules/bank`, `src/modules/kyc`, `src/modules/withdraw`

### Bank account

| Method   | Endpoint                    | Quyen         | Mo ta                           |
| -------- | --------------------------- | ------------- | ------------------------------- |
| `GET`    | `/api/me/bank-accounts`     | Authenticated | Danh sach tai khoan ngan hang   |
| `POST`   | `/api/me/bank-accounts`     | Authenticated | Them tai khoan ngan hang        |
| `DELETE` | `/api/me/bank-accounts/:id` | Owner         | Soft delete tai khoan ngan hang |

### KYC

| Method | Endpoint                    | Quyen                       | Mo ta              |
| ------ | --------------------------- | --------------------------- | ------------------ |
| `GET`  | `/api/me/kyc`               | Authenticated               | Xem trang thai KYC |
| `POST` | `/api/me/kyc`               | Authenticated               | Tao/cap nhat KYC   |
| `POST` | `/api/admin/kyc/:id/review` | `support/admin/super_admin` | Duyet/tu choi KYC  |

### Withdrawal

| Method | Endpoint                              | Quyen         | Mo ta                           |
| ------ | ------------------------------------- | ------------- | ------------------------------- |
| `POST` | `/api/me/withdrawals`                 | Authenticated | Tao yeu cau rut tien            |
| `GET`  | `/api/me/withdrawals`                 | Authenticated | Xem withdrawal cua minh         |
| `GET`  | `/api/admin/withdrawals`              | Admin roles   | Xem withdrawal queue            |
| `POST` | `/api/admin/withdrawals/:id/approve`  | Admin roles   | Duyet withdrawal                |
| `POST` | `/api/admin/withdrawals/:id/reject`   | Admin roles   | Tu choi va hoan tien            |
| `POST` | `/api/admin/withdrawals/:id/complete` | Admin roles   | Xac nhan chuyen tien thanh cong |

Da hoan thien:

- Ma hoa CCCD o application layer.
- Luu bank snapshot tai thoi diem withdrawal.
- KYC threshold va minimum withdrawal doc tu `system_settings`.
- Hold balance, approve, reject, complete trong transaction.
- Ghi ledger va audit log.

## 8. Topup

Module: `src/modules/topup`

| Method | Endpoint                        | Quyen         | Mo ta                     |
| ------ | ------------------------------- | ------------- | ------------------------- |
| `POST` | `/api/topups`                   | Authenticated | Tao topup order           |
| `POST` | `/api/topups/demo`              | Authenticated | Cong tien demo (dev/test) |
| `GET`  | `/api/topups`                   | Authenticated | Danh sach topup cua user  |
| `GET`  | `/api/topups/:id`               | Owner         | Chi tiet topup order      |
| `POST` | `/api/topups/:provider/webhook` | Gateway       | Nhan webhook va cong tien |

Da hoan thien:

- Demo topup chi hoat dong ngoai production, nhan cac menh gia co dinh va cong tien ngay vao wallet.
- Demo topup ghi transaction `topup` voi `payment_method = system` va wallet ledger trong cung transaction database.
- Verify HMAC signature.
- Lock order/wallet trong transaction.
- Idempotent webhook, callback lap khong cong tien hai lan.
- Tao transaction va wallet ledger.
- Tu dong xu ly order pending het han trong business logic/job du kien.

## 9. Refund va dispute

Module: `src/modules/refund`

| Method | Endpoint                         | Quyen         | Mo ta               |
| ------ | -------------------------------- | ------------- | ------------------- |
| `POST` | `/api/me/refunds`                | Authenticated | Tao yeu cau refund  |
| `GET`  | `/api/me/refunds`                | Authenticated | Xem refund cua user |
| `GET`  | `/api/admin/refunds`             | Admin roles   | Xem refund queue    |
| `POST` | `/api/admin/refunds/:id/approve` | Admin roles   | Duyet refund        |
| `POST` | `/api/admin/refunds/:id/reject`  | Admin roles   | Tu choi refund      |

Da hoan thien:

- Kiem tra purchase va transaction hop le.
- Lock refund request, purchase, transaction va wallet lien quan.
- Hoan tien buyer.
- Clawback seller khi can.
- Revoke purchase, cap nhat transaction goc va ghi ledger.

## 10. Follow, bookmark va reading history

Module: `src/modules/follow`, `src/modules/bookmark`

| Method   | Endpoint                          | Quyen         | Mo ta                   |
| -------- | --------------------------------- | ------------- | ----------------------- |
| `POST`   | `/api/follows`                    | Authenticated | Follow account/book     |
| `DELETE` | `/api/follows/:type/:id`          | Authenticated | Unfollow account/book   |
| `GET`    | `/api/me/follows`                 | Authenticated | Danh sach follow        |
| `POST`   | `/api/bookmarks`                  | Authenticated | Them sach vao tu truyen |
| `DELETE` | `/api/bookmarks/:bookId`          | Authenticated | Xoa bookmark            |
| `GET`    | `/api/me/bookmarks`               | Authenticated | Danh sach bookmark      |
| `PUT`    | `/api/me/reading-history/:bookId` | Authenticated | Upsert tien do doc      |
| `GET`    | `/api/me/reading-history`         | Authenticated | Danh sach lich su doc   |

Da hoan thien:

- Chong duplicate theo unique key.
- Bookmark chi nhan sach published.
- Reading history duy tri mot dong cho moi user/book.
- Progress phan tram dung Decimal.js.

## 11. Rating va comment

Module: `src/modules/interaction`

| Method   | Endpoint                  | Quyen         | Mo ta                              |
| -------- | ------------------------- | ------------- | ---------------------------------- |
| `POST`   | `/api/books/:id/ratings`  | Authenticated | Tao/cap nhat rating 1-5            |
| `GET`    | `/api/me/ratings`         | Authenticated | Lay ratings cua tai khoan hien tai |
| `POST`   | `/api/books/:id/comments` | Authenticated | Tao comment book/chapter           |
| `GET`    | `/api/books/:id/comments` | Public        | Lay comment visible                |
| `PATCH`  | `/api/comments/:id`       | Owner/Admin   | Sua comment                        |
| `DELETE` | `/api/comments/:id`       | Owner/Admin   | Soft delete comment                |

Da hoan thien:

- Moi user chi co mot rating cho moi book.
- Cap nhat `rating_avg` va `rating_count` trong transaction.
- Comment ho tro `parentId` de tra loi long nhau.
- Kiem tra chapter published va parent comment cung target.
- Xoa mem bang `status = deleted`, `deleted_at`.
- Cap nhat `comment_count` va `reply_count`.

## 12. Report va auto-hide

Module: `src/modules/report`

| Method | Endpoint                         | Quyen         | Mo ta                                       |
| ------ | -------------------------------- | ------------- | ------------------------------------------- |
| `POST` | `/api/reports`                   | Authenticated | Report book/chapter/comment/account/message |
| `GET`  | `/api/admin/reports`             | Admin roles   | Xem report queue                            |
| `POST` | `/api/admin/reports/:id/resolve` | Admin roles   | Xu ly report                                |
| `POST` | `/api/admin/reports/:id/dismiss` | Admin roles   | Bo qua report                               |

Da hoan thien:

- Validate target va ly do report.
- Chong report trung theo reporter/target.
- Doc nguong auto-hide tu `system_settings`.
- Dat nguong thi chuyen content sang `hidden`.
- Ghi audit log actor `system`.
- Resolve ho tro `none`, `hidden`, `deleted`, `account_locked`, `warning`.

## 13. Message va notification

Module: `src/modules/messaging`

### Conversation va message

| Method   | Endpoint                          | Quyen         | Mo ta                         |
| -------- | --------------------------------- | ------------- | ----------------------------- |
| `GET`    | `/api/conversations`              | Authenticated | Danh sach conversation        |
| `POST`   | `/api/conversations`              | Authenticated | Tao/lazy-get conversation 1-1 |
| `GET`    | `/api/conversations/:id/messages` | Member        | Lay message                   |
| `POST`   | `/api/conversations/:id/messages` | Member        | Gui message                   |
| `PATCH`  | `/api/messages/:id/read`          | Receiver      | Danh dau message da doc       |
| `POST`   | `/api/users/:id/block`            | Authenticated | Chan user                     |
| `DELETE` | `/api/users/:id/block`            | Authenticated | Bo chan user                  |

### Notification

| Method  | Endpoint                             | Quyen         | Mo ta                                        |
| ------- | ------------------------------------ | ------------- | -------------------------------------------- |
| `GET`   | `/api/me/notifications`              | Authenticated | Lay notification cua user                    |
| `GET`   | `/api/me/notifications/unread-count` | Authenticated | Dem notification chua doc                    |
| `PATCH` | `/api/notifications/:id/read`        | Owner         | Danh dau notification da doc                 |
| `PUT`   | `/api/me/push-token`                 | Authenticated | Dang ky Expo push token cho session hien tai |

Da hoan thien:

- Conversation luon luu `user_a_id < user_b_id`.
- Chi member moi doc/gui message.
- Block duoc kiem tra hai chieu.
- Notification luu MySQL truoc khi emit/push.
- Ho tro read state va deep-link reference.
- Socket.IO xac thuc JWT/session va join room rieng theo account ID.
- Message event `message:new` va notification event `notification:new` emit sau database commit.
- Expo push token luu trong `user_sessions.fcm_token`; notification gui qua Expo Push Service va mark `pushed_at` khi ticket thanh cong.
- Mobile co REST inbox fallback, chat realtime, notification list, ratings/comments/report va Library personal-ratings tab.
- Remote push can EAS project ID/push credentials va development build; Expo Go Android khong nhan remote push tu SDK 53 tro len.
- Push receipt retry worker/token cleanup chua duoc trien khai; REST notifications van doc duoc neu push fail.

## 14. Admin statistics

Module: `src/modules/statistics`

| Method | Endpoint                         | Quyen       | Mo ta                            |
| ------ | -------------------------------- | ----------- | -------------------------------- |
| `GET`  | `/api/admin/statistics/platform` | Admin roles | Thong ke toan platform theo ngay |
| `GET`  | `/api/admin/statistics/books`    | Admin roles | Thong ke theo book               |
| `GET`  | `/api/admin/statistics/authors`  | Admin roles | Thong ke theo author             |

Query parameters:

- `from`: ngay bat dau, dang `YYYY-MM-DD`.
- `to`: ngay ket thuc, dang `YYYY-MM-DD`.
- `bookId`: loc statistics theo book.
- `accountId`: loc statistics theo author.

Nguon du lieu aggregate:

- `daily_platform_stats`
- `daily_book_stats`
- `daily_author_stats`

## 15. Background job da co

Module: `src/jobs`

| Job                        | Trang thai             | Mo ta                                                          |
| -------------------------- | ---------------------- | -------------------------------------------------------------- |
| `rollupDailyStats`         | Da co                  | Tong hop views, sales, revenue, follow/comment vao daily stats |
| `cleanExpiredOtp`          | Chua trien khai        | Doi OTP het han/cleanup                                        |
| `expireTopupOrders`        | Chua trien khai day du | Doi topup pending qua han thanh expired                        |
| `updateCategoryAffinity`   | Chua trien khai        | Tinh goi y theo reading history                                |
| `pushPendingNotifications` | Chua trien khai        | Push FCM va retry notification                                 |
| `addChapterViewPartition`  | Chua trien khai        | Them partition chapter_views theo thang                        |

## 16. Kiem thu hien tai

Lenh chay test:

```powershell
Set-Location D:\BTL_Mobile\Backend_web\BackendAppBook
npm test
```

Ket qua da xac nhan:

```text
Test Files  13 passed (13)
Tests       23 passed (23)
```

Cac integration test bao phu:

- Authentication va session rotation.
- Content, moderation va entitlement.
- Wallet, purchase, topup, KYC, withdrawal, refund.
- Follow, bookmark, reading history.
- Rating, comment, report, auto-hide.
- Message, notification.
- Admin statistics va idempotent daily rollup.

## 17. Tai lieu lien quan

- `BTL_Mobile.sql`: database schema va business constraints.
- `PhanTichNV_Mobile.md`: dac ta nghiep vu.
- `PROCESS_BACKEND.md`: roadmap va quy tac ky thuat.
- `PROGRESS_BACKEND.md`: tien do thuc te va ket qua kiem chung.
