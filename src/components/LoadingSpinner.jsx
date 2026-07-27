export default function LoadingSpinner({ text = "Memuat data..." }) {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: "2rem", height: "2rem" }}>
        <span className="visually-hidden">Loading</span>
      </div>
      <p className="mt-3 text-muted" style={{ fontSize: "0.88rem" }}>{text}</p>
    </div>
  );
}
