// Purely decorative: a small orchestration-graph illustration for the
// login screen's right panel. Nodes = agent roles from blueprint §6.1,
// animated to suggest "always planning / always tracing", nothing more.

const NODES = [
  { id: "planner", label: "Planner", angle: -90 },
  { id: "router", label: "Router", angle: -30 },
  { id: "retrieval", label: "Retrieval", angle: 30 },
  { id: "verifier", label: "Verifier", angle: 90 },
  { id: "composer", label: "Composer", angle: 150 },
  { id: "vision", label: "Vision", angle: 210 },
];

const R = 128; // orbit radius
const CX = 160;
const CY = 160;

function pt(angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

export default function GeometricPanel() {
  return (
    <svg viewBox="0 0 320 320" className="w-full h-full max-w-[380px] max-h-[380px]" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F2EFE7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F2EFE7" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="150" fill="url(#glow)" />

      {/* slow-rotating outer ring */}
      <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="spin-slow">
        <circle cx={CX} cy={CY} r="150" fill="none" stroke="#66A3BF" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 8" />
      </g>
      <circle cx={CX} cy={CY} r="98" fill="none" stroke="#C8DFDB" strokeOpacity="0.25" strokeWidth="1" />

      {/* edges: center -> each node, animated flow */}
      {NODES.map((n, i) => {
        const p = pt(n.angle);
        return (
          <line
            key={n.id}
            x1={CX} y1={CY} x2={p.x} y2={p.y}
            stroke="#C8DFDB"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            className="flow-line"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        );
      })}

      {/* outer nodes */}
      {NODES.map((n, i) => {
        const p = pt(n.angle);
        return (
          <g key={n.id} className="node-pulse" style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${i * 0.25}s` }}>
            <circle cx={p.x} cy={p.y} r="15" fill="#1F2E3D" stroke="#66A3BF" strokeWidth="1.5" />
            <text x={p.x} y={p.y + 30} textAnchor="middle" fontSize="9" fill="#C8DFDB" fontFamily="'IBM Plex Mono', monospace">
              {n.label}
            </text>
          </g>
        );
      })}

      {/* center node — same hexagon-badge mark as the app logo, larger,
          same proportions as Logo.jsx (top-flat-half : half-height : point = 8 : 16 : 16) */}
      <path
        d={`M${CX - 21} ${CY - 42} L${CX + 21} ${CY - 42} L${CX + 42} ${CY} L${CX + 21} ${CY + 42} L${CX - 21} ${CY + 42} L${CX - 42} ${CY} Z`}
        fill="#F2EFE7"
      />
      <path
        d={`M${CX - 16.8} ${CY - 33.6} L${CX + 16.8} ${CY - 33.6} L${CX + 33.6} ${CY} L${CX + 16.8} ${CY + 33.6} L${CX - 16.8} ${CY + 33.6} L${CX - 33.6} ${CY} Z`}
        fill="none"
        stroke="#3368A0"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <text x={CX} y={CY + 12} textAnchor="middle" fontSize="40" fontWeight="700" fill="#3368A0" fontFamily="'IBM Plex Sans', ui-sans-serif, sans-serif">
        S
      </text>
    </svg>
  );
}
