import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronRight,
  ChevronLeft, ChevronUp, ContactRound, FileBarChart, FileText, Filter,
  House, Layers3, LayoutDashboard, Menu, MoreHorizontal, Pencil, Plus,
  Search, Settings, Trash2, UsersRound, X, Zap, ArrowRight, CalendarDays, Building2, Eye, Copy,
  CircleDollarSign, Download, FileCheck2, Send, Clock3, BadgeCheck
} from "lucide-react";

const STORAGE_KEY = "erp-proposals";


const API_URL = "http://localhost:5000/api/proposals";
const CLIENTS_API_URL = "http://localhost:5000/api/clients";
const PROJECTS_API_URL = "http://localhost:5000/api/projects";

function getAuthHeaders() {
  const token = sessionStorage.getItem("erp-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest(path = "", options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }
  return result;
}

function normalizeProposals(item) {
  return { ...item, id: item.id ?? item._id };
}

const initialProposals = [
  { id: 1, title: "Website Development", client: "ABC Technologies", amount: 75000, createdDate: "2026-10-10", validUntil: "2026-11-10", status: "Sent" },
  { id: 2, title: "Mobile App Development", client: "Bright Solutions", amount: 150000, createdDate: "2026-10-12", validUntil: "2026-11-12", status: "Draft" },
  { id: 3, title: "CRM Implementation", client: "Global Enterprises", amount: 90000, createdDate: "2026-10-15", validUntil: "2026-11-15", status: "Accepted" },
];

const emptyForm = {
  title: "",
  client: "",
  clientEmail: "",
  project: "",
  projectId: "",
  description: "",
  amount: "",
  createdDate: new Date().toISOString().slice(0, 10),
  validUntil: "",
  status: "Draft",
};

const statusStyles = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-50 text-blue-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
};
const statusDots = { Draft: "bg-slate-500", Sent: "bg-blue-500", Accepted: "bg-emerald-500", Rejected: "bg-rose-500" };

const navGroups = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "CRM", icon: ContactRound, children: [
    { label: "Clients", href: "/crm/clients" },
    { label: "Leads", href: "/crm/leads" },
    { label: "Contacts", href: "/crm/contacts" },
  ]},
  { label: "Projects", icon: BriefcaseBusiness, children: [
    { label: "All Projects", href: "/projects" },
    { label: "Tasks", href: "/tasks" },
    { label: "Proposals", href: "/proposals" },
  ]},
  { label: "HRMS", icon: UsersRound, children: [
    { label: "Employees", href: "/employees" },
    { label: "Attendance", href: "/attendance" },
    { label: "Leave Requests", href: "/leave-requests" },
  ]},
  { label: "Finance", icon: FileText, children: [
    { label: "Invoices", href: "/invoices" },
    { label: "Expenses", href: "/expenses" },
    { label: "Payments", href: "/payments" },
  ]},
  { label: "Assets", icon: Layers3, children: [
    { label: "All Assets", href: "/assets" },
    { label: "Assignments", href: "/assignments" },
  ]},
  { label: "Reports", icon: FileBarChart, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function readProposals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialProposals;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : initialProposals;
  } catch {
    return initialProposals;
  }
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const styles = {
    purple: "bg-violet-50 text-violet-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
  }[tone];
  const bars = [8, 12, 17, 22, 28];
  return (
    <div className="flex min-h-[74px] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_3px_12px_rgba(28,42,78,0.035)] transition hover:-translate-y-0.5 hover:shadow-md sm:px-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles}`}><Icon size={22} strokeWidth={2.2} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-slate-500">{title}</p>
        <p className="mt-1 text-[25px] font-bold leading-none tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 flex items-center gap-1 text-[10px] leading-none text-slate-500"><span className="font-bold text-emerald-500">↗</span><span className="truncate">{detail}</span></p>
      </div>
      <div className={`hidden h-8 shrink-0 items-end gap-[3px] sm:flex ${styles.split(" ")[1]}`}>
        {bars.map((height, i) => <span key={i} className="w-[4px] rounded-t-sm bg-current" style={{ height }} />)}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, tone = "neutral", children }) {
  const styles = {
    neutral: "border-slate-200 text-slate-600 hover:bg-slate-50",
    purple: "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100",
    red: "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100",
  };
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${styles[tone]}`}>{children}</button>;
}

function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [viewProposal, setViewProposal] = useState(null);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [proposalToSend, setProposalToSend] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [gmailOpened, setGmailOpened] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState(["Projects"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUp: true });
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [datePreset, setDatePreset] = useState("All dates");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function loadProposals() {
    setLoading(true);
    setApiError("");
    try {
      const result = await apiRequest();
      const items = Array.isArray(result) ? result : result.data || result.proposals || [];
      setProposals(items.map(normalizeProposals));
    } catch (error) {
      setApiError(error.message || "Unable to load proposals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProposals(); }, []);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const response = await fetch(CLIENTS_API_URL, {
          headers: getAuthHeaders(),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Unable to load clients.");

        const items = Array.isArray(result)
          ? result
          : result.data || result.clients || [];

        if (active) setClients(items);
      } catch (error) {
        // Keep the proposal form usable; show the error only when the dropdown is empty.
        if (active) setClients([]);
      }
    }

    loadClients();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProjects() {
      try {
        const response = await fetch(PROJECTS_API_URL, { headers: getAuthHeaders() });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Unable to load projects.");
        const items = Array.isArray(result) ? result : result.data || result.projects || [];
        if (active) setProjects(items);
      } catch {
        if (active) setProjects([]);
      }
    }
    loadProjects();
    return () => { active = false; };
  }, []);

  const filteredProjects = useMemo(() => {
    const term = projectSearch.trim().toLowerCase();
    return projects.filter((project) => {
      const name = project.name || project.title || project.projectName || project.projectTitle || "";
      const client = project.clientName || project.client?.name || "";
      return `${name} ${client}`.toLowerCase().includes(term);
    });
  }, [projects, projectSearch]);

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    return clients.filter((client) => {
      const name = client.name || client.companyName || client.clientName || client.company || "";
      const email = client.email || client.emailAddress || "";
      return `${name} ${email}`.toLowerCase().includes(term);
    });
  }, [clients, clientSearch]);

  const filteredProposals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return proposals.filter((proposal) => {
      const matchesSearch = [proposal.title, proposal.client, proposal.project, proposal.status].join(" ").toLowerCase().includes(term);
      const created = proposal.createdDate ? new Date(`${proposal.createdDate}T00:00:00`) : null;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let matchesDate = true;
      if (datePreset === "Last 7 days") { const start = new Date(startOfToday); start.setDate(start.getDate() - 6); matchesDate = created && created >= start && created <= startOfToday; }
      else if (datePreset === "This month") matchesDate = created && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
      else if (datePreset === "Last month") { const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 1); matchesDate = created && created >= start && created < end; }
      else if (datePreset === "This year") matchesDate = created && created.getFullYear() === now.getFullYear();
      if (dateFrom) matchesDate = matchesDate && created && created >= new Date(`${dateFrom}T00:00:00`);
      if (dateTo) matchesDate = matchesDate && created && created <= new Date(`${dateTo}T23:59:59`);
      return matchesSearch && matchesDate && (statusFilter === "All" || proposal.status === statusFilter) && (clientFilter === "All Clients" || (proposal.client || "") === clientFilter) && (projectFilter === "All Projects" || (proposal.project || "") === projectFilter);
    });
  }, [proposals, search, statusFilter, clientFilter, projectFilter, datePreset, dateFrom, dateTo]);

  const totalValue = proposals.reduce((sum, proposal) => sum + (Number(proposal.amount) || 0), 0);
  const acceptedValue = proposals.filter((proposal) => proposal.status === "Accepted").reduce((sum, proposal) => sum + (Number(proposal.amount) || 0), 0);
  const sentCount = proposals.filter((proposal) => proposal.status === "Sent").length;
  const acceptedCount = proposals.filter((proposal) => proposal.status === "Accepted").length;
  const draftCount = proposals.filter((proposal) => proposal.status === "Draft").length;
  const totalPages = Math.max(1, Math.ceil(filteredProposals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageProposals = filteredProposals.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [search, statusFilter, clientFilter, projectFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm, createdDate: new Date().toISOString().slice(0, 10) });
    setClientSearch("");
    setClientDropdownOpen(false);
    setProjectSearch("");
    setProjectDropdownOpen(false);
    setShowForm(true);
  }

  function openEditForm(proposal) {
    setEditingId(proposal.id);
    setForm({ ...emptyForm, ...proposal, project: proposal.project || proposal.projectName || "", projectId: proposal.projectId || proposal.project?._id || proposal.project?.id || "", description: proposal.description || "", clientEmail: proposal.clientEmail || (clients.find((item) => (item.name || item.companyName || item.clientName || item.company || "") === proposal.client)?.email || clients.find((item) => (item.name || item.companyName || item.clientName || item.company || "") === proposal.client)?.emailAddress || ""), amount: String(proposal.amount) });
    setClientSearch("");
    setClientDropdownOpen(false);
    setProjectSearch("");
    setProjectDropdownOpen(false);
    setShowForm(true);
    setOpenMenuId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const selectedClient = clients.find((item) => (item.name || item.companyName || item.clientName || item.company || "") === form.client.trim());
    const payload = { ...form, title: form.title.trim(), client: form.client.trim(), clientEmail: (form.clientEmail || selectedClient?.email || selectedClient?.emailAddress || "").trim().toLowerCase(), project: form.project.trim(), projectId: form.projectId || undefined, description: form.description.trim(), amount: Number(form.amount) };
    try {
      const result = editingId !== null
        ? await apiRequest(`/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiRequest("", { method: "POST", body: JSON.stringify(payload) });
      const saved = normalizeProposals(result.data || result.proposal || result);
      if (editingId !== null) setProposals((current) => current.map((proposal) => proposal.id === editingId ? saved : proposal));
      else setProposals((current) => [saved, ...current]);
      setShowForm(false);
      setClientDropdownOpen(false);
      setClientSearch("");
      setProjectDropdownOpen(false);
      setProjectSearch("");
      setEditingId(null);
      setForm(emptyForm);
      setApiError("");
    } catch (error) { setApiError(error.message || "Unable to save proposal."); }
  }

  async function deleteProposal(id) {
    const proposal = proposals.find((item) => item.id === id);
    if (!proposal) return;
    setProposalToDelete(proposal);
    setOpenMenuId(null);
  }

  async function confirmDeleteProposal() {
    if (!proposalToDelete) return;
    setActionLoading(true);
    setApiError("");
    try {
      await apiRequest(`/${proposalToDelete.id}`, { method: "DELETE" });
      setProposals((current) => current.filter((item) => item.id !== proposalToDelete.id));
      setProposalToDelete(null);
    } catch (error) {
      setApiError(error.message || "Unable to delete proposal.");
    } finally {
      setActionLoading(false);
    }
  }

  async function updateStatus(id, status) {
    const proposal = proposals.find((item) => item.id === id);
    if (!proposal || proposal.status === status) return false;
    try {
      const result = await apiRequest(`/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      const raw = result.data || result.proposal || result;
      const saved = normalizeProposals({ ...proposal, ...raw, status: raw.status || status });
      setProposals((current) => current.map((item) => item.id === id ? saved : item));
      return true;
    } catch (error) {
      setApiError(error.message || "Unable to update proposal status.");
      return false;
    }
  }

  function openProposalInGmail() {
    if (!proposalToSend) return;
    const proposal = proposalToSend;
    const recipient = (proposal.clientEmail || clients.find((item) => (item.name || item.companyName || item.clientName || item.company || "") === proposal.client)?.email || clients.find((item) => (item.name || item.companyName || item.clientName || item.company || "") === proposal.client)?.emailAddress || "").trim();
    if (!recipient) {
      setApiError("This client does not have an email address in CRM. Add the client's email first, then try again.");
      return;
    }

    const subject = `Proposal: ${proposal.title}`;
    const body = [
      `Hello ${proposal.client || "there"},`,
      "",
      `Please find the details of our proposal below:`,
      `Proposal: ${proposal.title}`,
      `Project: ${proposal.project || "N/A"}`,
      `Description: ${proposal.description || "Please see the attached proposal document for details."}`,
      `Amount: ${formatCurrency(proposal.amount)}`,
      `Valid Until: ${formatDate(proposal.validUntil)}`,
      "",
      "Please review the proposal and let us know if you have any questions.",
      "",
      "Best regards"
    ].join("\\n");

    const mailto = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank", "noopener,noreferrer");
    setGmailOpened(true);
    setApiError("");
  }

  async function confirmSendProposal() {
    if (!proposalToSend) return;
    setActionLoading(true);
    setApiError("");
    try {
      const result = await apiRequest(`/${proposalToSend.id}/mark-sent`, { method: "POST" });
      const raw = result.data || result.proposal || result;
      const saved = normalizeProposals({
        ...proposalToSend,
        ...raw,
        status: raw.status || "Sent",
        sentAt: raw.sentAt || new Date().toISOString(),
        sentVia: raw.sentVia || "gmail_manual"
      });
      setProposals((current) => current.map((item) => item.id === proposalToSend.id ? saved : item));
      setProposalToSend(null);
      setGmailOpened(false);
      setOpenMenuId(null);
    } catch (error) {
      setApiError(error.message || "Unable to mark proposal as sent.");
    } finally {
      setActionLoading(false);
    }
  }

  async function duplicateProposal(proposal) {
    const payload = { ...proposal, title: `${proposal.title} (Copy)`, status: "Draft" };
    delete payload.id;
    delete payload._id;
    try {
      const result = await apiRequest("", { method: "POST", body: JSON.stringify(payload) });
      const saved = normalizeProposals(result.data || result.proposal || result);
      setProposals((current) => [saved, ...current]);
      setOpenMenuId(null);
    } catch (error) { setApiError(error.message || "Unable to duplicate proposal."); }
  }

  function downloadProposal(proposal) {
    const content = `PROPOSAL\\n\\nTitle: ${proposal.title}\\nClient: ${proposal.client || "—"}\\nProject: ${proposal.project || "—"}\\nAmount: ${formatCurrency(proposal.amount)}\\nStatus: ${proposal.status}\\nCreated: ${formatDate(proposal.createdDate)}\\nValid Until: ${formatDate(proposal.validUntil)}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(proposal.title || "proposal").replace(/[^a-z0-9-_]/gi, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setOpenMenuId(null);
  }

  function toggleGroup(label) {
    setExpandedGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  function exportCsv() {
    const headers = ["Proposal", "Client", "Amount", "Created Date", "Valid Until", "Status"];
    const rows = filteredProposals.map((proposal) => [proposal.title, proposal.client, proposal.amount, proposal.createdDate, proposal.validUntil, proposal.status]);
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "erp-proposals.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#172033]">
      {sidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-white/5 bg-[#151a30] text-slate-200 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <a href="/" className="flex h-[78px] shrink-0 items-center gap-3 px-7 text-white"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-950/40"><Layers3 size={23} /></span><span className="text-[19px] font-bold tracking-tight">ERP System</span></a>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const expanded = expandedGroups.includes(group.label);
            if (group.children) return <div key={group.label}>
              <button type="button" onClick={() => toggleGroup(group.label)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition ${group.label === "Projects" ? "bg-white/[0.035] text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><GroupIcon size={20} /><span className="flex-1">{group.label}</span>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {expanded && <div className="mt-1 space-y-1">{group.children.map((child) => {
                const active = child.label === "Proposals";
                const ChildIcon = child.label === "All Projects" ? BriefcaseBusiness : child.label === "Tasks" ? Check : FileText;
                return <a key={child.label} href={child.href} className={`flex items-center gap-3 rounded-xl px-7 py-3 text-[13px] transition ${active ? "bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white shadow-md shadow-violet-950/25" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><ChildIcon size={17} />{child.label}</a>;
              })}</div>}
            </div>;
            return <a key={group.label} href={group.href} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"><GroupIcon size={20} />{group.label}</a>;
          })}
        </nav>
        <div className="m-3 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200"><Zap size={17} /></span>Upgrade to Pro</div><p className="mt-3 text-xs leading-5 text-slate-300">Unlock advanced features for your business.</p><button type="button" onClick={() => window.alert("Upgrade options can be connected here later.")} className="mt-3 flex w-full items-center justify-between text-xs font-semibold text-slate-100">Explore plans <ArrowRight size={15} /></button></div>
      </aside>

      <div className="min-h-screen lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 shadow-[0_2px_12px_rgba(25,35,65,0.025)] backdrop-blur sm:px-7 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button><div className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-slate-400 shadow-sm"><Search size={19} /><input aria-label="Search proposals" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /><span className="hidden items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 sm:flex">Ctrl <span className="text-slate-300">K</span></span></div></div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-6"><button type="button" aria-label="Notifications" onClick={() => window.alert("You're all caught up!")} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><Bell size={21} /><span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" /></button><button type="button" onClick={() => window.alert("Signed in as demo administrator.")} className="flex items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white">A</span><span className="hidden sm:block"><span className="block text-sm font-semibold text-slate-900">Admin</span><span className="mt-0.5 block text-xs text-slate-500">Administrator</span></span><ChevronDown size={16} className="hidden text-slate-500 sm:block" /></button></div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-8 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"><House size={14} /><span>ERP</span><ChevronRight size={14} /><span>Projects</span><ChevronRight size={14} /><span className="font-semibold text-violet-700">Proposals</span></div><h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[36px]">Proposals</h1><p className="mt-2 text-[15px] text-slate-500 sm:text-base">Create, manage and track your project proposals.</p></div><button type="button" onClick={openAddForm} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(109,40,217,0.22)] transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:self-auto"><Plus size={19} />New Proposal</button></div>

          <section className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total Proposals" value={proposals.length} detail="All proposals" icon={FileCheck2} tone="purple" />
            <MetricCard title="Draft" value={draftCount} detail="In preparation" icon={Clock3} tone="blue" />
            <MetricCard title="Sent" value={sentCount} detail="Awaiting response" icon={Send} tone="purple" />
            <MetricCard title="Accepted" value={acceptedCount} detail="Client approved" icon={BadgeCheck} tone="green" />
            <MetricCard title="Rejected" value={proposals.filter((p) => p.status === "Rejected").length} detail="Not approved" icon={X} tone="orange" />
          </section>

                    {apiError && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{apiError}</span><button type="button" onClick={loadProposals} className="font-semibold underline">Retry</button></div>}
          {loading && <p className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading proposals from server...</p>}

          <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.045)]">
            <div className="border-b border-slate-100 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {["All", "Draft", "Sent", "Accepted", "Rejected"].map((status) => {
                  const count = status === "All" ? proposals.length : proposals.filter((p) => p.status === status).length;
                  return <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${statusFilter === status ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{status} ({count})</button>;
                })}
                <div className="relative ml-auto">
                  <button type="button" onClick={() => setDateMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50/40"><CalendarDays size={14} /> {dateFrom || dateTo ? `${dateFrom || "Start"} – ${dateTo || "Today"}` : datePreset} <ChevronDown size={13} /></button>
                  {dateMenuOpen && <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Filter created date</p>
                    {["All dates", "Last 7 days", "This month", "Last month", "This year"].map((preset) => <button key={preset} type="button" onClick={() => { setDatePreset(preset); setDateFrom(""); setDateTo(""); setDateMenuOpen(false); }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${datePreset === preset && !dateFrom && !dateTo ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}>{preset}</button>)}
                    <div className="mt-3 border-t border-slate-100 pt-3"><p className="mb-2 text-xs font-semibold text-slate-700">Custom date range</p><label className="mb-2 block text-[11px] text-slate-500">From<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDatePreset("All dates"); }} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 outline-none focus:border-violet-400" /></label><label className="block text-[11px] text-slate-500">To<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); setDatePreset("All dates"); }} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 outline-none focus:border-violet-400" /></label><div className="mt-3 flex gap-2"><button type="button" onClick={() => setDateMenuOpen(false)} className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white">Apply</button><button type="button" onClick={() => { setDatePreset("All dates"); setDateFrom(""); setDateTo(""); setDateMenuOpen(false); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">Reset</button></div></div>
                  </div>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
                <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3"><Search size={15} className="shrink-0 text-slate-400" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." className="min-w-0 w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></div>
                <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-violet-400"><option>All Clients</option>{[...new Set(proposals.map((p) => p.client).filter(Boolean))].map((client) => <option key={client}>{client}</option>)}</select>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-violet-400"><option>All Projects</option>{[...new Set(proposals.map((p) => p.project).filter(Boolean))].map((project) => <option key={project}>{project}</option>)}</select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-violet-400">{["All", "Draft", "Sent", "Accepted", "Rejected"].map((status) => <option key={status} value={status}>{status === "All" ? "All Statuses" : status}</option>)}</select>
                <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14} />Export</button>
              </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[860px] border-collapse text-left">
              <thead><tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-[0.055em] text-slate-500"><th className="px-4 py-3">#</th><th className="px-4 py-3">Proposal Title</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created Date</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pageProposals.map((proposal, index) => <tr key={proposal.id} className="group transition-colors hover:bg-violet-50/30">
                  <td className="px-4 py-2.5 text-xs text-slate-500">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="px-4 py-2.5"><span className="block max-w-[220px] truncate text-xs font-semibold text-slate-800">{proposal.title}</span></td>
                  <td className="px-4 py-2.5"><span className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-600"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">{(proposal.client || "C").slice(0,2).toUpperCase()}</span>{proposal.client || "—"}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{proposal.project || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-800">{formatCurrency(proposal.amount)}</td>
                  <td className="px-4 py-2.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[proposal.status] || "bg-slate-100 text-slate-700"}`}>{proposal.status}</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">{formatDate(proposal.createdDate)}</td>
                  <td className="px-3 py-2.5 text-center"><div className="inline-flex items-center justify-center gap-1.5">
                    <button type="button" title="Edit proposal" aria-label={`Edit ${proposal.title}`} onClick={() => openEditForm(proposal)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-700 transition hover:bg-violet-100"><Pencil size={15}/></button>
                    <button type="button" title="Delete proposal" aria-label={`Delete ${proposal.title}`} onClick={() => deleteProposal(proposal.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100"><Trash2 size={15}/></button>
                    <button type="button" aria-label={`More actions for ${proposal.title}`} onClick={(event) => { if (openMenuId === proposal.id) { setOpenMenuId(null); return; } const rect = event.currentTarget.getBoundingClientRect(); const menuHeight = 250; const openUp = window.innerHeight - rect.bottom < menuHeight; setMenuPosition({ top: openUp ? Math.max(8, rect.top - menuHeight) : rect.bottom + 6, left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)), openUp }); setOpenMenuId(proposal.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"><MoreHorizontal size={17} /></button>
                  </div></td>
                </tr>)}
                {pageProposals.length === 0 && <tr><td colSpan={8} className="px-5 py-16 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Search size={22} /></span><p className="mt-4 font-semibold text-slate-900">No proposals found</p><p className="mt-1 text-sm text-slate-500">Try another search or change the status filter.</p><button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); }} className="mt-4 text-sm font-semibold text-violet-700">Clear filters</button></div></td></tr>}
              </tbody>
            </table></div>
            <div className="flex flex-col justify-between gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><p className="text-sm text-slate-500">{filteredProposals.length === 0 ? "Showing 0 proposals" : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredProposals.length)} of ${filteredProposals.length} proposals`}</p><div className="flex items-center justify-end gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={18} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map((number) => <button key={number} type="button" onClick={() => setPage(number)} className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold ${number === currentPage ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{number}</button>)}<button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="Next page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={18} /></button></div></div>
          </section>
        </main>
      </div>

      {openMenuId !== null && createPortal((() => { const proposal = proposals.find((item) => item.id === openMenuId); if (!proposal) return null; return <><button aria-label="Close actions menu" className="fixed inset-0 z-[90] cursor-default" onClick={() => setOpenMenuId(null)} /><div style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left }} className="z-[100] w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-[0_12px_35px_rgba(15,23,42,0.2)]">
        <button type="button" onClick={() => { setViewProposal(proposal); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Eye size={14}/>View Proposal</button>
        <button type="button" onClick={() => { openEditForm(proposal); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Pencil size={14}/>Edit Proposal</button>
        <button type="button" onClick={() => { setProposalToSend(proposal); setGmailOpened(false); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Send size={14}/>Send Proposal</button>
        <button type="button" onClick={() => { downloadProposal(proposal); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Download size={14}/>Download Proposal</button>
        <button type="button" onClick={() => { duplicateProposal(proposal); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Copy size={14}/>Duplicate</button>
        <button type="button" onClick={() => { setOpenMenuId(null); deleteProposal(proposal.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"><Trash2 size={14}/>Delete Proposal</button>
      </div></>; })(), document.body)}

      {proposalToDelete && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" onClick={() => !actionLoading && setProposalToDelete(null)}><div role="dialog" aria-modal="true" aria-labelledby="delete-proposal-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={23}/></div><h2 id="delete-proposal-title" className="mt-4 text-lg font-bold text-slate-900">Delete Proposal?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Are you sure you want to delete <span className="font-semibold text-slate-900">{proposalToDelete.title}</span>? This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={actionLoading} onClick={() => setProposalToDelete(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" disabled={actionLoading} onClick={confirmDeleteProposal} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">{actionLoading ? <><Clock3 size={15}/>Deleting...</> : <><Trash2 size={15}/>Delete Proposal</>}</button></div></div></div>}

      {proposalToSend && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" onClick={() => !actionLoading && setProposalToSend(null)}><div role="dialog" aria-modal="true" aria-labelledby="send-proposal-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Send size={22}/></div><h2 id="send-proposal-title" className="mt-4 text-lg font-bold text-slate-900">Send Proposal</h2><p className="mt-2 text-sm leading-6 text-slate-600">Prepare <span className="font-semibold text-slate-900">{proposalToSend.title}</span> for <span className="font-semibold text-slate-900">{proposalToSend.client || "the client"}</span> in Gmail.</p><div className="mt-3 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">Gmail will open with the recipient, subject, and message filled in. Review it, attach your proposal file if needed, and send it in Gmail. Then return here and mark the proposal as sent.</div><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={actionLoading} onClick={() => { setProposalToSend(null); setGmailOpened(false); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" disabled={actionLoading} onClick={openProposalInGmail} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"><Send size={15}/>Open Gmail</button>{gmailOpened && <button type="button" disabled={actionLoading} onClick={confirmSendProposal} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{actionLoading ? <><Clock3 size={15}/>Updating...</> : <><Check size={15}/>Mark as Sent</>}</button>}</div></div></div>}

      {viewProposal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={() => setViewProposal(null)}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><span className="inline-flex rounded-lg bg-violet-50 p-2 text-violet-700"><FileCheck2 size={20}/></span><h2 className="mt-3 text-xl font-bold text-slate-900">Proposal Details</h2><p className="mt-1 text-sm text-slate-500">Review proposal information</p></div><button type="button" onClick={() => setViewProposal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-3">{[["Proposal Title",viewProposal.title],["Client",viewProposal.client || "—"],["Project",viewProposal.project || "—"],["Description",viewProposal.description || "—"],["Amount",formatCurrency(viewProposal.amount)],["Status",viewProposal.status],["Created Date",formatDate(viewProposal.createdDate)],["Valid Until",formatDate(viewProposal.validUntil)]].map(([label,value]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-800">{value}</span></div>)}</div><div className="mt-5 flex justify-end"><button type="button" onClick={() => setViewProposal(null)} className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Close</button></div></div></div>}

      {showForm && <div onClick={(event) => { if (!event.target.closest("[data-proposal-client-picker]")) setClientDropdownOpen(false); if (!event.target.closest("[data-proposal-project-picker]")) setProjectDropdownOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"><form onSubmit={handleSubmit} onClick={(event) => { if (!event.target.closest("[data-proposal-client-picker]")) setClientDropdownOpen(false); if (!event.target.closest("[data-proposal-project-picker]")) setProjectDropdownOpen(false); }} className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileCheck2 size={22} /></span><h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{editingId !== null ? "Edit Proposal" : "Create New Proposal"}</h2><p className="mt-1 text-sm text-slate-500">Enter proposal value, dates and client information.</p></div><button type="button" onClick={() => { setShowForm(false); setClientDropdownOpen(false); setProjectDropdownOpen(false); }} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Proposal Title <span className="text-rose-500">*</span></span><input required value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Enter proposal title" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <div className="relative" data-proposal-client-picker>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Client / Company <span className="text-rose-500">*</span></label>
            <div className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 transition focus-within:ring-4 ${clientDropdownOpen ? "border-violet-500 ring-4 ring-violet-100" : "border-slate-300"}`}>
              <Building2 size={17} className="shrink-0 text-slate-400" />
              <input
                required
                value={clientDropdownOpen ? clientSearch : form.client}
                onFocus={() => { setClientSearch(""); setClientDropdownOpen(true); }}
                onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                onKeyDown={(e) => { if (e.key === "Escape") setClientDropdownOpen(false); }}
                placeholder="Search client or company..."
                autoComplete="off"
                className="min-w-0 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                aria-expanded={clientDropdownOpen}
                aria-autocomplete="list"
              />
              <button type="button" aria-label="Toggle client list" onClick={() => { setClientSearch(""); setClientDropdownOpen((open) => !open); }} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100"><ChevronDown size={17} /></button>
            </div>
            {clientDropdownOpen && <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {filteredClients.length > 0 ? filteredClients.map((client) => {
                const name = client.name || client.companyName || client.clientName || client.company || "Unnamed client";
                const email = client.email || client.emailAddress || "";
                const id = client._id || client.id || name;
                return <button key={id} type="button" onClick={() => { setForm((current) => ({ ...current, client: name, clientEmail: email })); setClientSearch(""); setClientDropdownOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${form.client === name ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Building2 size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{name}</span>{email && <span className="mt-0.5 block truncate text-xs text-slate-500">{email}</span>}</span>
                  {form.client === name && <Check size={16} />}
                </button>;
              }) : <div className="px-3 py-4 text-center"><p className="text-sm font-medium text-slate-700">No clients found</p><p className="mt-1 text-xs text-slate-500">{clients.length ? "Try a different search." : "No clients are available from the CRM yet."}</p></div>}
            </div>}
          </div>
          <div className="relative" data-proposal-project-picker>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Related Project</label>
            <div className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 transition focus-within:ring-4 ${projectDropdownOpen ? "border-violet-500 ring-4 ring-violet-100" : "border-slate-300"}`}>
              <BriefcaseBusiness size={17} className="shrink-0 text-slate-400" />
              <input value={projectDropdownOpen ? projectSearch : form.project} onFocus={() => { setProjectSearch(""); setProjectDropdownOpen(true); }} onChange={(e) => { setProjectSearch(e.target.value); setProjectDropdownOpen(true); }} onKeyDown={(e) => { if (e.key === "Escape") setProjectDropdownOpen(false); }} placeholder="Search project..." autoComplete="off" className="min-w-0 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400" aria-expanded={projectDropdownOpen} aria-autocomplete="list" />
              <button type="button" aria-label="Toggle project list" onClick={() => { setProjectSearch(""); setProjectDropdownOpen((open) => !open); }} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100"><ChevronDown size={17} /></button>
            </div>
            {projectDropdownOpen && <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button type="button" onClick={() => { setForm((current) => ({ ...current, project: "", projectId: "" })); setProjectSearch(""); setProjectDropdownOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${!form.project ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><X size={16} /></span><span className="font-medium">No project linked</span>{!form.project && <Check size={16} className="ml-auto" />}</button>
              {filteredProjects.length > 0 ? filteredProjects.map((project) => { const name = project.name || project.title || project.projectName || project.projectTitle || "Unnamed project"; const id = project._id || project.id || name; return <button key={id} type="button" onClick={() => { setForm((current) => ({ ...current, project: name, projectId: String(id) })); setProjectSearch(""); setProjectDropdownOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${form.project === name ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><BriefcaseBusiness size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{name}</span>{(project.clientName || project.client?.name) && <span className="mt-0.5 block truncate text-xs text-slate-500">{project.clientName || project.client?.name}</span>}</span>{form.project === name && <Check size={16} />}</button>; }) : <div className="px-3 py-3 text-center text-xs text-slate-500">{projects.length ? "No matching projects found." : "No projects available from the Projects module."}</div>}
            </div>}
          </div>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Proposal Description</span><textarea rows={3} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Describe the proposed work, deliverables, and scope..." className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Amount (₹) <span className="text-rose-500">*</span></span><input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} placeholder="Enter amount" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Created Date <span className="text-rose-500">*</span></span><input required type="date" value={form.createdDate} onChange={(e) => setForm((current) => ({ ...current, createdDate: e.target.value, validUntil: current.validUntil && current.validUntil < e.target.value ? "" : current.validUntil }))} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Valid Until <span className="text-rose-500">*</span></span><input required type="date" min={form.createdDate || undefined} value={form.validUntil} onChange={(e) => setForm((current) => ({ ...current, validUntil: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option>Draft</option><option>Sent</option><option>Accepted</option><option>Rejected</option></select></label>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setShowForm(false); setClientDropdownOpen(false); setProjectDropdownOpen(false); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100">{editingId !== null ? "Save Changes" : "Create Proposal"}</button></div>
      </form></div>}
    </div>
  );
}

export default Proposals;
