// apps/web/components/home/DashboardPreview.tsx
//
// Decorative SVG mockup of the calculator dashboard shown in the home hero.
// Built as an SVG (not a screenshot) so it scales crisply on retina, doesn't
// add a network request, and stays in sync with the brand theme tokens.
//
// Intentionally simplified — KPI tiles up top, donut + growth chart in the
// middle, sidebar slider rail on the left, insight callout at the bottom.
// Aria-hidden because the real calculator content lives elsewhere on the
// site; this is pure visual storytelling for the hero.

export default function DashboardPreview() {
  return (
    <svg
      viewBox="0 0 720 440"
      xmlns="http://www.w3.org/2000/svg"
      className="dashboard-preview"
      role="presentation"
    >
      <defs>
        <linearGradient id="dp-card-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2a42" />
          <stop offset="100%" stopColor="#1a2235" />
        </linearGradient>
        <linearGradient id="dp-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="dp-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <filter id="dp-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Outer window frame */}
      <rect x="0" y="0" width="720" height="440" rx="18" fill="url(#dp-card-bg)" stroke="#2a3a5c" strokeWidth="1" />

      {/* Window chrome dots */}
      <circle cx="22" cy="22" r="5" fill="#f43f5e" opacity="0.55" />
      <circle cx="40" cy="22" r="5" fill="#facc15" opacity="0.55" />
      <circle cx="58" cy="22" r="5" fill="#4ade80" opacity="0.55" />

      {/* Sidebar */}
      <rect x="14" y="48" width="148" height="378" rx="12" fill="#1a2235" stroke="#2a3a5c" strokeWidth="1" />
      <rect x="28" y="64" width="80" height="10" rx="3" fill="#4a5d80" opacity="0.5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="28" y={94 + i * 56} width="56" height="6" rx="2" fill="#8898b8" opacity="0.6" />
          <rect x="28" y={108 + i * 56} width="120" height="4" rx="2" fill="#2a3a5c" />
          <rect x="28" y={108 + i * 56} width={20 + i * 18} height="4" rx="2" fill="url(#dp-accent)" />
          <circle cx={28 + 20 + i * 18} cy="110" r="0" />
          <circle cx={28 + 20 + i * 18} cy={110 + i * 56} r="5" fill="#f0f4ff" stroke="#6366f1" strokeWidth="2" />
        </g>
      ))}

      {/* KPI tiles */}
      {[
        { x: 178, label: "Monthly revenue", value: "$12,840", trend: "+8.2%" },
        { x: 314, label: "Net profit", value: "$3,205", trend: "+12%" },
        { x: 450, label: "Margin", value: "24.9%", trend: "+1.4pt" },
        { x: 586, label: "Orders / mo", value: "412", trend: "+6%" },
      ].map((tile) => (
        <g key={tile.label}>
          <rect x={tile.x} y="48" width="120" height="80" rx="10" fill="#1e2a42" stroke="#2a3a5c" />
          <text x={tile.x + 14} y="68" fontFamily="Inter, sans-serif" fontSize="10" fill="#8898b8" letterSpacing="0.04em">
            {tile.label.toUpperCase()}
          </text>
          <text x={tile.x + 14} y="96" fontFamily="Syne, sans-serif" fontSize="22" fontWeight="700" fill="#f0f4ff">
            {tile.value}
          </text>
          <text x={tile.x + 14} y="115" fontFamily="DM Mono, monospace" fontSize="10" fill="#4ade80">
            ▲ {tile.trend}
          </text>
        </g>
      ))}

      {/* Donut chart card (cost breakdown) */}
      <rect x="178" y="142" width="256" height="200" rx="12" fill="#1e2a42" stroke="#2a3a5c" />
      <text x="194" y="166" fontFamily="Inter, sans-serif" fontSize="11" fill="#8898b8" letterSpacing="0.04em">
        COST BREAKDOWN
      </text>
      <g transform="translate(306 252)">
        {/* Donut segments — clockwise from 12 o'clock */}
        <circle cx="0" cy="0" r="58" fill="none" stroke="#2a3a5c" strokeWidth="22" />
        <circle cx="0" cy="0" r="58" fill="none" stroke="url(#dp-accent)" strokeWidth="22"
          strokeDasharray="125 364" strokeDashoffset="0" transform="rotate(-90)" />
        <circle cx="0" cy="0" r="58" fill="none" stroke="#fb923c" strokeWidth="22"
          strokeDasharray="78 364" strokeDashoffset="-125" transform="rotate(-90)" />
        <circle cx="0" cy="0" r="58" fill="none" stroke="#4ade80" strokeWidth="22"
          strokeDasharray="55 364" strokeDashoffset="-203" transform="rotate(-90)" />
        <circle cx="0" cy="0" r="58" fill="none" stroke="#60a5fa" strokeWidth="22"
          strokeDasharray="38 364" strokeDashoffset="-258" transform="rotate(-90)" />
      </g>
      {/* Donut legend */}
      {[
        { y: 200, color: "#a78bfa", label: "Materials", pct: "34%" },
        { y: 222, color: "#fb923c", label: "Labor", pct: "21%" },
        { y: 244, color: "#4ade80", label: "Platform fees", pct: "15%" },
        { y: 266, color: "#60a5fa", label: "Shipping", pct: "10%" },
      ].map((row) => (
        <g key={row.label}>
          <circle cx="394" cy={row.y} r="4" fill={row.color} />
          <text x="406" y={row.y + 3} fontFamily="Inter, sans-serif" fontSize="10" fill="#8898b8">
            {row.label}
          </text>
        </g>
      ))}

      {/* Growth trajectory area chart */}
      <rect x="450" y="142" width="256" height="200" rx="12" fill="#1e2a42" stroke="#2a3a5c" />
      <text x="466" y="166" fontFamily="Inter, sans-serif" fontSize="11" fill="#8898b8" letterSpacing="0.04em">
        GROWTH TRAJECTORY
      </text>
      <text x="466" y="320" fontFamily="DM Mono, monospace" fontSize="9" fill="#4a5d80">M1</text>
      <text x="528" y="320" fontFamily="DM Mono, monospace" fontSize="9" fill="#4a5d80">M4</text>
      <text x="592" y="320" fontFamily="DM Mono, monospace" fontSize="9" fill="#4a5d80">M8</text>
      <text x="660" y="320" fontFamily="DM Mono, monospace" fontSize="9" fill="#4a5d80">M12</text>
      {/* Grid */}
      {[195, 230, 265, 300].map((y) => (
        <line key={y} x1="466" y1={y} x2="690" y2={y} stroke="#2a3a5c" strokeWidth="0.5" opacity="0.7" />
      ))}
      {/* Area */}
      <path
        d="M 466 290 L 504 270 L 542 248 L 580 226 L 618 208 L 656 188 L 690 178 L 690 305 L 466 305 Z"
        fill="url(#dp-area)"
      />
      <path
        d="M 466 290 L 504 270 L 542 248 L 580 226 L 618 208 L 656 188 L 690 178"
        fill="none" stroke="url(#dp-accent)" strokeWidth="2" strokeLinecap="round"
      />
      {/* Endpoint dot */}
      <circle cx="690" cy="178" r="4" fill="#a78bfa" />
      <circle cx="690" cy="178" r="8" fill="#a78bfa" opacity="0.25" filter="url(#dp-glow)" />

      {/* Insight callout */}
      <rect x="178" y="358" width="528" height="68" rx="12" fill="#1e2a42" stroke="#6366f1" strokeOpacity="0.5" />
      <rect x="178" y="358" width="4" height="68" rx="2" fill="url(#dp-accent)" />
      <text x="200" y="380" fontFamily="Inter, sans-serif" fontSize="11" fill="#a78bfa" letterSpacing="0.04em">
        INSIGHT
      </text>
      <text x="200" y="402" fontFamily="Inter, sans-serif" fontSize="12" fill="#f0f4ff">
        Healthy 24.9% margin — most slime brands here reinvest into
      </text>
      <text x="200" y="418" fontFamily="Inter, sans-serif" fontSize="12" fill="#f0f4ff">
        bigger drops + paid creator collabs to scale faster.
      </text>
    </svg>
  );
}
