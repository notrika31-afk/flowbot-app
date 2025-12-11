export default function BotStatsCards({ bots, loading }) {
  const total = bots.length;
  const active = bots.filter(b => b.isActive).length;
  const flows = bots.reduce((acc, b) => acc + (b.flows?.length || 0), 0);

  const cards = [
    { title: "בוטים פעילים", value: active, color: "from-green-500 to-emerald-600" },
    { title: "סה״כ בוטים", value: total, color: "from-blue-500 to-indigo-600" },
    { title: "סה״כ Flows", value: flows, color: "from-purple-500 to-pink-600" },
    { title: "פרויקטים", value: 0, color: "from-cyan-500 to-sky-600" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`p-6 rounded-2xl bg-gradient-to-br ${c.color} shadow-xl bg-opacity-30 backdrop-blur-xl border border-white/10 text-center transition transform hover:scale-[1.02]`}
        >
          <p className="text-sm opacity-90">{c.title}</p>
          <p className="text-4xl font-bold mt-2">{loading ? "…" : c.value}</p>
        </div>
      ))}
    </div>
  );
}