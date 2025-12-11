// apps/web/src/app/dashboard/components/Topbar.tsx
"use client";

import { Menu } from "lucide-react";

export default function Topbar({
  setSidebarOpen,
}: {
  setSidebarOpen: (v: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm border-b h-16 flex items-center px-4 md:px-8">
      <button
        className="md:hidden p-2 rounded hover:bg-gray-100"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>

      <span className="text-lg font-semibold ml-4">FlowBot Dashboard</span>
    </div>
  );
}