"use client";

import { useState } from "react";
import { useAdminToken } from "@/hooks/use-admin-token";
import {
  AdminTokenField,
} from "@/components/admin-token-field";
import { listAccounts, listBooks } from "@/services/management-api";
import { listModerationRequests } from "@/services/moderation-api";
import {
  DailyPlatformStats,
  getPlatformStats,
  listReports,
  listWithdrawals,
} from "@/services/operations-api";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

function dateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function AdminDashboard() {
  const [token, setToken] = useAdminToken();
  const [days, setDays] = useState<DailyPlatformStats[]>([]);
  const [counts, setCounts] = useState({ accounts: 0, books: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token.trim()) {
      setError("Nhập access token admin để tải số liệu thật.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { from, to } = dateRange();
      const [platform, accounts, books, moderation, withdrawals, reports] =
        await Promise.all([
          getPlatformStats(token.trim(), from, to),
          listAccounts(token.trim(), { limit: 1 }),
          listBooks(token.trim(), { limit: 1 }),
          listModerationRequests(token.trim()),
          listWithdrawals(token.trim()),
          listReports(token.trim()),
        ]);
      setDays(platform.items);
      setCounts({
        accounts: accounts.total,
        books: books.total,
        pending:
          moderation.rows.filter((item) => item.status === "pending").length +
          withdrawals.withdrawals.filter((item) => item.status === "pending")
            .length +
          reports.items.length,
      });
      setLoaded(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được số liệu tổng quan.",
      );
    } finally {
      setLoading(false);
    }
  };

  const totals = days.reduce(
    (result, item) => ({
      revenue: result.revenue + Number(item.platform_revenue || 0),
      users: result.users + Number(item.new_users || 0),
      views: result.views + Number(item.total_views || 0),
    }),
    { revenue: 0, users: 0, views: 0 },
  );
  const maxRevenue = Math.max(
    1,
    ...days.map((item) => Number(item.platform_revenue || 0)),
  );
  const recentDays = days.slice(-14);

  return (
    <>
      <div className="data-toolbar">
        <AdminTokenField token={token} onChange={setToken} />
        <button className="primary-action" onClick={() => void load()} disabled={loading}>
          {loading ? "Đang tải..." : "Tải số liệu mới nhất"}
        </button>
        <span className="panel-subtitle">Doanh thu và lượt đọc: 30 ngày gần nhất</span>
      </div>
      {error ? <p className="data-error">{error}</p> : null}
      <section className="stats">
        <article className="stat lime">
          <div className="stat-top">Doanh thu nền tảng · 30 ngày</div>
          <strong>{loaded ? money(totals.revenue) : "—"}</strong>
          <span className="trend">Theo dữ liệu tổng hợp hằng ngày</span>
        </article>
        <article className="stat">
          <div className="stat-top">Tài khoản</div>
          <strong>{loaded ? counts.accounts.toLocaleString("vi-VN") : "—"}</strong>
          <span className="trend">Tổng số tài khoản hiện có</span>
        </article>
        <article className="stat">
          <div className="stat-top">Sách / truyện</div>
          <strong>{loaded ? counts.books.toLocaleString("vi-VN") : "—"}</strong>
          <span className="trend">Tổng số nội dung hiện có</span>
        </article>
        <article className="stat">
          <div className="stat-top">Việc chờ xử lý</div>
          <strong>{loaded ? counts.pending.toLocaleString("vi-VN") : "—"}</strong>
          <span className="trend down">Kiểm duyệt, báo cáo và rút tiền</span>
        </article>
      </section>
      <section className="grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Hoạt động 30 ngày gần nhất</h2>
              <span className="panel-subtitle">
                {loaded
                  ? `${totals.users.toLocaleString("vi-VN")} tài khoản mới · ${totals.views.toLocaleString("vi-VN")} lượt đọc`
                  : "Biểu đồ lấy từ dữ liệu tổng hợp backend"}
              </span>
            </div>
          </div>
          {loaded && recentDays.length > 0 ? (
            <div className="live-chart" aria-label="Doanh thu nền tảng theo ngày">
              {recentDays.map((day) => {
                const revenue = Number(day.platform_revenue || 0);
                return (
                  <div className="live-chart-column" key={day.stat_date}>
                    <div
                      className="live-chart-bar"
                      title={`${day.stat_date}: ${money(revenue)}`}
                      style={{
                        height: `${Math.max(3, (revenue / maxRevenue) * 100)}%`,
                      }}
                    />
                    <span>
                      {new Date(`${day.stat_date}T00:00:00`).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="data-empty">
              {loaded
                ? "Chưa có dữ liệu tổng hợp trong khoảng thời gian này."
                : "Nhập token admin và tải số liệu để xem tổng quan."}
            </div>
          )}
        </article>
        <article className="panel dashboard-note">
          <h2>Phạm vi dữ liệu</h2>
          <p>
            Số liệu được lấy trực tiếp từ API thống kê, quản lý tài khoản,
            sách, kiểm duyệt, báo cáo và rút tiền. Biểu đồ chỉ hiển thị những
            ngày backend đã tổng hợp.
          </p>
          <p>
            Nếu chưa có dữ liệu thống kê, hãy chạy tác vụ tổng hợp backend cho
            các ngày cần xem.
          </p>
        </article>
      </section>
    </>
  );
}
