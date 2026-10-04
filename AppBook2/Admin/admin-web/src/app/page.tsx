"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ManagementPanel } from "@/components/management-panel";
import { ModerationPanel } from "@/components/moderation-panel";
import { ReportsPanel } from "@/components/reports-panel";
import { Sidebar } from "@/components/sidebar";
import { StatisticsPanel } from "@/components/statistics-panel";
import { WithdrawalsPanel } from "@/components/withdrawals-panel";

export default function AdminPage() {
  const [active, setActive] = useState("Tổng quan");

  return (
    <div className="admin-shell">
      <Sidebar active={active} onChange={setActive} />
      <main className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "full",
              }).format(new Date())}
            </div>
            <h1>
              {active === "Tổng quan"
                ? "Chào mừng đến APPBOOK Admin"
                : active}
            </h1>
          </div>
          <div className="top-actions">
            <Bell size={18} color="#78817c" />
            <div className="avatar profile">AD</div>
          </div>
        </header>
        {active === "Tổng quan" ? <AdminDashboard /> : null}
        {active === "Sách & truyện" ? <ManagementPanel kind="books" /> : null}
        {active === "Kiểm duyệt" ? <ModerationPanel /> : null}
        {active === "Người dùng" ? <ManagementPanel kind="accounts" /> : null}
        {active === "Tài chính" ? <WithdrawalsPanel /> : null}
        {active === "Báo cáo" ? <ReportsPanel /> : null}
        {active === "Thống kê" ? <StatisticsPanel /> : null}
        {["Cài đặt", "Đăng xuất"].includes(active) ? (
          <section className="panel">
            <div className="data-empty">
              {active} chưa được triển khai trong trang quản trị.
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
