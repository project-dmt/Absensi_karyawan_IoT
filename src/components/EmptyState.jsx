export default function EmptyState({ message = "Tidak ada data" }) {
  return (
    <div className="text-center py-5 text-muted">
      <i className="bi bi-inbox fs-1 d-block mb-2" />
      <p>{message}</p>
    </div>
  );
}
