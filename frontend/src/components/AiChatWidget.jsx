import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Bot, Send, TriangleAlert, X } from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

const QUICK_QUESTIONS = [
  "Berapa karyawan yang tidak hadir hari ini?",
  "Berapa persen kehadiran karyawan minggu ini?",
  "Siapa saja yang terlambat hari ini?",
];

const messageText = (message) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const token = localStorage.getItem("token");
  const messagesRef = useRef(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/ai/chat`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  });

  useEffect(() => {
    if (open) messagesRef.current?.scrollTo({ top: 1e9 });
  }, [open, messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="ai-widget">
      {open && (
        <div className="ai-widget__panel">
          <div className="ai-widget__header">
            <div className="flex items-center gap-2">
              <div className="ai-widget__header-icon">
                <Bot className="size-5" />
              </div>
              <div>
                <div className="ai-widget__header-title">AI Asisten</div>
                <div className="ai-widget__header-sub">Tanya data absensi</div>
              </div>
            </div>
            <button
              className="ai-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="ai-widget__messages" ref={messagesRef}>
            {messages.length === 0 && (
              <div className="ai-widget__empty">
                <Bot className="mx-auto mb-2 size-10 text-primary-light" />
                <p>
                  Halo! Tanyakan hal seputar data absensi, contohnya jumlah
                  karyawan yang tidak hadir atau persentase kehadiran.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message}>
                {messageText(message) ||
                  (message.role === "assistant" && <TypingIndicator />)}
              </MessageBubble>
            ))}
            {error && (
              <div className="ai-widget__error">
                <TriangleAlert className="mr-1 inline size-3.5" />
                Terjadi kesalahan: {error.message}
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="ai-widget__quick">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="ai-widget__chip"
                  onClick={() => sendMessage({ text: q })}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form className="ai-widget__form" onSubmit={handleSubmit}>
            <input
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan..."
              aria-label="Pertanyaan"
            />
            <button
              type="submit"
              className="ai-widget__send"
              disabled={!input.trim() || status === "streaming"}
              aria-label="Kirim"
            >
              <Send className="size-5" />
            </button>
          </form>
        </div>
      )}

      <button
        className="ai-widget__fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup asisten" : "Buka asisten"}
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </div>
  );
}
