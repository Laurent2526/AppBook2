const swaggerJsdoc = require("swagger-jsdoc");

const jsonBody = (example) => ({
  required: true,
  content: {
    "application/json": {
      schema: { type: "object", additionalProperties: true },
      example,
    },
  },
});

const protectedOperation = (summary, method = "get", tag = "System", body) => ({
  [method]: {
    summary,
    tags: [tag],
    security: [{ bearerAuth: [] }],
    ...(body ? { requestBody: jsonBody(body) } : {}),
    responses: {
      200: { description: "Success" },
      401: { description: "Authentication required" },
      403: { description: "Forbidden" },
    },
  },
});

const publicOperation = (summary, method = "get", tag = "System", body) => ({
  [method]: {
    summary,
    tags: [tag],
    ...(body ? { requestBody: jsonBody(body) } : {}),
    responses: {
      200: { description: "Success" },
      400: { description: "Invalid request" },
      404: { description: "Not found" },
    },
  },
});

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "APPBOOK API",
      version: "1.0.0",
      description:
        "Backend API for APPBOOK mobile application and admin portal",
    },
    servers: [{ url: "http://localhost:3000", description: "Local server" }],
    tags: [
      { name: "System", description: "Health check and API metadata" },
      { name: "Authentication", description: "Registration, OTP and sessions" },
      { name: "Content", description: "Categories, books and chapters" },
      { name: "Moderation", description: "Admin content moderation" },
      { name: "Wallet", description: "Wallet, purchases and transactions" },
      {
        name: "Bank and KYC",
        description: "Bank accounts and KYC verification",
      },
      { name: "Withdrawal", description: "Withdrawal workflow" },
      { name: "Topup", description: "Topup orders and gateway webhooks" },
      { name: "Refund", description: "Refund requests and decisions" },
      {
        name: "Social",
        description: "Follow, bookmarks, ratings and comments",
      },
      { name: "Reports", description: "Reports and automatic hiding" },
      { name: "Messaging", description: "Conversations, messages and blocks" },
      { name: "Notifications", description: "System notifications" },
      { name: "Statistics", description: "Admin aggregate statistics" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      "/api/health": publicOperation(
        "Check API and database health",
        "get",
        "System",
      ),
      "/api/categories": publicOperation(
        "List active categories",
        "get",
        "Content",
      ),
      "/api/books": {
        ...publicOperation("List public books", "get", "Content"),
        ...protectedOperation("Create a book", "post", "Content", {
          title: "My first book",
          description: "Book description",
          categoryIds: [1],
          writingStatus: "ongoing",
          isMature: false,
          language: "vi",
          freePreviewChapters: 1,
        }),
      },
      "/api/books/{id}": {
        ...publicOperation("Get a public book", "get", "Content"),
        ...protectedOperation("Request book update", "patch", "Content"),
        ...protectedOperation("Request book deletion", "post", "Content"),
      },
      "/api/books/{bookId}/chapters": {
        ...publicOperation("List published chapters", "get", "Content"),
        ...protectedOperation("Create a chapter", "post", "Content", {
          chapterNumber: 1,
          title: "Chapter 1",
          content: "Chapter content",
          previewText: "Preview",
          isFree: true,
          price: "0",
        }),
      },
      "/api/chapters/{id}": {
        ...publicOperation("Read a chapter or preview", "get", "Content"),
        ...protectedOperation("Request chapter update", "patch", "Content"),
        ...protectedOperation("Request chapter deletion", "post", "Content"),
      },
      "/api/chapters/{id}/purchase": protectedOperation(
        "Purchase a paid chapter",
        "post",
        "Wallet",
      ),
      "/api/auth/register": publicOperation(
        "Register an account",
        "post",
        "Authentication",
        {
          username: "test_user_001",
          email: "test001@example.com",
          channel: "email",
          password: "Password123",
        },
      ),
      "/api/auth/verify-otp": publicOperation(
        "Verify registration OTP",
        "post",
        "Authentication",
        { target: "test001@example.com", code: "123456" },
      ),
      "/api/auth/login": publicOperation("Login", "post", "Authentication", {
        identifier: "test001@example.com",
        password: "Password123",
        platform: "web",
      }),
      "/api/auth/refresh": publicOperation(
        "Refresh access token",
        "post",
        "Authentication",
        { refreshToken: "paste-refresh-token-here" },
      ),
      "/api/me": protectedOperation(
        "Get current account",
        "get",
        "Authentication",
      ),
      "/api/me/wallet": protectedOperation(
        "Get current wallet",
        "get",
        "Wallet",
      ),
      "/api/me/wallet/entries": protectedOperation(
        "List wallet ledger entries",
        "get",
        "Wallet",
      ),
      "/api/me/purchases": protectedOperation(
        "List purchased chapters",
        "get",
        "Wallet",
      ),
      "/api/transactions/{id}": protectedOperation(
        "Get a related transaction",
        "get",
        "Wallet",
      ),
      "/api/admin/moderation": protectedOperation(
        "List moderation queue",
        "get",
        "Moderation",
      ),
      "/api/admin/moderation/{id}/approve": protectedOperation(
        "Approve moderation request",
        "post",
        "Moderation",
      ),
      "/api/admin/moderation/{id}/reject": protectedOperation(
        "Reject moderation request",
        "post",
        "Moderation",
      ),
      "/api/me/bank-accounts": {
        ...protectedOperation("List bank accounts", "get", "Bank and KYC"),
        ...protectedOperation("Create bank account", "post", "Bank and KYC"),
      },
      "/api/me/bank-accounts/{id}": protectedOperation(
        "Delete bank account",
        "delete",
        "Bank and KYC",
      ),
      "/api/me/kyc": {
        ...protectedOperation("Get latest KYC", "get", "Bank and KYC"),
        ...protectedOperation("Submit KYC", "post", "Bank and KYC"),
      },
      "/api/admin/kyc/{id}/review": protectedOperation(
        "Review KYC",
        "post",
        "Bank and KYC",
      ),
      "/api/me/withdrawals": {
        ...protectedOperation("List withdrawals", "get", "Withdrawal"),
        ...protectedOperation("Create withdrawal", "post", "Withdrawal"),
      },
      "/api/admin/withdrawals": protectedOperation(
        "List all withdrawals",
        "get",
        "Withdrawal",
      ),
      "/api/admin/withdrawals/{id}/approve": protectedOperation(
        "Approve withdrawal",
        "post",
        "Withdrawal",
      ),
      "/api/admin/withdrawals/{id}/reject": protectedOperation(
        "Reject withdrawal",
        "post",
        "Withdrawal",
      ),
      "/api/admin/withdrawals/{id}/complete": protectedOperation(
        "Complete withdrawal",
        "post",
        "Withdrawal",
      ),
      "/api/topups": {
        ...protectedOperation("Create topup order", "post", "Topup"),
        ...protectedOperation("List topup orders", "get", "Topup"),
      },
      "/api/topups/{id}": protectedOperation("Get topup order", "get", "Topup"),
      "/api/topups/{provider}/webhook": publicOperation(
        "Process topup webhook",
        "post",
        "Topup",
      ),
      "/api/me/refunds": {
        ...protectedOperation("Create refund request", "post", "Refund"),
        ...protectedOperation("List my refund requests", "get", "Refund"),
      },
      "/api/admin/refunds": protectedOperation(
        "List refund requests",
        "get",
        "Refund",
      ),
      "/api/admin/refunds/{id}/approve": protectedOperation(
        "Approve refund",
        "post",
        "Refund",
      ),
      "/api/admin/refunds/{id}/reject": protectedOperation(
        "Reject refund",
        "post",
        "Refund",
      ),
      "/api/follows": {
        ...protectedOperation("Follow an account or book", "post", "Social"),
      },
      "/api/follows/{type}/{id}": protectedOperation(
        "Unfollow an account or book",
        "delete",
        "Social",
      ),
      "/api/me/follows": protectedOperation("List follows", "get", "Social"),
      "/api/bookmarks": protectedOperation("Create bookmark", "post", "Social"),
      "/api/bookmarks/{bookId}": protectedOperation(
        "Delete bookmark",
        "delete",
        "Social",
      ),
      "/api/me/bookmarks": protectedOperation(
        "List bookmarks",
        "get",
        "Social",
      ),
      "/api/me/reading-history/{bookId}": protectedOperation(
        "Update reading history",
        "put",
        "Social",
      ),
      "/api/me/reading-history": protectedOperation(
        "List reading history",
        "get",
        "Social",
      ),
      "/api/books/{id}/ratings": protectedOperation(
        "Create or update rating",
        "post",
        "Social",
      ),
      "/api/books/{id}/comments": {
        ...publicOperation("List visible comments", "get", "Social"),
        ...protectedOperation("Create comment", "post", "Social"),
      },
      "/api/comments/{id}": {
        ...protectedOperation("Update comment", "patch", "Social"),
        ...protectedOperation("Delete comment", "delete", "Social"),
      },
      "/api/reports": protectedOperation("Create report", "post", "Reports"),
      "/api/admin/reports": protectedOperation(
        "List reports",
        "get",
        "Reports",
      ),
      "/api/admin/reports/{id}/resolve": protectedOperation(
        "Resolve report",
        "post",
        "Reports",
      ),
      "/api/admin/reports/{id}/dismiss": protectedOperation(
        "Dismiss report",
        "post",
        "Reports",
      ),
      "/api/conversations": {
        ...protectedOperation("List conversations", "get", "Messaging"),
        ...protectedOperation("Create conversation", "post", "Messaging"),
      },
      "/api/conversations/{id}/messages": {
        ...protectedOperation("List conversation messages", "get", "Messaging"),
        ...protectedOperation("Send message", "post", "Messaging"),
      },
      "/api/messages/{id}/read": protectedOperation(
        "Mark message as read",
        "patch",
        "Messaging",
      ),
      "/api/users/{id}/block": {
        ...protectedOperation("Block user", "post", "Messaging"),
        ...protectedOperation("Unblock user", "delete", "Messaging"),
      },
      "/api/me/notifications": protectedOperation(
        "List notifications",
        "get",
        "Notifications",
      ),
      "/api/me/notifications/unread-count": protectedOperation(
        "Count unread notifications",
        "get",
        "Notifications",
      ),
      "/api/notifications/{id}/read": protectedOperation(
        "Mark notification as read",
        "patch",
        "Notifications",
      ),
      "/api/admin/statistics/platform": protectedOperation(
        "Platform statistics",
        "get",
        "Statistics",
      ),
      "/api/admin/statistics/books": protectedOperation(
        "Book statistics",
        "get",
        "Statistics",
      ),
      "/api/admin/statistics/authors": protectedOperation(
        "Author statistics",
        "get",
        "Statistics",
      ),
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(swaggerOptions);
