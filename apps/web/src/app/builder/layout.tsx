export const metadata = {
  title: "FlowBot • Builder",
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        min-h-screen w-full 
        bg-[#e7e7ec]        /* רקע בהיר כמו הבית */
        text-slate-900
        flex items-center justify-center
        py-10 px-4
      "
    >
      {/* מסגרת שחורה כמו בדף הבית */}
      <div
        className="
          w-full max-w-7xl 
          rounded-[42px]
          bg-black/90
          shadow-[0_0_130px_-30px_rgba(0,0,0,1)]
          p-[3px]
        "
      >
        {/* האזור הפנימי */}
        <div
          className="
            rounded-[38px]
            bg-[#f5f5f8]     /* לוח פנימי בהיר */
            overflow-hidden
            min-h-[85vh]
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}