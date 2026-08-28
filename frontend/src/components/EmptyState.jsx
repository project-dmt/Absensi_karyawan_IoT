export default function EmptyState({ message = "Tidak ada data", icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-4xl text-slate-400">{icon}</div>}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}