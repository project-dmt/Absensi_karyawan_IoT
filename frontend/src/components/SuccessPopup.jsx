import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Pop-up sukses di tengah halaman dengan animasi centang (SVG stroke-draw).
 * Dipakai setelah aksi simpan berhasil, otomatis menutup setelah `duration` ms.
 */
export default function SuccessPopup({ open, title, description, onClose, duration = 2000 }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || duration <= 0) return undefined;
    const timer = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration, open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xs"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Berhasil</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="relative flex size-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--chart-1)]/20" />
            <svg
              viewBox="0 0 52 52"
              className="size-16"
              aria-hidden="true"
              role="img"
            >
              <circle
                className="success-popup__circle"
                cx="26"
                cy="26"
                r="23"
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth="3"
              />
              <path
                className="success-popup__check"
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27 l8 8 l16 -17"
              />
            </svg>
          </span>
          <div>
            <p className="text-base font-semibold">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <DialogFooter className="mt-1">
            <Button size="sm" onClick={onClose}>
              <Check aria-hidden="true" />
              Tutup
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
