export default function Cite({ n }) {
  return (
    <sup className="ml-0.5 rounded-sm px-1 text-[10px] cursor-default" style={{ background: "var(--brand-200)", color: "var(--brand-700)", fontFamily: "var(--font-mono)" }}>
      {n}
    </sup>
  );
}
