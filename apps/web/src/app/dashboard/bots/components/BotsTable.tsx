"use client";

import { useState } from "react";

export default function BotsTable({ bots, loading }) {
  const [search, setSearch] = useState("");

  const filtered = bots.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/10">
      {/* Search */}
      <div className="flex justify-between mb-4">
        <input
          className="w-full max-w-sm px-3 py-2 rounded-xl bg-white/20 text-white outline-none"
          placeholder="חיפוש בוט..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <table className="w-full text-right">
        <thead>
          <tr className="text-white/70 border-b border-white/10">
            <th className="py-3">שם הבוט</th>
            <th className="py-3">סטטוס</th>
            <th className="py-3">תאריך יצירה</th>
            <th className="py-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td className="py-4 opacity-70" colSpan={4}>טוען...</td>
            </tr>
          )}

          {!loading && filtered.length === 0 && (
            <tr>
              <td className="py-4 opacity-70" colSpan={4}>לא נמצאו בוטים</td>
            </tr>
          )}

          {filtered.map((b) => (
            <tr key={b.id} className="border-b border-white/5">
              <td className="py-3">{b.name}</td>
              <td className="py-3">{b.isActive ? "פעיל" : "לא פעיל"}</td>
              <td className="py-3">
                {new Date(b.createdAt).toLocaleDateString("he-IL")}
              </td>
              <td className="py-3">
                <button className="text-blue-300 hover:text-blue-400">עריכה</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}