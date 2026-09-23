# APPBOOK modules

Mỗi module nghiệp vụ dùng cấu trúc:

```text
module/
├── module.routes.js
├── module.controller.js
├── module.service.js
├── module.repository.js
├── module.schema.js
└── module.errors.js
```

Thứ tự triển khai dự kiến:

1. auth và account
2. category, book và chapter
3. moderation
4. wallet và transaction
5. topup, withdraw và refund
6. follow, reading, rating và comment
7. report, notification và message
8. statistics, recommendation và jobs
