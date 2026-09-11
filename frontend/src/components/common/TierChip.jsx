export default function TierChip({ tier, compact }) {
  if (tier == null) {
    return (
      <span
        className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 ${compact ? "text-[10px]" : "text-xs"}`}
        style={{ borderColor: "var(--tier2)55", color: "var(--tier2)", background: "var(--tier2)14", fontFamily: "var(--font-mono)" }}
      >
        pending
      </span>
    );
  }
  const color = tier === 3 ? "var(--tier3)" : tier === 2 ? "var(--tier2)" : "var(--tier1)";
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 ${compact ? "text-[10px]" : "text-xs"}`}
      style={{ borderColor: `${color}55`, color, background: `${color}14`, fontFamily: "var(--font-mono)" }}
    >
      T{tier}
    </span>
  );
}
