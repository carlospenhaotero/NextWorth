"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PaperPlaneRight, Sparkle, User } from "@phosphor-icons/react/dist/ssr";
import { ChatMarkdown } from "./chat-markdown";

function BotAvatar() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-hover">
      <Sparkle size={16} weight="fill" />
    </span>
  );
}

function UserAvatar() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-neutral-300">
      <User size={16} />
    </span>
  );
}

type ExplainChip = { label: string; prompt: string };

export function AdvisorChat() {
  const t = useTranslations("advisor.chat");
  const presetQuestions = t.raw("presets") as string[];
  const explainChips = t.raw("explain") as ExplainChip[];
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/advisor/chat" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="glass-card flex flex-col h-full min-h-[420px]">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <Sparkle size={18} weight="fill" className="text-accent-hover" />
        <h3 className="text-neutral-200 font-semibold">{t("header")}</h3>
      </div>
      <p className="mb-3 text-xs text-neutral-500 shrink-0">{t("aiDisclaimer")}</p>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-neutral-500">{t("explainTitle")}</span>
        {explainChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => submit(chip.prompt)}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-neutral-700 text-neutral-300 transition-colors hover:border-accent hover:text-accent-hover disabled:opacity-40 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-hover">
              <Sparkle size={24} weight="fill" />
            </span>
            <p className="text-neutral-400 text-sm max-w-sm">{t("intro")}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {presetQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-neutral-700 text-neutral-300 transition-colors hover:border-accent hover:text-accent-hover outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
              >
                {isUser ? <UserAvatar /> : <BotAvatar />}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isUser
                      ? "bg-accent text-accent-foreground rounded-tr-sm"
                      : "bg-neutral-800 text-neutral-100 rounded-tl-sm"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return isUser ? (
                        <span key={i} className="whitespace-pre-wrap">{part.text}</span>
                      ) : (
                        <ChatMarkdown key={i} text={part.text} />
                      );
                    }
                    if (part.type === "tool-getPortfolioMetrics") {
                      return (
                        <span key={i} className="block text-xs text-neutral-400 italic">
                          {t("reading")}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })
        )}
        {busy && (
          <div className="flex items-start gap-2.5">
            <BotAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-neutral-800 px-4 py-3.5">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-4 flex items-center gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-ring"
        />
        <button
          type="submit"
          aria-label={t("send")}
          disabled={busy || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/25 transition-colors hover:bg-accent-hover disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </form>

      <p className="mt-2 text-[11px] text-neutral-600 text-center shrink-0">
        {t("disclaimer")}
      </p>
    </div>
  );
}
