"use client";

import { useState } from "react";
import { Upload, File, ImageIcon, Link2 } from "lucide-react";

export default function FileUploadArea({ onUploaded }: { onUploaded: (data: any) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (files.length === 0) return;

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    setLoading(true);

    const res = await fetch("/api/builder/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    setLoading(false);

    if (onUploaded) onUploaded(data);
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
      <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <Upload size={16} className="text-sky-500" />
        העלאת מידע לבוט (תמונות / PDF / קטלוג / אתר)
      </div>

      <input
        type="file"
        multiple
        className="w-full text-sm text-slate-700"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm py-2 shadow"
      >
        {loading ? "מעלה..." : "העלה קבצים"}
      </button>

      {files.length > 0 && (
        <div className="text-xs text-slate-600 space-y-1">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              {f.type.includes("image") ? (
                <ImageIcon size={14} className="text-sky-500" />
              ) : (
                <File size={14} className="text-slate-500" />
              )}
              {f.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}