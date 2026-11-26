import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Bot, Download, Loader2, Send, TriangleAlert, X } from "lucide-react";
import api from "../api/axios";
import { formatTanggalIndo } from "../lib/dates";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

const EXPORT_MARKER_PATTERN = /\[\[EXPORT_EXCEL:([\s\S]*?)\]\]/g;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(2000, month - 1, day));
  date.setUTCFullYear(year);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function parseExportIntents(text) {
  const intents = [];
  for (const match of text.matchAll(EXPORT_MARKER_PATTERN)) {
    try {
      const value = JSON.parse(match[1]);
      if (!value || Array.isArray(value) || typeof value !== "object") continue;
      const keys = Object.keys(value).sort().join(",");
      if (keys !== "dari,sampai" && keys !== "dari,format,sampai") continue;

      const format = value.format === undefined ? "xlsx" : value.format;
      if (format !== "xlsx" && format !== "csv") continue;
      const dari = parseIsoDate(value.dari);
      const sampai = parseIsoDate(value.sampai);
      if (!dari || !sampai || dari > sampai) continue;
      const calendarDays = (sampai.getTime() - dari.getTime()) / 86400000 + 1;
      if (calendarDays > 31) continue;

      const intent = { dari: value.dari, sampai: value.sampai, format };
      if (!intents.some((item) =>
        item.dari === intent.dari && item.sampai === intent.sampai && item.format === intent.format
      )) {
        intents.push(intent);
      }
    } catch {
      // Ignore malformed markers; the marker is still removed from the UI.
    }
  }
  return intents;
}

function stripExportMarkers(text) {
  const visible = text.replace(EXPORT_MARKER_PATTERN, "");
  const incompleteMarker = visible.indexOf("[[EXPORT_EXCEL:");
  return (incompleteMarker >= 0 ? visible.slice(0, incompleteMarker) : visible).trim();
}

function exportFilename({ dari, sampai, format }) {
  return `laporan_absensi_${dari}_sd_${sampai}.${format}`;
}

function ExportDownloadButton({ intent }) {
  const [downloading, setDownloading] = useState(false);
  const filename = exportFilename(intent);
  const isCsv = intent.format === "csv";
  const label = isCsv ? "CSV" : "Excel";
  const mimeType = isCsv ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const rangeLabel = `${formatTanggalIndo(intent.dari)} – ${formatTanggalIndo(intent.sampai)}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get("/laporan/export", {
        params: { dari: intent.dari, sampai: intent.sampai, format: intent.format },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
      toast.success(`Laporan ${label} berhasil diunduh`);
    } catch (downloadError) {
      console.error("[AI export]", downloadError);
      toast.error(`Gagal mengunduh laporan ${label}. Silakan coba lagi.`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Download ${label} laporan absensi ${rangeLabel}`}
      >
        {downloading ? <Loader2 className="animate-spin" /> : <Download />}
        Download {label}
      </Button>
      <span className="text-xs text-muted-foreground" title={filename}>
        File: {filename} · Periode: {rangeLabel}
      </span>
    </div>
  );
}

function renderWithBold(text) {
  // ponytail: minimal **bold** parser, tanpa lib markdown
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.includes("\n")) {
      const lines = part.split("\n");
      return (
        <span key={i}>
          {lines.map((line, j) => (
            <span key={j}>
              {line}
              {j < lines.length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    }
    return part;
  });
}

function friendlyError(error) {
  const raw = error?.message || "";
  // ponytail: template mapping, jangan tampilkan stack trace ke user
  if (/Multi-statement|tidak bisa memproses/i.test(raw))
    return "Maaf, saya tidak bisa memproses pertanyaan itu. Coba tanyakan dengan kalimat lebih spesifik.";
  if (/AI tidak merespon/i.test(raw))
    return "Maaf, AI tidak merespon. Silakan coba lagi dalam beberapa detik.";
  if (/Terjadi gangguan|500|Network|Failed to fetch|Load failed/i.test(raw))
    return "Terjadi gangguan server. Silakan coba beberapa saat lagi.";
  if (raw) {
    console.error("[AI]", raw);
    const short = raw.split("\n")[0].slice(0, 120);
    return `Terjadi kesalahan: ${short}`;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const token = localStorage.getItem("token");
  const messagesRef = useRef(null);
  const transport = useMemo(
    () => new TextStreamChatTransport({
      api: `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/ai/chat`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    [token]
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

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
            {messages.map((message) => {
              const rawText = messageText(message);
              const isAssistant = message.role === "assistant";
              const text = isAssistant ? stripExportMarkers(rawText) : rawText;
              const exportIntents = isAssistant ? parseExportIntents(rawText) : [];
              return (
                <MessageBubble key={message.id} message={message}>
                  {text ? renderWithBold(text) : message.role === "assistant" && <TypingIndicator />}
                  {exportIntents.map((intent) => (
                    <ExportDownloadButton
                      key={`${intent.dari}-${intent.sampai}-${intent.format}`}
                      intent={intent}
                    />
                  ))}
                </MessageBubble>
              );
            })}
            {error && (
              <div className="ai-widget__error">
                <TriangleAlert className="mr-1 inline size-3.5" />
                {friendlyError(error)}
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
