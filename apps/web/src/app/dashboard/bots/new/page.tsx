"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function NewBotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  async function createBot() {
    if (!name.trim()) return;

    setLoading(true);

    // 🔥 בהמשך תחבר ל־API אמיתי
    const res = await fetch("/api/bots/create", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    setLoading(false);

    if (res.ok) {
      router.push(`/dashboard/bots/${data.id}`);
    } else {
      alert(data.error || "שגיאה");
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-3xl font-bold">צור בוט חדש</h1>

      <div className="space-y-3">
        <label className="text-sm text-gray-600">שם הבוט</label>
        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2"
          placeholder="לדוגמה: בוט שירות לקוחות"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button
        onClick={createBot}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        צור בוט
      </button>
    </div>
  );
}