"use client";

import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileCheck2,
  Flag,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

const items = [
  ["Tổng quan", LayoutDashboard],
  ["Sách & truyện", BookOpen],
  ["Kiểm duyệt", FileCheck2],
  ["Báo cáo", Flag],
  ["Người dùng", Users],
  ["Tài chính", CreditCard],
  ["Thống kê", BarChart3],
] as const;

export function Sidebar({
  active,
  onChange,
}: {
  active: string;
  onChange: (item: string) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <b className="logo-mark">A</b>
        <span>APPBOOK</span>
      </div>
      <p className="nav-label">Quản trị hệ thống</p>
      <nav className="nav">
        {items.map(([label, Icon]) => (
          <button
            className={active === label ? "active" : ""}
            key={label}
            onClick={() => onChange(label)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-other">
        <p className="nav-label">Khác</p>
        <nav className="nav">
          <button onClick={() => onChange("Cài đặt")}>
            <Settings />
            <span>Cài đặt</span>
          </button>
          <button onClick={() => onChange("Đăng xuất")}>
            <LogOut />
            <span>Đăng xuất</span>
          </button>
        </nav>
      </div>
      <div className="sidebar-foot">
        <div className="avatar">AD</div>
        <div>
          <strong>Quản trị viên</strong>
          <span>APPBOOK</span>
        </div>
      </div>
    </aside>
  );
}
