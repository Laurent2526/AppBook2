"use client";

import { useState } from "react";
import { AdminTokenField } from "@/components/admin-token-field";
import { useAdminToken } from "@/hooks/use-admin-token";
import {
  DailyAuthorStats,
  DailyBookStats,
  DailyPlatformStats,
  getAuthorStats,
  getBookStats,
  getPlatformStats,
} from "@/services/operations-api";

const money = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function dateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function sum<T>(items: T[], read: (item: T) => number | string) {
  return items.reduce((total, item) => total + Number(read(item) || 0), 0);
}

export function StatisticsPanel() {
  const [token, setToken] = useAdminToken();
  const initialRange = dateRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [platform, setPlatform] = useState<DailyPlatformStats[]>([]);
  const [books, setBooks] = useState<DailyBookStats[]>([]);
  const [authors, setAuthors] = useState<DailyAuthorStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token.trim()) {
      setError("Nhập access token admin để tải thống kê.");
      return;
    }
    if (!from || !to || from > to) {
      setError("Chọn khoảng ngày hợp lệ.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [platformResult, bookResult, authorResult] = await Promise.all([
        getPlatformStats(token.trim(), from, to),
        getBookStats(token.trim(), from, to),
        getAuthorStats(token.trim(), from, to),
      ]);
      setPlatform(platformResult.items);
      setBooks(bookResult.items);
      setAuthors(authorResult.items);
      setLoaded(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được thống kê.",
      );
    } finally {
      setLoading(false);
    }
  };

  const topBooks = [...books]
    .reduce<DailyBookStats[]>((rows, item) => {
      const existing = rows.find((row) => row.book_id === item.book_id);
      if (existing) {
        existing.views += Number(item.views || 0);
        existing.chapters_sold += Number(item.chapters_sold || 0);
        existing.revenue = String(
          Number(existing.revenue || 0) + Number(item.revenue || 0),
        );
      } else {
        rows.push({ ...item });
      }
      return rows;
    }, [])
    .sort((left, right) => Number(right.revenue) - Number(left.revenue))
    .slice(0, 10);
  const topAuthors = [...authors]
    .reduce<DailyAuthorStats[]>((rows, item) => {
      const existing = rows.find((row) => row.account_id === item.account_id);
      if (existing) {
        existing.total_views += Number(item.total_views || 0);
        existing.chapters_sold += Number(item.chapters_sold || 0);
        existing.revenue = String(
          Number(existing.revenue || 0) + Number(item.revenue || 0),
        );
      } else {
        rows.push({ ...item });
      }
      return rows;
    }, [])
    .sort((left, right) => Number(right.revenue) - Number(left.revenue))
    .slice(0, 10);

  return (
    <section className="panel operations-panel">
      <div className="panel-head">
        <div>
          <h2>Thống kê hệ thống</h2>
          <span className="panel-subtitle">
            Tổng hợp nền tảng, sách/truyện và người đăng theo khoảng ngày
          </span>
        </div>
        <button className="action-btn" onClick={() => void load()} disabled={loading}>
          {loading ? "Đang tải..." : "Tải thống kê"}
        </button>
      </div>
      <div className="data-toolbar statistics-toolbar">
        <AdminTokenField token={token} onChange={setToken} />
        <label>
          Từ ngày
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      {error ? <p className="data-error">{error}</p> : null}
      {loaded ? (
        <>
          <div className="stats stats-summary">
            <article className="stat">
              <div className="stat-top">Người dùng mới</div>
              <strong>{sum(platform, (item) => item.new_users).toLocaleString("vi-VN")}</strong>
            </article>
            <article className="stat">
              <div className="stat-top">Người đọc hoạt động</div>
              <strong>{sum(platform, (item) => item.active_readers).toLocaleString("vi-VN")}</strong>
            </article>
            <article className="stat">
              <div className="stat-top">Lượt đọc</div>
              <strong>{sum(platform, (item) => item.total_views).toLocaleString("vi-VN")}</strong>
            </article>
            <article className="stat lime">
              <div className="stat-top">Doanh thu nền tảng</div>
              <strong>{money(sum(platform, (item) => item.platform_revenue))}</strong>
            </article>
          </div>
          <DataTable title="Thống kê theo ngày" empty={!platform.length}>
            <table className="data-table operations-table">
              <thead>
                <tr>
                  <th>Ngày</th><th>Người dùng mới</th><th>Đọc hoạt động</th>
                  <th>Lượt đọc</th><th>Chương bán</th><th>Tổng giao dịch</th>
                  <th>Phí nền tảng</th><th>Doanh thu người đăng</th>
                </tr>
              </thead>
              <tbody>
                {platform.map((item) => (
                  <tr key={item.stat_date}>
                    <td>{new Date(`${item.stat_date}T00:00:00`).toLocaleDateString("vi-VN")}</td>
                    <td>{Number(item.new_users).toLocaleString("vi-VN")}</td>
                    <td>{Number(item.active_readers).toLocaleString("vi-VN")}</td>
                    <td>{Number(item.total_views).toLocaleString("vi-VN")}</td>
                    <td>{Number(item.chapters_sold).toLocaleString("vi-VN")}</td>
                    <td>{money(item.gross_revenue)}</td>
                    <td>{money(item.platform_revenue)}</td>
                    <td>{money(item.author_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
          <DataTable title="Sách / truyện nổi bật trong kỳ" empty={!topBooks.length}>
            <table className="data-table operations-table">
              <thead><tr><th>ID truyện</th><th>Lượt đọc</th><th>Chương bán</th><th>Doanh thu người đăng</th><th>Người theo dõi mới</th></tr></thead>
              <tbody>{topBooks.map((item) => <tr key={item.book_id}><td>#{item.book_id}</td><td>{Number(item.views).toLocaleString("vi-VN")}</td><td>{Number(item.chapters_sold).toLocaleString("vi-VN")}</td><td>{money(item.revenue)}</td><td>{Number(item.new_followers).toLocaleString("vi-VN")}</td></tr>)}</tbody>
            </table>
          </DataTable>
          <DataTable title="Người đăng nổi bật trong kỳ" empty={!topAuthors.length}>
            <table className="data-table operations-table">
              <thead><tr><th>ID người đăng</th><th>Số truyện</th><th>Lượt đọc</th><th>Chương bán</th><th>Doanh thu</th></tr></thead>
              <tbody>{topAuthors.map((item) => <tr key={item.account_id}><td>#{item.account_id}</td><td>{Number(item.book_count).toLocaleString("vi-VN")}</td><td>{Number(item.total_views).toLocaleString("vi-VN")}</td><td>{Number(item.chapters_sold).toLocaleString("vi-VN")}</td><td>{money(item.revenue)}</td></tr>)}</tbody>
            </table>
          </DataTable>
        </>
      ) : (
        <div className="data-empty">
          Tải thống kê để xem số liệu trong khoảng ngày đã chọn.
        </div>
      )}
    </section>
  );
}

function DataTable({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="statistics-table-section">
      <h3>{title}</h3>
      {empty ? <div className="data-empty">Không có dữ liệu trong khoảng thời gian này.</div> : <div className="table-wrap">{children}</div>}
    </section>
  );
}
