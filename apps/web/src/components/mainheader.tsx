"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Bot, LogOut } from "lucide-react";

export default function MainHeader() {
  const pathname = usePathname();
  
  // לא מציג האדר בעמודי אימות או בילדר מלא
  if (pathname.includes("/auth") || pathname === "/") return null;

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-6 sticky top-0 z-50">
      <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-tight">
        <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">
          <Bot size={20} />
        </div>
        <span>FlowBot</span>
      </Link>

      <nav className="flex items-center gap-4">
        <Link 
          href="/dashboard" 
          className={`text-sm font-medium hover:text-black transition-colors ${pathname === "/dashboard" ? "text-black" : "text-neutral-500"}`}
        >
          דשבורד
        </Link>
        <div className="w-px h-4 bg-neutral-200" />
        <Link 
          href="/builder" 
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-800 transition-all"
        >
          + בוט חדש
        </Link>
      </nav>
    </header>
  );
}