import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronRight,
  ChevronLeft, ChevronUp, ContactRound, FileBarChart, FileText, Filter,
  House, Layers3, LayoutDashboard, Menu, MoreHorizontal, Pencil, Plus,
  Search, Settings, Trash2, UsersRound, X, Zap, ArrowRight, CalendarDays,
  Clock3, Download, UserRound, ListTodo, AlertTriangle, Eye, CircleDollarSign,
  CheckCircle2, PauseCircle, PlayCircle, CalendarClock, ClipboardCheck,
} from "lucide-react";


const API_URL = "http://localhost:5000/api/tasks";
const PROJECTS_API_URL = "http://localhost:5000/api/projects";
const EMPLOYEES_API_URL = "http://localhost:5000/api/employees";

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

function normalizeTasks(item) {
  const projectObject = item?.project && typeof item.project === "object" ? item.project : null;
  const legacyAssigneeObject = item?.assignee && typeof item.assignee === "object" ? item.assignee : null;
  const populatedAssignees = Array.isArray(item?.assigneeIds) ? item.assigneeIds : [];
  const legacyId = item?.assigneeId ?? legacyAssigneeObject?._id ?? "";
  const assigneeIds = populatedAssignees.length
    ? populatedAssignees.map((employee) => String(typeof employee === "object" ? employee?._id ?? employee?.id ?? "" : employee)).filter(Boolean)
    : legacyId ? [String(legacyId)] : [];
  const assigneeNames = populatedAssignees.length
    ? populatedAssignees.map((employee) => typeof employee === "object" ? getEmployeeName(employee) : "").filter(Boolean)
    : [legacyAssigneeObject?.name ?? item?.assigneeName ?? (typeof item?.assignee === "string" ? item.assignee : "")].filter(Boolean);
  return {
    ...item,
    id: item.id ?? item._id,
    projectId: String(item.projectId ?? projectObject?._id ?? ""),
    assigneeIds,
    assigneeId: assigneeIds[0] || String(legacyId || ""),
    project: projectObject?.name ?? item.projectName ?? (typeof item.project === "string" ? item.project : ""),
    assignee: assigneeNames.join(", ") || (typeof item?.assignee === "string" ? item.assignee : ""),
  };
}

function getArrayResponse(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.projects)) return result.projects;
  if (Array.isArray(result?.employees)) return result.employees;
  return [];
}

function getRecordId(item) {
  return String(item?._id ?? item?.id ?? "");
}

function getProjectName(item) {
  return item?.name ?? item?.title ?? item?.projectName ?? "Unnamed project";
}

function getEmployeeName(item) {
  return item?.name ?? item?.fullName ?? item?.employeeName ?? "Unnamed employee";
}

const emptyForm = { title: "", projectId: "", assigneeIds: [], project: "", assignee: "", dueDate: "", priority: "Medium", status: "To Do" };

const priorityStyles = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-blue-50 text-blue-700",
};

const priorityDots = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-blue-500" };

const statusStyles = {
  "To Do": "bg-slate-100 text-slate-700",
  Pending: "bg-slate-100 text-slate-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  "On Hold": "bg-amber-50 text-amber-700",
};

const statusDots = { "To Do": "bg-slate-500", Pending: "bg-slate-500", "In Progress": "bg-violet-500", Completed: "bg-emerald-500", "On Hold": "bg-amber-500" };

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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const styles = {
    purple: { icon: "bg-violet-100/80 text-violet-600", chart: "text-violet-500" },
    green: { icon: "bg-emerald-100/80 text-emerald-600", chart: "text-emerald-500" },
    blue: { icon: "bg-blue-100/80 text-blue-600", chart: "text-blue-500" },
    orange: { icon: "bg-amber-100/80 text-amber-600", chart: "text-orange-500" },
  }[tone] || { icon: "bg-violet-100/80 text-violet-600", chart: "text-violet-500" };

  return (
    <div className="flex min-h-[116px] min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_3px_12px_rgba(28,42,78,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:gap-3.5 sm:px-4">
      <span className={`flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
        <Icon size={29} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-5 text-slate-600">{title}</p>
        <p className="mt-1 text-[28px] font-bold leading-8 tracking-tight text-slate-950">{value}</p>
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[11px] leading-4 text-slate-500 sm:text-xs">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600">↗</span>
          <span className="truncate">{detail}</span>
        </p>
      </div>
      <span aria-hidden="true" className={`hidden h-10 shrink-0 items-end gap-[3px] pb-0.5 sm:flex ${styles.chart}`}>
        {[10, 16, 22, 29, 36].map((height, index) => (
          <span key={height} className="w-[4px] rounded-t-sm bg-current" style={{ height: `${height}px`, opacity: 0.72 + index * 0.07 }} />
        ))}
      </span>
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

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [relatedDataLoading, setRelatedDataLoading] = useState(false);
  const [relatedDataError, setRelatedDataError] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [timelineTask, setTimelineTask] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState(["Projects"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function loadTasks() {
    setLoading(true);
    setApiError("");
    try {
      const result = await apiRequest();
      const items = Array.isArray(result) ? result : result.data || result.tasks || [];
      setTasks(items.map(normalizeTasks));
    } catch (error) {
      setApiError(error.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    let active = true;
    async function loadRelatedData() {
      setRelatedDataLoading(true);
      setRelatedDataError("");
      try {
        const [projectResponse, employeeResponse] = await Promise.all([
          fetch(PROJECTS_API_URL, { headers: getAuthHeaders() }),
          fetch(EMPLOYEES_API_URL, { headers: getAuthHeaders() }),
        ]);

        const [projectResult, employeeResult] = await Promise.all([
          projectResponse.json().catch(() => ({})),
          employeeResponse.json().catch(() => ({})),
        ]);

        if (!projectResponse.ok) throw new Error(projectResult.message || "Unable to load projects.");
        if (!employeeResponse.ok) throw new Error(employeeResult.message || "Unable to load employees.");

        if (active) {
          setProjects(getArrayResponse(projectResult));
          setEmployees(getArrayResponse(employeeResult));
        }
      } catch (error) {
        if (active) setRelatedDataError(error.message || "Unable to load projects and employees.");
      } finally {
        if (active) setRelatedDataLoading(false);
      }
    }
    loadRelatedData();
    return () => { active = false; };
  }, []);

  const filteredProjects = useMemo(() => {
    const term = projectSearch.trim().toLowerCase();
    return projects.filter((item) => getProjectName(item).toLowerCase().includes(term));
  }, [projects, projectSearch]);

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    return employees.filter((item) => {
      const label = `${getEmployeeName(item)} ${item.employeeId || ""} ${item.email || ""}`.toLowerCase();
      return label.includes(term);
    });
  }, [employees, employeeSearch]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = [task.title, task.project, task.assignee, task.priority, task.status].join(" ").toLowerCase().includes(term);
      return matchesSearch && (statusFilter === "All" || task.status === statusFilter || (statusFilter === "To Do" && task.status === "Pending")) && (priorityFilter === "All" || task.priority === priorityFilter);
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const pendingCount = tasks.filter((task) => task.status === "To Do" || task.status === "Pending").length;
  const inProgressCount = tasks.filter((task) => task.status === "In Progress").length;
  const completedCount = tasks.filter((task) => task.status === "Completed").length;
  const onHoldCount = tasks.filter((task) => task.status === "On Hold").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = tasks.filter((task) => task.status !== "Completed" && task.dueDate && task.dueDate < today).length;
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [search, statusFilter, priorityFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setProjectSearch("");
    setEmployeeSearch("");
    setProjectDropdownOpen(false);
    setEmployeeDropdownOpen(false);
    setShowForm(true);
  }

  function openEditForm(task) {
    setEditingId(task.id);
    setForm({
      ...emptyForm,
      ...task,
      projectId: String(task.projectId || projects.find((item) => getProjectName(item) === task.project)?._id || ""),
      assigneeIds: Array.isArray(task.assigneeIds) && task.assigneeIds.length
        ? task.assigneeIds.map(String)
        : task.assigneeId
          ? [String(task.assigneeId)]
          : employees.filter((item) => (task.assignee || "").split(", ").includes(getEmployeeName(item))).map(getRecordId),
    });
    setProjectSearch("");
    setEmployeeSearch("");
    setProjectDropdownOpen(false);
    setEmployeeDropdownOpen(false);
    setShowForm(true);
    setOpenMenuId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const selectedProject = projects.find((item) => getRecordId(item) === String(form.projectId));
    const selectedEmployees = employees.filter((item) => (form.assigneeIds || []).includes(getRecordId(item)));
    if (!form.projectId || !selectedProject) {
      setApiError("Please select a valid project.");
      return;
    }
    if (!selectedEmployees.length || selectedEmployees.length !== (form.assigneeIds || []).length) {
      setApiError("Please select at least one valid employee.");
      return;
    }
    const assigneeNames = selectedEmployees.map(getEmployeeName);
    const payload = {
      title: form.title.trim(),
      projectId: String(form.projectId),
      assigneeIds: selectedEmployees.map(getRecordId),
      // Legacy field retained temporarily for older records/clients.
      assigneeId: getRecordId(selectedEmployees[0]),
      project: getProjectName(selectedProject),
      assignee: assigneeNames.join(", "),
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
    };
    try {
      const result = editingId !== null
        ? await apiRequest(`/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiRequest("", { method: "POST", body: JSON.stringify(payload) });
      const saved = normalizeTasks(result.data || result.task || result);
      if (editingId !== null) setTasks((current) => current.map((task) => task.id === editingId ? saved : task));
      else setTasks((current) => [saved, ...current]);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setApiError("");
    } catch (error) {
      setApiError(error.message || "Unable to save task.");
    }
  }

  async function deleteTask(id) {
    try {
      setDeleting(true);
      await apiRequest(`/${id}`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== id));
      setOpenMenuId(null);
      setDeleteConfirmTask(null);
      if (detailsTask?.id === id) setDetailsTask(null);
      if (timelineTask?.id === id) setTimelineTask(null);
    } catch (error) {
      setApiError(error.message || "Unable to delete task.");
    } finally {
      setDeleting(false);
    }
  }

  async function changeStatus(id, status) {
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === status) return;
    try {
      const result = await apiRequest(`/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      const saved = normalizeTasks(result.data || result.task || result);
      setTasks((current) => current.map((item) => item.id === id ? saved : item));
    } catch (error) { setApiError(error.message || "Unable to update task status."); }
  }

  function toggleAssignee(employeeId) {
    setForm((current) => {
      const currentIds = current.assigneeIds || [];
      const nextIds = currentIds.includes(employeeId)
        ? currentIds.filter((id) => id !== employeeId)
        : [...currentIds, employeeId];
      return {
        ...current,
        assigneeIds: nextIds,
        assignee: employees.filter((item) => nextIds.includes(getRecordId(item))).map(getEmployeeName).join(", "),
      };
    });
  }

  function toggleGroup(label) {
    setExpandedGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  function exportCsv() {
    const headers = ["Task", "Project", "Assignee", "Due Date", "Priority", "Status"];
    const rows = filteredTasks.map((task) => [task.title, task.project, task.assignee, task.dueDate, task.priority, task.status]);
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "erp-tasks.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const avatarColors = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700", "bg-pink-100 text-pink-700"];
  const taskProgress = (task) => task.status === "Completed" ? 100 : task.status === "In Progress" ? 60 : task.status === "On Hold" ? 30 : Number(task.progress || 0);
  const taskStatusLabel = (task) => task.status === "Pending" || !task.status ? "To Do" : task.status;

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
                const active = child.label === "Tasks";
                const ChildIcon = child.label === "All Projects" ? BriefcaseBusiness : child.label === "Tasks" ? ListTodo : FileText;
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
          <div className="flex min-w-0 flex-1 items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button><div className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-slate-400 shadow-sm"><Search size={19} /><input aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /><span className="hidden items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 sm:flex">Ctrl <span className="text-slate-300">K</span></span></div></div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-6"><button type="button" aria-label="Notifications" onClick={() => window.alert(overdueCount ? `You have ${overdueCount} overdue task(s).` : "You're all caught up!")} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><Bell size={21} />{overdueCount > 0 && <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />}</button><button type="button" onClick={() => window.alert("Signed in as demo administrator.")} className="flex items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white">A</span><span className="hidden sm:block"><span className="block text-sm font-semibold text-slate-900">Admin</span><span className="mt-0.5 block text-xs text-slate-500">Administrator</span></span><ChevronDown size={16} className="hidden text-slate-500 sm:block" /></button></div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-8 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"><House size={14} /><span>ERP</span><ChevronRight size={14} /><span>Projects</span><ChevronRight size={14} /><span className="font-semibold text-violet-700">Tasks</span></div><h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[36px]">Task Management</h1><p className="mt-2 text-[15px] text-slate-500 sm:text-base">Create, assign and track tasks across all projects.</p></div><button type="button" onClick={openAddForm} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(109,40,217,0.22)] transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:self-auto"><Plus size={19} />New Task</button></div>

          <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total Tasks" value={tasks.length} detail="All task records" icon={ClipboardCheck} tone="purple" />
            <MetricCard title="To Do" value={pendingCount} detail="Waiting to start" icon={Clock3} tone="blue" />
            <MetricCard title="In Progress" value={inProgressCount} detail="Currently underway" icon={PlayCircle} tone="purple" />
            <MetricCard title="Completed" value={completedCount} detail="Tasks finished" icon={CheckCircle2} tone="green" />
            <MetricCard title="On Hold" value={onHoldCount} detail="Paused tasks" icon={PauseCircle} tone="orange" />
          </section>

          {overdueCount > 0 && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100"><AlertTriangle size={18} /></span><div><p className="font-semibold">{overdueCount} overdue task{overdueCount === 1 ? "" : "s"}</p><p className="mt-1 text-rose-700">Review the deadlines and update their status.</p></div></div>}

          {apiError && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{apiError}</span><button type="button" onClick={loadTasks} className="font-semibold underline">Retry</button></div>}
          {loading && <p className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading tasks from server...</p>}

          <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.045)]">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 p-5 sm:p-6 xl:flex-row xl:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ListTodo size={22} /></span><div><h2 className="text-[17px] font-bold tracking-tight text-slate-900">Task List</h2><p className="mt-1 text-sm text-slate-500">{filteredTasks.length} task(s) found · {inProgressCount} in progress</p></div></div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="flex h-12 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm sm:w-[270px]"><Search size={19} className="shrink-0 text-slate-500" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, projects..." className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-slate-400"><X size={16} /></button>}</div>
                <div className="relative"><button type="button" onClick={() => setShowFilter((value) => !value)} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${statusFilter !== "All" || priorityFilter !== "All" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}><Filter size={18} />Filter</button>{showFilter && <div className="absolute right-0 top-14 z-20 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"><option value="All">All statuses</option><option>To Do</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select><label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">Priority</label><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"><option value="All">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select><button type="button" onClick={() => { setStatusFilter("All"); setPriorityFilter("All"); setShowFilter(false); }} className="mt-3 w-full rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100">Clear filters</button></div>}</div>
                <button type="button" onClick={exportCsv} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Download size={18} />Export</button>
                <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white p-1"><button type="button" aria-label="List view" onClick={() => setViewMode("list")} className={`flex h-10 w-10 items-center justify-center rounded-lg ${viewMode === "list" ? "border border-violet-200 bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><ListTodo size={18} /></button><button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={`flex h-10 w-10 items-center justify-center rounded-lg ${viewMode === "grid" ? "border border-violet-200 bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}><Layers3 size={18} /></button></div>
              </div>
            </div>

            {viewMode === "list" ? <div className="overflow-x-auto"><table className="w-full min-w-[1180px] border-collapse text-left">
              <thead><tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-[0.055em] text-slate-500"><th className="px-5 py-4">#</th><th className="px-4 py-4">Task Title</th><th className="px-4 py-4">Project</th><th className="px-4 py-4">Assignee</th><th className="px-4 py-4">Due Date</th><th className="px-4 py-4">Priority</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Progress</th><th className="px-5 py-4 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pageTasks.map((task, index) => {
                  const isOverdue = task.status !== "Completed" && task.dueDate && task.dueDate < today;
                  const progress = taskProgress(task);
                  return <tr key={task.id} className="group transition-colors hover:bg-[#fbfaff]">
                    <td className="px-5 py-4 text-sm text-slate-500">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-4"><div className="flex min-w-[205px] items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${avatarColors[index % avatarColors.length]}`}><ClipboardCheck size={19} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{task.title}</span><span className="mt-1 block max-w-[230px] truncate text-xs text-slate-500">{task.description || `Task ID: #${String(task.id).slice(-5)}`}</span></span></div></td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600"><BriefcaseBusiness size={15} className="text-slate-400" />{task.project || "—"}</span></td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${avatarColors[index % avatarColors.length]}`}>{initials(task.assignee || "?")}</span>{task.assignee || "Unassigned"}</span></td>
                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 whitespace-nowrap text-sm ${isOverdue ? "font-semibold text-rose-600" : "text-slate-600"}`}><CalendarDays size={15} className={isOverdue ? "text-rose-500" : "text-slate-400"} />{formatDate(task.dueDate)}{isOverdue && <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase">Overdue</span>}</span></td>
                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${priorityStyles[task.priority] || "bg-slate-100 text-slate-700"}`}>{task.priority === "High" ? "↑ " : task.priority === "Low" ? "↓ " : ""}{task.priority}</span></td>
                    <td className="px-4 py-4"><select aria-label={`Status for ${task.title}`} value={task.status === "Pending" ? "To Do" : (task.status || "To Do")} onChange={(e) => changeStatus(task.id, e.target.value)} className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ring-0 ${statusStyles[task.status] || "bg-slate-100 text-slate-700"}`}><option>To Do</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></td>
                    <td className="px-4 py-4"><div className="w-[115px]"><div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-700"><span>{progress}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div></div></td>
                    <td className="px-5 py-4"><div className="flex items-center justify-center gap-2"><IconButton label={`View details for ${task.title}`} onClick={() => setDetailsTask(task)}><Eye size={16} /></IconButton><IconButton label={`Edit ${task.title}`} tone="purple" onClick={() => openEditForm(task)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${task.title}`} tone="red" onClick={() => setDeleteConfirmTask(task)}><Trash2 size={16} /></IconButton><div className="relative"><IconButton label={`More actions for ${task.title}`} onClick={(event) => { if (openMenuId === task.id) { setOpenMenuId(null); return; } const rect = event.currentTarget.getBoundingClientRect(); const menuHeight = 300; setMenuPosition({ top: rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 8) : rect.bottom + 8, left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)) }); setOpenMenuId(task.id); }}><MoreHorizontal size={18} /></IconButton></div></div></td>
                  </tr>;
                })}
                {pageTasks.length === 0 && <tr><td colSpan={9} className="px-5 py-16 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Search size={22} /></span><p className="mt-4 font-semibold text-slate-900">No tasks found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p><button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); setPriorityFilter("All"); }} className="mt-4 text-sm font-semibold text-violet-700">Clear filters</button></div></td></tr>}
              </tbody>
            </table></div> : <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{pageTasks.map((task, index) => <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${avatarColors[index % avatarColors.length]}`}><ClipboardCheck size={20} /></span><div className="flex gap-2"><IconButton label="View details" onClick={() => setDetailsTask(task)}><Eye size={16} /></IconButton><IconButton label="Edit task" tone="purple" onClick={() => openEditForm(task)}><Pencil size={16} /></IconButton><IconButton label="Delete task" tone="red" onClick={() => setDeleteConfirmTask(task)}><Trash2 size={16} /></IconButton></div></div><h3 className="mt-4 font-bold text-slate-900">{task.title}</h3><p className="mt-1 text-sm text-slate-500">{task.project || "No project"}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${priorityStyles[task.priority]}`}>{task.priority} Priority</span><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[task.status]}`}>{taskStatusLabel(task)}</span></div><div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{task.assignee || "Unassigned"}</span><span>{formatDate(task.dueDate)}</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${taskProgress(task)}%` }} /></div><div className="mt-1 text-right text-xs text-slate-500">{taskProgress(task)}% complete</div><button type="button" onClick={() => setTimelineTask(task)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><CalendarClock size={16} />View Timeline</button></article>)}{pageTasks.length === 0 && <p className="col-span-full py-12 text-center text-sm text-slate-500">No tasks found.</p>}</div>}
            <div className="flex flex-col justify-between gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><p className="text-sm text-slate-500">{filteredTasks.length === 0 ? "Showing 0 tasks" : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredTasks.length)} of ${filteredTasks.length} tasks`}</p><div className="flex items-center justify-end gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={18} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map((number) => <button key={number} type="button" onClick={() => setPage(number)} className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold ${number === currentPage ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{number}</button>)}<button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="Next page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={18} /></button></div></div>
          </section>
        </main>
      </div>

      {openMenuId !== null && (() => { const menuTask = tasks.find((item) => item.id === openMenuId); if (!menuTask) return null; return createPortal(<><button aria-label="Close task actions" className="fixed inset-0 z-[90] cursor-default" onClick={() => setOpenMenuId(null)} /><div style={{ top: menuPosition.top, left: menuPosition.left }} className="fixed z-[100] w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_15px_40px_rgba(20,30,60,.18)]"><button type="button" onClick={() => { setDetailsTask(menuTask); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><Eye size={16} />View Details</button><button type="button" onClick={() => { openEditForm(menuTask); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><Pencil size={16} />Edit Task</button><button type="button" onClick={() => { setTimelineTask(menuTask); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><CalendarClock size={16} />View Timeline</button><button type="button" onClick={() => { changeStatus(menuTask.id, "To Do"); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><Clock3 size={16} />Mark To Do</button><button type="button" onClick={() => { changeStatus(menuTask.id, "In Progress"); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><PlayCircle size={16} />Mark In Progress</button><button type="button" onClick={() => { changeStatus(menuTask.id, "Completed"); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50"><CheckCircle2 size={16} />Mark Completed</button><button type="button" onClick={() => { setDeleteConfirmTask(menuTask); setOpenMenuId(null); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"><Trash2 size={16} />Delete Task</button></div></>, document.body); })()}

      {deleteConfirmTask && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteConfirmTask(null); }}><section role="dialog" aria-modal="true" aria-labelledby="delete-task-title" className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={22} /></span><div><h2 id="delete-task-title" className="font-bold text-slate-900">Delete Task</h2><p className="mt-1 text-xs text-slate-500">Are you sure you want to delete this task?</p></div></div><button type="button" disabled={deleting} onClick={() => setDeleteConfirmTask(null)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={18} /></button></div><div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={28} /></div><p className="mt-4 text-center text-sm leading-5 text-slate-600">This action cannot be undone. All task data and associated information will be permanently removed.</p><div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/80 p-3 text-sm leading-6 text-slate-600"><p><span className="font-semibold text-slate-700">Task Title:</span> {deleteConfirmTask.title || "—"}</p><p><span className="font-semibold text-slate-700">Project:</span> {deleteConfirmTask.project || "—"}</p><p><span className="font-semibold text-slate-700">Assignee:</span> {deleteConfirmTask.assignee || "—"}</p><p><span className="font-semibold text-slate-700">Due Date:</span> {formatDate(deleteConfirmTask.dueDate)}</p><p><span className="font-semibold text-slate-700">Priority:</span> {deleteConfirmTask.priority || "—"}</p><p><span className="font-semibold text-slate-700">Status:</span> {taskStatusLabel(deleteConfirmTask)}</p><p><span className="font-semibold text-slate-700">Progress:</span> {taskProgress(deleteConfirmTask)}%</p></div><div className="mt-5 flex gap-3"><button type="button" disabled={deleting} onClick={() => setDeleteConfirmTask(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" disabled={deleting} onClick={() => deleteTask(deleteConfirmTask.id)} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? "Deleting..." : "Delete Task"}</button></div></section></div>}

      {detailsTask && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget) setDetailsTask(null); }}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Eye size={22} /></span><div><h2 className="font-bold text-slate-900">Task Details</h2><p className="mt-1 text-xs text-slate-500">View complete task information.</p></div></div><button type="button" onClick={() => setDetailsTask(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ClipboardCheck size={20} /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{detailsTask.title}</p><p className="text-xs text-slate-500">{detailsTask.project || "No project"}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[detailsTask.status] || "bg-slate-100 text-slate-700"}`}>{taskStatusLabel(detailsTask)}</span></div><div className="mt-4 space-y-3 text-sm">{[["Assignee", detailsTask.assignee || "Unassigned"], ["Due Date", formatDate(detailsTask.dueDate)], ["Priority", detailsTask.priority || "—"], ["Status", taskStatusLabel(detailsTask)], ["Progress", `${taskProgress(detailsTask)}%`], ["Task ID", String(detailsTask.id)], ["Description", detailsTask.description || "No description added."]].map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-3"><span className="font-semibold text-slate-700">{label}</span><span className="break-words text-slate-600">{value}</span></div>)}</div><div className="mt-5 flex gap-3"><button type="button" onClick={() => { const task = detailsTask; setDetailsTask(null); openEditForm(task); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"><Pencil size={16} />Edit Task</button><button type="button" onClick={() => setDetailsTask(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></div></section></div>}

      {timelineTask && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget) setTimelineTask(null); }}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarClock size={22} /></span><div><h2 className="font-bold text-slate-900">Task Timeline</h2><p className="mt-1 text-xs text-slate-500">Timeline overview based on saved task details.</p></div></div><button type="button" onClick={() => setTimelineTask(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><h3 className="mt-5 font-semibold text-slate-900">{timelineTask.title}</h3><p className="mt-1 text-sm text-slate-500">{timelineTask.project || "No project assigned"}</p><div className="mt-6 space-y-5 border-l-2 border-violet-100 pl-5"><div className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-violet-600 ring-2 ring-violet-100"/><p className="text-sm font-semibold text-slate-800">Task created / recorded</p><p className="mt-1 text-xs text-slate-500">Creation timestamp is not provided by the task API.</p></div><div className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-100"/><p className="text-sm font-semibold text-slate-800">Assigned to {timelineTask.assignee || "no assignee"}</p><p className="mt-1 text-xs text-slate-500">Current assignment</p></div><div className="relative"><span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${timelineTask.status === "Completed" ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-amber-500 ring-2 ring-amber-100"}`}/><p className="text-sm font-semibold text-slate-800">Status: {taskStatusLabel(timelineTask)}</p><p className="mt-1 text-xs text-slate-500">Due date: {formatDate(timelineTask.dueDate)}</p></div></div><div className="mt-5"><div className="flex justify-between text-sm"><span className="font-medium text-slate-700">Progress</span><span className="font-semibold text-violet-700">{taskProgress(timelineTask)}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${taskProgress(timelineTask)}%` }}/></div></div><button type="button" onClick={() => setTimelineTask(null)} className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></section></div>}

      {showForm && <div onClick={(event) => { if (event.target === event.currentTarget) { setProjectDropdownOpen(false); setEmployeeDropdownOpen(false); } }} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px] sm:items-center"><form onClick={(event) => { if (!event.target.closest("#task-project-search, #task-employee-search, [data-task-dropdown]")) { setProjectDropdownOpen(false); setEmployeeDropdownOpen(false); } }} onSubmit={handleSubmit} className="my-4 w-full max-w-3xl overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:my-auto sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><ListTodo size={22} /></span><h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{editingId !== null ? "Edit Task" : "Create New Task"}</h2><p className="mt-1 text-sm text-slate-500">Add task details, assign ownership and set a deadline.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
          {relatedDataError && <p role="alert" className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{relatedDataError}</p>}
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Task Title <span className="text-rose-500">*</span></span><input required value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Enter task title" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <div data-task-dropdown="project" className="relative">
            <label htmlFor="task-project-search" className="mb-1.5 block text-sm font-medium text-slate-700">Project <span className="text-rose-500">*</span></label>
            <input id="task-project-search" value={projectSearch || (form.projectId ? getProjectName(projects.find((item) => getRecordId(item) === String(form.projectId)) || { name: form.project }) : "")} onFocus={() => { setProjectDropdownOpen(true); setEmployeeDropdownOpen(false); }} onClick={() => { setProjectDropdownOpen(true); setEmployeeDropdownOpen(false); }} onChange={(e) => { setProjectSearch(e.target.value); setProjectDropdownOpen(true); setForm((current) => ({ ...current, projectId: "", project: "" })); }} placeholder={relatedDataLoading ? "Loading projects..." : "Search projects..."} disabled={relatedDataLoading} autoComplete="off" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50" />
            {projectDropdownOpen && <div data-task-dropdown="project" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {relatedDataLoading ? <p className="p-3 text-sm text-slate-500">Loading projects...</p> : filteredProjects.length ? filteredProjects.map((item) => <button key={getRecordId(item)} type="button" onClick={() => { setForm((current) => ({ ...current, projectId: getRecordId(item), project: getProjectName(item) })); setProjectSearch(""); setProjectDropdownOpen(false); }} className="block w-full border-b border-slate-100 px-3.5 py-2.5 text-left text-sm hover:bg-violet-50">{getProjectName(item)}</button>) : <p className="p-3 text-sm text-slate-500">No projects found.</p>}
            </div>}
            {form.projectId && <button type="button" onClick={() => { setForm((current) => ({ ...current, projectId: "", project: "" })); setProjectSearch(""); }} className="mt-1 text-xs font-medium text-violet-700">Clear selection</button>}
          </div>
          <div data-task-dropdown="employee" className="relative min-w-0">
            <label htmlFor="task-employee-search" className="mb-1.5 block text-sm font-medium text-slate-700">Assignees <span className="text-rose-500">*</span></label>
            <div
              className={`flex min-h-[50px] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white px-3 py-2 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100 ${employeeDropdownOpen ? "border-violet-500" : "border-slate-300"} ${relatedDataLoading ? "bg-slate-50" : ""}`}
              onClick={() => {
                if (!relatedDataLoading) {
                  setEmployeeDropdownOpen(true);
                  setProjectDropdownOpen(false);
                  document.getElementById("task-employee-search")?.focus();
                }
              }}
            >
              {employees.filter((item) => (form.assigneeIds || []).includes(getRecordId(item))).map((item) => (
                <span key={getRecordId(item)} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                  <span className="max-w-[120px] truncate">{getEmployeeName(item)}</span>
                  <button type="button" aria-label={`Remove ${getEmployeeName(item)}`} onClick={(event) => { event.stopPropagation(); toggleAssignee(getRecordId(item)); }} className="shrink-0 rounded-full hover:text-violet-950"><X size={13} /></button>
                </span>
              ))}
              <input
                id="task-employee-search"
                value={employeeSearch}
                onFocus={() => { setEmployeeDropdownOpen(true); setProjectDropdownOpen(false); }}
                onClick={(event) => { event.stopPropagation(); setEmployeeDropdownOpen(true); setProjectDropdownOpen(false); }}
                onChange={(e) => { setEmployeeSearch(e.target.value); setEmployeeDropdownOpen(true); }}
                placeholder={(form.assigneeIds || []).length ? "Add more..." : relatedDataLoading ? "Loading employees..." : "Search and select employees..."}
                disabled={relatedDataLoading}
                autoComplete="off"
                className="min-w-[90px] flex-1 border-0 bg-transparent px-0 py-1 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:bg-transparent"
              />
            </div>
            {employeeDropdownOpen && <div data-task-dropdown="employee" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {relatedDataLoading ? <p className="p-3 text-sm text-slate-500">Loading employees...</p> : filteredEmployees.length ? filteredEmployees.map((item) => {
                const employeeId = getRecordId(item);
                const selected = (form.assigneeIds || []).includes(employeeId);
                return (
                  <button key={employeeId} type="button" onClick={() => toggleAssignee(employeeId)} className={`flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 text-left text-sm ${selected ? "bg-violet-50" : "hover:bg-violet-50"}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"}`}>{selected && <Check size={12} />}</span>
                    <span className="min-w-0 flex-1"><span className="block">{getEmployeeName(item)}</span><span className="text-xs text-slate-400">{item.employeeId || item.email || ""}</span></span>
                  </button>
                );
              }) : <p className="p-3 text-sm text-slate-500">No employees found.</p>}
              {(form.assigneeIds || []).length > 0 && <button type="button" onClick={() => setForm((current) => ({ ...current, assigneeIds: [], assignee: "" }))} className="w-full border-t border-slate-100 px-3.5 py-2.5 text-left text-xs font-semibold text-violet-700 hover:bg-violet-50">Clear all selections</button>}
            </div>}
            {(form.assigneeIds || []).length === 0 && <p className="mt-2 text-xs leading-5 text-slate-500">Search and select one or more employees.</p>}
          </div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</span><input type="date" value={form.dueDate} onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Priority</span><select value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option>To Do</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></label>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100">{editingId !== null ? "Save Changes" : "Create Task"}</button></div>
      </form></div>}
    </div>
  );
}

export default Tasks;
