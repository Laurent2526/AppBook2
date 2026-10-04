"use client";

import { useEffect, useState } from "react";
import { AdminTokenField } from "@/components/admin-token-field";
import { useAdminToken } from "@/hooks/use-admin-token";
import {
  dismissReport,
  listReports,
  Report,
  resolveReport,
} from "@/services/operations-api";

const reasonLabels: Record<string, string> = {
  copyright: "Vi phạm bản quyền",
  sensitive_content: "Nội dung nhạy cảm",
  spam: "Spam",
  hate_speech: "Ngôn từ kích động",
  harassment: "Quấy rối",
  misinformation: "Thông tin sai lệch",
  other: "Khác",
};

const targetLabels: Record<string, string> = {
  book: "Truyện",
  chapter: "Chương",
  comment: "Bình luận",
  account: "Tài khoản",
  message: "Tin nhắn",
};

function availableActions(report: Report) {
  if (["book", "chapter", "comment"].includes(report.target_type)) {
    return [
      ["hidden", "Ẩn nội dung"],
      ["deleted", "Xóa mềm"],
      ["none", "Không thay đổi nội dung"],
    ] as const;
  }
  if (report.target_type === "account") {
    return [
      ["account_locked", "Khóa tài khoản"],
      ["none", "Không thay đổi tài khoản"],
    ] as const;
  }
  return [["none", "Không thay đổi nội dung"]] as const;
}

export function ReportsPanel() {
  const [token, setToken] = useAdminToken();
  const [items, setItems] = useState<Report[]>([]);
  const [actions, setActions] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token.trim()) {
      setError("Nhập access token admin để tải báo cáo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await listReports(token.trim());
      setItems(result.items);
      setActions((current) => {
        const next = { ...current };
        for (const report of result.items) {
          if (!next[report.id]) {
            next[report.id] = availableActions(report)[0][0];
          }
        }
        return next;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được hàng đợi báo cáo.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token.trim()) return;
    const timer = window.setTimeout(() => void load(), 500);
    return () => window.clearTimeout(timer);
    // Token changes are debounced to avoid requests for every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const decide = async (report: Report, dismiss: boolean) => {
    setBusyId(report.id);
    setError("");
    try {
      if (dismiss) {
        await dismissReport(token.trim(), report.id, notes[report.id]);
      } else {
        const action = actions[report.id] || availableActions(report)[0][0];
        await resolveReport(
          token.trim(),
          report.id,
          action as "none" | "hidden" | "deleted" | "account_locked",
          notes[report.id],
        );
      }
      setItems((current) => current.filter((item) => item.id !== report.id));
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Không thể xử lý báo cáo.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel operations-panel">
      <div className="panel-head">
        <div>
          <h2>Hàng đợi báo cáo vi phạm</h2>
          <span className="panel-subtitle">
            Xem lý do, thực hiện biện pháp và ghi chú kết quả qua API backend
          </span>
        </div>
        <button
          className="action-btn"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>
      <div className="data-toolbar">
        <AdminTokenField token={token} onChange={setToken} />
      </div>
      {error ? <p className="data-error">{error}</p> : null}
      <div className="report-list">
        {items.map((report) => {
          const choices = availableActions(report);
          return (
            <article className="report-item" key={report.id}>
              <div className="report-item-main">
                <div className="report-badges">
                  <span className="status pending">
                    {targetLabels[report.target_type] || report.target_type} #
                    {report.target_id}
                  </span>
                  <span className="status rejected">
                    {reasonLabels[report.reason] || report.reason}
                  </span>
                </div>
                <strong>Báo cáo #{report.id}</strong>
                <span>
                  Người báo cáo #{report.reporter_id} ·{" "}
                  {new Date(report.created_at).toLocaleString("vi-VN")}
                </span>
                {report.description ? <p>{report.description}</p> : null}
                {report.evidence_urls ? (
                  <EvidenceLinks evidence={report.evidence_urls} />
                ) : null}
              </div>
              <div className="report-controls">
                <select
                  className="filter"
                  value={actions[report.id] || choices[0][0]}
                  onChange={(event) =>
                    setActions((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                >
                  {choices.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Ghi chú xử lý (không bắt buộc)"
                  value={notes[report.id] || ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                />
                <div className="row-actions">
                  <button
                    className="approve-action"
                    disabled={busyId === report.id}
                    onClick={() => void decide(report, false)}
                  >
                    Xử lý báo cáo
                  </button>
                  <button
                    className="reject-action"
                    disabled={busyId === report.id}
                    onClick={() => void decide(report, true)}
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {items.length === 0 ? (
          <div className="data-empty">
            {loading
              ? "Đang tải báo cáo..."
              : "Không có báo cáo nào đang chờ xử lý."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EvidenceLinks({ evidence }: { evidence: string | string[] }) {
  let urls: string[];
  try {
    const parsed = typeof evidence === "string" ? JSON.parse(evidence) : evidence;
    urls = Array.isArray(parsed) ? parsed : [];
  } catch {
    urls = [];
  }
  if (!urls.length) return null;
  return (
    <div className="evidence-links">
      {urls.map((url, index) => (
        <a href={url} target="_blank" rel="noreferrer" key={`${url}-${index}`}>
          Bằng chứng {index + 1}
        </a>
      ))}
    </div>
  );
}
