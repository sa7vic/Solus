export default function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-3 pb-1.5 text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
      {children}
    </div>
  );
}
