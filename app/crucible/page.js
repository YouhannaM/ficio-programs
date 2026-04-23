"use client";
import React, { useState, useEffect } from "react";

const RUBRIC = [
  { key: "frontier",     label: "Frontier Impact",          weight: 0.20, desc: "Does this push a real technological boundary?" },
  { key: "tam",          label: "TAM / Market Size",         weight: 0.20, desc: "Is the addressable market $1B+?" },
  { key: "trl",          label: "Tech Readiness (TRL)",      weight: 0.15, desc: "How far from a deployable system? (1-9)" },
  { key: "moat",         label: "Defensibility / Moat",      weight: 0.10, desc: "IP, data, or network effects competitors can't copy." },
  { key: "pull",         label: "Customer Pull",             weight: 0.15, desc: "Is there an unmet need or just a clever solution?" },
  { key: "scalability",  label: "Manufacturing Scalability", weight: 0.10, desc: "Can the lab process survive a factory?" },
  { key: "team",         label: "Team / Founder Fit",        weight: 0.05, desc: "Does the PI have skin in the game?" },
  { key: "capital",      label: "Capital Efficiency",        weight: 0.05, desc: "Time and dollars to first revenue." },
];

const WAFFLE_CASE = {
  title: "WAFFLE: A Wearable Approach to Bite Timing Estimation in Robot-Assisted Feeding",
  authors: "Padmanabha, Yuan, Mehta, Jenamani, Hu, de León, Wertz, Gupta, Dodson, Yan, Majidi, Bhattacharjee, Erickson",
  venue: "ACM/IEEE HRI 2026 — Best Systems Paper",
  institution: "Cornell University (EmPRISE Lab) + CMU Robotics Institute",
  abstract: "Robot-assisted feeding systems for adults with mobility limitations struggle with the social timing of meals — knowing when to deliver the next bite. WAFFLE introduces a wearable sensor approach that learns to predict bite timing from natural user cues: head movements, chewing patterns, and conversation. The system makes assistive feeding feel less mechanical and more responsive to the human eating with others.",
  scores: {
    frontier:    7.5,
    tam:         8.0,
    trl:         5.0,
    moat:        7.0,
    pull:        9.0,
    scalability: 6.5,
    team:        8.5,
    capital:     7.0,
  },
};

const PI_QUESTIONS = [
  { cat: "Limitations",   q: "What's the failure rate when the user is in conversation vs. eating silently? You mentioned chewing as a signal — does it generalize across food textures (soup vs. steak)?" },
  { cat: "Limitations",   q: "How does the wearable perform on users with involuntary head movement (e.g., cerebral palsy, ALS, Parkinson's tremor)? These are the people most likely to need it." },
  { cat: "Hardware",      q: "What's the sensor BOM today, and what's the path to a sub-$200 wearable? Is the IMU off-the-shelf or custom?" },
  { cat: "Hardware",      q: "Battery life on the wearable during a full meal? Does it require a charging routine the caregiver has to manage?" },
  { cat: "Data / IP",     q: "Who owns the bite-timing dataset? Is it patentable as a method, or is the moat the dataset itself?" },
  { cat: "Regulatory",    q: "Does this need FDA Class I or Class II clearance as an assistive device? Have you talked to a regulatory consultant yet?" },
  { cat: "Reimbursement", q: "What's your CPT / HCPCS reimbursement strategy? Without a billing code, payers won't cover it and adoption stalls." },
  { cat: "Commercial",    q: "Have any rehab hospitals (Spaulding, Shirley Ryan, Kessler) piloted this? A signed LOI changes the conversation with investors." },
  { cat: "Team",          q: "Which co-author would leave Cornell to be the technical founder? Without that, this is a license deal, not a startup." },
  { cat: "Competitive",   q: "How does WAFFLE compare to Obi (Desin LLC) or the Bestic arm? Are you a feature on those platforms or a standalone product?" },
];

const COMM_PATHS = [
  {
    name: "Path A — Venture-Backed Startup",
    summary: "Spin out as a Cornell + CMU dual-affiliated company. Raise seed to harden the wearable and run a pivotal clinical study.",
    capital: "$2.5M seed → $12M Series A",
    timeline: "36 months to first revenue",
    team: "Technical co-founder from EmPRISE (PhD-level), clinical advisor from a rehab hospital, regulatory hire by month 6",
    partners: ["Cornell Center for Technology Licensing (CCTL)", "CMU Innovation Forum", "HAX (hardtech accelerator)", "Boost VC", "AlleyCorp Robotics"],
    milestones: [
      "M0–M6: License IP from Cornell. Form C-corp. Hire regulatory consultant.",
      "M6–M12: V1 wearable BOM under $300. IRB approval at 2 hospital sites.",
      "M12–M24: 30-patient pivotal study. FDA pre-submission meeting.",
      "M24–M36: 510(k) clearance. First commercial unit shipped to Shirley Ryan AbilityLab.",
    ],
    risk: "FDA timeline slips. Reimbursement code denied. Caregiver training load too high.",
    fit: 8.5,
  },
  {
    name: "Path B — License to Strategic",
    summary: "License the bite-timing method + dataset to an existing assistive robotics player. Faster cash, smaller upside.",
    capital: "$0 — paid by licensee. Royalty stream 4–8% net sales.",
    timeline: "12 months to deal close",
    team: "No new hires. PI stays at Cornell; 1–2 PhD students consult.",
    partners: ["Desin LLC (Obi)", "Bestic / Camanio", "Kinova Robotics", "Hello Robot (Stretch platform)"],
    milestones: [
      "M0–M3: CCTL packages IP. Outreach to 4 strategics.",
      "M3–M9: Technical due diligence. Demo on partner hardware.",
      "M9–M12: Term sheet. Exclusive license signed.",
      "M12+: Royalties begin once licensee ships integrated product (typically 18–24 months later).",
    ],
    risk: "Licensee deprioritizes. Royalties never material. Lab loses leverage post-signing.",
    fit: 6.0,
  },
  {
    name: "Path C — Non-Dilutive, Federally-Funded Translation",
    summary: "Bridge the lab-to-market gap with NIH SBIR + NSF PFI funding before raising venture. De-risks for investors.",
    capital: "$2M non-dilutive (SBIR Phase I + II, NSF Partnerships for Innovation)",
    timeline: "24 months to investor-ready, then raise",
    team: "Stay at Cornell. PI as PI on grants. Hire 1 staff engineer on grant funds.",
    partners: ["NIH NIBIB", "NSF PFI program", "Cornell-Tech Runway program", "VA Office of Research (huge market for assistive tech in veterans)"],
    milestones: [
      "M0–M6: SBIR Phase I submission ($300K).",
      "M6–M18: Phase I execution → Phase II application ($1.7M).",
      "M18–M24: VA pilot deployment. Clinical evidence package.",
      "M24+: Convert to startup with strong evidence base. Lower dilution at seed.",
    ],
    risk: "Grant cycles are slow. Team risks losing founder energy over 24 months. Competitors move faster.",
    fit: 7.5,
  },
];

const TARGETS = {
  Companies: [
    { name: "Desin LLC (Obi)",           why: "Already commercializes a robotic feeder. Bite-timing is their #1 UX gap.", type: "Strategic acquirer / licensee" },
    { name: "Hello Robot",               why: "Stretch platform is being deployed for in-home assistance. Natural integration.", type: "Hardware partner" },
    { name: "Kinova Robotics",           why: "Jaco arm is the de facto research platform. Could OEM the wearable.", type: "Strategic partner" },
    { name: "Labrador Systems",          why: "Building home assistive robots; feeding is on their roadmap.", type: "Customer / partner" },
    { name: "Diligent Robotics",         why: "Healthcare automation; share clinical sales channel.", type: "Channel partner" },
    { name: "Toyota Research Institute", why: "Heavily invested in assistive robotics for aging populations.", type: "R&D partner / investor" },
  ],
  Universities: [
    { name: "MIT CSAIL — Assistive Tech",                              why: "Adjacent research; potential collaborator and validation site.", type: "Research collab" },
    { name: "Stanford ChARM Lab",                                      why: "Wearable + assistive overlap; possible joint clinical study.", type: "Research collab" },
    { name: "University of Washington (Personal Robotics Lab)",        why: "Long history in robot-assisted feeding; could co-validate.", type: "Research collab" },
    { name: "Northwestern (Shirley Ryan AbilityLab)",                  why: "Top US rehab hospital; pilot deployment site.", type: "Clinical site" },
    { name: "Cornell-Tech Runway",                                     why: "In-house translation program. Founder-in-residence track.", type: "Accelerator" },
  ],
  Government: [
    { name: "VA Office of Research & Development",          why: "Largest single buyer of assistive tech in the US. SCI veteran population.", type: "Customer + funder" },
    { name: "NIH / NIBIB",                                  why: "SBIR funding for assistive medical devices.", type: "Non-dilutive funder" },
    { name: "NSF PFI (Partnerships for Innovation)",        why: "Translation funding designed for exactly this gap.", type: "Non-dilutive funder" },
    { name: "DARPA Biological Technologies Office",         why: "Interest in human-machine teaming and assistive systems.", type: "Funder" },
    { name: "CMS (Centers for Medicare & Medicaid)",        why: "Reimbursement code holder. Must engage early for HCPCS designation.", type: "Regulatory" },
  ],
};

function computeScore(scores) {
  let total = 0;
  for (const r of RUBRIC) total += (scores[r.key] || 0) * r.weight;
  return total;
}

function scoreLabel(s) {
  if (s >= 8) return "STRONG BUY";
  if (s >= 7) return "BUY";
  if (s >= 6) return "WATCHLIST";
  if (s >= 5) return "PASS — REVISIT";
  return "PASS";
}

function PathRow({ label, children, dark }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: dark ? "#999" : "#888", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export default function CruciblePage() {
  const [stage, setStage] = useState("input");
  const [tab, setTab] = useState("score");

  const overall = computeScore(WAFFLE_CASE.scores);

  useEffect(() => {
    if (stage === "analyzing") {
      const t = setTimeout(() => setStage("results"), 2400);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const baseFont = `'Helvetica Neue', Helvetica, Arial, sans-serif`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      color: "#000",
      fontFamily: baseFont,
      fontWeight: 300,
      letterSpacing: "0.01em",
    }}>
      {/* HEADER */}
      <header style={{
        borderBottom: "1px solid #000",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Crucible<span style={{ fontWeight: 200 }}> / Commercialization Engine</span>
          </div>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            v0.1 · Demo Build
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Case Study: Cornell EmPRISE Lab
          </div>
          <a href="/" style={{
            fontSize: 11, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase",
            textDecoration: "none", borderBottom: "1px solid #ccc",
          }}>
            ← Back to Programs
          </a>
        </div>
      </header>

      {/* INPUT STAGE */}
      {stage === "input" && (
        <main style={{ maxWidth: 880, margin: "80px auto", padding: "0 40px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 24 }}>
            01 / Submit Research
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 200, lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em" }}>
            Score a paper.<br />
            Map it to capital.<br />
            <span style={{ fontWeight: 400 }}>In two minutes.</span>
          </h1>

          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#444", marginTop: 32, maxWidth: 620 }}>
            Crucible reads a published research paper and returns a commercialization score, the
            questions you&apos;d ask the PI in a real diligence call, three concrete paths to market,
            and a target list of companies, universities, and government buyers.
          </p>

          <div style={{ marginTop: 56, border: "1px solid #000", padding: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#000", marginBottom: 16 }}>
              Pre-loaded Case Study
            </div>
            <div style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.3, marginBottom: 8 }}>
              {WAFFLE_CASE.title}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
              {WAFFLE_CASE.venue} · {WAFFLE_CASE.institution}
            </div>
            <div style={{ fontSize: 14, color: "#333", lineHeight: 1.6, marginBottom: 28 }}>
              {WAFFLE_CASE.abstract}
            </div>
            <button
              onClick={() => setStage("analyzing")}
              style={{
                background: "#000", color: "#fff", border: "none",
                padding: "14px 28px", fontFamily: baseFont, fontSize: 12,
                letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Run Analysis →
            </button>
          </div>

          <div style={{ marginTop: 24, fontSize: 11, color: "#888", letterSpacing: "0.05em" }}>
            In production: paste DOI, upload PDF, or drop arXiv link. Demo uses pre-computed analysis.
          </div>
        </main>
      )}

      {/* ANALYZING STAGE */}
      {stage === "analyzing" && (
        <main style={{
          minHeight: "70vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#000", marginBottom: 32 }}>
            Analyzing
          </div>
          <div style={{ width: 320, height: 1, background: "#eee", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%", background: "#000",
              animation: "fill 2.4s ease-out forwards",
            }} />
          </div>
          <div style={{ marginTop: 32, fontSize: 12, color: "#666", letterSpacing: "0.05em", textAlign: "center", lineHeight: 2 }}>
            Parsing abstract &amp; methods…<br />
            Mapping to TRL framework…<br />
            Cross-referencing market data…<br />
            Generating diligence questions…
          </div>
          <style>{`@keyframes fill { from { width: 0 } to { width: 100% } }`}</style>
        </main>
      )}

      {/* RESULTS STAGE */}
      {stage === "results" && (
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px" }}>
          {/* Paper header */}
          <div style={{ borderBottom: "1px solid #000", paddingBottom: 24, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
              Analysis Complete
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>
              {WAFFLE_CASE.title}
            </h2>
            <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
              {WAFFLE_CASE.venue}
            </div>
          </div>

          {/* Score banner */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0,
            border: "1px solid #000", marginBottom: 48,
          }}>
            <div style={{ padding: 32, borderRight: "1px solid #000" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888" }}>Composite Score</div>
              <div style={{ fontSize: 72, fontWeight: 200, lineHeight: 1, marginTop: 8, letterSpacing: "-0.04em" }}>
                {overall.toFixed(1)}
                <span style={{ fontSize: 24, color: "#888" }}>/10</span>
              </div>
            </div>
            <div style={{ padding: 32, borderRight: "1px solid #000" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888" }}>Verdict</div>
              <div style={{ fontSize: 28, fontWeight: 500, marginTop: 16, letterSpacing: "0.02em" }}>
                {scoreLabel(overall)}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                Strong customer pull + proven institution. TRL gap = where capital is needed.
              </div>
            </div>
            <div style={{ padding: 32 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888" }}>Recommended Path</div>
              <div style={{ fontSize: 18, fontWeight: 400, marginTop: 16, lineHeight: 1.3 }}>
                Path A — Venture-Backed Startup
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                Best fit score: 8.5. See full breakdown below.
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #000", marginBottom: 32 }}>
            {[
              ["score",     "01 / Score Breakdown"],
              ["questions", "02 / PI Questions"],
              ["paths",     "03 / Commercialization Paths"],
              ["targets",   "04 / Target List"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  background: tab === k ? "#000" : "#fff",
                  color: tab === k ? "#fff" : "#000",
                  border: "none",
                  padding: "16px 24px",
                  fontFamily: baseFont,
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontWeight: 500,
                  borderRight: "1px solid #000",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* TAB: SCORE */}
          {tab === "score" && (
            <div>
              {RUBRIC.map((r) => {
                const v = WAFFLE_CASE.scores[r.key];
                return (
                  <div key={r.key} style={{
                    display: "grid", gridTemplateColumns: "240px 1fr 80px 60px",
                    gap: 24, alignItems: "center",
                    padding: "20px 0", borderBottom: "1px solid #eee",
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Weight: {Math.round(r.weight * 100)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#444", marginBottom: 8 }}>{r.desc}</div>
                      <div style={{ height: 4, background: "#eee", position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${v * 10}%`, background: "#000" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 200, textAlign: "right" }}>{v.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "#888", textAlign: "right", letterSpacing: "0.1em" }}>/ 10</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 32, padding: 24, background: "#000", color: "#fff" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>
                  Methodology
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 300 }}>
                  Rubric synthesizes NASA TRL, Cooper&apos;s Stage-Gate, Christensen&apos;s JTBD,
                  Moore&apos;s Crossing the Chasm, and Gans-Stern appropriability. Weights tuned for
                  hardtech with regulatory exposure. Composite is a weighted mean; verdict thresholds
                  are calibrated against historical hardtech exits ($100M+).
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUESTIONS */}
          {tab === "questions" && (
            <div>
              <p style={{ fontSize: 14, color: "#444", maxWidth: 720, lineHeight: 1.6, marginBottom: 32 }}>
                Ten questions to ask the PI in a 30-minute diligence call. Designed to surface the
                things that don&apos;t make it into the paper — failure modes, regulatory exposure,
                founder commitment, and competitive positioning.
              </p>
              {PI_QUESTIONS.map((q, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "60px 140px 1fr",
                  gap: 24, padding: "20px 0", borderBottom: "1px solid #eee",
                }}>
                  <div style={{ fontSize: 28, fontWeight: 200, color: "#888" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#000", paddingTop: 12 }}>
                    {q.cat}
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, paddingTop: 6 }}>{q.q}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: PATHS */}
          {tab === "paths" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid #000" }}>
              {COMM_PATHS.map((p, i) => (
                <div key={i} style={{
                  padding: 28,
                  borderRight: i < 2 ? "1px solid #000" : "none",
                  background: i === 0 ? "#000" : "#fff",
                  color: i === 0 ? "#fff" : "#000",
                }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: i === 0 ? "#999" : "#888", marginBottom: 8 }}>
                    {i === 0 ? "Recommended" : `Option ${String.fromCharCode(65 + i)}`}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.3, marginBottom: 16, minHeight: 50 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 24, color: i === 0 ? "#ccc" : "#444" }}>
                    {p.summary}
                  </div>

                  <PathRow dark={i === 0} label="Capital">{p.capital}</PathRow>
                  <PathRow dark={i === 0} label="Timeline">{p.timeline}</PathRow>
                  <PathRow dark={i === 0} label="Team">{p.team}</PathRow>

                  <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: i === 0 ? "#999" : "#888", marginTop: 20, marginBottom: 8 }}>
                    Partners
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>
                    {p.partners.join(" · ")}
                  </div>

                  <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: i === 0 ? "#999" : "#888", marginBottom: 8 }}>
                    Milestones
                  </div>
                  {p.milestones.map((m, j) => (
                    <div key={j} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8, paddingLeft: 16, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, top: 0 }}>—</span>
                      {m}
                    </div>
                  ))}

                  <div style={{
                    marginTop: 24, paddingTop: 16, borderTop: `1px solid ${i === 0 ? "#444" : "#eee"}`,
                    fontSize: 11, color: i === 0 ? "#999" : "#888",
                  }}>
                    <div style={{ marginBottom: 6 }}><strong>Risk:</strong> {p.risk}</div>
                    <div><strong>Fit Score:</strong> {p.fit.toFixed(1)} / 10</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: TARGETS */}
          {tab === "targets" && (
            <div>
              {Object.entries(TARGETS).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 48 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 22, fontWeight: 400 }}>{cat}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888" }}>
                      {items.length} targets
                    </div>
                  </div>
                  <div style={{ border: "1px solid #000" }}>
                    {items.map((t, i) => (
                      <div key={i} style={{
                        display: "grid", gridTemplateColumns: "260px 1fr 200px",
                        gap: 24, padding: "18px 24px",
                        borderBottom: i < items.length - 1 ? "1px solid #eee" : "none",
                        alignItems: "center",
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{t.why}</div>
                        <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#000", textAlign: "right" }}>
                          {t.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer reset */}
          <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid #eee", textAlign: "center" }}>
            <button
              onClick={() => { setStage("input"); setTab("score"); }}
              style={{
                background: "transparent", color: "#000", border: "1px solid #000",
                padding: "12px 24px", fontFamily: baseFont, fontSize: 11,
                letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              ← Analyze Another Paper
            </button>
          </div>
        </main>
      )}

      {/* Bottom legal */}
      <footer style={{
        borderTop: "1px solid #000", padding: "20px 40px", marginTop: 80,
        display: "flex", justifyContent: "space-between",
        fontSize: 10, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        <div>Crucible · Built for university tech transfer offices and venture scouts</div>
        <div>Demo · Not investment advice</div>
      </footer>
    </div>
  );
}
