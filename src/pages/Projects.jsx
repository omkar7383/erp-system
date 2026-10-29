import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronRight,
  ChevronLeft, ChevronUp, ContactRound, FileBarChart, FileText, Filter,
  House, Layers3, LayoutDashboard, Menu, MoreHorizontal, Pencil, Plus,
  Search, Settings, Trash2, Users, UsersRound, X, Zap, ArrowRight,
  CalendarDays, CircleDollarSign, Target, Clock3, Download, Building2, Eye, List, Grid2X2, UserRound
} from "lucide-react";

const API_URL = "http://localhost:5000/api/projects";
const CLIENTS_API_URL = "http://localhost:5000/api/clients";
const EMPLOYEES_API_URL = "http://localhost:5000/api/employees";
const TASKS_API_URL = "http://localhost:5000/api/tasks";
const emptyForm = { name: "", client: "", manager: "", startDate: "", deadline: "", budget: "", status: "Planning", progress: 0, description: "" };
const emptyTaskForm = { title: "", assignee: "", dueDate: "", status: "To Do", description: "" };

function getRows(result) {
  if (Array.isArray(result)) return result;
  return result?.data || result?.clients || result?.employees || result?.tasks || result?.projects || [];
}
function recordId(item) { return String(item?._id ?? item?.id ?? ""); }
function clientName(item) {
  return item?.name ?? item?.clientName ?? item?.fullName ?? item?.contactName ?? item?.contactPerson ?? item?.personName ?? "Unnamed client";
}
function clientCompany(item) {
  return item?.companyName ?? item?.company ?? item?.businessName ?? item?.organization ?? item?.organisation ?? "";
}
function clientLabel(item) {
  const name = clientName(item);
  const company = clientCompany(item);
  return company && company !== name ? `${name} - ${company}` : name;
}
function employeeLabel(item) { return item?.name ?? item?.fullName ?? item?.employeeName ?? item?.email ?? "Unnamed employee"; }
function authHeaders() {
  const token = sessionStorage.getItem("erp-token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const statusStyles = {
  Planning: "bg-blue-50 text-blue-700",
  "In Progress": "bg-violet-50 text-violet-700",
  "On Hold": "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const statusDots = {
  Planning: "bg-blue-500",
  "In Progress": "bg-violet-500",
  "On Hold": "bg-amber-500",
  Completed: "bg-emerald-500",
};

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

function formatBudget(amount) {
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
    purple: { box: "bg-violet-50 text-violet-600", chart: "bg-violet-500", trend: "bg-emerald-50 text-emerald-600" },
    green: { box: "bg-emerald-50 text-emerald-600", chart: "bg-emerald-400", trend: "bg-emerald-50 text-emerald-600" },
    blue: { box: "bg-blue-50 text-blue-600", chart: "bg-blue-500", trend: "bg-emerald-50 text-emerald-600" },
    orange: { box: "bg-amber-50 text-amber-600", chart: "bg-orange-400", trend: "bg-amber-50 text-amber-600" },
    rose: { box: "bg-rose-50 text-rose-600", chart: "bg-rose-500", trend: "bg-emerald-50 text-emerald-600" },
  }[tone] || { box: "bg-violet-50 text-violet-600", chart: "bg-violet-500", trend: "bg-emerald-50 text-emerald-600" };
  const bars = [9, 14, 19, 25, 31];
  return (
    <div className="flex min-h-[98px] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_4px_16px_rgba(28,42,78,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl ${styles.box}`}><Icon size={25} strokeWidth={2.1} /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-600">{title}</p><p className="mt-1 text-[24px] font-bold leading-none tracking-tight text-slate-950">{value}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`flex h-4 w-4 items-center justify-center rounded-full ${styles.trend}`}>↗</span>{detail}</p></div>
      <div aria-hidden="true" className="hidden h-10 shrink-0 items-end gap-[3px] sm:flex">{bars.map((height, index) => <span key={height} className={`w-[4px] rounded-t-sm ${styles.chart} opacity-${50 + index * 10}`} style={{ height: `${height}px`, opacity: 0.35 + index * 0.14 }} />)}</div>
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

function Projects() {
  const [projects, setProjects] = useState([]);
  // Keep a dashboard-readable cache in sync with this API-backed module.
  useEffect(() => {
    try {
      localStorage.setItem("erp-projects", JSON.stringify(projects));
      window.dispatchEvent(new Event("erp-data-updated"));
    } catch (error) {
      console.warn("Could not sync projects dashboard cache:", error);
    }
  }, [projects]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [taskRecords, setTaskRecords] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  async function apiRequest(path = "", options = {}) {
    const token = sessionStorage.getItem("erp-token");
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.message || `Request failed (${response.status})`);
    }
    return result;
  }

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const result = await apiRequest();
        if (active) {
          setProjects((result.data || []).map((item) => ({
            ...item,
            id: item._id || item.id,
            budget: item.budget ?? "",
            progress: Number(item.progress) || 0
          })));
        }
      } catch (error) {
        if (active) window.alert(`Could not load projects: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProjects();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadRelatedData() {
      setRelatedLoading(true);
      setRelatedError("");
      const requests = [
        fetch(CLIENTS_API_URL, { headers: authHeaders() }),
        fetch(EMPLOYEES_API_URL, { headers: authHeaders() }),
        fetch(TASKS_API_URL, { headers: authHeaders() })
      ];
      try {
        const responses = await Promise.all(requests);
        const results = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
        if (!responses[0].ok) throw new Error(results[0].message || "Could not load clients.");
        if (!responses[1].ok) throw new Error(results[1].message || "Could not load employees.");
        if (active) {
          setClients(getRows(results[0]));
          setEmployees(getRows(results[1]));
          if (responses[2].ok) setTaskRecords(getRows(results[2]));
        }
      } catch (error) {
        if (active) setRelatedError(`${error.message} You can still enter client and manager names manually.`);
      } finally {
        if (active) setRelatedLoading(false);
      }
    }
    loadRelatedData();
    return () => { active = false; };
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState(["Projects"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openMenuPosition, setOpenMenuPosition] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeProjectPanel, setActiveProjectPanel] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskProject, setTaskProject] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [savingTask, setSavingTask] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("list");
  const pageSize = 8;


  // Completed projects are always 100%; all other statuses use the manually selected value.
  function calculateProjectProgress(project) {
    if (project?.status === "Completed") return 100;
    return Math.min(100, Math.max(0, Number(project?.progress) || 0));
  }

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = [project.name, project.client, project.manager, project.status].join(" ").toLowerCase().includes(term);
      return matchesSearch && (statusFilter === "All" || project.status === statusFilter);
    });
  }, [projects, search, statusFilter]);

  const filteredClients = clients.filter((item) =>
    `${clientName(item)} ${clientCompany(item)} ${item.email || ""}`.toLowerCase().includes(clientSearch.trim().toLowerCase())
  );
  const filteredManagers = employees.filter((item) => `${employeeLabel(item)} ${item.employeeId || ""} ${item.email || ""}`.toLowerCase().includes(managerSearch.trim().toLowerCase()));

  const totalBudget = projects.reduce((total, project) => total + (Number(project.budget) || 0), 0);
  const activeCount = projects.filter((project) => project.status === "In Progress").length;
  const completedCount = projects.filter((project) => project.status === "Completed").length;
  const planningCount = projects.filter((project) => project.status === "Planning").length;
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageProjects = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [search, statusFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setClientSearch("");
    setManagerSearch("");
    setClientDropdownOpen(false);
    setManagerDropdownOpen(false);
    setShowForm(true);
  }

  function openEditForm(project) {
    setEditingId(project.id);
    setForm({ ...emptyForm, ...project, progress: calculateProjectProgress(project) });
    setClientSearch("");
    setManagerSearch("");
    setClientDropdownOpen(false);
    setManagerDropdownOpen(false);
    setShowForm(true);
    setOpenMenuId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      client: form.client.trim(),
      manager: form.manager.trim(),
      deadline: form.deadline,
      startDate: form.startDate || "",
      endDate: form.deadline || "",
      description: form.description || "",
      budget: form.budget === "" ? 0 : Number(form.budget),
      status: form.status,
      progress: form.status === "Completed" ? 100 : Math.min(100, Math.max(0, Number(form.progress) || 0))
    };

    if (!payload.name) {
      window.alert("Project name is required.");
      return;
    }
    if (payload.budget < 0 || !Number.isFinite(payload.budget)) {
      window.alert("Please enter a valid non-negative budget.");
      return;
    }
    if (payload.deadline && form.deadline < new Date().toISOString().slice(0, 10) && form.status !== "Completed") {
      const proceed = window.confirm("This deadline is in the past. Do you want to continue?");
      if (!proceed) return;
    }

    try {
      if (editingId !== null) {
        const result = await apiRequest(`/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const updated = {
          ...result.data,
          id: result.data._id || result.data.id,
          budget: result.data.budget ?? "",
          progress: Number(result.data.progress) || 0
        };
        setProjects((current) => current.map((item) => item.id === editingId ? updated : item));
      } else {
        const result = await apiRequest("", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const created = {
          ...result.data,
          id: result.data._id || result.data.id,
          budget: result.data.budget ?? "",
          progress: Number(result.data.progress) || 0
        };
        setProjects((current) => [created, ...current]);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      window.alert(`Could not save project: ${error.message}`);
    }
  }

  async function deleteProject(id) {
    const project = projects.find((item) => String(item.id) === String(id));
    if (!project) return;
    setProjectToDelete(project);
    setOpenMenuId(null);
  }

  async function confirmDeleteProject() {
    if (!projectToDelete || deletingProject) return;
    setDeletingProject(true);
    try {
      await apiRequest(`/${projectToDelete.id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => String(item.id) !== String(projectToDelete.id)));
      setProjectToDelete(null);
      setOpenMenuId(null);
    } catch (error) {
      window.alert(`Could not delete project: ${error.message}`);
    } finally {
      setDeletingProject(false);
    }
  }

  function openProjectPanel(project, panel = "details") {
    setSelectedProject(project);
    setActiveProjectPanel(panel);
    setOpenMenuId(null);
  }

  function openTaskForm(project) {
    setTaskProject(project);
    setTaskForm({ ...emptyTaskForm });
    setShowTaskForm(true);
    setOpenMenuId(null);
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    if (!taskProject || !taskForm.title.trim()) return;
    setSavingTask(true);
    const payload = {
      title: taskForm.title.trim(),
      project: taskProject.name,
      projectId: taskProject.id,
      assignee: taskForm.assignee,
      dueDate: taskForm.dueDate,
      status: taskForm.status,
      description: taskForm.description,
    };
    try {
      const response = await fetch(TASKS_API_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || `Request failed (${response.status})`);
      const createdTask = result.data || result.task || { ...payload, id: `local-${Date.now()}` };
      setTaskRecords((current) => [createdTask, ...current]);
      setShowTaskForm(false);
      setTaskForm(emptyTaskForm);
      window.alert("Task created successfully.");
    } catch (error) {
      window.alert(`Could not create task: ${error.message}`);
    } finally {
      setSavingTask(false);
    }
  }

  function projectTasks(project) {
    const projectId = recordId(project);
    return taskRecords.filter((task) => {
      const linkedId = String(task.projectId ?? task.project?._id ?? task.project?.id ?? "");
      const linkedName = typeof task.project === "string" ? task.project : task.project?.name;
      return (linkedId && linkedId === projectId) || linkedName === project.name || task.projectName === project.name;
    });
  }

  function toggleGroup(label) {
    setExpandedGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  function exportCsv() {
    const headers = ["Project", "Client", "Manager", "Start Date", "End Date", "Budget", "Progress", "Status", "Description"];
    const rows = filteredProjects.map((project) => [project.name, project.client, project.manager, project.startDate, project.endDate || project.deadline, project.budget, calculateProjectProgress(project), project.status, project.description]);
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "erp-projects.csv";
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
                const active = child.label === "All Projects";
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
          <div className="flex min-w-0 flex-1 items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button><div className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-slate-400 shadow-sm"><Search size={19} /><input aria-label="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /><span className="hidden items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 sm:flex">Ctrl <span className="text-slate-300">K</span></span></div></div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-6"><button type="button" aria-label="Notifications" onClick={() => window.alert("You're all caught up!")} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><Bell size={21} /><span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" /></button><button type="button" onClick={() => window.alert("Signed in as demo administrator.")} className="flex items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white">A</span><span className="hidden sm:block"><span className="block text-sm font-semibold text-slate-900">Admin</span><span className="mt-0.5 block text-xs text-slate-500">Administrator</span></span><ChevronDown size={16} className="hidden text-slate-500 sm:block" /></button></div>
        </header>

        <main className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-7 sm:py-7 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"><House size={14} /><span>ERP</span><ChevronRight size={14} /><span>Projects</span><ChevronRight size={14} /><span className="font-semibold text-violet-700">All Projects</span></div><h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[36px]">All Projects</h1><p className="mt-2 text-[15px] text-slate-500 sm:text-base">Plan projects, track progress and manage deadlines.</p></div><button type="button" onClick={openAddForm} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(109,40,217,0.22)] transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:self-auto"><Plus size={19} />New Project</button></div>

          <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total Projects" value={projects.length} detail="All project records" icon={BriefcaseBusiness} tone="purple" />
            <MetricCard title="In Progress" value={activeCount} detail="Currently underway" icon={Activity} tone="blue" />
            <MetricCard title="Completed" value={completedCount} detail="Successfully delivered" icon={Check} tone="green" />
            <MetricCard title="On Hold" value={projects.filter((project) => project.status === "On Hold").length} detail="Projects paused" icon={Clock3} tone="orange" />
            <MetricCard title="Total Budget" value={formatBudget(totalBudget)} detail="Combined project budget" icon={CircleDollarSign} tone="rose" />
          </section>

          <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.045)]">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 p-5 sm:p-6 xl:flex-row xl:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BriefcaseBusiness size={22} /></span><div><h2 className="text-[17px] font-bold tracking-tight text-slate-900">Project Portfolio</h2><p className="mt-1 text-sm text-slate-500">{filteredProjects.length} project(s) found <span className="text-slate-400">· {planningCount} in planning</span></p></div></div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="flex h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm sm:w-[280px]"><Search size={19} className="shrink-0 text-slate-500" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project, client, manager..." className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-slate-400"><X size={16} /></button>}</div>
                <div className="relative"><button type="button" onClick={() => setShowFilter((value) => !value)} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${statusFilter !== "All" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}><Filter size={18} />Filter</button>{showFilter && <div className="absolute right-0 top-14 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Project status</p>{["All", "Planning", "In Progress", "On Hold", "Completed"].map((status) => <button key={status} type="button" onClick={() => { setStatusFilter(status); setShowFilter(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${statusFilter === status ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>{status}{statusFilter === status && <Check size={16} />}</button>)}</div>}</div>
                <button type="button" onClick={exportCsv} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Download size={18} />Export</button>
                <div className="flex h-12 items-center rounded-xl border border-slate-200 p-1"><button type="button" title="List view" onClick={() => setViewMode("list")} className={`flex h-9 w-9 items-center justify-center rounded-lg ${viewMode === "list" ? "border border-violet-200 bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><List size={18}/></button><button type="button" title="Grid view" onClick={() => setViewMode("grid")} className={`flex h-9 w-9 items-center justify-center rounded-lg ${viewMode === "grid" ? "border border-violet-200 bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><Grid2X2 size={17}/></button></div>
              </div>
            </div>

            {viewMode === "list" ? <div className="overflow-x-auto"><table className="w-full min-w-[1450px] border-collapse text-left">
              <thead><tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-[0.055em] text-slate-500"><th className="px-5 py-4">#</th><th className="px-4 py-4">Project</th><th className="px-4 py-4">Client</th><th className="px-4 py-4">Manager</th><th className="px-4 py-4">Start Date</th><th className="px-4 py-4">End Date</th><th className="px-4 py-4">Budget</th><th className="px-4 py-4">Progress</th><th className="px-4 py-4">Status</th><th className="px-5 py-4 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={10} className="px-5 py-16 text-center text-sm text-slate-500">Loading projects...</td></tr> : pageProjects.map((project, index) => <tr key={project.id} className="group transition-colors hover:bg-[#fbfaff]">
                  <td className="px-5 py-4 text-xs font-medium text-slate-400">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="px-4 py-4"><div className="flex min-w-[220px] items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700"][index % 4]}`}><BriefcaseBusiness size={20} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{project.name}</span><span className="mt-1 block max-w-[230px] truncate text-[11px] text-slate-500">{project.description || `Project managed by ${project.manager || "unassigned"}`}</span></span></div></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600"><Building2 size={15} className="text-slate-400" />{project.client || "—"}</span></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{(project.manager || "?").charAt(0).toUpperCase()}</span>{project.manager || "—"}</span></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600"><CalendarDays size={15} className="text-slate-400" />{formatDate(project.startDate)}</span></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600"><CalendarDays size={15} className="text-slate-400" />{formatDate(project.endDate || project.deadline)}</span></td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-700">{formatBudget(project.budget)}</td>
                  <td className="px-4 py-4"><div className="min-w-[130px]"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-700">{calculateProjectProgress(project)}%</span><span className="text-[11px] text-slate-400">
  {project.status === "Completed"
    ? "complete"
    : project.status === "In Progress"
      ? "in progress"
      : project.status === "On Hold"
        ? "on hold"
        : "planning"}
</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${project.status === "Completed" ? "bg-emerald-500" : "bg-violet-600"}`} style={{ width: `${Math.min(100, Math.max(0, calculateProjectProgress(project)))}%` }} /></div></div></td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[project.status] || "bg-slate-100 text-slate-700"}`}><span className={`h-2 w-2 rounded-full ${statusDots[project.status] || "bg-slate-500"}`} />{project.status}</span></td>
                  <td className="px-5 py-4"><div className="flex items-center justify-center gap-2"><IconButton label={`Edit ${project.name}`} tone="purple" onClick={() => openEditForm(project)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${project.name}`} tone="red" onClick={() => deleteProject(project.id)}><Trash2 size={16} /></IconButton><div className="relative"><IconButton label={`More actions for ${project.name}`} onClick={(event) => { if (openMenuId === project.id) { setOpenMenuId(null); setOpenMenuPosition(null); } else { const rect = event.currentTarget.getBoundingClientRect(); const menuHeight = 286; const top = rect.bottom + menuHeight + 8 > window.innerHeight ? Math.max(8, rect.top - menuHeight - 8) : rect.bottom + 8; const left = Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232)); setOpenMenuPosition({ top, left }); setOpenMenuId(project.id); } }}><MoreHorizontal size={18} /></IconButton></div></div></td>
                </tr>)}
                {pageProjects.length === 0 && <tr><td colSpan={10} className="px-5 py-16 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Search size={22} /></span><p className="mt-4 font-semibold text-slate-900">No projects found</p><p className="mt-1 text-sm text-slate-500">Try another search or change the status filter.</p><button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); }} className="mt-4 text-sm font-semibold text-violet-700">Clear filters</button></div></td></tr>}
              </tbody>
            </table></div> : <div className="grid grid-cols-1 gap-4 border-b border-slate-200/80 bg-slate-50/40 p-4 sm:grid-cols-2 xl:grid-cols-3">{pageProjects.map((project, index) => <article key={project.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"][index % 4]}`}><BriefcaseBusiness size={19}/></span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status] || "bg-slate-100 text-slate-700"}`}>{project.status}</span></div><h3 className="mt-3 font-bold text-slate-900">{project.name}</h3><p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{project.description || "No project description provided."}</p><div className="mt-4 space-y-2 text-sm text-slate-600"><p><span className="text-slate-400">Client:</span> {project.client || "—"}</p><p><span className="text-slate-400">Manager:</span> {project.manager || "—"}</p><p><span className="text-slate-400">Deadline:</span> {formatDate(project.endDate || project.deadline)}</p><p className="font-semibold text-slate-800">{formatBudget(project.budget)}</p></div><div className="mt-3"><div className="mb-1 flex justify-between text-xs"><span>Progress</span><span>{calculateProjectProgress(project)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{width:`${calculateProjectProgress(project)}%`}}/></div></div><div className="mt-4 flex justify-end gap-2"><IconButton label={`Edit ${project.name}`} tone="purple" onClick={() => openEditForm(project)}><Pencil size={16}/></IconButton><IconButton label={`Delete ${project.name}`} tone="red" onClick={() => deleteProject(project.id)}><Trash2 size={16}/></IconButton><IconButton label={`View ${project.name}`} onClick={() => openProjectPanel(project, "details")}><Eye size={16}/></IconButton></div></article>)}</div>}
            <div className="flex flex-col justify-between gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><p className="text-sm text-slate-500">{filteredProjects.length === 0 ? "Showing 0 projects" : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredProjects.length)} of ${filteredProjects.length} projects`}</p><div className="flex items-center justify-end gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={18} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map((number) => <button key={number} type="button" onClick={() => setPage(number)} className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold ${number === currentPage ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{number}</button>)}<button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="Next page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={18} /></button></div></div>
          </section>
        </main>
      </div>

      {selectedProject && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget) setSelectedProject(null); }}>
        <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BriefcaseBusiness size={23}/></span><div><h2 className="text-xl font-bold text-slate-900">{activeProjectPanel === "details" ? "Project Details" : activeProjectPanel === "tasks" ? "Project Tasks" : activeProjectPanel === "timeline" ? "Project Timeline" : "Project"}</h2><p className="mt-1 text-sm text-slate-500">{selectedProject.name}</p></div></div><button type="button" onClick={() => setSelectedProject(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={20}/></button></div>
          {activeProjectPanel === "details" && <div className="mt-6 space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{selectedProject.name}</h3><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[selectedProject.status] || "bg-slate-100 text-slate-700"}`}>{selectedProject.status}</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[["Client",selectedProject.client],["Manager",selectedProject.manager],["Start Date",formatDate(selectedProject.startDate)],["End Date",formatDate(selectedProject.endDate || selectedProject.deadline)],["Budget",formatBudget(selectedProject.budget)],["Progress",`${calculateProjectProgress(selectedProject)}%`]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p></div>)}</div>{selectedProject.description && <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-500">Description</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedProject.description}</p></div>}<div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{width:`${calculateProjectProgress(selectedProject)}%`}}/></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { const p = selectedProject; setSelectedProject(null); openEditForm(p); }} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700"><Pencil size={16}/>Edit Project</button><button type="button" onClick={() => setSelectedProject(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Close</button></div></div>}
          {activeProjectPanel === "tasks" && <div className="mt-6">{projectTasks(selectedProject).length ? <div className="space-y-2">{projectTasks(selectedProject).map((task, index) => <div key={recordId(task) || index} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-900">{task.title || task.name || "Untitled task"}</p><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{task.status || "To Do"}</span></div><p className="mt-1 text-sm text-slate-500">Assignee: {task.assignee || task.assignedTo || "Unassigned"} · Due: {formatDate(task.dueDate || task.deadline)}</p></div>)}</div> : <div className="rounded-xl bg-slate-50 p-8 text-center"><Check size={28} className="mx-auto text-slate-400"/><p className="mt-3 font-semibold text-slate-800">No tasks linked to this project</p><p className="mt-1 text-sm text-slate-500">Create a task to start tracking project work.</p></div>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { const p=selectedProject; setSelectedProject(null); openTaskForm(p); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Add Task</button><button type="button" onClick={() => setSelectedProject(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Close</button></div></div>}
          {activeProjectPanel === "timeline" && <div className="mt-6 space-y-4"><div className="relative ml-3 border-l-2 border-violet-100 pl-6"><div className="relative pb-6"><span className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-4 border-violet-100 bg-violet-600"/><p className="font-semibold text-slate-900">Project created / planned</p><p className="mt-1 text-sm text-slate-500">Start: {formatDate(selectedProject.startDate)}</p></div><div className="relative pb-6"><span className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-4 border-blue-100 bg-blue-600"/><p className="font-semibold text-slate-900">Current progress</p><p className="mt-1 text-sm text-slate-500">{calculateProjectProgress(selectedProject)}% complete · {selectedProject.status}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{width:`${calculateProjectProgress(selectedProject)}%`}}/></div></div><div className="relative"><span className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-4 border-emerald-100 bg-emerald-600"/><p className="font-semibold text-slate-900">Target completion</p><p className="mt-1 text-sm text-slate-500">End date: {formatDate(selectedProject.endDate || selectedProject.deadline)}</p></div></div><div className="flex justify-end"><button type="button" onClick={() => setSelectedProject(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Close</button></div></div>}
        </div>
      </div>}

      {projectToDelete && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget && !deletingProject) setProjectToDelete(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="delete-project-title" className="my-auto w-full max-w-sm rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={20} strokeWidth={2.2}/></span><div><h2 id="delete-project-title" className="text-sm font-bold text-slate-900">Delete Project</h2><p className="mt-0.5 text-[11px] text-slate-500">Are you sure you want to delete this project?</p></div></div>
            <button type="button" aria-label="Close delete confirmation" disabled={deletingProject} onClick={() => setProjectToDelete(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={17}/></button>
          </div>
          <div className="my-3 flex justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={27} strokeWidth={2.3}/></span></div>
          <p className="text-center text-[11px] leading-[1.45] text-slate-500">This action cannot be undone. All project data and associated information (tasks, invoices, files etc.) will be permanently removed.</p>
          <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2.5 text-[11px] leading-[1.55] text-slate-600">
            <p><span className="font-medium text-slate-700">Project Name:</span> {projectToDelete.name || "—"}</p>
            <p><span className="font-medium text-slate-700">Client:</span> {projectToDelete.client || "—"}</p>
            <p><span className="font-medium text-slate-700">Manager:</span> {projectToDelete.manager || "—"}</p>
            <p><span className="font-medium text-slate-700">Start Date:</span> {formatDate(projectToDelete.startDate)}</p>
            <p><span className="font-medium text-slate-700">End Date:</span> {formatDate(projectToDelete.endDate || projectToDelete.deadline)}</p>
            <p><span className="font-medium text-slate-700">Budget:</span> {formatBudget(projectToDelete.budget)}</p>
            <p><span className="font-medium text-slate-700">Status:</span> {projectToDelete.status || "Planning"}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={deletingProject} onClick={() => setProjectToDelete(null)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">Cancel</button><button type="button" disabled={deletingProject} onClick={confirmDeleteProject} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">{deletingProject ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"/>Deleting...</> : <><Trash2 size={14}/>Delete Project</>}</button></div>
        </section>
      </div>}

      {showTaskForm && taskProject && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget && !savingTask) setShowTaskForm(false); }}><form onSubmit={handleCreateTask} className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Check size={22}/></span><h2 className="mt-3 text-xl font-bold text-slate-900">Add Task (From Project)</h2><p className="mt-1 text-sm text-slate-500">Create a new task for {taskProject.name}.</p></div><button type="button" onClick={() => setShowTaskForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div><div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Project</span><input readOnly value={taskProject.name} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Task Title *</span><input required value={taskForm.title} onChange={(e)=>setTaskForm(v=>({...v,title:e.target.value}))} placeholder="Enter task title" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-violet-500"/></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Assignee</span><select value={taskForm.assignee} onChange={(e)=>setTaskForm(v=>({...v,assignee:e.target.value}))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"><option value="">Select employee</option>{employees.map((employee)=><option key={recordId(employee)} value={employeeLabel(employee)}>{employeeLabel(employee)}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</span><input type="date" value={taskForm.dueDate} onChange={(e)=>setTaskForm(v=>({...v,dueDate:e.target.value}))} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"/></label><label><span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span><select value={taskForm.status} onChange={(e)=>setTaskForm(v=>({...v,status:e.target.value}))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"><option>To Do</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></label><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span><textarea rows="3" value={taskForm.description} onChange={(e)=>setTaskForm(v=>({...v,description:e.target.value}))} placeholder="Enter task description..." className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"/></label></div><div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={savingTask} onClick={()=>setShowTaskForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={savingTask} type="submit" className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingTask ? "Creating..." : "Create Task"}</button></div></form></div>}

      {showForm && <div onClick={(event) => { if (event.target === event.currentTarget) { setClientDropdownOpen(false); setManagerDropdownOpen(false); setShowForm(false); } }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
        <form onClick={(event) => { if (!event.target.closest("[data-project-picker]")) { setClientDropdownOpen(false); setManagerDropdownOpen(false); } }} onSubmit={handleSubmit} className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BriefcaseBusiness size={22} /></span><h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{editingId !== null ? "Edit Project" : "Create New Project"}</h2><p className="mt-1 text-sm text-slate-500">Manage project details, budget and delivery progress.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Project Name <span className="text-rose-500">*</span></span><input required value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Enter project name" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
            <div data-project-picker="client" className="relative">
              <label htmlFor="project-client-search" className="mb-1.5 block text-sm font-medium text-slate-700">Client / Company</label>
              <input id="project-client-search" value={clientDropdownOpen ? clientSearch : form.client} onFocus={() => { setClientDropdownOpen(true); setManagerDropdownOpen(false); setClientSearch(""); }} onClick={() => { setClientDropdownOpen(true); setManagerDropdownOpen(false); }} onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); setForm((current) => ({ ...current, client: "" })); }} placeholder={relatedLoading ? "Loading clients..." : "Search clients..."} autoComplete="off" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              {clientDropdownOpen && <div data-project-picker="client" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {relatedLoading ? <p className="p-3 text-sm text-slate-500">Loading clients...</p> : filteredClients.length ? filteredClients.map((item) => <button key={recordId(item) || `${clientName(item)}-${clientCompany(item)}`} type="button" onClick={() => { setForm((current) => ({ ...current, client: clientLabel(item) })); setClientSearch(""); setClientDropdownOpen(false); }} className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left transition hover:bg-violet-50">
                  <span className="block truncate text-sm font-semibold text-slate-800">{clientName(item)}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{clientCompany(item) || "Company not specified"}</span>
                </button>) : <div className="p-3"><p className="text-sm text-slate-500">No matching clients.</p><button type="button" onClick={() => { setForm((current) => ({ ...current, client: clientSearch.trim() })); setClientDropdownOpen(false); }} className="mt-2 text-sm font-semibold text-violet-700">Use "{clientSearch}"</button></div>}
              </div>}
              {form.client && <button type="button" onClick={() => setForm((current) => ({ ...current, client: "" }))} className="mt-1 text-xs font-medium text-violet-700">Clear selection</button>}
            </div>
            <div data-project-picker="manager" className="relative">
              <label htmlFor="project-manager-search" className="mb-1.5 block text-sm font-medium text-slate-700">Project Manager</label>
              <input id="project-manager-search" value={managerDropdownOpen ? managerSearch : form.manager} onFocus={() => { setManagerDropdownOpen(true); setClientDropdownOpen(false); setManagerSearch(""); }} onClick={() => { setManagerDropdownOpen(true); setClientDropdownOpen(false); }} onChange={(e) => { setManagerSearch(e.target.value); setManagerDropdownOpen(true); setForm((current) => ({ ...current, manager: "" })); }} placeholder={relatedLoading ? "Loading employees..." : "Search employees..."} autoComplete="off" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              {managerDropdownOpen && <div data-project-picker="manager" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {relatedLoading ? <p className="p-3 text-sm text-slate-500">Loading employees...</p> : filteredManagers.length ? filteredManagers.map((item) => <button key={recordId(item)} type="button" onClick={() => { setForm((current) => ({ ...current, manager: employeeLabel(item) })); setManagerSearch(""); setManagerDropdownOpen(false); }} className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-sm hover:bg-violet-50"><span className="block">{employeeLabel(item)}</span><span className="text-xs text-slate-400">{item.employeeId || item.email || ""}</span></button>) : <div className="p-3"><p className="text-sm text-slate-500">No matching employees.</p><button type="button" onClick={() => { setForm((current) => ({ ...current, manager: managerSearch.trim() })); setManagerDropdownOpen(false); }} className="mt-2 text-sm font-semibold text-violet-700">Use "{managerSearch}"</button></div>}
              </div>}
              {form.manager && <button type="button" onClick={() => setForm((current) => ({ ...current, manager: "" }))} className="mt-1 text-xs font-medium text-violet-700">Clear selection</button>}
            </div>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Start Date</span><input type="date" value={form.startDate || ""} onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">End Date</span><input type="date" value={form.deadline} onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Budget (₹)</span><input type="number" min="0" value={form.budget} onChange={(e) => setForm((current) => ({ ...current, budget: e.target.value }))} placeholder="Enter budget" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value, progress: e.target.value === "Completed" ? 100 : current.status === "Completed" ? 0 : current.progress }))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option>Planning</option><option>In Progress</option><option>On Hold</option><option>Completed</option></select></label>
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span><textarea rows="3" value={form.description || ""} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Enter project description..." className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
            <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                <span>Project Progress</span>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${form.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>
                  {form.status === "Completed" ? 100 : Math.min(100, Math.max(0, Number(form.progress) || 0))}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={form.status === "Completed"}
                value={form.status === "Completed" ? 100 : Math.min(100, Math.max(0, Number(form.progress) || 0))}
                onChange={(event) => setForm((current) => ({ ...current, progress: Number(event.target.value) }))}
                aria-label="Project progress percentage"
                className="mt-4 block w-full cursor-pointer accent-violet-600 disabled:cursor-not-allowed disabled:accent-emerald-600"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400"><span>0%</span><span>50%</span><span>100%</span></div>
              <p className="mt-2 text-xs text-slate-500">
                {form.status === "Completed" ? "Completed projects are automatically set to 100%." : "Set progress manually using the slider. Choosing Completed will automatically set it to 100%."}
              </p>
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100">{editingId !== null ? "Save Changes" : "Create Project"}</button></div>
        </form>
      </div>}
      {openMenuId !== null && openMenuPosition && createPortal(
        <>
          <button aria-label="Close project actions menu" className="fixed inset-0 z-[79] cursor-default bg-transparent" onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); }} />
          <div style={{ top: openMenuPosition.top, left: openMenuPosition.left }} className="fixed z-[80] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            {(() => { const project = projects.find((item) => String(item.id) === String(openMenuId)); if (!project) return null; return <>
              <button type="button" onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); openProjectPanel(project, "details"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><Target size={17} className="text-slate-500"/><span>View Details<small className="block text-xs font-normal text-slate-400">See complete project information</small></span></button>
              <button type="button" onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); openTaskForm(project); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><Plus size={17} className="text-slate-500"/><span>Add Task<small className="block text-xs font-normal text-slate-400">Create a new task for this project</small></span></button>
              <button type="button" onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); openProjectPanel(project, "tasks"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><Check size={17} className="text-slate-500"/><span>View Tasks<small className="block text-xs font-normal text-slate-400">See all tasks of this project</small></span></button>
              <button type="button" onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); openProjectPanel(project, "timeline"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><CalendarDays size={17} className="text-slate-500"/><span>View Timeline<small className="block text-xs font-normal text-slate-400">See project timeline</small></span></button>
              <button type="button" onClick={() => { setOpenMenuId(null); setOpenMenuPosition(null); window.location.href = `/invoices?project=${encodeURIComponent(project.id)}&projectName=${encodeURIComponent(project.name)}`; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50"><FileText size={17} className="text-slate-500"/><span>View Invoices<small className="block text-xs font-normal text-slate-400">Open project invoices</small></span></button>
            </>; })()}
          </div>
        </>, document.body
      )}
    </div>
  );
}

export default Projects;
