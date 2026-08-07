import { useState } from "react";

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="ai-widget">
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
