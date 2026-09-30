import React, { useState, useEffect, useMemo } from "react";
import {
  Wifi, WifiOff, Siren, Radio, MapPin, ShieldCheck, ShieldAlert,
  Users, CheckCircle2, Circle, ChevronDown, ChevronUp, Satellite,
  Waves, Activity, Droplets, Mountain, Server, ArrowRight, Clock,
  Sun, Moon, Maximize2, X
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const RISK = {
  green:  { label: "Green",  fg: "#0F5132", bg: "#E7F6EC", ring: "#3FB27F" },
  yellow: { label: "Yellow", fg: "#6B5300", bg: "#FBF3D9", ring: "#E8C547" },
  orange: { label: "Orange", fg: "#7A3B00", bg: "#FCE9D9", ring: "#F0883E" },
  red:    { label: "Red",    fg: "#7A1620", bg: "#FBE1E3", ring: "#E5484D" },
};

const WARDS = [
  { id: "W4", name: "Kotgarh", risk: "red", eta: 18 * 60, rainfall: 62, soil: 78, slope: 27,
    slopeClass: "Steep", hist: 2, histYears: "2019, 2022", x: 210, y: 96,
    contrib: { rain: 0.34, soil: 0.28, slope: 0.24, hist: 0.14 } },
  { id: "W7", name: "Chowki", risk: "orange", eta: 46 * 60, rainfall: 44, soil: 61, slope: 19,
    slopeClass: "Moderate", hist: 1, histYears: "2022", x: 138, y: 150,
    contrib: { rain: 0.31, soil: 0.27, slope: 0.20, hist: 0.10 } },
  { id: "W2", name: "Jogindernagar", risk: "yellow", eta: null, rainfall: 26, soil: 44, slope: 14,
    slopeClass: "Gentle", hist: 1, histYears: "2013", x: 280, y: 168,
    contrib: { rain: 0.20, soil: 0.18, slope: 0.10, hist: 0.08 } },
  { id: "W6", name: "Karsog", risk: "yellow", eta: null, rainfall: 22, soil: 39, slope: 16,
    slopeClass: "Gentle", hist: 0, histYears: "\u2014", x: 96, y: 226,
    contrib: { rain: 0.17, soil: 0.15, slope: 0.11, hist: 0.02 } },
  { id: "W1", name: "Sundernagar", risk: "green", eta: null, rainfall: 9, soil: 22, slope: 8,
    slopeClass: "Flat", hist: 0, histYears: "\u2014", x: 236, y: 258,
    contrib: { rain: 0.06, soil: 0.07, slope: 0.05, hist: 0.01 } },
  { id: "W9", name: "Padhar", risk: "green", eta: null, rainfall: 6, soil: 18, slope: 6,
    slopeClass: "Flat", hist: 0, histYears: "\u2014", x: 328, y: 214,
    contrib: { rain: 0.04, soil: 0.05, slope: 0.03, hist: 0.01 } },
];

const LORA_NODES = [
  { id: "N-01", nearWard: "W4", status: "online", battery: 88 },
  { id: "N-02", nearWard: "W4", status: "online", battery: 76 },
  { id: "N-07", nearWard: "W7", status: "online", battery: 91 },
  { id: "N-13", nearWard: "W2", status: "offline", battery: 12 },
  { id: "GW-1", nearWard: "gateway", status: "online", battery: 100 },
];

const RAIN_TREND = [4, 6, 9, 14, 22, 31, 40, 51, 58, 62].map((v, i) => ({ i, v }));

function fmtClock(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Chip({ tone, style }) {
  const t = RISK[tone];
  return (
    <span
      style={{
        background: t.bg, color: t.fg, borderRadius: 999, padding: "1px 8px",
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
        letterSpacing: 0.2, whiteSpace: "nowrap", ...style,
      }}
    >
      {t.label}
    </span>
  );
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const [networkStatus, setNetworkStatus] = useState("online");
  const [selectedWard, setSelectedWard] = useState(WARDS[0]);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [fieldView, setFieldView] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [mapMode, setMapMode] = useState("satellite");
  const [checklist, setChecklist] = useState({ alert: false, route: false, done: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const critical = useMemo(
    () => [...WARDS].sort((a, b) => (a.eta ?? 1e9) - (b.eta ?? 1e9))[0],
    []
  );
  const liveEta = critical.eta != null ? Math.max(0, critical.eta - tick) : null;

  const cmlAtten = (9.4 + Math.sin(tick / 6) * 0.6).toFixed(1);
  const gnssSoil = (78 + Math.sin(tick / 9) * 2).toFixed(0);
  const acoustic = (61 + Math.cos(tick / 5) * 1.4).toFixed(1);

  const ward = selectedWard;

  const stages = [
    { key: "ingest", label: "Data ingestion", icon: Droplets },
    { key: "spatial", label: "Spatial + stream", icon: Mountain },
    { key: "risk", label: "Risk engine", icon: Activity },
    { key: "out", label: "Dissemination", icon: ArrowRight },
  ];

  return (
    <div
      data-theme={theme}
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        overflow: "hidden",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        transition: "background-color 0.2s ease, color 0.2s ease",
      }}
    >
      {/* Top Header */}
      <div
        className="top-header"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-header)",
          flexWrap: "nowrap", gap: 10, width: "100%", height: 48, flexShrink: 0,
        }}
      >
        <div className="brand-block" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30, height: 30, borderRadius: 6, background: "var(--bg-card)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cat-online)",
              border: "1px solid var(--border-strong)"
            }}
          >
            <Mountain size={17} />
          </div>
          <div className="brand-copy">
            <div className="cmd-font" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.2px" }}>
              GeoHydra&#8209;Edge
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
              District EOC &middot; Mandi, HP &middot; sub&#8209;basin pilot
            </div>
          </div>
        </div>

        <div className="header-controls" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>
            {new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            className="ghd-btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            style={{
              borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5,
            }}
            aria-label="Toggle Light / Dark mode theme"
          >
            {theme === "dark" ? <Sun size={13} color="#E8C547" /> : <Moon size={13} color="#378ADD" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <button
            className="ghd-btn"
            onClick={() => setFieldView((f) => !f)}
            style={{ borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 500 }}
            aria-label="Toggle between Command View and Field View"
          >
            {fieldView ? "Command view" : "Field view"}
          </button>

          <button
            className="ghd-btn"
            onClick={() => setNetworkStatus((s) => (s === "online" ? "severed" : "online"))}
            style={{
              borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5,
              borderColor: networkStatus === "severed" ? "#F0883E" : "var(--border-strong)",
              color: networkStatus === "severed" ? "#F0883E" : "var(--text-secondary)",
              background: networkStatus === "severed" ? (theme === "dark" ? "#2C180B" : "#FFF7ED") : "var(--bg-card)",
            }}
            aria-label="Toggle network connectivity state"
          >
            {networkStatus === "online" ? <Wifi size={13} /> : <WifiOff size={13} />}
            {networkStatus === "online" ? "Network: active" : "Network: severed"}
          </button>
        </div>
      </div>

      {fieldView ? (
        <FieldView ward={critical} eta={liveEta} checklist={checklist} setChecklist={setChecklist} />
      ) : (
        <div className="command-content" style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minHeight: 0, overflow: "hidden" }}>
          {/* Command Band (Enlarged Warning Banner) */}
          <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
            <div
              style={{
                background: RISK[critical.risk].bg, borderRadius: 10, padding: "12px 18px",
                border: `1.5px solid ${RISK[critical.risk].ring}77`,
                boxShadow: "0 4px 12px rgba(229,72,77,0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    className="pulse-dot"
                    style={{ width: 14, height: 14, borderRadius: "50%", background: RISK[critical.risk].ring, display: "inline-block", flexShrink: 0 }}
                  />
                  <div>
                    <div className="mono" style={{ fontSize: 11.5, color: RISK[critical.risk].fg, opacity: 0.9, fontWeight: 700, lineHeight: 1, letterSpacing: "0.3px" }}>
                      HIGHEST SEVERITY WARNING &middot; WARD {critical.id.replace("W", "")}, {critical.name.toUpperCase()}
                    </div>
                    <div className="cmd-font" style={{ fontSize: 22, fontWeight: 800, color: RISK[critical.risk].fg, marginTop: 3, lineHeight: 1.1, letterSpacing: "-0.3px" }}>
                      EVACUATE {critical.name.toUpperCase()}{liveEta != null ? ` \u2014 ${fmtClock(liveEta)} REMAINING` : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReasoningOpen((o) => !o)}
                  style={{
                    background: "transparent", border: `1px solid ${RISK[critical.risk].fg}55`,
                    color: RISK[critical.risk].fg, borderRadius: 6, padding: "5px 12px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                  aria-expanded={reasoningOpen}
                >
                  Why {reasoningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {reasoningOpen && (
                <div
                  className="mono"
                  style={{
                    marginTop: 10, paddingTop: 10, borderTop: `1px solid ${RISK[critical.risk].fg}33`,
                    fontSize: 12, color: RISK[critical.risk].fg, display: "flex", flexWrap: "wrap", gap: "6px 22px",
                  }}
                >
                  <span><strong>Rainfall:</strong> {critical.rainfall}mm/3hr</span>
                  <span><strong>Soil saturation proxy:</strong> {critical.soil}%</span>
                  <span><strong>Slope:</strong> {critical.slope}&deg; ({critical.slopeClass})</span>
                  <span><strong>Historical events:</strong> {critical.hist} ({critical.histYears})</span>
                </div>
              )}
            </div>
          </div>

          {/* Main 3-Column 100vh Non-Scrollable Grid (Expanded Columns & Controls) */}
          <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "360px 1fr 380px", gap: 16, padding: "12px 16px", flex: 1, width: "100%", minHeight: 0, overflow: "hidden" }}>
            {/* Left: Wards & Committee */}
            <div className="dashboard-left" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
              <div className="ward-list-section" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <SectionLabel style={{ marginBottom: 4 }}>Wards &amp; villages</SectionLabel>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-panel)", flex: 1, display: "flex", flexDirection: "column" }}>
                  {WARDS.map((w) => (
                    <div
                      key={w.id}
                      className="ward-row"
                      onClick={() => setSelectedWard(w)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 14px", borderBottom: "1px solid var(--border)",
                        background: selectedWard.id === w.id ? "var(--bg-card-hover)" : "transparent",
                        borderLeft: selectedWard.id === w.id ? "3px solid var(--cat-rainfall)" : "3px solid transparent",
                        flex: 1,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{w.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Ward {w.id.replace("W", "")}</div>
                      </div>
                      <Chip tone={w.risk} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel style={{ marginBottom: 4 }}>Committee status</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                  <StatusRow icon={ShieldCheck} label="Police mobilised" ok />
                  <StatusRow icon={Users} label="Apda Mitra volunteers" ok />
                  <StatusRow icon={ShieldAlert} label="NDRF alerted" ok={false} />
                  <StatusRow icon={ShieldCheck} label="Shelters ready" ok />
                </div>
              </div>
            </div>

            {/* Center: Expanded Square Map & Detailed Metrics */}
            <div className="dashboard-center" style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 10, alignItems: "stretch" }}>
              <div className="mobile-ward-select">
                <SectionLabel style={{ marginBottom: 4 }}>Ward &amp; village</SectionLabel>
                <select
                  value={selectedWard.id}
                  onChange={(e) => setSelectedWard(WARDS.find((w) => w.id === e.target.value))}
                  aria-label="Select ward or village"
                >
                  {WARDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Risk: {w.risk.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <SectionLabel style={{ margin: 0 }}>Risk map &middot; Mandi sub-basin AOI</SectionLabel>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
                    <button
                      onClick={() => setMapMode("satellite")}
                      style={{
                        background: mapMode === "satellite" ? "var(--border)" : "transparent",
                        color: mapMode === "satellite" ? "var(--cat-online)" : "var(--text-muted)",
                        border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 10.5,
                        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      Satellite + Heatmap
                    </button>
                    <button
                      onClick={() => setMapMode("vector")}
                      style={{
                        background: mapMode === "vector" ? "var(--border)" : "transparent",
                        color: mapMode === "vector" ? "var(--cat-online)" : "var(--text-muted)",
                        border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 10.5,
                        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      Vector Topo
                    </button>
                  </div>

                  <button
                    className="ghd-btn"
                    onClick={() => setIsMapFullscreen(true)}
                    style={{
                      borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                    title="Open map in full screen"
                  >
                    <Maximize2 size={13} /> Fullscreen
                  </button>
                </div>
              </div>

              {/* Map Canvas Container */}
              <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <div className="map-canvas" style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-panel)", padding: 6, position: "relative", overflow: "hidden", height: 420, width: "100%", maxWidth: "100%", aspectRatio: "4 / 3", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                {mapMode === "satellite" ? (
                  <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
                    <img
                      src="/satellite_heatmap.png"
                      alt="Mandi Satellite Elevation Heatmap"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: theme === "dark" ? "brightness(0.85) contrast(1.15)" : "brightness(0.95) contrast(1.05)",
                        display: "block"
                      }}
                    />

                    <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                      <defs>
                        <linearGradient id="floodGlowFit" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#E5484D" stopOpacity="0.85" />
                          <stop offset="50%" stopColor="#F0883E" stopOpacity="0.65" />
                          <stop offset="100%" stopColor="#378ADD" stopOpacity="0.35" />
                        </linearGradient>
                        <linearGradient id="catchmentGrad" x1="30%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#E5484D" stopOpacity="0.4" />
                          <stop offset="70%" stopColor="#F0883E" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#E8C547" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>

                      {/* Steep Side-Valley Watershed Catchment Polygon */}
                      <polygon
                        points="270,30 225,42 190,75 145,120 120,165 140,185 180,150 225,115 255,75 275,45"
                        fill="url(#catchmentGrad)"
                        stroke="#E5484D"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        opacity="0.75"
                        className="catchment-pulse"
                      />

                      {/* Landslide Slope Failure & Downhill Debris Motion Path */}
                      <path
                        d="M 260 35 C 240 60, 222 78, 210 96 C 182 120, 152 135, 138 150 C 128 162, 122 170, 120 182"
                        fill="none"
                        stroke="url(#floodGlowFit)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        opacity="0.7"
                        className="pulse-dot"
                      />
                      <path
                        d="M 260 35 C 240 60, 222 78, 210 96 C 182 120, 152 135, 138 150 C 128 162, 122 170, 120 182"
                        fill="none"
                        stroke="#E5484D"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="landslide-motion"
                      />
                    </svg>

                    <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
                      {WARDS.map((w) => {
                        const t = RISK[w.risk];
                        const isSel = selectedWard.id === w.id;
                        return (
                          <g key={w.id} onClick={() => setSelectedWard(w)} style={{ cursor: "pointer" }}>
                            {w.risk === "red" && (
                              <circle cx={w.x} cy={w.y} r={16} fill={t.ring} opacity={0.35} className="pulse-dot" />
                            )}
                            <circle cx={w.x} cy={w.y} r={isSel ? 9 : 7} fill={t.ring} stroke="#0B1220" strokeWidth="2.5" />
                            <rect x={w.x + 10} y={w.y - 7} width={w.name.length * 7.5 + 12} height="15" fill="#0B1220d0" rx="3" stroke="#1E2937" />
                            <text x={w.x + 15} y={w.y + 4.5} fontSize="10.5" fill={isSel ? "#5DCAA5" : "#E7EBF3"} fontWeight={isSel ? "700" : "500"} fontFamily="IBM Plex Mono, monospace">
                              {w.name}
                            </text>
                          </g>
                        );
                      })}

                      {LORA_NODES.filter((n) => n.nearWard !== "gateway").map((n, i) => {
                        const w = WARDS.find((x) => x.id === n.nearWard);
                        if (!w) return null;
                        return (
                          <g key={n.id}>
                            <rect
                              x={w.x - 18 + i * 6} y={w.y - 18}
                              width="5" height="5"
                              fill={n.status === "online" ? "#5DCAA5" : "#888780"}
                              rx="1"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    <div
                      className="mono"
                      style={{
                        position: "absolute", bottom: 8, left: 8, background: "rgba(11, 18, 32, 0.88)",
                        padding: "4px 8px", borderRadius: 4, border: "1px solid #1E2937",
                        fontSize: 9, color: "#E7EBF3", display: "flex", gap: 10, alignItems: "center",
                        backdropFilter: "blur(4px)"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E5484D", display: "inline-block" }} />
                        Landslide / Slope Failure Gully
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 14, height: 3, background: "linear-gradient(to right, #378ADD, #E8C547, #E5484D)", display: "inline-block", borderRadius: 2 }} />
                        Elevation Gradient
                      </span>
                    </div>
                  </div>
                ) : (
                  <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ display: "block" }}>
                    <defs>
                      <pattern id="contour" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M0 40 Q20 10 40 40" fill="none" stroke="var(--border)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="400" height="300" fill="url(#contour)" rx="6" />
                    <path
                      d="M 40 20 C 100 60, 90 120, 150 150 S 260 170, 250 220 S 330 250, 360 280"
                      fill="none" stroke="#2A6FA8" strokeWidth="3.5" opacity="0.65" strokeLinecap="round"
                    />
                    <text x="50" y="32" fontSize="9" fill="#2A6FA8" fontFamily="IBM Plex Mono, monospace" opacity="0.8">Beas Tributary</text>

                    {WARDS.map((w) => {
                      const t = RISK[w.risk];
                      const isSel = selectedWard.id === w.id;
                      return (
                        <g key={w.id} onClick={() => setSelectedWard(w)} style={{ cursor: "pointer" }}>
                          {w.risk === "red" && (
                            <circle cx={w.x} cy={w.y} r={16} fill={t.ring} opacity={0.22} className="pulse-dot" />
                          )}
                          <circle cx={w.x} cy={w.y} r={isSel ? 9 : 7} fill={t.ring} stroke="var(--bg-panel)" strokeWidth="2.5" />
                          <text x={w.x + 12} y={w.y + 4} fontSize="11" fill="var(--text-primary)" fontWeight={isSel ? "600" : "400"} fontFamily="IBM Plex Mono, monospace">
                            {w.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

              {/* Metric Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, flexShrink: 0 }}>
                <MetricCard label="Rainfall (3hr)" value={`${ward.rainfall} mm`} accent="#378ADD" />
                <MetricCard label="Soil moisture" value={`${ward.soil}%`} accent="#7C9473" />
                <MetricCard label="Slope" value={`${ward.slope}\u00B0 \u00B7 ${ward.slopeClass}`} accent="#BA7517" />
                <MetricCard label="Hist. Events" value={`${ward.hist} \u00B7 ${ward.histYears}`} accent="#D4537E" />
              </div>

              {/* Risk Contribution Bars */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", background: "var(--bg-panel)", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <SectionLabel style={{ margin: 0 }}>Risk contribution breakdown &middot; {ward.name}</SectionLabel>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                  {[
                    ["Rainfall", ward.contrib.rain, "#378ADD"],
                    ["Soil saturation", ward.contrib.soil, "#7C9473"],
                    ["Slope / terrain", ward.contrib.slope, "#BA7517"],
                    ["Historical density", ward.contrib.hist, "#D4537E"],
                  ].map(([label, v, color]) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
                        <span>{label}</span>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>{Math.round(v * 100)}%</span>
                      </div>
                      <div style={{ height: 5, background: "var(--bg-card)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${v * 100}%`, height: "100%", background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Multi-source feed, Nodes, Dissemination, Trust */}
            <div className="dashboard-right" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
              <div>
                <SectionLabel style={{ marginBottom: 4 }}>Multi-source telemetry</SectionLabel>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--bg-panel)" }}>
                  <FeedRow icon={Droplets} label="IMD rainfall" value={`${ward.rainfall} mm/3hr`} live />
                  <div style={{ height: 38, margin: "6px 0" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={RAIN_TREND}>
                        <Area type="monotone" dataKey="v" stroke="#378ADD" fill="#378ADD22" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <FeedRow icon={Radio} label="CML attenuation" value={`${cmlAtten} dB`} sim />
                  <FeedRow icon={Satellite} label="GNSS-R soil proxy" value={`${gnssSoil}%`} sim />
                  <FeedRow icon={Waves} label="Acoustic sensor" value={`${acoustic} dB`} sim />
                </div>
              </div>

              <div>
                <SectionLabel style={{ marginBottom: 4 }}>LoRa mesh nodes</SectionLabel>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--bg-panel)" }}>
                  {LORA_NODES.slice(0, 4).map((n) => (
                    <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{n.id}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: n.status === "online" ? "var(--cat-online)" : "var(--cat-offline)" }}>
                        <Circle size={7} fill={n.status === "online" ? "var(--cat-online)" : "var(--cat-offline)"} stroke="none" />
                        {n.status} &middot; {n.battery}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel style={{ marginBottom: 4 }}>Pipeline dissemination</SectionLabel>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--bg-panel)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {stages.map((s, idx) => (
                      <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                        <s.icon size={13} color="var(--cat-online)" />
                        <span style={{ fontSize: 11.5 }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    {networkStatus === "online" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--cat-online)", fontWeight: 600 }}>
                        <Server size={14} /> SACHET portal sync
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#F0883E", fontWeight: 600 }}>
                        <Siren size={14} className="pulse-dot" /> Siren (110dB) active
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel style={{ marginBottom: 4 }}>System trust ledger &middot; 30d</SectionLabel>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, background: "var(--bg-panel)" }}>
                  <Ledger label="Issued" value="14" color="var(--text-secondary)" />
                  <Ledger label="Confirmed" value="11" color="var(--cat-online)" />
                  <Ledger label="Near-miss" value="2" color="#E8C547" />
                  <Ledger label="False pos." value="1" color="#E5484D" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN MAP OVERLAY MODAL */}
      {isMapFullscreen && (
        <div
          className="fullscreen-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            background: "var(--bg-page)",
            display: "flex",
            flexDirection: "column",
            padding: 12,
            boxSizing: "border-box",
          }}
        >
          {/* Modal Header */}
          <div
            className="fullscreen-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: "var(--bg-panel)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              marginBottom: 10,
              height: 48,
              flexShrink: 0,
            }}
          >
            <div className="fullscreen-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Mountain size={18} color="var(--cat-online)" />
              <div>
                <div className="cmd-font" style={{ fontSize: 15, fontWeight: 700 }}>
                  Mandi Sub-Basin Fullscreen GIS Console &middot; {selectedWard.name}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  High Resolution Satellite Elevation Heatmap &amp; Predicted Inundation Vectors
                </div>
              </div>
            </div>

            <div className="fullscreen-controls" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>Ward:</span>
                <select
                  value={selectedWard.id}
                  onChange={(e) => setSelectedWard(WARDS.find((w) => w.id === e.target.value))}
                  style={{
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "3px 6px",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {WARDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Risk: {w.risk.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
                <button
                  onClick={() => setMapMode("satellite")}
                  style={{
                    background: mapMode === "satellite" ? "var(--border)" : "transparent",
                    color: mapMode === "satellite" ? "var(--cat-online)" : "var(--text-muted)",
                    border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10.5,
                    fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Satellite + Heatmap
                </button>
                <button
                  onClick={() => setMapMode("vector")}
                  style={{
                    background: mapMode === "vector" ? "var(--border)" : "transparent",
                    color: mapMode === "vector" ? "var(--cat-online)" : "var(--text-muted)",
                    border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10.5,
                    fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Vector Topo
                </button>
              </div>

              <button
                className="ghd-btn"
                data-fullscreen-exit="true"
                onClick={() => setIsMapFullscreen(false)}
                style={{
                  borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                  borderColor: "var(--cat-rainfall)", color: "var(--cat-rainfall)"
                }}
              >
                <X size={15} /> Exit Fullscreen
              </button>
            </div>
          </div>

          {/* Large Map Display Viewport */}
          <div
            className="fullscreen-map"
            style={{
              flex: 1,
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "#0E1524",
            }}
          >
            {mapMode === "satellite" ? (
              <div style={{ width: "100%", height: "100%", position: "relative" }}>
                <img
                  src="/satellite_heatmap.png"
                  alt="Mandi Satellite Elevation Heatmap Fullscreen"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "brightness(0.9) contrast(1.15)",
                    display: "block"
                  }}
                />

                <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                  <defs>
                    <linearGradient id="floodGlowFS" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E5484D" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#F0883E" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#378ADD" stopOpacity="0.35" />
                    </linearGradient>
                    <linearGradient id="catchmentGradFS" x1="30%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E5484D" stopOpacity="0.45" />
                      <stop offset="70%" stopColor="#F0883E" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#E8C547" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>

                  {/* Side-Valley Watershed Catchment Polygon Overlay */}
                  <polygon
                    points="270,30 225,42 190,75 145,120 120,165 140,185 180,150 225,115 255,75 275,45"
                    fill="url(#catchmentGradFS)"
                    stroke="#E5484D"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                    opacity="0.8"
                    className="catchment-pulse"
                  />

                  {/* Landslide Slope Failure & Downhill Debris Motion Path */}
                  <path
                    d="M 260 35 C 240 60, 222 78, 210 96 C 182 120, 152 135, 138 150 C 128 162, 122 170, 120 182"
                    fill="none"
                    stroke="url(#floodGlowFS)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    opacity="0.75"
                    className="pulse-dot"
                  />
                  <path
                    d="M 260 35 C 240 60, 222 78, 210 96 C 182 120, 152 135, 138 150 C 128 162, 122 170, 120 182"
                    fill="none"
                    stroke="#E5484D"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="landslide-motion"
                  />
                </svg>

                <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
                  {WARDS.map((w) => {
                    const t = RISK[w.risk];
                    const isSel = selectedWard.id === w.id;
                    return (
                      <g key={w.id} onClick={() => setSelectedWard(w)} style={{ cursor: "pointer" }}>
                        {w.risk === "red" && (
                          <circle cx={w.x} cy={w.y} r={18} fill={t.ring} opacity={0.35} className="pulse-dot" />
                        )}
                        <circle cx={w.x} cy={w.y} r={isSel ? 10 : 7.5} fill={t.ring} stroke="#0B1220" strokeWidth="2.5" />
                        <rect x={w.x + 10} y={w.y - 8} width={w.name.length * 8 + 14} height="17" fill="#0B1220e0" rx="4" stroke="#1E2937" />
                        <text x={w.x + 15} y={w.y + 4.5} fontSize="11" fill={isSel ? "#5DCAA5" : "#FFFFFF"} fontWeight={isSel ? "700" : "500"} fontFamily="IBM Plex Mono, monospace">
                          {w.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div
                  className="mono"
                  style={{
                    position: "absolute", bottom: 12, left: 12, right: 12,
                    background: "rgba(11, 18, 32, 0.92)", padding: "10px 14px",
                    borderRadius: 6, border: "1px solid #1E2937", color: "#E7EBF3",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backdropFilter: "blur(6px)", flexWrap: "wrap", gap: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 9.5, color: "#7A879C", display: "block" }}>Selected Ward</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#5DCAA5" }}>{ward.name} ({ward.id})</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 9.5, color: "#7A879C", display: "block" }}>Rainfall (3hr)</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ward.rainfall} mm</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 9.5, color: "#7A879C", display: "block" }}>Soil Moisture</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ward.soil}%</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 9.5, color: "#7A879C", display: "block" }}>Slope Angle</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ward.slope}&deg; ({ward.slopeClass})</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#E5484D", display: "inline-block" }} />
                      Landslide / Slope Failure Motion
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5 }}>
                      <span style={{ width: 16, height: 4, background: "linear-gradient(to right, #378ADD, #E8C547, #E5484D)", display: "inline-block", borderRadius: 2 }} />
                      Terrain Elevation Gradient
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <svg viewBox="0 0 400 300" width="100%" height="100%" style={{ display: "block", background: "#0E1524" }}>
                <defs>
                  <pattern id="contourFS" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M0 40 Q20 10 40 40" fill="none" stroke="#16202F" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="400" height="300" fill="url(#contourFS)" />
                <path
                  d="M 40 20 C 100 60, 90 120, 150 150 S 260 170, 250 220 S 330 250, 360 280"
                  fill="none" stroke="#2A6FA8" strokeWidth="4" opacity="0.75" strokeLinecap="round"
                />
                <text x="50" y="32" fontSize="9" fill="#2A6FA8" fontFamily="IBM Plex Mono, monospace" opacity="0.9">Beas Tributary</text>

                {WARDS.map((w) => {
                  const t = RISK[w.risk];
                  const isSel = selectedWard.id === w.id;
                  return (
                    <g key={w.id} onClick={() => setSelectedWard(w)} style={{ cursor: "pointer" }}>
                      {w.risk === "red" && (
                        <circle cx={w.x} cy={w.y} r={18} fill={t.ring} opacity={0.25} className="pulse-dot" />
                      )}
                      <circle cx={w.x} cy={w.y} r={isSel ? 10 : 7.5} fill={t.ring} stroke="#0B1220" strokeWidth="2.5" />
                      <text x={w.x + 14} y={w.y + 4} fontSize="11" fill="#FFFFFF" fontWeight={isSel ? "700" : "500"} fontFamily="IBM Plex Mono, monospace">
                        {w.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.2px", ...style }}>
      {children}
    </div>
  );
}

function StatusRow({ icon: Icon, label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
      <Icon size={15} color={ok ? "var(--cat-online)" : "#E8C547"} />
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontSize: 11.5, color: ok ? "var(--cat-online)" : "#E8C547", fontWeight: 600 }}>{ok ? "\u2713" : "pending"}</span>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--border)", borderLeft: `3.5px solid ${accent}` }}>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function FeedRow({ icon: Icon, label, value, sim }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 0" }}>
      <Icon size={15} color="var(--text-muted)" />
      <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</span>
      {sim && <span className="mono" style={{ fontSize: 9.5, color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: 3, padding: "0 4px" }}>sim</span>}
      <span className="mono" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Ledger({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg-card)", padding: "7px 6px", borderRadius: 6, border: "1px solid var(--border)", textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FieldView({ ward, eta, checklist, setChecklist }) {
  const tier = RISK[ward.risk];
  const items = [
    { key: "alert", label: "Alert households in ward" },
    { key: "route", label: "Confirm shelter route open" },
    { key: "done", label: "Mark evacuation complete" },
  ];
  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center", flex: 1, background: "var(--bg-page)", minHeight: 0 }}>
      <div style={{ width: 360, background: tier.bg, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.2)", border: `1px solid ${tier.ring}55`, alignSelf: "center" }}>
        <div className="mono" style={{ fontSize: 11, color: tier.fg, opacity: 0.85, fontWeight: 600 }}>Ward {ward.id.replace("W", "")} &middot; Field Telemetry</div>
        <div className="cmd-font" style={{ fontSize: 24, fontWeight: 700, color: tier.fg, margin: "6px 0" }}>
          Evacuate {ward.name}
        </div>
        {eta != null && (
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: tier.fg, marginBottom: 12, background: "rgba(255,255,255,0.4)", padding: "3px 10px", borderRadius: 999 }}>
            <Clock size={13} /> <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{fmtClock(eta)} remaining</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 14px" }}>
          <MapPin size={30} color={tier.fg} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: 10, padding: 12, textAlign: "left", backdropFilter: "blur(4px)" }}>
          {items.map((it) => (
            <div
              key={it.key}
              onClick={() => setChecklist((c) => ({ ...c, [it.key]: !c[it.key] }))}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}
            >
              {checklist[it.key] ? <CheckCircle2 size={18} color={tier.fg} /> : <Circle size={18} color={tier.fg} />}
              <span style={{ fontSize: 13, color: tier.fg, fontWeight: 500, textDecoration: checklist[it.key] ? "line-through" : "none", opacity: checklist[it.key] ? 0.7 : 1 }}>
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
