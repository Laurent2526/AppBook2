const { Server } = require("socket.io");
const db = require("../../config/db");
const env = require("../../config/env");
const { verifyAccessToken } = require("../../utils/tokens");

let io;

function attachRealtime(server) {
  io = new Server(server, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("AUTH_REQUIRED"));
      const auth = verifyAccessToken(token);
      const session = await db("user_sessions as sessions")
        .join("accounts", "accounts.id", "sessions.account_id")
        .select("accounts.id", "sessions.id as session_id")
        .where("sessions.id", auth.sessionId)
        .where("sessions.account_id", auth.sub)
        .whereNull("sessions.revoked_at")
        .where("sessions.expires_at", ">", db.fn.now())
        .where("accounts.status", "active")
        .first();
      if (!session) return next(new Error("SESSION_REVOKED"));
      socket.data.accountId = Number(session.id);
      next();
    } catch {
      next(new Error("INVALID_ACCESS_TOKEN"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`account:${socket.data.accountId}`);
  });

  return io;
}

function emitToAccount(accountId, event, payload) {
  io?.to(`account:${accountId}`).emit(event, payload);
}

module.exports = { attachRealtime, emitToAccount };
