import Link from "next/link";

export default function NewBotButton() {
  return (
    <Link
      href="/builder"
      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition"
    >
      + יצירת בוט חדש
    </Link>
  );
}