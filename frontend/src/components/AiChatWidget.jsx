import { useState } from "react";

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
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

          <div className="ai-widget__messages">
            <div className="ai-widget__empty">
              <i className="bi bi-robot" />
              <p>
                Halo! Tanyakan hal seputar data absensi, contohnya jumlah
                karyawan yang tidak hadir atau persentase kehadiran.
              </p>
            </div>
          </div>

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
              disabled={!input.trim()}
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
