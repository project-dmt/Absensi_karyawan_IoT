export default function EmptyState({ message = "Tidak ada data", icon = "bi-inbox" }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} />
      <p>{message}</p>
    </div>
  );
}
