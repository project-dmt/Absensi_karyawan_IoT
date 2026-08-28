export default function MessageBubble({ message, children }) {
  return (
    <div
      className={`ai-widget__bubble ai-widget__bubble--${message.role}`}
    >
      {children}
    </div>
  );
}
