"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminTokenField } from "@/components/admin-token-field";
import { useAdminToken } from "@/hooks/use-admin-token";
import {
  approveWithdrawal,
  completeWithdrawal,
  listWithdrawals,
  rejectWithdrawal,
  Withdrawal,
} from "@/services/operations-api";

const currency = (value: string | number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

function bankDetails(snapshot: Withdrawal["bank_snapshot"]) {
  try {
    const bank =
      typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    return [
      bank.bankName || bank.bankCode,
      bank.accountHolder,
      bank.accountNumber,
      bank.branch,
    ]
      .filter(Boolean)
      .join(" · ") || "Không có thông tin ngân hàng";
  } catch {
    return "Thông tin ngân hàng không hợp lệ";
  }
}

const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt · chờ chuyển",
  rejected: "Đã từ chối",
  completed: "Đã chuyển",
};

export function WithdrawalsPanel() {
  const [token, setToken] = useAdminToken();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState("pending");
  const [transferRefs, setTransferRefs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const visibleItems = useMemo(
    () => items.filter((item) => filter === "all" || item.status === filter),
    [filter, items],
  );

  const load = async () => {
    if (!token.trim()) {
      setError("Nhập access token admin để tải yêu cầu rút tiền.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await listWithdrawals(token.trim());
      setItems(result.withdrawals);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được yêu cầu rút tiền.",
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

  const runAction = async (
    item: Withdrawal,
    action: () => Promise<unknown>,
  ) => {
    setBusyId(item.id);
    setError("");
    try {
      await action();
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Không thể xử lý yêu cầu rút tiền.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const requestRejection = (item: Withdrawal) => {
    const reason = window.prompt("Nhập lý do từ chối yêu cầu rút tiền:");
    if (!reason?.trim()) {
      if (reason !== null) setError("Cần nhập lý do để từ chối yêu cầu.");
      return;
    }
    void runAction(item, () =>
      rejectWithdrawal(token.trim(), item.id, reason.trim()),
    );
  };

  return (
    <section className="panel operations-panel">
      <div className="panel-head">
        <div>
          <h2>Yêu cầu rút tiền</h2>
          <span className="panel-subtitle">
            Duyệt, từ chối hoặc xác nhận chuyển tiền qua API backend
          </span>
        </div>
        <button className="action-btn" onClick={() => void load()} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>
      <div className="data-toolbar">
        <AdminTokenField token={token} onChange={setToken} />
        <select
          className="filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt · chờ chuyển</option>
          <option value="completed">Đã chuyển</option>
          <option value="rejected">Đã từ chối</option>
          <option value="all">Tất cả</option>
        </select>
      </div>
      {error ? <p className="data-error">{error}</p> : null}
      <div className="table-wrap">
        <table className="data-table operations-table">
          <thead>
            <tr>
              <th>Mã yêu cầu</th>
              <th>Người đăng</th>
              <th>Số tiền</th>
              <th>Tài khoản nhận</th>
              <th>Ngày yêu cầu</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <b>{item.code}</b>
                </td>
                <td>
                  <b>{item.account_full_name || item.account_username || `#${item.account_id}`}</b>
                  {item.account_email ? (
                    <span className="table-subline">{item.account_email}</span>
                  ) : null}
                </td>
                <td>
                  <b>{currency(item.amount)}</b>
                </td>
                <td className="bank-cell">{bankDetails(item.bank_snapshot)}</td>
                <td>{new Date(item.created_at).toLocaleString("vi-VN")}</td>
                <td>
                  <span
                    className={`status ${item.status === "pending" ? "pending" : item.status === "rejected" ? "rejected" : "published"}`}
                  >
                    {statusLabel[item.status] || item.status}
                  </span>
                  {item.reject_reason ? (
                    <span className="table-subline">{item.reject_reason}</span>
                  ) : null}
                  {item.transfer_ref ? (
                    <span className="table-subline">
                      Mã chuyển: {item.transfer_ref}
                    </span>
                  ) : null}
                </td>
                <td>
                  {item.status === "pending" ? (
                    <div className="row-actions">
                      <button
                        className="approve-action"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void runAction(item, () =>
                            approveWithdrawal(token.trim(), item.id),
                          )
                        }
                      >
                        Duyệt
                      </button>
                      <button
                        className="reject-action"
                        disabled={busyId === item.id}
                        onClick={() => requestRejection(item)}
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : null}
                  {item.status === "approved" ? (
                    <div className="complete-withdrawal">
                      <input
                        aria-label={`Mã chuyển khoản ${item.code}`}
                        placeholder="Mã giao dịch chuyển"
                        value={transferRefs[item.id] || ""}
                        onChange={(event) =>
                          setTransferRefs((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className="approve-action"
                        disabled={
                          busyId === item.id || !transferRefs[item.id]?.trim()
                        }
                        onClick={() =>
                          void runAction(item, () =>
                            completeWithdrawal(
                              token.trim(),
                              item.id,
                              transferRefs[item.id].trim(),
                            ),
                          )
                        }
                      >
                        Xác nhận đã chuyển
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  {loading
                    ? "Đang tải yêu cầu..."
                    : "Không có yêu cầu rút tiền ở trạng thái này."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
