import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  ChevronRight, ChevronUp, Clock3, ContactRound, Download, FileBarChart,
  FileText, Filter, House, Layers3, LayoutDashboard, Menu, Plus, Search,
  Settings, Trash2, UsersRound, X, Zap, ArrowRight, UserCheck, UserX,
  CalendarOff, ClipboardList, Pencil, CheckCircle2, XCircle
} from "lucide-react";

const API_URL = "http://localhost:5000/api/leave-requests";
const EMPLOYEES_API_URL = "http://localhost:5000/api/employees";
const departments = ["Engineering", "HR", "Finance", "Marketing", "Sales", "Operations"];
const leaveTypes = ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave"];
const emptyForm = { name: "", department: "Engineering", leaveType: "Casual Leave", fromDate: "", toDate: "", reason: "" };
const statusStyles = { Pending: "bg-amber-50 text-amber-700", Approved: "bg-emerald-50 text-emerald-700", Rejected: "bg-rose-50 text-rose-700" };
const navGroups = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "CRM", icon: ContactRound, children: [{ label: "Clients", href: "/crm/clients" }, { label: "Leads", href: "/crm/leads" }, { label: "Contacts", href: "/crm/contacts" }] },
  { label: "Projects", icon: BriefcaseBusiness, children: [{ label: "All Projects", href: "/projects" }, { label: "Tasks", href: "/tasks" }, { label: "Proposals", href: "/proposals" }] },
  { label: "HRMS", icon: UsersRound, children: [{ label: "Employees", href: "/employees" }, { label: "Attendance", href: "/attendance" }, { label: "Leave Requests", href: "/leave-requests" }] },
  { label: "Finance", icon: FileText, children: [{ label: "Invoices", href: "/invoices" }, { label: "Expenses", href: "/expenses" }, { label: "Payments", href: "/payments" }] },
  { label: "Assets", icon: Layers3, children: [{ label: "All Assets", href: "/assets" }, { label: "Assignments", href: "/assignments" }] },
  { label: "Reports", icon: FileBarChart, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
function formatDate(value) { if (!value) return "—"; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function getDays(fromDate, toDate) { const start = new Date(`${fromDate}T00:00:00`); const end = new Date(`${toDate}T00:00:00`); return Math.round((end - start) / 86400000) + 1; }
function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const style = { purple: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", orange: "bg-amber-50 text-amber-600" }[tone];
  return <div className="flex min-h-[132px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_16px_rgba(28,42,78,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"><span className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl ${style}`}><Icon size={28} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-600">{title}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div></div>;
}
export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef(null);

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
    async function loadRequests() {
      try {
        const result = await apiRequest();
        if (active) setRequests((result.data || []).map((item) => ({ ...item, id: item._id || item.id })));
      } catch (error) {
        if (active) window.alert(`Could not load leave requests: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadEmployees() {
      try {
        const token = sessionStorage.getItem("erp-token");
        const response = await fetch(EMPLOYEES_API_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Could not load employees");
        const list = Array.isArray(result) ? result : (result.data || result.employees || []);
        if (active) setEmployees(list.map((employee) => ({
          ...employee,
          id: employee._id || employee.id,
          displayName: employee.name || employee.fullName || employee.employeeName || employee.email || "Unnamed employee",
          displayDepartment: employee.department || employee.departmentName || "Unassigned",
          displayCode: employee.employeeId || employee.empId || employee.code || "",
        })));
      } catch (error) {
        console.error("Load employees error:", error);
        if (active) setEmployees([]);
      }
    }
    loadRequests();
    loadEmployees();
    return () => { active = false; };
  }, []);
  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [employee.displayName, employee.displayDepartment, employee.displayCode, employee.email]
        .filter(Boolean).join(" ").toLowerCase().includes(query)
    );
  }, [employees, employeeSearch]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setEmployeeDropdownOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") setEmployeeDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState(["HRMS"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const filteredRequests = useMemo(() => requests.filter((request) => [request.name, request.department, request.reason, request.leaveType].join(" ").toLowerCase().includes(search.trim().toLowerCase()) && (statusFilter === "All" || request.status === statusFilter) && (typeFilter === "All" || request.leaveType === typeFilter)), [requests, search, statusFilter, typeFilter]);
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const approvedCount = requests.filter((r) => r.status === "Approved").length;
  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function addRequest(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.department.trim()) {
      window.alert("Please select an employee from the dropdown.");
      return;
    }
    if (form.toDate < form.fromDate) {
      window.alert("End date cannot be earlier than start date.");
      return;
    }
    try {
      const result = await apiRequest("", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const created = { ...result.data, id: result.data._id || result.data.id };
      setRequests((current) => [created, ...current]);
      setForm(emptyForm);
      setEmployeeSearch("");
      setEmployeeDropdownOpen(false);
      setShowForm(false);
      window.alert("Leave request saved successfully.");
    } catch (error) {
      window.alert(`Could not save leave request: ${error.message}`);
    }
  }

  async function updateStatus(id, status) {
    try {
      const result = await apiRequest(`/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      const updated = { ...result.data, id: result.data._id || result.data.id };
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
    } catch (error) {
      window.alert(`Could not update leave request: ${error.message}`);
    }
  }

  async function deleteRequest(id) {
    const request = requests.find((r) => r.id === id);
    if (!window.confirm(`Delete leave request from ${request?.name || "this employee"}?`)) return;
    try {
      await apiRequest(`/${id}`, { method: "DELETE" });
      setRequests((current) => current.filter((r) => r.id !== id));
    } catch (error) {
      window.alert(`Could not delete leave request: ${error.message}`);
    }
  }

  function toggleGroup(label) { setExpandedGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]); }
  function exportCsv() {
    const headers = ["Employee", "Department", "Leave Type", "From Date", "To Date", "Days", "Reason", "Status"];
    const rows = filteredRequests.map((r) => [r.name, r.department, r.leaveType, r.fromDate, r.toDate, getDays(r.fromDate, r.toDate), r.reason, r.status]);
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["\uFEFF", [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "erp-leave-requests.csv"; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="min-h-screen bg-[#f7f8fc] text-[#172033]">
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-white/5 bg-[#151a30] text-slate-200 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <a href="/" className="flex h-[78px] shrink-0 items-center gap-3 px-7 text-white"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600"><Layers3 size={23} /></span><span className="text-[19px] font-bold tracking-tight">ERP System</span></a>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">{navGroups.map((group) => { const Icon = group.icon; const expanded = expandedGroups.includes(group.label); if (group.children) return <div key={group.label}><button onClick={() => toggleGroup(group.label)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium ${group.label === "HRMS" ? "bg-white/[0.035] text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><Icon size={20} /><span className="flex-1">{group.label}</span>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{expanded && <div className="mt-1 space-y-1">{group.children.map((child) => { const active = child.label === "Leave Requests"; const ChildIcon = child.label === "Employees" ? UsersRound : child.label === "Attendance" ? CalendarDays : CalendarOff; return <a key={child.label} href={child.href} className={`flex items-center gap-3 rounded-xl px-7 py-3 text-[13px] ${active ? "bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white shadow-md" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><ChildIcon size={17} />{child.label}</a>; })}</div>}</div>; return <a key={group.label} href={group.href} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"><Icon size={20} />{group.label}</a>; })}</nav>
      <div className="m-3 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200"><Zap size={17} /></span>Upgrade to Pro</div><p className="mt-3 text-xs leading-5 text-slate-300">Unlock advanced features for your business.</p><button onClick={() => window.alert("Upgrade options can be connected here later.")} className="mt-3 flex w-full items-center justify-between text-xs font-semibold text-slate-100">Explore plans <ArrowRight size={15} /></button></div>
    </aside>
    <div className="min-h-screen lg:pl-[264px]">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-7 lg:px-8"><div className="flex min-w-0 flex-1 items-center gap-3"><button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button><div className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-slate-400"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /></div></div><div className="flex shrink-0 items-center gap-4 sm:gap-6"><button aria-label="Notifications" onClick={() => window.alert(`${pendingCount} leave request(s) pending review.`)} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><Bell size={21} />{pendingCount > 0 && <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />}</button><button onClick={() => window.alert("Signed in as demo administrator.")} className="flex items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white">A</span><span className="hidden sm:block"><span className="block text-sm font-semibold text-slate-900">Admin</span><span className="mt-0.5 block text-xs text-slate-500">Administrator</span></span><ChevronDown size={16} className="hidden text-slate-500 sm:block" /></button></div></header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-8 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"><House size={14} />ERP <ChevronRight size={14} />HRMS <ChevronRight size={14} /><span className="font-semibold text-violet-700">Leave Requests</span></div><h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[36px]">Leave Requests</h1><p className="mt-2 text-[15px] text-slate-500 sm:text-base">Review employee leave applications and manage approvals.</p></div><button onClick={() => { setForm(emptyForm); setEmployeeSearch(""); setEmployeeDropdownOpen(false); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200/70 transition hover:bg-violet-700 sm:self-auto"><Plus size={19} />Apply for Leave</button></div>
        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard title="Total Requests" value={requests.length} detail="All leave applications" icon={ClipboardList} tone="purple" /><MetricCard title="Pending Requests" value={pendingCount} detail="Waiting for review" icon={Clock3} tone="orange" /><MetricCard title="Approved" value={approvedCount} detail="Leave approved" icon={UserCheck} tone="green" /><MetricCard title="Rejected" value={rejectedCount} detail="Requests declined" icon={UserX} tone="blue" /></section>
        <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.045)]">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 p-5 sm:p-6 xl:flex-row xl:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><CalendarOff size={22} /></span><div><h2 className="text-[17px] font-bold text-slate-900">All Leave Requests</h2><p className="mt-1 text-sm text-slate-500">{filteredRequests.length} request(s) found</p></div></div><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-3.5 sm:w-[245px]"><Search size={18} className="text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or reason..." className="min-w-0 w-full bg-transparent text-sm outline-none" /></div><div className="relative"><button onClick={() => setShowFilter((v) => !v)} className={`inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${statusFilter !== "All" || typeFilter !== "All" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><Filter size={17} />Filter</button>{showFilter && <div className="absolute right-0 top-14 z-20 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">Leave type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>All</option>{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select><button onClick={() => { setStatusFilter("All"); setTypeFilter("All"); setShowFilter(false); }} className="mt-3 w-full rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">Clear filters</button></div>}</div><button onClick={() => { setSearch(""); setStatusFilter("All"); setTypeFilter("All"); }} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><X size={16} />Clear</button><button onClick={exportCsv} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={17} />Export</button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1050px] border-collapse text-left"><thead><tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-wide text-slate-500">{["Employee", "Leave Type", "Duration", "Days", "Reason", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">Loading leave requests...</td></tr> : filteredRequests.length > 0 ? filteredRequests.map((request, index) => <tr key={request.id} className="transition hover:bg-[#fbfaff]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700"][index % 4]}`}>{initials(request.name)}</span><span><span className="block text-sm font-semibold text-slate-900">{request.name}</span><span className="mt-1 block text-xs text-slate-500">{request.department}</span></span></div></td><td className="px-5 py-4 text-sm text-slate-600">{request.leaveType}</td><td className="px-5 py-4"><span className="block whitespace-nowrap text-sm text-slate-700">{formatDate(request.fromDate)}</span><span className="my-1 block text-xs text-slate-400">to</span><span className="block whitespace-nowrap text-sm text-slate-700">{formatDate(request.toDate)}</span></td><td className="px-5 py-4"><span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">{getDays(request.fromDate, request.toDate)}</span></td><td className="max-w-[210px] px-5 py-4 text-sm text-slate-600"><span className="line-clamp-2">{request.reason}</span></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[request.status] || "bg-slate-100 text-slate-700"}`}><span className={`h-2 w-2 rounded-full ${request.status === "Pending" ? "bg-amber-500" : request.status === "Approved" ? "bg-emerald-500" : "bg-rose-500"}`} />{request.status}</span></td><td className="px-5 py-4"><div className="flex items-center gap-2">{request.status === "Pending" && <><button title="Approve request" onClick={() => updateStatus(request.id, "Approved")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Check size={16} /></button><button title="Reject request" onClick={() => updateStatus(request.id, "Rejected")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"><X size={16} /></button></>}<button title="Delete request" onClick={() => deleteRequest(request.id)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Trash2 size={16} /></button></div></td></tr>) : <tr><td colSpan={7} className="px-5 py-16 text-center"><Search size={24} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-900">No leave requests found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p><button onClick={() => { setSearch(""); setStatusFilter("All"); setTypeFilter("All"); }} className="mt-3 text-sm font-semibold text-violet-700">Clear filters</button></td></tr>}</tbody></table></div>
          <div className="border-t border-slate-200/80 px-5 py-4 text-sm text-slate-500">Showing {filteredRequests.length} of {requests.length} leave requests</div>
        </section>
      </main>
    </div>
    {showForm && <div onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"><form onSubmit={addRequest} className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><CalendarOff size={22} /></span><h2 className="mt-4 text-xl font-bold text-slate-900">Apply for Leave</h2><p className="mt-1 text-sm text-slate-500">Submit a leave request for review.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="relative text-sm font-medium text-slate-700" ref={employeeDropdownRef}>
<label htmlFor="leave-employee-search">Employee Name</label>
<div className="relative mt-1.5">
<input id="leave-employee-search" required autoComplete="off" value={employeeDropdownOpen ? employeeSearch : form.name}
  onFocus={() => { setEmployeeSearch(""); setEmployeeDropdownOpen(true); }}
  onChange={(event) => { setEmployeeSearch(event.target.value); setEmployeeDropdownOpen(true); setForm((current) => ({ ...current, name: "", department: "" })); }}
  placeholder="Search employees..." className="w-full rounded-xl border border-slate-300 px-3.5 py-3 pr-10 text-sm font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" aria-expanded={employeeDropdownOpen} aria-controls="leave-employee-options" />
<button type="button" aria-label="Toggle employee list" onClick={() => setEmployeeDropdownOpen((open) => !open)} className="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400"><ChevronDown size={17} /></button>
</div>
{employeeDropdownOpen && <div id="leave-employee-options" className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
{filteredEmployees.length ? filteredEmployees.map((employee) => <button type="button" key={employee.id || employee.email || employee.displayName} onClick={() => { setForm((current) => ({ ...current, name: employee.displayName, department: employee.displayDepartment === "Unassigned" ? "" : employee.displayDepartment })); setEmployeeSearch(""); setEmployeeDropdownOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-violet-50"><span><span className="block text-sm font-medium text-slate-800">{employee.displayName}</span><span className="mt-0.5 block text-xs text-slate-500">{[employee.displayCode, employee.displayDepartment, employee.email].filter(Boolean).join(" · ")}</span></span>{form.name === employee.displayName && <Check size={16} className="text-violet-600" />}</button>) : <p className="px-3 py-4 text-center text-sm font-normal text-slate-500">No employees found.</p>}
</div>}
</div><label className="text-sm font-medium text-slate-700">Department<select name="department" value={form.department} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option value="">Select employee first</option>{[...new Set([...departments, form.department].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Leave Type<select name="leaveType" value={form.leaveType} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100">{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Start Date<input required type="date" name="fromDate" value={form.fromDate} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700">End Date<input required type="date" name="toDate" min={form.fromDate || undefined} value={form.toDate} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Reason<textarea required name="reason" value={form.reason} onChange={updateField} rows={3} placeholder="Explain the reason for leave" className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label></div><div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700">Submit Request</button></div></form></div>}
  </div>;
}
