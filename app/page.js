"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/*
 * ─────────────────────────────────────────────
 *  SUPABASE CONFIG — Replace with your keys
 * ─────────────────────────────────────────────
 */
const SUPABASE_URL = "https://maaqinrstimbdtiidxij.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYXFpbnJzdGltYmR0aWlkeGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTQwNjEsImV4cCI6MjA4NzU3MDA2MX0.v4DJbrljTy5qRBlKZ9JRJte8dhzy7L8NOfxklfVQmG0";
const isDemo = SUPABASE_URL === "YOUR_SUPABASE_URL";

const api = async (table, method = "GET", body = null, filter = "") => {
  if (isDemo) return null;
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? `?${filter}` : method === "GET" ? "?order=created_at.asc" : ""}`;
  const opts = {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(method !== "GET" && method !== "DELETE" ? { Prefer: "return=representation" } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (method === "DELETE") return [];
  return res.ok ? res.json() : [];
};

/* ── Helpers ── */
const STATUSES = ["To Do", "In Progress", "Done"];
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
const isOverdue = (d, s) => d && s !== "Done" && new Date(d) < new Date(new Date().toDateString());
const daysLeft = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `${diff}d`;
};
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
let _id = Date.now();
const uid = () => ++_id;

/*
 * ─────────────────────────────────────────────
 *  LOGO — Replace with your Ficio logo URL
 * ─────────────────────────────────────────────
 */
const FICIO_LOGO_URL = "https://cdn.prod.website-files.com/680c0e4d1e1e8416c498e3c5/680c1a31d94cdeb0dd6e8389_ficio%20(2).png";

export default function FicioPrograms() {
  const [tasks, setTasks] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [projects, setProjects] = useState(["Project Alpha", "Project Beta"]);
  const [team, setTeam] = useState(["Youhanna", "Member 2", "Member 3"]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterProject, setFilterProject] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSub, setShowAddSub] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [updateAuthor, setUpdateAuthor] = useState("");
  const [attachments, setAttachments] = useState({}); // taskId -> [{name, url, type}]
  const fileInputRef = useRef(null);
  const [activeFileTask, setActiveFileTask] = useState(null);

  const [form, setForm] = useState({ title: "", project: "", assignee: "", due: "", dependency: "" });
  const [subForm, setSubForm] = useState({ title: "", assignee: "", due: "" });

  /* ── Load ── */
  const fetchAll = useCallback(async () => {
    if (isDemo) { setLoading(false); return; }
    try {
      const [t, u] = await Promise.all([
        api("tasks"),
        api("updates", "GET", null, "order=created_at.desc"),
      ]);
      setTasks(t || []);
      setUpdates(u || []);
      const p = [...new Set((t || []).map((x) => x.project).filter(Boolean))];
      const m = [...new Set((t || []).flatMap((x) => [x.assignee]).filter(Boolean))];
      if (p.length) setProjects((prev) => [...new Set([...prev, ...p])]);
      if (m.length) setTeam((prev) => [...new Set([...prev, ...m])]);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    if (!isDemo) { const i = setInterval(fetchAll, 10000); return () => clearInterval(i); }
  }, [fetchAll]);

  /* ── Task CRUD ── */
  const addTask = async () => {
    if (!form.title.trim()) return;
    const task = {
      title: form.title.trim(), project: form.project || projects[0],
      assignee: form.assignee || team[0], due: form.due || null,
      status: "To Do", dependency: form.dependency || null,
      parent_id: null, created_at: new Date().toISOString(),
    };
    if (isDemo) { setTasks((p) => [...p, { ...task, id: uid() }]); }
    else { setSyncing(true); const d = await api("tasks", "POST", [task]); if (d?.[0]) setTasks((p) => [...p, d[0]]); setSyncing(false); }
    if (task.project && !projects.includes(task.project)) setProjects((p) => [...p, task.project]);
    if (task.assignee && !team.includes(task.assignee)) setTeam((t) => [...t, task.assignee]);
    setForm({ title: "", project: "", assignee: "", due: "", dependency: "" });
    setShowAdd(false);
  };

  const addSubtask = async (parentId) => {
    if (!subForm.title.trim()) return;
    const parent = tasks.find((t) => t.id === parentId);
    const sub = {
      title: subForm.title.trim(), project: parent?.project || "",
      assignee: subForm.assignee || parent?.assignee || team[0],
      due: subForm.due || null, status: "To Do", dependency: null,
      parent_id: parentId, created_at: new Date().toISOString(),
    };
    if (isDemo) { setTasks((p) => [...p, { ...sub, id: uid() }]); }
    else { setSyncing(true); const d = await api("tasks", "POST", [sub]); if (d?.[0]) setTasks((p) => [...p, d[0]]); setSyncing(false); }
    if (sub.assignee && !team.includes(sub.assignee)) setTeam((t) => [...t, sub.assignee]);
    setSubForm({ title: "", assignee: "", due: "" });
    setShowAddSub(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (isDemo) { setTasks((p) => p.map((t) => t.id === editing.id ? editing : t)); }
    else { setSyncing(true); const { id, ...rest } = editing; await api("tasks", "PATCH", rest, `id=eq.${id}`); setTasks((p) => p.map((t) => t.id === id ? editing : t)); setSyncing(false); }
    if (editing.project && !projects.includes(editing.project)) setProjects((p) => [...p, editing.project]);
    if (editing.assignee && !team.includes(editing.assignee)) setTeam((t) => [...t, editing.assignee]);
    setEditing(null);
  };

  const removeTask = async (id) => {
    if (isDemo) { setTasks((p) => p.filter((t) => t.id !== id && t.parent_id !== id)); }
    else { setSyncing(true); await api("tasks", "DELETE", null, `parent_id=eq.${id}`); await api("tasks", "DELETE", null, `id=eq.${id}`); setTasks((p) => p.filter((t) => t.id !== id && t.parent_id !== id)); setSyncing(false); }
    setEditing(null); setExpandedTask(null);
  };

  const cycleStatus = async (task) => {
    const next = STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length];
    if (isDemo) { setTasks((p) => p.map((t) => t.id === task.id ? { ...t, status: next } : t)); }
    else { setSyncing(true); await api("tasks", "PATCH", { status: next }, `id=eq.${task.id}`); setTasks((p) => p.map((t) => t.id === task.id ? { ...t, status: next } : t)); setSyncing(false); }
  };

  /* ── Updates/Comments ── */
  const postUpdate = async (taskId) => {
    if (!updateText.trim()) return;
    const u = {
      task_id: taskId, author: updateAuthor || team[0],
      content: updateText.trim(), created_at: new Date().toISOString(),
    };
    if (isDemo) { setUpdates((p) => [{ ...u, id: uid() }, ...p]); }
    else { setSyncing(true); const d = await api("updates", "POST", [u]); if (d?.[0]) setUpdates((p) => [d[0], ...p]); setSyncing(false); }
    setUpdateText("");
  };

  /* ── File attachments (local/demo — stored as base64 in state) ── */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !activeFileTask) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment = { name: file.name, type: file.type, size: file.size, data: reader.result, addedAt: new Date().toISOString() };
        setAttachments((prev) => ({ ...prev, [activeFileTask]: [...(prev[activeFileTask] || []), attachment] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (taskId, idx) => {
    setAttachments((prev) => ({ ...prev, [taskId]: (prev[taskId] || []).filter((_, i) => i !== idx) }));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (type) => {
    if (type?.startsWith("image/")) return "🖼";
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("sheet") || type?.includes("csv") || type?.includes("excel")) return "📊";
    if (type?.includes("doc") || type?.includes("word")) return "📝";
    return "📎";
  };

  /* ── Derived data ── */
  const parentTasks = tasks.filter((t) => !t.parent_id);
  const getSubtasks = (id) => tasks.filter((t) => t.parent_id === id);
  const getUpdates = (id) => updates.filter((u) => u.task_id === id);
  const filtered = parentTasks.filter((t) => filterProject === "all" || t.project === filterProject);
  const grouped = {};
  filtered.forEach((t) => { const p = t.project || "Uncategorized"; if (!grouped[p]) grouped[p] = []; grouped[p].push(t); });
  const depStatus = (name) => { const t = tasks.find((x) => x.title.toLowerCase() === (name || "").toLowerCase()); return t?.status || null; };

  /* ── Styles ── */
  const input = {
    width: "100%", padding: "10px 12px", border: "1px solid #E5E5E5", borderRadius: 8,
    fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fff", color: "#111", boxSizing: "border-box",
  };
  const label = { fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4 };
  const btnPrimary = { padding: "9px 24px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" };
  const btnSecondary = { padding: "9px 18px", borderRadius: 8, border: "1px solid #EBEBEB", background: "#fff", color: "#666", cursor: "pointer", fontSize: 13, fontFamily: "inherit" };
  const btnDanger = { ...btnSecondary, border: "1px solid #FFCDD2", color: "#D32F2F" };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <span style={{ color: "#999", fontSize: 14 }}>Loading...</span>
    </div>
  );

  /* ── Task detail panel ── */
  const renderDetail = (task) => {
    const subs = getSubtasks(task.id);
    const taskUpdates = getUpdates(task.id);
    const taskFiles = attachments[task.id] || [];
    const subsDone = subs.filter((s) => s.status === "Done").length;

    return (
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #EBEBEB", marginTop: 8, animation: "slideDown 0.2s ease" }}>
        <style>{`@keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }`}</style>

        {/* ── Subtasks ── */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F5F5F5" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Subtasks {subs.length > 0 && <span style={{ color: "#BBB", fontWeight: 400 }}>{subsDone}/{subs.length}</span>}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setShowAddSub(showAddSub === task.id ? null : task.id); }}
              style={{ fontSize: 12, color: "#111", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              + Add
            </button>
          </div>

          {/* Progress bar */}
          {subs.length > 0 && (
            <div style={{ height: 3, background: "#F0F0F0", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(subsDone / subs.length) * 100}%`, background: "#111", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          )}

          {subs.map((sub) => (
            <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #FAFAFA" }}>
              <button onClick={(e) => { e.stopPropagation(); cycleStatus(sub); }}
                style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `1.5px solid ${sub.status === "Done" ? "#111" : "#DDD"}`,
                  background: sub.status === "Done" ? "#111" : "transparent",
                  color: sub.status === "Done" ? "#fff" : sub.status === "In Progress" ? "#111" : "#CCC",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontFamily: "inherit", padding: 0,
                }}>
                {sub.status === "Done" ? "✓" : sub.status === "In Progress" ? "◑" : ""}
              </button>
              <span style={{ flex: 1, fontSize: 13, textDecoration: sub.status === "Done" ? "line-through" : "none", color: sub.status === "Done" ? "#BBB" : "#333" }}>
                {sub.title}
              </span>
              <span style={{ fontSize: 11, color: "#BBB" }}>{sub.assignee}</span>
              {sub.due && <span style={{ fontSize: 11, color: isOverdue(sub.due, sub.status) ? "#D32F2F" : "#CCC" }}>{fmtDate(sub.due)}</span>}
              <button onClick={(e) => { e.stopPropagation(); setEditing({ ...sub }); }}
                style={{ fontSize: 11, color: "#CCC", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>edit</button>
            </div>
          ))}

          {showAddSub === task.id && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ flex: 2 }}>
                <input value={subForm.title} onChange={(e) => setSubForm({ ...subForm, title: e.target.value })}
                  placeholder="Subtask..." autoFocus style={{ ...input, padding: "8px 10px", fontSize: 13 }}
                  onKeyDown={(e) => { if (e.key === "Enter") addSubtask(task.id); }} />
              </div>
              <div style={{ flex: 1 }}>
                <input value={subForm.assignee} onChange={(e) => setSubForm({ ...subForm, assignee: e.target.value })}
                  placeholder="Assignee" list="team-sub" style={{ ...input, padding: "8px 10px", fontSize: 13 }} />
                <datalist id="team-sub">{team.map((m) => <option key={m} value={m} />)}</datalist>
              </div>
              <div style={{ flex: 1 }}>
                <input type="date" value={subForm.due} onChange={(e) => setSubForm({ ...subForm, due: e.target.value })}
                  style={{ ...input, padding: "8px 10px", fontSize: 13 }} />
              </div>
              <button onClick={() => addSubtask(task.id)} style={{ ...btnPrimary, padding: "8px 16px", fontSize: 12, whiteSpace: "nowrap" }}>Add</button>
            </div>
          )}

          {subs.length === 0 && showAddSub !== task.id && (
            <div style={{ fontSize: 12, color: "#DDD", padding: "4px 0" }}>No subtasks yet</div>
          )}
        </div>

        {/* ── Files ── */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F5F5F5" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Files {taskFiles.length > 0 && <span style={{ color: "#BBB", fontWeight: 400 }}>{taskFiles.length}</span>}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setActiveFileTask(task.id); fileInputRef.current?.click(); }}
              style={{ fontSize: 12, color: "#111", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              + Attach
            </button>
          </div>
          {taskFiles.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {taskFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#FAFAFA", borderRadius: 6, fontSize: 13 }}>
                  <span>{getFileIcon(f.type)}</span>
                  {f.type?.startsWith("image/") ? (
                    <a href={f.data} target="_blank" rel="noopener noreferrer" style={{ color: "#111", textDecoration: "none", fontWeight: 500, flex: 1 }}>
                      {f.name}
                    </a>
                  ) : (
                    <a href={f.data} download={f.name} style={{ color: "#111", textDecoration: "none", fontWeight: 500, flex: 1 }}>{f.name}</a>
                  )}
                  <span style={{ fontSize: 11, color: "#BBB" }}>{formatSize(f.size)}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeAttachment(task.id, i); }}
                    style={{ fontSize: 11, color: "#CCC", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#DDD" }}>No files attached</div>
          )}
        </div>

        {/* ── Updates / Progress ── */}
        <div style={{ padding: "14px 20px" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
            Updates {taskUpdates.length > 0 && <span style={{ color: "#BBB", fontWeight: 400 }}>{taskUpdates.length}</span>}
          </span>

          {/* Post update */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
            <input value={updateAuthor} onChange={(e) => setUpdateAuthor(e.target.value)}
              placeholder="Your name" list="team-upd" style={{ ...input, width: 120, padding: "8px 10px", fontSize: 13, flex: "0 0 120px" }} />
            <datalist id="team-upd">{team.map((m) => <option key={m} value={m} />)}</datalist>
            <input value={updateText} onChange={(e) => setUpdateText(e.target.value)}
              placeholder="Post a progress update..." style={{ ...input, padding: "8px 10px", fontSize: 13 }}
              onKeyDown={(e) => { if (e.key === "Enter") postUpdate(task.id); }} />
            <button onClick={() => postUpdate(task.id)} disabled={!updateText.trim()}
              style={{ ...btnPrimary, padding: "8px 16px", fontSize: 12, opacity: updateText.trim() ? 1 : 0.4 }}>Post</button>
          </div>

          {/* Update feed */}
          {taskUpdates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
              {taskUpdates.map((u) => (
                <div key={u.id} style={{ padding: "10px 12px", background: "#FAFAFA", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{u.author}</span>
                    <span style={{ fontSize: 11, color: "#CCC" }}>{timeAgo(u.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{u.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#DDD" }}>No updates yet</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'Inter', system-ui, sans-serif", color: "#111" }}>
      <style>{`
        ::selection { background: #111; color: #fff; }
        input:focus, select:focus, textarea:focus { border-color: #111 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 3px; }
      `}</style>

      <input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={handleFileSelect} />

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #EBEBEB", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={FICIO_LOGO_URL} alt="Ficio" style={{ height: 24, objectFit: "contain" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#999", letterSpacing: "0.02em" }}>Programs</span>
          </div>
          {syncing && <span style={{ fontSize: 11, color: "#999" }}>syncing...</span>}
          {isDemo && <span style={{ fontSize: 11, color: "#E85D3A", background: "#FEF3F0", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>Demo</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
            style={{ ...input, width: "auto", padding: "7px 12px", fontSize: 13, background: "#FAFAFA", border: "1px solid #EBEBEB" }}>
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {!isDemo && <button onClick={fetchAll} style={{ ...btnSecondary, padding: "7px 12px" }}>↻</button>}
          <button onClick={() => setShowSetup(!showSetup)} style={{ ...btnSecondary, padding: "7px 12px", background: showSetup ? "#F5F5F5" : "#fff" }}>Setup</button>
          <button onClick={() => { setForm({ title: "", project: projects[0] || "", assignee: team[0] || "", due: "", dependency: "" }); setShowAdd(true); }}
            style={btnPrimary}>+ Add Task</button>
        </div>
      </div>

      {/* ── Setup ── */}
      {showSetup && (
        <div style={{ borderBottom: "1px solid #EBEBEB", padding: "20px 28px", background: "#fff", animation: "fadeIn 0.2s ease" }}>
          {isDemo && (
            <div style={{ marginBottom: 16, padding: "14px 16px", background: "#FFFBE6", borderRadius: 8, border: "1px solid #F5E6A3", fontSize: 13, lineHeight: 1.7 }}>
              <strong>Setup for shared team access (free):</strong>
              <br />1. <a href="https://supabase.com" target="_blank" rel="noopener" style={{ color: "#111" }}>supabase.com</a> → New Project → SQL Editor → run:
              <pre style={{ background: "#F9F9F9", padding: 12, borderRadius: 6, overflow: "auto", fontSize: 12, margin: "8px 0", border: "1px solid #EBEBEB" }}>{`create table tasks (
  id bigint generated always as identity primary key,
  title text not null,
  project text,
  assignee text,
  due date,
  status text default 'To Do',
  dependency text,
  parent_id bigint references tasks(id),
  created_at timestamptz default now()
);

create table updates (
  id bigint generated always as identity primary key,
  task_id bigint references tasks(id) on delete cascade,
  author text,
  content text,
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Allow all" on tasks for all using (true) with check (true);
alter table updates enable row level security;
create policy "Allow all" on updates for all using (true) with check (true);`}</pre>
              2. Settings → API → copy <strong>URL</strong> and <strong>anon key</strong>
              <br />3. Replace values at top of file → Deploy to <a href="https://vercel.com" target="_blank" rel="noopener" style={{ color: "#111" }}>Vercel</a> → share URL
              <br /><span style={{ fontSize: 12, color: "#999" }}>For file storage, enable Supabase Storage and create a public bucket called "attachments"</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 32 }}>
            <div>
              <div style={label}>Team Members</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {team.map((m) => <span key={m} style={{ fontSize: 13, padding: "4px 10px", background: "#F5F5F5", borderRadius: 6 }}>{m}</span>)}
              </div>
              <div style={{ fontSize: 11, color: "#CCC" }}>Auto-added when assigned</div>
            </div>
            <div>
              <div style={label}>Projects</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {projects.map((p) => <span key={p} style={{ fontSize: 13, padding: "4px 10px", background: "#F5F5F5", borderRadius: 6 }}>{p}</span>)}
              </div>
              <div style={{ fontSize: 11, color: "#CCC" }}>Auto-added when used</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ padding: "20px 28px 0", display: "flex", gap: 32 }}>
        {[
          { val: parentTasks.filter((t) => t.status !== "Done").length, label: "Active" },
          { val: parentTasks.filter((t) => t.status === "Done").length, label: "Done" },
          { val: tasks.filter((t) => isOverdue(t.due, t.status)).length, label: "Overdue", red: true },
          { val: tasks.filter((t) => t.parent_id).length, label: "Subtasks" },
        ].map((s, i) => (
          <div key={i} style={{ animation: `fadeIn 0.3s ${i * 0.06}s both` }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em", color: s.red && s.val > 0 ? "#D32F2F" : "#111", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Project Groups ── */}
      <div style={{ padding: "20px 28px 40px" }}>
        {Object.keys(grouped).length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#CCC", fontSize: 14 }}>
            No tasks yet. Click <span style={{ color: "#111", fontWeight: 600 }}>+ Add Task</span> to start.
          </div>
        )}

        {Object.entries(grouped).map(([projName, projTasks]) => {
          const projDone = projTasks.filter((t) => t.status === "Done").length;
          return (
            <div key={projName} style={{ marginBottom: 28, animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 2px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase" }}>{projName}</span>
                <span style={{ fontSize: 11, color: "#CCC" }}>{projDone}/{projTasks.length}</span>
                {projTasks.length > 0 && (
                  <div style={{ flex: 1, maxWidth: 120, height: 3, background: "#F0F0F0", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(projDone / projTasks.length) * 100}%`, background: "#111", borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                )}
              </div>

              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #EBEBEB", overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ display: "grid", gridTemplateColumns: "36px 2.5fr 1fr 1fr 1fr 1.2fr 28px", padding: "10px 16px", borderBottom: "1px solid #F5F5F5" }}>
                  {["", "Action", "Assignee", "Due", "Status", "Depends On", ""].map((h) => (
                    <span key={h + Math.random()} style={{ fontSize: 10, color: "#BBB", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>

                {projTasks.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)).map((task, i) => {
                  const overdue = isOverdue(task.due, task.status);
                  const dl = daysLeft(task.due);
                  const ds = depStatus(task.dependency);
                  const blocked = ds && ds !== "Done";
                  const subs = getSubtasks(task.id);
                  const subsDone = subs.filter((s) => s.status === "Done").length;
                  const isExpanded = expandedTask === task.id;
                  const taskFiles = attachments[task.id] || [];
                  const taskUpdates = getUpdates(task.id);
                  const badgeCount = subs.length + taskFiles.length + taskUpdates.length;

                  return (
                    <div key={task.id} style={{ animation: `fadeIn 0.25s ${i * 0.03}s both` }}>
                      <div
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        style={{
                          display: "grid", gridTemplateColumns: "36px 2.5fr 1fr 1fr 1fr 1.2fr 28px",
                          padding: "11px 16px", borderBottom: isExpanded ? "none" : "1px solid #F9F9F9",
                          alignItems: "center", fontSize: 13,
                          opacity: task.status === "Done" ? 0.4 : 1,
                          cursor: "pointer", transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#FCFCFC"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <button onClick={(e) => { e.stopPropagation(); cycleStatus(task); }}
                          style={{
                            width: 22, height: 22, borderRadius: 6,
                            border: `1.5px solid ${task.status === "Done" ? "#111" : "#DDD"}`,
                            background: task.status === "Done" ? "#111" : "transparent",
                            color: task.status === "Done" ? "#fff" : task.status === "In Progress" ? "#111" : "#CCC",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontFamily: "inherit", padding: 0,
                          }}>
                          {task.status === "Done" ? "✓" : task.status === "In Progress" ? "◑" : ""}
                        </button>

                        <div>
                          <span onClick={(e) => { e.stopPropagation(); setEditing({ ...task }); }}
                            style={{ fontWeight: 500, textDecoration: task.status === "Done" ? "line-through" : "none", cursor: "pointer" }}>
                            {task.title}
                          </span>
                          {blocked && <span style={{ fontSize: 10, color: "#E85D3A", marginLeft: 6, fontWeight: 600 }}>blocked</span>}
                          {subs.length > 0 && <span style={{ fontSize: 10, color: "#BBB", marginLeft: 6 }}>{subsDone}/{subs.length} subtasks</span>}
                          {badgeCount > 0 && !isExpanded && (
                            <span style={{ fontSize: 10, color: "#CCC", marginLeft: 6 }}>
                              {taskFiles.length > 0 ? `📎${taskFiles.length} ` : ""}
                              {taskUpdates.length > 0 ? `💬${taskUpdates.length}` : ""}
                            </span>
                          )}
                        </div>

                        <span style={{ color: "#666" }}>{task.assignee}</span>

                        <div>
                          <span style={{ color: overdue ? "#D32F2F" : "#666", fontWeight: overdue ? 600 : 400 }}>{fmtDate(task.due) || "—"}</span>
                          {dl && task.status !== "Done" && <div style={{ fontSize: 10, color: overdue ? "#D32F2F" : "#BBB", marginTop: 1 }}>{dl}</div>}
                        </div>

                        <span style={{ fontSize: 12, color: task.status === "Done" ? "#999" : task.status === "In Progress" ? "#111" : "#BBB" }}>{task.status}</span>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {task.dependency ? (
                            <>
                              <span style={{ fontSize: 12, color: "#999" }}>{task.dependency}</span>
                              {ds && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600, background: ds === "Done" ? "#E8F5E9" : "#FFF3E0", color: ds === "Done" ? "#2E7D32" : "#E65100" }}>{ds === "Done" ? "✓" : "pending"}</span>}
                            </>
                          ) : <span style={{ color: "#DDD" }}>—</span>}
                        </div>

                        <span style={{ fontSize: 12, color: "#CCC", textAlign: "center" }}>{isExpanded ? "▾" : "▸"}</span>
                      </div>

                      {isExpanded && renderDetail(task)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add Task Modal ── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", animation: "slideUp 0.25s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.02em" }}>New Task</div>
            <div style={{ marginBottom: 10 }}>
              <div style={label}>Action</div>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to be done?" autoFocus style={input} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={label}>Project</div>
                <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}
                  placeholder={projects[0] || "Project"} list="pl" style={input} />
                <datalist id="pl">{projects.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div>
                <div style={label}>Assigned To</div>
                <input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                  placeholder={team[0] || "Name"} list="tl" style={input} />
                <datalist id="tl">{team.map((m) => <option key={m} value={m} />)}</datalist>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <div style={label}>Due Date</div>
                <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} style={input} />
              </div>
              <div>
                <div style={label}>Depends On</div>
                <input value={form.dependency} onChange={(e) => setForm({ ...form, dependency: e.target.value })}
                  placeholder="Task name (optional)" list="dl" style={input} />
                <datalist id="dl">{tasks.filter((t) => t.status !== "Done" && !t.parent_id).map((t) => <option key={t.id} value={t.title} />)}</datalist>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={btnSecondary}>Cancel</button>
              <button onClick={addTask} style={btnPrimary}>Add Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", animation: "slideUp 0.25s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{editing.parent_id ? "Edit Subtask" : "Edit Task"}</div>
            <div style={{ marginBottom: 10 }}>
              <div style={label}>Action</div>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} style={input} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {!editing.parent_id && (
                <div>
                  <div style={label}>Project</div>
                  <input value={editing.project || ""} onChange={(e) => setEditing({ ...editing, project: e.target.value })} list="ple" style={input} />
                  <datalist id="ple">{projects.map((p) => <option key={p} value={p} />)}</datalist>
                </div>
              )}
              <div>
                <div style={label}>Assigned To</div>
                <input value={editing.assignee || ""} onChange={(e) => setEditing({ ...editing, assignee: e.target.value })} list="tle" style={input} />
                <datalist id="tle">{team.map((m) => <option key={m} value={m} />)}</datalist>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <div style={label}>Due Date</div>
                <input type="date" value={editing.due || ""} onChange={(e) => setEditing({ ...editing, due: e.target.value })} style={input} />
              </div>
              <div>
                <div style={label}>Status</div>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} style={input}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => removeTask(editing.id)} style={btnDanger}>Delete</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditing(null)} style={btnSecondary}>Cancel</button>
                <button onClick={saveEdit} style={btnPrimary}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
