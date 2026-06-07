"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PaperPlaneRight, Sparkle } from "@phosphor-icons/react/dist/ssr";

const PRESET_QUESTIONS = [
  "¿Cómo está balanceada mi cartera?",
  "¿Qué perfil de riesgo tengo?",
  "¿A qué perfil debería llegar?",
  "¿Cómo rebalancear hacia un perfil más conservador?",
];

export function AdvisorChat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/advisor/chat" }),
  });
  const [input, setInput] = useState("");

  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="glass-card flex flex-col h-full min-h-[420px]">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Sparkle size={18} className="text-neutral-300" />
        <h3 className="text-neutral-200 font-medium">Advisor</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <p className="text-neutral-500 text-sm max-w-sm">
              Ask about how your portfolio is balanced and your risk profile.
              I explain, I don&apos;t recommend what to buy or sell.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-neutral-200 text-neutral-900"
                    : "bg-neutral-800 text-neutral-100"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text") return <span key={i}>{part.text}</span>;
                  if (part.type === "tool-getPortfolioMetrics") {
                    return (
                      <span key={i} className="block text-xs text-neutral-400 italic">
                        Reading your portfolio…
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 text-neutral-400 rounded-2xl px-4 py-2.5 text-sm">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-3 flex items-center gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your portfolio…"
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="p-2.5 rounded-xl bg-primary text-neutral-900 disabled:opacity-40 transition"
        >
          <PaperPlaneRight size={18} />
        </button>
      </form>

      <p className="mt-2 text-[11px] text-neutral-600 text-center shrink-0">
        General educational information, not personalized financial advice.
      </p>
    </div>
  );
}
