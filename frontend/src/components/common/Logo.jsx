// The Solus mark: a bold "S" set inside a flat-sided hexagon badge, not a
// rounded square. The hexagon nods to the industrial/engineering domain
// (P&ID node shapes, hex fasteners) rather than being a generic app-icon
// container; a thin inset ring gives it a stamped/seal quality that fits
// the "sovereignty" framing.
export default function Logo({ size = 24, variant = "on-light" }) {
  const bg = variant === "on-light" ? "var(--brand-700)" : "#F2EFE7";
  const mark = variant === "on-light" ? "#F2EFE7" : "var(--brand-700)";
  const ring = variant === "on-light" ? "#66A3BF" : "#3368A0";

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 0 L24 0 L32 16 L24 32 L8 32 L0 16 Z" fill={bg} />
      <path
        d="M9.6 3.2 L22.4 3.2 L28.8 16 L22.4 28.8 L9.6 28.8 L3.2 16 Z"
        fill="none"
        stroke={ring}
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <text
        x="16"
        y="21.5"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill={mark}
        fontFamily="'IBM Plex Sans', ui-sans-serif, sans-serif"
      >
        S
      </text>
    </svg>
  );
}
