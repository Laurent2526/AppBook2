"use client";

import { useState } from "react";
import {
  AdminAccount,
  AdminBook,
  AdminChapter,
  deleteAccount,
  deleteBook,
  getAdminBook,
  listAccounts,
  listBooks,
  resolveAdminAssetUrl,
  setAccountStatus,
  setAdminBookStatus,
  updateAdminBook,
} from "@/services/management-api";
import { useAdminToken } from "@/hooks/use-admin-token";

type Props = { kind: "accounts" | "books" };

const statusNames: Record<string, string> = {
  active: "Hoạt động",
  locked: "Đã khóa",
  pending_verify: "Chờ xác thực",
  deleted: "Đã xóa",
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  published: "Công khai",
  rejected: "Từ chối",
  hidden: "Đã ẩn",
  pending_delete: "Chờ xóa",
};

function dateLabel(value?: string | null) {
  if (!value) return "Chưa đăng nhập";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(
    new Date(value),
  );
}

export function ManagementPanel({ kind }: Props) {
  const [token, setToken] = useAdminToken();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [selectedBook, setSelectedBook] = useState<AdminBook | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  const title =
    kind === "accounts" ? "Quản lý tài khoản" : "Quản lý sách & truyện";

  const load = async () => {
    if (!token.trim()) {
      setError("Nhập access token admin để tải dữ liệu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result =
        kind === "accounts"
          ? await listAccounts(token.trim(), {
              search: query,
              status,
              limit: 50,
            })
          : await listBooks(token.trim(), { search: query, status, limit: 50 });
      if (kind === "accounts") setAccounts(result.rows as AdminAccount[]);
      else setBooks(result.rows as AdminBook[]);
      setTotal(result.total);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được dữ liệu.",
      );
    } finally {
      setLoading(false);
    }
  };

  const withBusy = async (id: number, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError("");
    try {
      await action();
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Thao tác thất bại.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const showBook = async (book: AdminBook) => {
    setBusyId(book.id);
    setError("");
    try {
      const result = await getAdminBook(token.trim(), book.id);
      setSelectedBook(result.book);
      setChapters(result.chapters);
      setEditTitle(result.book.title);
      setEditAuthor(result.book.author_name || "");
      setEditDescription(result.book.description || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được chi tiết sách.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const saveBook = async () => {
    if (!selectedBook) return;
    await withBusy(selectedBook.id, async () => {
      await updateAdminBook(token.trim(), selectedBook.id, {
        title: editTitle.trim(),
        authorName: editAuthor.trim(),
        description: editDescription,
      });
      setSelectedBook(null);
    });
  };

  return (
    <section className="panel section management-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <span className="panel-subtitle">
            {total.toLocaleString("vi-VN")} kết quả
          </span>
        </div>
        <button
          className="action-btn"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Tải dữ liệu"}
        </button>
      </div>
      <div className="management-toolbar">
        <input
          className="management-token"
          type="password"
          placeholder="Admin access token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <input
          className="management-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void load();
          }}
          placeholder={
            kind === "accounts"
              ? "Tên, email, username, số điện thoại"
              : "Tên sách hoặc người đăng"
          }
        />
        <select
          className="filter"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Mọi trạng thái</option>
          {kind === "accounts" ? (
            <>
              <option value="active">Hoạt động</option>
              <option value="locked">Đã khóa</option>
              <option value="pending_verify">Chờ xác thực</option>
              <option value="deleted">Đã xóa</option>
            </>
          ) : (
            <>
              <option value="pending">Chờ duyệt</option>
              <option value="published">Công khai</option>
              <option value="hidden">Đã ẩn</option>
              <option value="rejected">Từ chối</option>
              <option value="pending_delete">Chờ xóa</option>
              <option value="deleted">Đã xóa</option>
            </>
          )}
        </select>
        <button
          className="primary-action"
          onClick={() => void load()}
          disabled={loading}
        >
          Tìm
        </button>
      </div>
      {error ? <p className="management-error">{error}</p> : null}
      <div className="table-wrap">
        {kind === "accounts" ? (
          <table className="data-table management-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Tham gia</th>
                <th>Đăng nhập gần nhất</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <b>{account.full_name || account.username}</b>
                    <span className="table-subline">
                      {account.email || account.phone || account.username}
                    </span>
                  </td>
                  <td>
                    {account.role}
                    {account.is_author ? " · Người đăng" : ""}
                  </td>
                  <td>
                    <span
                      className={`status ${account.status === "active" ? "published" : account.status === "locked" ? "rejected" : "pending"}`}
                    >
                      {statusNames[account.status]}
                    </span>
                  </td>
                  <td>{dateLabel(account.created_at)}</td>
                  <td>{dateLabel(account.last_login_at)}</td>
                  <td className="row-actions">
                    {account.status !== "deleted" &&
                    account.role !== "super_admin" ? (
                      <>
                        <button
                          className="action-btn"
                          disabled={busyId === account.id}
                          onClick={() =>
                            void withBusy(account.id, () =>
                              setAccountStatus(
                                token.trim(),
                                account.id,
                                account.status === "locked"
                                  ? "active"
                                  : "locked",
                              ),
                            )
                          }
                        >
                          {account.status === "locked" ? "Mở khóa" : "Khóa"}
                        </button>
                        <button
                          className="danger-btn"
                          disabled={busyId === account.id}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Xóa mềm tài khoản ${account.username}?`,
                              )
                            )
                              void withBusy(account.id, () =>
                                deleteAccount(token.trim(), account.id),
                              );
                          }}
                        >
                          Xóa mềm
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Không có tài khoản phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : (
          <table className="data-table management-table">
            <thead>
              <tr>
                <th>Sách / truyện</th>
                <th>Người đăng</th>
                <th>Trạng thái</th>
                <th>Lượt đọc</th>
                <th>Chương bán</th>
                <th>Doanh thu</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>
                    <div className="book-management-cell">
                      <div className="admin-book-cover">
                        <span>{book.title.slice(0, 2).toUpperCase()}</span>
                        {resolveAdminAssetUrl(book.cover_url) ? (
                          <img
                            src={resolveAdminAssetUrl(book.cover_url)}
                            alt={`Ảnh bìa ${book.title}`}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div>
                        <b>{book.title}</b>
                        <span className="table-subline">#{book.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>{book.owner_name || book.owner_username}</td>
                  <td>
                    <span
                      className={`status ${book.status === "published" ? "published" : book.status === "rejected" ? "rejected" : "pending"}`}
                    >
                      {statusNames[book.status] || book.status}
                    </span>
                  </td>
                  <td>{Number(book.view_count).toLocaleString("vi-VN")}</td>
                  <td>{Number(book.purchase_count).toLocaleString("vi-VN")}</td>
                  <td>
                    {Number(book.total_revenue).toLocaleString("vi-VN")} đ
                  </td>
                  <td className="row-actions">
                    <button
                      className="action-btn"
                      disabled={busyId === book.id}
                      onClick={() => void showBook(book)}
                    >
                      Chi tiết / sửa
                    </button>
                    {book.status !== "deleted" ? (
                      <button
                        className="action-btn"
                        disabled={busyId === book.id}
                        onClick={() =>
                          void withBusy(book.id, () =>
                            setAdminBookStatus(
                              token.trim(),
                              book.id,
                              book.status === "published"
                                ? "hidden"
                                : "published",
                            ),
                          )
                        }
                      >
                        {book.status === "published" ? "Ẩn" : "Công khai"}
                      </button>
                    ) : null}
                    {book.status !== "deleted" ? (
                      <button
                        className="danger-btn"
                        disabled={busyId === book.id}
                        onClick={() => {
                          if (window.confirm(`Xóa mềm “${book.title}”?`))
                            void withBusy(book.id, () =>
                              deleteBook(token.trim(), book.id),
                            );
                        }}
                      >
                        Xóa mềm
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {books.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    Không có sách phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
      {selectedBook ? (
        <div className="management-detail">
          <div className="panel-head">
            <div>
              <h2>Chi tiết sách #{selectedBook.id}</h2>
              <span className="panel-subtitle">
                Người đăng:{" "}
                {selectedBook.owner_name || selectedBook.owner_username}
              </span>
            </div>
            <button
              className="action-btn"
              onClick={() => setSelectedBook(null)}
            >
              Đóng
            </button>
          </div>
          <div className="management-form">
            <div className="admin-book-cover admin-book-cover-large">
              <span>{selectedBook.title.slice(0, 2).toUpperCase()}</span>
              {resolveAdminAssetUrl(selectedBook.cover_url) ? (
                <img
                  src={resolveAdminAssetUrl(selectedBook.cover_url)}
                  alt={`Ảnh bìa ${selectedBook.title}`}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
            </div>
            <label>
              Tên sách
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </label>
            <label>
              Tác giả
              <input
                value={editAuthor}
                onChange={(event) => setEditAuthor(event.target.value)}
              />
            </label>
            <label>
              Mô tả
              <input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Nhập mô tả mới nếu cần cập nhật"
              />
            </label>
            <button
              className="primary-action"
              disabled={busyId === selectedBook.id}
              onClick={() => void saveBook()}
            >
              Lưu thay đổi
            </button>
          </div>
          <div className="management-chapters">
            <h3>Danh sách chương</h3>
            {chapters.map((chapter) => (
              <div className="chapter-row" key={chapter.id}>
                <b>
                  Chương {chapter.chapter_number}: {chapter.title}
                </b>
                <span>
                  {statusNames[chapter.status] || chapter.status} ·{" "}
                  {chapter.is_free
                    ? "Miễn phí"
                    : `${Number(chapter.price).toLocaleString("vi-VN")} đ`}{" "}
                  · {chapter.purchase_count} lượt mua
                </span>
              </div>
            ))}
            {chapters.length === 0 ? (
              <p className="empty-cell">Chưa có chương.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
