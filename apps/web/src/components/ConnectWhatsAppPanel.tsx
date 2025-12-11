"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SimulationChat({ flow }: { flow: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      from: "user",
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/bot/simulate", {
      method: "POST",
      body: JSON.stringify({
        message: text,
        flow,
        sessionId: "preview-session",
      }),
    });

    const data = await res.json();

    const botMsg = {
      id: Date.now() + 1,
      from: "bot",
      text: data.reply,
      buttons: extractButtons(data.reply),
    };

    setMessages((prev) => [...prev, botMsg]);
    setLoading(false);
  }

  function extractButtons(text: string) {
    const lines = text.split("\n");
    return lines
      .filter((l) => l.startsWith("• "))
      .map((l) => l.replace("• ", "").trim());
  }

  return (
    <div className="w-full max-w-md mx-auto glass rounded-2xl p-4 flex flex-col h-[560px] overflow-hidden">

      {/* Header */}
      <div className="py-2 px-3 border-b border-white/10 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-sm text-gray-200">סימולציה חיה</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 pb-5">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`max-w-[80%] p-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.from === "user"
                  ? "ml-auto bg-emerald-600/90 text-white rounded-2xl rounded-bl-md shadow"
                  : "mr-auto bg-white/10 border border-white/15 text-gray-100 rounded-2xl rounded-br-md backdrop-blur"
              }`}
            >
              {msg.text}

              {/* Buttons */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {msg.buttons.map((btn: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(btn)}
                      className="text-center py-2 px-3 rounded-lg bg-white/20 border border-white/25 hover:bg-white/30 transition text-xs"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="mr-auto bg-white/10 text-gray-200 px-3 py-2 rounded-xl border border-white/15 animate-pulse text-sm">
            מקליד...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-2 border-t border-white/10">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="כתוב הודעה..."
          className="flex-1 bg-white/10 text-white border border-white/20 px-3 py-2 rounded-xl outline-none"
        />
        <button
          onClick={() => sendMessage(input)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition text-white"
        >
          שלח
        </button>
      </div>
    </div>
  );
}