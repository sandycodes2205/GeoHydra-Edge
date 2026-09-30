import React, { useState, useEffect, useMemo } from "react";
import {
  Wifi, WifiOff, Siren, Radio, MapPin, ShieldCheck, ShieldAlert,
  Users, CheckCircle2, Circle, ChevronDown, ChevronUp, Satellite,
  Waves, Activity, Droplets, Mountain, Server, ArrowRight, Clock,
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

function Chip({ tone, children, style }) {
  const t = RISK[tone];
  return (
    <span
      style={{
        background: t.bg, color: t.fg, borderRadius: 999, padding: "2px 10px",
        fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
        letterSpacing: 0.2, whiteSpace: "nowrap", ...style,
      }}
    >
      {t.label}
    </span>
  );
}

export default function GeoHydraDashboard() {
  const [networkStatus, setNetworkStatus] = useState("online");
  const [selectedWard, setSelectedWard] = useState(WARDS[0]);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [fieldView, setFieldView] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [checklist, setChecklist] = useState({ alert: false, route: false, done: false });
  const [tick, setTick] = useState(0);

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
  const tier = RISK[ward.risk];

  const stages = [
    { key: "ingest", label: "Data ingestion", icon: Droplets },
    { key: "spatial", label: "Spatial + stream", icon: Mountain },
    { key: "risk", label: "Risk engine", icon: Activity },
    { key: "out", label: "Dissemination", icon: ArrowRight },
  ];

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#0B1220",
        color: "#E7EBF3",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #1E2937",
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .cmd-font { font-family: 'Space Grotesk', sans-serif; }
        .ghd-btn { cursor: pointer; border: 1px solid #2B3648; background: #141B29; color: #C6CEDB; }
        .ghd-btn:hover { background: #1B2434; }
        .ward-row { cursor: pointer; }
        .ward-row:hover { background: #16202F !important; }
        .pulse-dot { animation: ghdpulse 1.6s ease-in-out infinite; }
        @keyframes ghdpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #1E2937", background: "#0E1524",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30, height: 30, borderRadius: 8, background: "#182234",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#5DCAA5",
            }}
          >
            <Mountain size={17} />
          </div>
          <div>
            <div className="cmd-font" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>
              GeoHydra&#8209;Edge
            </div>
            <div className="mono" style={{ fontSize: 11, color: "#7A879C" }}>
              District EOC &middot; Mandi, HP &middot; sub&#8209;basin pilot
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="mono" style={{ fontSize: 12, color: "#7A879C" }}>
            {new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <button
            className="ghd-btn"
            onClick={() => setFieldView((f) => !f)}
            style={{ borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 500 }}
          >
            {fieldView ? "Command view" : "Field view"}
          </button>
          <button
            className="ghd-btn"
            onClick={() => setNetworkStatus((s) => (s === "online" ? "severed" : "online"))}
            style={{
              borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
              borderColor: networkStatus === "severed" ? "#F0883E" : "#2B3648",
              color: networkStatus === "severed" ? "#F0883E" : "#C6CEDB",
            }}
          >
            {networkStatus === "online" ? <Wifi size={14} /> : <WifiOff size={14} />}
            {networkStatus === "online" ? "Network: active" : "Network: severed"}
          </button>
        </div>
      </div>

      {fieldView ? (
        <FieldView ward={critical} eta={liveEta} checklist={checklist} setChecklist={setChecklist} />
      ) : (
        <>
          {/* Command band */}
          <div style={{ padding: "18px 20px 0" }}>
            <div
              style={{
                background: tier.bg, borderRadius: 12, padding: "16px 18px",
                border: `1px solid ${RISK[critical.risk].ring}55`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    className="pulse-dot"
                    style={{ width: 10, height: 10, borderRadius: "50%", background: RISK[critical.risk].ring, display: "inline-block" }}
                  />
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: RISK[critical.risk].fg, opacity: 0.8 }}>
                      Highest severity &middot; Ward {critical.id.replace("W", "")}, {critical.name}
                    </div>
                    <div className="cmd-font" style={{ fontSize: 21, fontWeight: 700, color: RISK[critical.risk].fg, marginTop: 2 }}>
                      Evacuate {critical.name}{liveEta != null ? ` \u2014 ${fmtClock(liveEta)} remaining` : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReasoningOpen((o) => !o)}
                  style={{
                    background: "transparent", border: `1px solid ${RISK[critical.risk].fg}33`,
                    color: RISK[critical.risk].fg, borderRadius: 8, padding: "6px 10px",
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  Why {reasoningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {reasoningOpen && (
                <div
                  className="mono"
                  style={{
                    marginTop: 12, paddingTop: 12, borderTop: `1px solid ${RISK[critical.risk].fg}22`,
                    fontSize: 12.5, color: RISK[critical.risk].fg, display: "flex", flexWrap: "wrap", gap: "6px 18px",
                  }}
                >
                  <span>Rainfall: {critical.rainfall}mm/3hr</span>
                  <span>Soil saturation proxy: {critical.soil}%</span>
                  <span>Slope: {critical.slope}&deg; ({critical.slopeClass})</span>
                  <span>Historical events: {critical.hist} ({critical.histYears})</span>
                </div>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 300px", gap: 16, padding: 20 }}>
            {/* Left: ward list */}
            <div>
              <SectionLabel>Wards &amp; villages</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, overflow: "hidden" }}>
                {WARDS.map((w) => (
                  <div
                    key={w.id}
                    className="ward-row"
                    onClick={() => setSelectedWard(w)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderBottom: "1px solid #1A2332",
                      background: selectedWard.id === w.id ? "#16202F" : "transparent",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{w.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: "#7A879C" }}>Ward {w.id.replace("W", "")}</div>
                    </div>
                    <Chip tone={w.risk} />
                  </div>
                ))}
              </div>

              <SectionLabel style={{ marginTop: 18 }}>Committee status</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <StatusRow icon={ShieldCheck} label="Police mobilised" ok />
                <StatusRow icon={Users} label="Apda Mitra volunteers" ok />
                <StatusRow icon={ShieldAlert} label="NDRF alerted" ok={false} />
                <StatusRow icon={ShieldCheck} label="Shelters ready" ok />
              </div>
            </div>

            {/* Center: map */}
            <div>
              <SectionLabel>Risk map &middot; committed AOI</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, background: "#0E1524", padding: 10 }}>
                <svg viewBox="0 0 400 300" width="100%" height="300">
                  <defs>
                    <pattern id="contour" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M0 40 Q20 10 40 40" fill="none" stroke="#16202F" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="400" height="300" fill="url(#contour)" />
                  <path
                    d="M 40 20 C 100 60, 90 120, 150 150 S 260 170, 250 220 S 330 250, 360 280"
                    fill="none" stroke="#2A6FA8" strokeWidth="3" opacity="0.55"
                  />
                  {WARDS.map((w) => {
                    const t = RISK[w.risk];
                    const isSel = selectedWard.id === w.id;
                    return (
                      <g key={w.id} onClick={() => setSelectedWard(w)} style={{ cursor: "pointer" }}>
                        {w.risk === "red" && (
                          <circle cx={w.x} cy={w.y} r={16} fill={t.ring} opacity={0.18} className="pulse-dot" />
                        )}
                        <circle cx={w.x} cy={w.y} r={isSel ? 9 : 7} fill={t.ring} stroke="#0B1220" strokeWidth="2" />
                        <text x={w.x + 12} y={w.y + 4} fontSize="11" fill="#C6CEDB" fontFamily="IBM Plex Mono, monospace">
                          {w.name}
                        </text>
                      </g>
                    );
                  })}
                  {LORA_NODES.filter((n) => n.nearWard !== "gateway").map((n, i) => {
                    const w = WARDS.find((x) => x.id === n.nearWard);
                    if (!w) return null;
                    return (
                      <rect
                        key={n.id}
                        x={w.x - 20 + i * 4} y={w.y - 20}
                        width="5" height="5"
                        fill={n.status === "online" ? "#5DCAA5" : "#5F5E5A"}
                      />
                    );
                  })}
                </svg>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <MetricCard label="Rainfall (3hr)" value={`${ward.rainfall} mm`} accent="#378ADD" />
                <MetricCard label="Soil moisture proxy" value={`${ward.soil}%`} accent="#7C9473" />
                <MetricCard label="Slope" value={`${ward.slope}\u00B0 \u00B7 ${ward.slopeClass}`} accent="#BA7517" />
                <MetricCard label="Historical events" value={`${ward.hist} \u00B7 ${ward.histYears}`} accent="#D4537E" />
              </div>

              <SectionLabel style={{ marginTop: 16 }}>Risk contribution &middot; {ward.name}</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, padding: 12 }}>
                {[
                  ["Rainfall", ward.contrib.rain, "#378ADD"],
                  ["Soil saturation", ward.contrib.soil, "#7C9473"],
                  ["Slope / terrain", ward.contrib.slope, "#BA7517"],
                  ["Historical density", ward.contrib.hist, "#D4537E"],
                ].map(([label, v, color]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#9AA5B8", marginBottom: 3 }}>
                      <span>{label}</span>
                      <span className="mono">{Math.round(v * 100)}%</span>
                    </div>
                    <div style={{ height: 6, background: "#141B29", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${v * 100}%`, height: "100%", background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: sensors, pipeline, trust */}
            <div>
              <SectionLabel>Multi-source feed</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <FeedRow icon={Droplets} label="IMD rainfall" value={`${ward.rainfall} mm/3hr`} live />
                <div style={{ height: 46, margin: "8px 0" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={RAIN_TREND}>
                      <Area type="monotone" dataKey="v" stroke="#378ADD" fill="#378ADD22" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <FeedRow icon={Radio} label="CML attenuation" value={`${cmlAtten} dB`} live sim />
                <FeedRow icon={Satellite} label="GNSS-R soil proxy" value={`${gnssSoil}%`} live sim />
                <FeedRow icon={Waves} label="Acoustic sensor" value={`${acoustic} dB`} live sim />
              </div>

              <SectionLabel>LoRa mesh nodes</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                {LORA_NODES.map((n) => (
                  <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                    <span className="mono" style={{ fontSize: 12 }}>{n.id}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: n.status === "online" ? "#5DCAA5" : "#888780" }}>
                      <Circle size={7} fill={n.status === "online" ? "#5DCAA5" : "#888780"} stroke="none" />
                      {n.status} &middot; {n.battery}%
                    </span>
                  </div>
                ))}
              </div>

              <SectionLabel>Pipeline &amp; dissemination</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stages.map((s, idx) => (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center",
                        justifyContent: "center", background: "#141B29", color: "#5DCAA5",
                      }}>
                        <s.icon size={13} />
                      </div>
                      <span style={{ fontSize: 12.5 }}>{s.label}</span>
                      {idx === stages.length - 1 && (
                        <span style={{ marginLeft: "auto" }}>
                          <Chip tone={networkStatus === "online" ? "green" : "orange"} style={{ fontSize: 10.5 }} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1A2332" }}>
                  {networkStatus === "online" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5DCAA5" }}>
                      <Server size={14} /> Command Center UI &amp; SACHET portal
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#F0883E" }}>
                      <Siren size={14} className="pulse-dot" /> Pi gateway &rarr; LoRa mesh &rarr; village siren (110dB)
                    </div>
                  )}
                </div>
              </div>

              <SectionLabel>System trust ledger &middot; 30d</SectionLabel>
              <div style={{ border: "1px solid #1E2937", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Ledger label="Issued" value="14" color="#C6CEDB" />
                <Ledger label="Confirmed" value="11" color="#5DCAA5" />
                <Ledger label="Near-miss" value="2" color="#E8C547" />
                <Ledger label="False positive" value="1" color="#E5484D" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div className="mono" style={{ fontSize: 11, color: "#5F6B80", marginBottom: 8, ...style }}>
      {children}
    </div>
  );
}

function StatusRow({ icon: Icon, label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 0" }}>
      <Icon size={14} color={ok ? "#5DCAA5" : "#E8C547"} />
      <span style={{ color: "#C6CEDB" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontSize: 11 }}>{ok ? "\u2713" : "pending"}</span>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div style={{ background: "#141B29", borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${accent}` }}>
      <div className="mono" style={{ fontSize: 10.5, color: "#7A879C", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function FeedRow({ icon: Icon, label, value, sim }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <Icon size={14} color="#7A879C" />
      <span style={{ fontSize: 12.5, color: "#C6CEDB" }}>{label}</span>
      {sim && <span className="mono" style={{ fontSize: 9.5, color: "#5F6B80", border: "1px solid #2B3648", borderRadius: 4, padding: "0 4px" }}>sim</span>}
      <span className="mono" style={{ marginLeft: "auto", fontSize: 12.5 }}>{value}</span>
    </div>
  );
}

function Ledger({ label, value, color }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#7A879C" }}>{label}</div>
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
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 340, background: tier.bg, borderRadius: 16, padding: 22, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, color: tier.fg, opacity: 0.8 }}>Ward {ward.id.replace("W", "")}</div>
        <div className="cmd-font" style={{ fontSize: 24, fontWeight: 700, color: tier.fg, margin: "6px 0" }}>
          Evacuate {ward.name}
        </div>
        {eta != null && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: tier.fg, marginBottom: 14 }}>
            <Clock size={14} /> <span className="mono">{fmtClock(eta)} remaining</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 18px" }}>
          <MapPin size={30} color={tier.fg} />
        </div>
        <div style={{ background: "#ffffffaa", borderRadius: 10, padding: 12, textAlign: "left" }}>
          {items.map((it) => (
            <div
              key={it.key}
              onClick={() => setChecklist((c) => ({ ...c, [it.key]: !c[it.key] }))}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", cursor: "pointer" }}
            >
              {checklist[it.key] ? <CheckCircle2 size={18} color={tier.fg} /> : <Circle size={18} color={tier.fg} />}
              <span style={{ fontSize: 13.5, color: tier.fg, textDecoration: checklist[it.key] ? "line-through" : "none" }}>
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
