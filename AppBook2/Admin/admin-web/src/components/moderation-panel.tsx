"use client";

import { Check, FileCheck2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  decideModerationRequest,
  listModerationRequests,
  ModerationRequest,
} from "@/services/moderation-api";
import { useAdminToken } from "@/hooks/use-admin-token";

const labels: Record<string, string> = {
  book_publish: "Đăng truyện mới",
  chapter_publish: "Đăng chapter mới",
  book_edit: "Sửa truyện",
  chapter_edit: "Sửa chapter",
  book_delete: "Xóa truyện",
  chapter_delete: "Xóa chapter",
};

function requestTitle(item: ModerationRequest) {
  if (
    item.request_type === "chapter_publish" ||
    item.request_type === "chapter_edit"
  ) {
    return `${item.book_title || "Truyện"} · Chương ${item.chapter_number || "?"}${item.chapter_title ? `: ${item.chapter_title}` : ""}`;
  }
  return item.title || item.book_title || `Nội dung #${item.target_id}`;
}

export function ModerationPanel() {
  const [token, setToken] = useAdminToken();
  const [items, setItems] = useState<ModerationRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "chapter" | "book">("all");
  const [note, setNote] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadQueue = async () => {
    if (!token.trim()) {
      setError("Hãy nhập access token của tài khoản admin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await listModerationRequests(token.trim());
      setItems(result.rows.filter((item) => item.status === "pending"));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được hàng đợi duyệt.",
      );
    } finally {
      setLoading(false);
    }
  };

  const decide = async (
    item: ModerationRequest,
    action: "approve" | "reject",
  ) => {
    setBusyId(item.id);
    setError("");
    try {
      await decideModerationRequest(
        token.trim(),
        item.id,
        action,
        note[item.id],
      );
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Không xử lý được yêu cầu.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const visibleItems = items.filter(
    (item) => filter === "all" || item.target_type === filter,
  );

  return (
    <section className="panel section moderation-panel">
      <div className="panel-head">
        <div>
          <h2>Hàng đợi kiểm duyệt</h2>
          <span className="panel-subtitle">
            Duyệt truyện và chapter từ mobile bằng dữ liệu thật
          </span>
        </div>
        <button
          className="action-btn"
          onClick={() => void loadQueue()}
          disabled={loading}
        >
          <RefreshCw size={14} /> {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      <div className="moderation-toolbar">
        <input
          className="moderation-token"
          type="password"
          placeholder="Admin access token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <button
          className="primary-action"
          onClick={() => void loadQueue()}
          disabled={loading}
        >
          <FileCheck2 size={14} /> Tải yêu cầu
        </button>
        <select
          className="filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
        >
          <option value="all">Tất cả</option>
          <option value="book">Truyện</option>
          <option value="chapter">Chapter</option>
        </select>
      </div>

      {error ? <p className="moderation-error">{error}</p> : null}

      <div className="moderation-list">
        {visibleItems.length === 0 ? (
          <div className="moderation-empty">Chưa có yêu cầu chờ duyệt.</div>
        ) : (
          visibleItems.map((item) => (
            <article className="moderation-item" key={item.id}>
              <div className="moderation-item-main">
                <span className="moderation-type">
                  {labels[item.request_type] || item.request_type}
                </span>
                <strong>{requestTitle(item)}</strong>
                <span>
                  Request #{item.id} · Target #{item.target_id}
                  {item.author_name ? ` · ${item.author_name}` : ""}
                </span>
              </div>
              <div className="moderation-actions">
                <input
                  placeholder="Ghi chú (không bắt buộc)"
                  value={note[item.id] || ""}
                  onChange={(event) =>
                    setNote((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
                <button
                  className="approve-action"
                  onClick={() => void decide(item, "approve")}
                  disabled={busyId === item.id}
                >
                  <Check size={14} /> Duyệt
                </button>
                <button
                  className="reject-action"
                  onClick={() => void decide(item, "reject")}
                  disabled={busyId === item.id}
                >
                  <X size={14} /> Từ chối
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
