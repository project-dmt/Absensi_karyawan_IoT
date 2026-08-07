import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
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
            <div className="d-flex align-items-center gap-2">
              <div className="ai-widget__header-icon">
                <i className="bi bi-robot" />
              </div>
              <div>
                <div className="ai-widget__header-title">AI Asisten</div>
                <div className="ai-widget__header-sub">Tanya data absensi</div>
              </div>
            </div>
            <button
              className="btn btn-sm ai-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div className="ai-widget__messages" ref={messagesRef}>
            {messages.length === 0 && (
              <div className="ai-widget__empty">
                <i className="bi bi-robot" />
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
                <i className="bi bi-exclamation-triangle me-1" />
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
              className="form-control"
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
              <i className="bi bi-send" />
            </button>
          </form>
        </div>
      )}

      <button
        className="ai-widget__fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup asisten" : "Buka asisten"}
      >
        <i className={`bi ${open ? "bi-x-lg" : "bi-robot"}`} />
      </button>
    </div>
  );
}
