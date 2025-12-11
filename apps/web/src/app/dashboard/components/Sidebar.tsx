// apps/web/src/app/dashboard/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { X, Bot, Home, Settings, PlugZap, LogOut } from "lucide-react";

export default function Sidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-72 bg-white border-r shadow-sm transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b">
          <span className="text-2xl font-bold text-blue-600">FlowBot</span>
          <button className="md:hidden" onClick={() => setOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="p-4 space-y-2">
          <LinkItem href="/dashboard" icon={<Home />} label="דשבורד" />
          <LinkItem href="/dashboard/bots" icon={<Bot />} label="הבוטים שלי" />
          <LinkItem href="/dashboard/integrations" icon={<PlugZap />} label="אינטגרציות" />
          <LinkItem href="/dashboard/account" icon={<Settings />} label="חשבון" />
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-4">
          <LinkItem href="/logout" icon={<LogOut />} label="התנתקות" danger />
        </div>
      </aside>
    </>
  );
}

function LinkItem({
  icon,
  label,
  href,
  danger,
}: {
  icon: any;
  label: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 transition
        ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}