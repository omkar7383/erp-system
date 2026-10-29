import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import EmployeePanel from "./pages/EmployeePanel";
import ClientPanel from "./pages/ClientPanel";
import {
  LayoutDashboard,
  UsersRound,
  BriefcaseBusiness,
  UserRound,
  ReceiptText,
  Boxes,
  ChartNoAxesColumn,
  Settings as SettingsIcon,
  ChevronRight,
  Search,
  CalendarDays,
  TrendingUp,
  Wallet,
  Package,
  Activity,
  CheckCircle2,
  Zap,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Cuboid,
  LogOut,
  Mail,
  X,
  ChevronDown,
  Ticket,
  MessageSquare,
  RefreshCw,
  UserCheck,
  Clock3,
  AlertCircle,
} from "lucide-react";

import CRM from "./pages/CRM";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Proposals from "./pages/Proposals";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import LeaveRequests from "./pages/LeaveRequests";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Payments from "./pages/Payments";
import Assets from "./pages/Assets";
import Assignments from "./pages/Assignments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import HRDocuments from "./pages/HRDocuments";
import NotificationBell from "./components/NotificationBell";
import { disconnectSocket } from "./utils/socket";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  {
    name: "CRM",
    icon: UsersRound,
    children: ["Clients", "Leads", "Contacts"],
  },
  {
    name: "Projects",
    icon: BriefcaseBusiness,
    children: ["All Projects", "Tasks", "Proposals"],
  },
  {
    name: "HRMS",
    icon: UserRound,
    children: ["Employees", "Attendance", "Leave Requests", "HR Documents"],
  },
  {
    name: "Finance",
    icon: ReceiptText,
    children: ["Invoices", "Expenses", "Payments"],
  },
  {
    name: "Assets",
    icon: Boxes,
    children: ["All Assets", "Assignments"],
  },
  { name: "Support Tickets", icon: Ticket },
  { name: "Help & Feedback", icon: MessageSquare },
  { name: "Reports", icon: ChartNoAxesColumn },
  { name: "Settings", icon: SettingsIcon },
];

const activities = [
  {
    title: "New employee added",
    module: "HRMS",
    user: "Admin",
    time: "10:30 AM",
    icon: UsersRound,
    tone: "violet",
  },
  {
    title: "Project status updated",
    module: "Projects",
    user: "Rahul",
    time: "09:15 AM",
    icon: BriefcaseBusiness,
    tone: "green",
  },
  {
    title: "New invoice created",
    module: "Finance",
    user: "Admin",
    time: "Yesterday",
    icon: Wallet,
    tone: "orange",
  },
  {
    title: "Asset assigned to employee",
    module: "Assets",
    user: "Sneha",
    time: "Yesterday",
    icon: Package,
    tone: "blue",
  },
];

const tasks = [
  { title: "Prepare monthly report", date: "Today" },
  { title: "Client meeting - ABC Corp", date: "Tomorrow" },
  { title: "Update employee records", date: "22 Oct" },
  { title: "Review project progress", date: "23 Oct" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STORAGE_KEYS = {
  employees: "erp-employees",
  projects: "erp-projects",
  invoices: "erp-invoices",
  assets: "erp-assets",
};

function readRecords(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function recordAmount(record) {
  const raw =
    record.amount ??
    record.total ??
    record.value ??
    record.cost ??
    0;

  const amount = Number(String(raw).replace(/[₹,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getRecordDate(record) {
  const raw =
    record.createdAt ??
    record.created_at ??
    record.createdOn ??
    record.created_on ??
    record.dateAdded ??
    record.addedDate ??
    record.joiningDate ??
    record.startDate ??
    record.invoiceDate ??
    record.issueDate ??
    record.date ??
    record.createdAtDate;

  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function isOnOrBefore(record, asOfDate) {
  const recordDate = getRecordDate(record);
  return !recordDate || recordDate <= asOfDate;
}

function readDashboardData(asOfDate, mode = "day") {
  const allEmployees = readRecords(STORAGE_KEYS.employees);
  const allProjects = readRecords(STORAGE_KEYS.projects);
  const allInvoices = readRecords(STORAGE_KEYS.invoices);
  const allAssets = readRecords(STORAGE_KEYS.assets);

  // Overall mode shows all saved records. Day-wise mode shows only records
  // whose saved date matches the selected calendar date.
  const employees = mode === "overall"
    ? allEmployees
    : allEmployees.filter((record) => getRecordDate(record) === asOfDate);
  const projects = mode === "overall"
    ? allProjects
    : allProjects.filter((record) => getRecordDate(record) === asOfDate);
  const invoices = allInvoices;
  const assets = mode === "overall"
    ? allAssets
    : allAssets.filter((record) => getRecordDate(record) === asOfDate);

  const projectStatus = {
    completed: 0,
    inProgress: 0,
    onHold: 0,
    notStarted: 0,
  };

  projects.forEach((project) => {
    const status = String(
      project.status ?? project.projectStatus ?? project.stage ?? ""
    )
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim();

    if (status.includes("complete") || status === "done") {
      projectStatus.completed += 1;
    } else if (
      status.includes("progress") ||
      status === "active" ||
      status === "ongoing"
    ) {
      projectStatus.inProgress += 1;
    } else if (status.includes("hold") || status.includes("paused")) {
      projectStatus.onHold += 1;
    } else if (
      status.includes("not started") ||
      status.includes("pending") ||
      status === "new" ||
      !status
    ) {
      projectStatus.notStarted += 1;
    } else {
      projectStatus.inProgress += 1;
    }
  });

  const selected = new Date(`${asOfDate}T12:00:00`);
  const selectedYear = selected.getFullYear();
  const monthlyRevenue = Array(12).fill(0);
  let revenueTotal = mode === "overall"
    ? invoices.reduce((sum, invoice) => sum + recordAmount(invoice), 0)
    : 0;

  invoices.forEach((invoice) => {
    const rawDate =
      invoice.issueDate ??
      invoice.invoiceDate ??
      invoice.date ??
      invoice.createdAt ??
      invoice.created_on ??
      invoice.created_at;

    // Overall revenue includes every saved invoice, even if an older invoice
    // has no date. Date-less invoices are simply omitted from the monthly chart.
    if (!rawDate) return;

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;

    const isoDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (mode === "day") {
      if (isoDate !== asOfDate) return;
      revenueTotal += recordAmount(invoice);
    }

    if (date.getFullYear() === selectedYear) {
      monthlyRevenue[date.getMonth()] += recordAmount(invoice);
    }
  });

  return {
    employeesCount: employees.length,
    projectsCount: projects.length,
    activeProjectsCount: projects.filter((project) => {
      const status = String(
        project.status ?? project.projectStatus ?? project.stage ?? ""
      ).toLowerCase();

      return (
        !status.includes("complete") &&
        status !== "done" &&
        !status.includes("cancel")
      );
    }).length,
    revenueTotal,
    assetsCount: assets.length,
    projectStatus,
    monthlyRevenue,
    selectedYear,
    selectedMonth: selected.getMonth(),
    asOfDate,
  };
}

const stats = [
  {
    title: "Total Employees",
    key: "employeesCount",
    icon: UsersRound,
    color: "violet",
    line: "M2 28 C10 28 12 18 20 20 S31 13 39 16 S51 8 60 10 S72 3 82 4",
    note: "Employees in selected view",
  },
  {
    title: "Active Projects",
    key: "activeProjectsCount",
    icon: BriefcaseBusiness,
    color: "green",
    line: "M2 30 C10 29 13 23 21 25 S31 14 40 17 S50 20 59 10 S72 14 82 3",
    note: "Projects in selected view",
  },
  {
    title: "Total Revenue",
    key: "revenueTotal",
    icon: Wallet,
    color: "blue",
    line: "M2 29 C12 29 12 19 22 21 S34 10 42 16 S52 13 61 8 S72 12 82 2",
    note: "Revenue in selected view",
  },
  {
    title: "Total Assets",
    key: "assetsCount",
    icon: Package,
    color: "orange",
    line: "M2 30 C12 29 14 22 23 24 S36 7 44 12 S54 20 63 9 S73 12 82 3",
    note: "Assets in selected view",
  },
];

function getStoredAuth() {
  try {
    const token = sessionStorage.getItem("erp-token");
    const user = JSON.parse(sessionStorage.getItem("erp-user") || "null");

    if (!token || !user || !user.role) {
      return { token: null, user: null };
    }

    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}


function getApiRows(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function AdminSupportCenter({ mode = "tickets" }) {
  const token = sessionStorage.getItem("erp-token");
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchText, setSearchText] = useState("");
  const [drafts, setDrafts] = useState({});

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
    }
    return payload;
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const dataUrl = mode === "feedback"
        ? "http://localhost:5000/api/feedback"
        : "http://localhost:5000/api/support-tickets";
      const [dataPayload, employeePayload] = await Promise.all([
        apiRequest(dataUrl),
        mode === "tickets"
          ? apiRequest("http://localhost:5000/api/employees").catch(() => [])
          : Promise.resolve([]),
      ]);
      const ticketRows = mode === "feedback"
        ? getApiRows(dataPayload, ["feedback", "items"])
        : getApiRows(dataPayload, ["tickets", "supportTickets"]);
      const employeeRows = getApiRows(employeePayload, ["employees"]);
      setTickets(ticketRows);
      setEmployees(employeeRows);
      setDrafts((current) => {
        const next = { ...current };
        ticketRows.forEach((ticket) => {
          const id = String(ticket._id || ticket.id || ticket.ticketNumber);
          // Keep the form in sync with the latest server response.
          // After a successful assignment, the backend's saved status/employee
          // must replace stale local draft values.
          next[id] = {
            status: ticket.status || (mode === "feedback" ? "New" : "Open"),
            assignedTo: ticket.assignedTo?._id || ticket.assignedTo || "",
            resolutionNote: ticket.resolutionNote || "",
            adminReply: ticket.adminReply || "",
          };
        });
        return next;
      });
    } catch (loadError) {
      setError(`${loadError.message}. Check that the backend is running and GET ${mode === "feedback" ? "/api/feedback" : "/api/support-tickets"} is registered.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Reload when the Admin switches between the two support pages.
  }, [mode]);

  const isFeedback = (ticket) => {
    const subject = String(ticket.subject || ticket.title || "").trim().toLowerCase();
    return subject.startsWith("feedback:") || subject.startsWith("help request:") ||
      String(ticket.requestType || ticket.type || "").toLowerCase().includes("feedback") ||
      String(ticket.requestType || ticket.type || "").toLowerCase().includes("help");
  };

  const visibleTickets = tickets
    .filter((ticket) => mode === "feedback" ? true : !isFeedback(ticket))
    .filter((ticket) => {
      const q = searchText.toLowerCase().trim();
      if (!q) return true;
      return [
        ticket.ticketNumber, ticket.subject, ticket.clientName, ticket.description,
        ticket.message, ticket.type, ticket.category, ticket.status, ticket.priority,
      ].some((value) => String(value || "").toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [field]: value },
    }));
  };

  const saveTicket = async (ticket) => {
    const id = String(ticket._id || ticket.id || "");
    if (!id) {
      setError("This record has no database ID, so it cannot be updated.");
      return;
    }
    const draft = drafts[id] || {};
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      if (mode === "feedback") {
        const updated = await apiRequest(`http://localhost:5000/api/feedback/${encodeURIComponent(id)}/review`, {
          method: "PATCH",
          body: JSON.stringify({
            status: draft.status || ticket.status || "New",
            adminReply: draft.adminReply ?? ticket.adminReply ?? "",
          }),
        });
        const saved = updated.feedback || updated.data || updated;
        setTickets((current) => current.map((item) =>
          String(item._id || item.id) === id ? { ...item, ...saved } : item
        ));
        setNotice("Help & Feedback review saved successfully.");
      } else {
        const selectedEmployeeId = String(draft.assignedTo || "");
        const selectedStatus = draft.status || ticket.status || "Open";
        const resolutionNote = draft.resolutionNote ?? ticket.resolutionNote ?? "";

        // The backend expects the Employee profile's MongoDB ID under
        // `employeeId` (not `assignedTo`). Send assignment + status + note
        // together so one button performs one consistent operation.
        const assignPayload = await apiRequest(
          `http://localhost:5000/api/support-tickets/${encodeURIComponent(id)}/assign`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ...(selectedEmployeeId
                ? { employeeId: selectedEmployeeId }
                : { assignToSelf: true }),
              status:
                selectedEmployeeId && selectedStatus === "Open"
                  ? "Assigned"
                  : selectedStatus,
              resolutionNote,
            }),
          }
        );

        const savedTicket =
          assignPayload.ticket || assignPayload.data || assignPayload;
        setTickets((current) =>
          current.map((item) =>
            String(item._id || item.id) === id
              ? { ...item, ...savedTicket }
              : item
          )
        );
        setNotice(
          selectedEmployeeId
            ? `${ticket.ticketNumber || "Ticket"} sent to employee successfully.`
            : `${ticket.ticketNumber || "Ticket"} updated successfully.`
        );
      }
      await loadData();
    } catch (saveError) {
      setError(`${saveError.message}. Please verify the corresponding backend route and permissions.`);
    } finally {
      setSavingId("");
    }
  };

  const title = mode === "feedback" ? "Help & Feedback" : "Support Tickets";
  const subtitle = mode === "feedback"
    ? "Review client help requests and feedback submitted through the Client Panel."
    : "Review incoming client tickets, assign an employee, and track resolution.";

  const statusClass = (status) => {
    const value = String(status || "Open").toLowerCase();
    if (value === "resolved" || value === "closed") return "bg-emerald-50 text-emerald-700";
    if (value === "in progress" || value === "assigned") return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-700";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Client Support</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total {mode === "feedback" ? "Requests" : "Tickets"}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{visibleTickets.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Open</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{visibleTickets.filter((ticket) => mode === "feedback" ? ["new", "under review", "planned"].includes(String(ticket.status || "New").toLowerCase()) : ["open", "assigned", "in progress"].includes(String(ticket.status || "Open").toLowerCase())).length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Resolved / Closed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{visibleTickets.filter((ticket) => mode === "feedback" ? ["responded", "implemented", "declined", "closed"].includes(String(ticket.status || "").toLowerCase()) : ["resolved", "closed"].includes(String(ticket.status || "").toLowerCase())).length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)}
              placeholder={mode === "feedback" ? "Search help requests or feedback..." : "Search tickets, client, priority..."}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <p className="text-xs text-slate-500">Showing {visibleTickets.length} record(s)</p>
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><RefreshCw size={17} className="animate-spin" /> Loading {mode === "feedback" ? "help & feedback" : "tickets"}...</div>
        ) : visibleTickets.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              {mode === "feedback" ? <MessageSquare size={23} /> : <Ticket size={23} />}
            </span>
            <h3 className="mt-3 font-semibold text-slate-900">No {mode === "feedback" ? "help requests or feedback" : "support tickets"} found</h3>
            <p className="mt-1 text-sm text-slate-500">New submissions will appear here when the API returns them.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {visibleTickets.map((ticket) => {
              const id = String(ticket._id || ticket.id || ticket.ticketNumber);
              const draft = drafts[id] || {};
              const assignedId = typeof draft.assignedTo === "object" ? draft.assignedTo?._id : draft.assignedTo;
              const assignedEmployee = employees.find((employee) => String(employee._id || employee.id) === String(assignedId || ""));
              return (
                <article key={id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{mode === "feedback" ? String(ticket.type || "Help Request") : (ticket.ticketNumber || `TKT-${id.slice(-6)}`)}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(ticket.status)}`}>{ticket.status || "Open"}</span>
                        {mode === "tickets" && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{ticket.priority || "Medium"} priority</span>}
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-900">{ticket.subject || ticket.title || (mode === "feedback" ? "Client help request" : "Support request")}</h3>
                      <p className="mt-1 text-sm text-slate-600">{ticket.description || ticket.message || "No description provided."}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><UserCheck size={14} /> {ticket.clientName || ticket.client?.name || "Unknown client"}</span>
                        <span>{ticket.category || (mode === "feedback" ? "Help & Feedback" : "Other")}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Date unavailable"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">Status</span>
                      <select value={draft.status || ticket.status || (mode === "feedback" ? "New" : "Open")} onChange={(event) => updateDraft(id, "status", event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                        {(mode === "feedback" ? ["New", "Under Review", "Planned", "Implemented", "Declined", "Responded", "Closed"] : ["Open", "Assigned", "In Progress", "Resolved", "Closed"]).map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                    {mode === "feedback" ? (
                      <label className="block md:col-span-2">
                        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Reply to client</span>
                        <textarea rows={3} maxLength={5000} value={draft.adminReply ?? ticket.adminReply ?? ""} onChange={(event) => updateDraft(id, "adminReply", event.target.value)} placeholder="Write a response for the client..." className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      </label>
                    ) : (
                      <>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Assign employee</span>
                          <select value={assignedId || ""} onChange={(event) => updateDraft(id, "assignedTo", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                            <option value="">Not assigned / Handle as admin</option>
                            {employees.map((employee) => <option key={employee._id || employee.id} value={employee._id || employee.id}>{employee.name || employee.fullName || employee.email || "Employee"}</option>)}
                          </select>
                          {assignedEmployee && <span className="mt-1 block text-xs text-slate-500">Assigned to {assignedEmployee.name || assignedEmployee.email}</span>}
                        </label>
                        <label className="block md:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Resolution note</span>
                          <textarea rows={3} value={draft.resolutionNote ?? ticket.resolutionNote ?? ""} onChange={(event) => updateDraft(id, "resolutionNote", event.target.value)} placeholder="Add update or resolution for the client..." className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                        </label>
                      </>
                    )}
                  </div>
                  {(mode === "feedback" ? ticket.adminReply : ticket.resolutionNote) && (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{mode === "feedback" ? "Current admin reply" : "Current resolution note"}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{mode === "feedback" ? ticket.adminReply : ticket.resolutionNote}</p>
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button type="button" onClick={() => saveTicket(ticket)} disabled={savingId === id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
                      {savingId === id ? <RefreshCw size={16} className="animate-spin" /> : mode === "feedback" ? <Mail size={16} /> : <UserCheck size={16} />}
                      {savingId === id
                        ? (mode === "feedback" ? "Sending..." : "Sending...")
                        : mode === "feedback"
                        ? "Send reply"
                        : (draft.assignedTo ? "Send to Employee" : "Save changes")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();

  const [authSession, setAuthSession] = useState(getStoredAuth);
  const currentUser = authSession.user;
  const isAdminLoggedIn = Boolean(authSession.token && currentUser);

  useEffect(() => {
    const loginRoutes = [
      "/login",
      "/login/admin",
      "/login/employee",
      "/login/client",
    ];

    const isLoginRoute = loginRoutes.includes(location.pathname);

    if (!isAdminLoggedIn && !isLoginRoute) {
      routerNavigate("/login", { replace: true });
      return;
    }

    if (isAdminLoggedIn && currentUser?.role === "employee") {
      if (!location.pathname.startsWith("/employee/")) {
        routerNavigate("/employee/dashboard", { replace: true });
      }
      return;
    }

    if (isAdminLoggedIn && currentUser?.role === "client") {
      if (!location.pathname.startsWith("/client/")) {
        routerNavigate("/client/dashboard", { replace: true });
      }
      return;
    }

    if (isAdminLoggedIn && currentUser?.role === "admin") {
      if (
        location.pathname.startsWith("/employee/") ||
        location.pathname.startsWith("/client/")
      ) {
        routerNavigate("/", { replace: true });
      }
    }
  }, [
    isAdminLoggedIn,
    currentUser?.role,
    location.pathname,
    routerNavigate,
  ]);

  const displayName = currentUser?.name || "Admin User";
  const displayEmail = currentUser?.email || "admin@company.com";

  const displayRole =
    currentUser?.role === "admin"
      ? "Administrator"
      : currentUser?.role === "employee"
      ? "Employee"
      : currentUser?.role === "client"
      ? "Client"
      : "User";

  const userInitials =
    String(displayName)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "U";

  const [prototypePage, setPrototypePage] = useState("Dashboard");

  const [expanded, setExpanded] = useState(
    location.pathname.startsWith("/crm/")
      ? "CRM"
      : ["/projects", "/tasks", "/proposals"].includes(location.pathname)
      ? "Projects"
      : [
          "/employees",
          "/attendance",
          "/leave-requests",
          "/hr-documents",
        ].includes(location.pathname)
      ? "HRMS"
      : ["/invoices", "/expenses", "/payments"].includes(location.pathname)
      ? "Finance"
      : ["/assets", "/assignments"].includes(location.pathname)
      ? "Assets"
      : ""
  );

  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const [dashboardMode, setDashboardMode] = useState("overall");
  const [dashboardData, setDashboardData] = useState(() =>
    readDashboardData(selectedDate, "overall")
  );

  useEffect(() => {
    let cancelled = false;

    const refreshFromCache = () =>
      setDashboardData(readDashboardData(selectedDate, dashboardMode));

    async function loadDashboardFromApi() {
      // Dashboard must read the same backend data as Employees, Projects,
      // Invoices and Assets pages instead of relying on stale localStorage only.
      const token = sessionStorage.getItem("erp-token");
      const endpoints = [
        ["employees", "erp-employees", "http://localhost:5000/api/employees"],
        ["projects", "erp-projects", "http://localhost:5000/api/projects"],
        ["invoices", "erp-invoices", "http://localhost:5000/api/invoices"],
        ["assets", "erp-assets", "http://localhost:5000/api/assets"],
      ];

      await Promise.allSettled(endpoints.map(async ([name, key, url]) => {
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || `Could not load ${name} (${response.status})`);
        }

        const rows = Array.isArray(payload)
          ? payload
          : payload.data || payload[name] || payload.invoices || payload.assets || payload.projects || payload.employees || [];

        if (!Array.isArray(rows)) {
          throw new Error(`Unexpected ${name} response format`);
        }

        try {
          localStorage.setItem(key, JSON.stringify(rows));
        } catch (error) {
          console.warn(`Could not cache ${name} for dashboard:`, error);
        }
      }));

      if (!cancelled) refreshFromCache();
    }

    refreshFromCache();
    loadDashboardFromApi().catch((error) => {
      console.error("Dashboard data refresh failed:", error);
      if (!cancelled) refreshFromCache();
    });

    window.addEventListener("storage", refreshFromCache);
    window.addEventListener("focus", loadDashboardFromApi);
    window.addEventListener("erp-data-updated", refreshFromCache);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", refreshFromCache);
      window.removeEventListener("focus", loadDashboardFromApi);
      window.removeEventListener("erp-data-updated", refreshFromCache);
    };
  }, [location.pathname, selectedDate, dashboardMode]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setCalendarOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setProfileModalOpen(false);
        setCalendarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const activePage =
    location.pathname === "/"
      ? "Dashboard"
      : location.pathname === "/crm/clients"
      ? "Clients"
      : location.pathname === "/crm/leads"
      ? "Leads"
      : location.pathname === "/crm/contacts"
      ? "Contacts"
      : location.pathname === "/projects"
      ? "All Projects"
      : location.pathname === "/tasks"
      ? "Tasks"
      : location.pathname === "/proposals"
      ? "Proposals"
      : location.pathname === "/employees"
      ? "Employees"
      : location.pathname === "/attendance"
      ? "Attendance"
      : location.pathname === "/leave-requests"
      ? "Leave Requests"
      : location.pathname === "/hr-documents"
      ? "HR Documents"
      : location.pathname === "/invoices"
      ? "Invoices"
      : location.pathname === "/expenses"
      ? "Expenses"
      : location.pathname === "/payments"
      ? "Payments"
      : location.pathname === "/assets"
      ? "All Assets"
      : location.pathname === "/assignments"
      ? "Assignments"
      : location.pathname === "/support-tickets"
      ? "Support Tickets"
      : location.pathname === "/help-feedback"
      ? "Help & Feedback"
      : location.pathname === "/reports"
      ? "Reports"
      : location.pathname === "/settings"
      ? "Settings"
      : prototypePage;

  // Keep the sidebar highlight tied to the item the user selected.
  // This also prevents Dashboard from staying highlighted if a module click
  // updates the in-panel selection before the URL changes.
  const selectedSidebarPage =
    location.pathname === "/" && prototypePage !== "Dashboard"
      ? prototypePage
      : activePage;

  function navigate(name) {
    setMobileMenu(false);

    const parent = navigation.find((item) =>
      item.children?.includes(name)
    );

    if (parent) setExpanded(parent.name);

    const routes = {
      Dashboard: "/",
      Clients: "/crm/clients",
      Leads: "/crm/leads",
      Contacts: "/crm/contacts",
      "All Projects": "/projects",
      Tasks: "/tasks",
      Proposals: "/proposals",
      Employees: "/employees",
      Attendance: "/attendance",
      "Leave Requests": "/leave-requests",
      "HR Documents": "/hr-documents",
      Invoices: "/invoices",
      Expenses: "/expenses",
      Payments: "/payments",
      "All Assets": "/assets",
      Assignments: "/assignments",
      "Support Tickets": "/support-tickets",
      "Help & Feedback": "/help-feedback",
      Reports: "/reports",
      Settings: "/settings",
    };

    if (routes[name]) {
      setPrototypePage(name);
      routerNavigate(routes[name]);
    } else {
      setPrototypePage(name);
    }
  }

  const handleLogin = useCallback(
    (loggedInUser) => {
      const stored = getStoredAuth();
      const token = stored.token || sessionStorage.getItem("erp-token");
      const user = stored.user || loggedInUser;

      if (token && user && user.role) {
        sessionStorage.setItem("erp-user", JSON.stringify(user));
        setAuthSession({ token, user });
        routerNavigate(
          user.role === "employee"
            ? "/employee/dashboard"
            : user.role === "client"
            ? "/client/dashboard"
            : "/",
          { replace: true }
        );
      } else {
        setAuthSession({ token: null, user: null });
      }
    },
    [routerNavigate]
  );

  function handleLogout() {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    // Close the authenticated Socket.IO connection before clearing the session.
    disconnectSocket();

    sessionStorage.removeItem("erp-token");
    sessionStorage.removeItem("erp-user");

    setAuthSession({ token: null, user: null });
    setMobileMenu(false);
    setIsSidebarCollapsed(false);

    routerNavigate("/login", { replace: true });
  }

  if (!isAdminLoggedIn || !currentUser) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // Employee users see their own portal, not the Admin workspace.
  if (currentUser.role === "employee") {
    return <EmployeePanel user={currentUser} onLogout={handleLogout} />;
  }

  // Client users see their own portal, not the Admin or Employee workspace.
  if (currentUser.role === "client") {
    return <ClientPanel user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            {currentUser.role === "client"
              ? "Client Portal coming soon"
              : "Panel not available yet"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {currentUser.role === "client"
              ? "Your client account is signed in successfully, but the Client Portal is still being developed."
              : "Your account is authenticated, but the panel for your role has not been implemented yet."}
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700"
          >
            Logout
          </button>
        </div>
      </main>
    );
  }

  const moduleContent =
    location.pathname === "/crm/clients" ? (
      <CRM />
    ) : location.pathname === "/crm/leads" ? (
      <Leads />
    ) : location.pathname === "/crm/contacts" ? (
      <Contacts />
    ) : location.pathname === "/projects" ? (
      <Projects />
    ) : location.pathname === "/tasks" ? (
      <Tasks />
    ) : location.pathname === "/proposals" ? (
      <Proposals />
    ) : location.pathname === "/employees" ? (
      <Employees />
    ) : location.pathname === "/attendance" ? (
      <Attendance />
    ) : location.pathname === "/leave-requests" ? (
      <LeaveRequests />
    ) : location.pathname === "/hr-documents" ? (
      <HRDocuments />
    ) : location.pathname === "/invoices" ? (
      <Invoices />
    ) : location.pathname === "/expenses" ? (
      <Expenses />
    ) : location.pathname === "/payments" ? (
      <Payments />
    ) : location.pathname === "/assets" ? (
      <Assets />
    ) : location.pathname === "/assignments" ? (
      <Assignments />
    ) : location.pathname === "/support-tickets" ? (
      <AdminSupportCenter mode="tickets" />
    ) : location.pathname === "/help-feedback" ? (
      <AdminSupportCenter mode="feedback" />
    ) : location.pathname === "/reports" ? (
      <Reports />
    ) : location.pathname === "/settings" ? (
      <Settings onLogout={handleLogout} />
    ) : null;

  const visibleActivities = activities.filter((item) =>
    `${item.title} ${item.module} ${item.user}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      {/* Keep the same slim sidebar scrollbar visible on Dashboard and every module.
          Previously this styling only existed inside the moduleContent branch. */}
      <style>{`
        .erp-sidebar-nav {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #9ca3af transparent;
          -ms-overflow-style: auto;
        }
        .erp-sidebar-nav::-webkit-scrollbar {
          display: block;
          width: 8px;
          height: 8px;
        }
        .erp-sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 9999px;
        }
        .erp-sidebar-nav::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border: 1px solid transparent;
          border-radius: 9999px;
          background-clip: padding-box;
        }
        .erp-sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
          background-clip: padding-box;
        }
      `}</style>
      {mobileMenu && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileMenu(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${
          isSidebarCollapsed ? "w-[76px]" : "w-[260px]"
        } flex-col border-r border-white/[0.08] bg-[#080f20] text-slate-300 shadow-xl transition-all duration-200 ${
          mobileMenu ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div
          className={`relative flex h-[84px] shrink-0 items-center border-b border-white/10 ${
            isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 text-white shadow-lg shadow-violet-900/40">
            <Cuboid size={27} strokeWidth={2.3} />
          </div>

          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-[18px] font-extrabold tracking-tight text-white">
                ERP System
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                Business workspace
              </p>
            </div>
          )}

          {!isSidebarCollapsed && (
            <button
              onClick={() => setMobileMenu(false)}
              className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-white/10 lg:hidden"
              aria-label="Close menu"
            >
              ×
            </button>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className="px-3.5 py-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.10] bg-[#111a2d] px-3.5 py-3 focus-within:border-violet-500/70 focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search size={17} className="shrink-0 text-slate-500" />
              <input
                aria-label="Search menu"
                placeholder="Search menu..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        )}

        {!isSidebarCollapsed && (
          <p className="px-5 pb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
        )}

        <nav className="erp-sidebar-nav flex-1 space-y-1.5 overflow-y-auto px-3.5 pb-4">
          {navigation
            .filter((item) =>
              `${item.name} ${(item.children || []).join(" ")}`
                .toLowerCase()
                .includes(search.toLowerCase())
            )
            .map((item) => (
              <div key={item.name}>
                <button
                  title={isSidebarCollapsed ? item.name : undefined}
                  onClick={() => {
                    if (item.children) {
                      if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                      setExpanded(expanded === item.name ? "" : item.name);
                    } else {
                      navigate(item.name);
                    }
                  }}
                  className={`group flex w-full items-center ${
                    isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"
                  } rounded-xl py-3 text-left text-[15px] transition-all ${
                    selectedSidebarPage === item.name
                      ? "bg-gradient-to-r from-violet-700 via-violet-600 to-purple-700 font-semibold text-white shadow-lg shadow-violet-950/35"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center ${
                      selectedSidebarPage === item.name
                        ? "text-white"
                        : "text-slate-400 group-hover:text-violet-300"
                    }`}
                  >
                    <item.icon size={18} strokeWidth={2.1} />
                  </span>

                  {!isSidebarCollapsed && (
                    <span className="flex-1">{item.name}</span>
                  )}

                  {!isSidebarCollapsed && item.children && (
                    <ChevronRight
                      size={16}
                      className={`transition-transform ${
                        expanded === item.name ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </button>

                {item.children &&
                  expanded === item.name &&
                  !isSidebarCollapsed && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-white/10 py-1 pl-4">
                      {item.children.map((child) => (
                        <button
                          key={child}
                          onClick={() => navigate(child)}
                          className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                            selectedSidebarPage === child
                              ? "bg-gradient-to-r from-violet-700 via-violet-600 to-purple-700 font-medium text-white shadow-md shadow-violet-950/25"
                              : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          {child}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            title={`${displayName} — Settings`}
            onClick={() => navigate("Settings")}
            className={`flex w-full items-center ${
              isSidebarCollapsed ? "justify-center" : "gap-3"
            } rounded-2xl border border-white/[0.08] bg-[#111a2d] p-3 text-left transition hover:bg-white/[0.08]`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-200 font-bold text-violet-800">
              {userInitials}
            </div>

            {!isSidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {displayEmail}
                  </p>
                </div>
                <span className="text-slate-500">↗</span>
              </>
            )}
          </button>

          <button
            onClick={() =>
              setIsSidebarCollapsed((collapsed) => !collapsed)
            }
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            className={`mt-2 hidden w-full items-center rounded-lg py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white lg:flex ${
              isSidebarCollapsed ? "justify-center px-2" : "gap-2 px-3"
            }`}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <>
                <PanelLeftClose size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          isSidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[260px]"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileMenu(true)}
              className="rounded-lg p-2 text-xl text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 sm:flex sm:w-[248px] md:w-[340px] xl:w-[400px]">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                aria-label="Search activities"
                placeholder="Search anything... (Ctrl + K)"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <span className="truncate text-sm font-semibold text-slate-700 sm:hidden">
              {activePage}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <NotificationBell />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Open account profile menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
                className={`flex items-center gap-2 rounded-xl p-1.5 transition ${
                  profileMenuOpen ? "bg-slate-100" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {userInitials}
                </span>

                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold text-slate-800">
                    {displayName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {displayRole}
                  </span>
                </span>

                <ChevronDown
                  size={15}
                  className={`hidden text-slate-500 transition-transform sm:block ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-base font-bold text-violet-700">
                      {userInitials}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {displayName}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {displayEmail}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {displayRole}
                      </p>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                    >
                      <UserRound size={19} className="text-slate-500" />
                      <span className="font-medium">My Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("Settings");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                    >
                      <SettingsIcon size={19} className="text-slate-500" />
                      <span className="font-medium">Account Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut size={19} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1800px] p-2.5 sm:p-3 lg:p-3">
          {moduleContent ? (
            <div className="erp-module-content">
              <style>{`
                /* Keep sidebar scrolling enabled and show a slim scrollbar. */
                .erp-sidebar-nav {
                  scrollbar-width: thin;
                  scrollbar-color: #9ca3af transparent;
                  -ms-overflow-style: auto;
                  overflow-y: auto;
                  overflow-x: hidden;
                }
                .erp-sidebar-nav::-webkit-scrollbar {
                  display: block;
                  width: 8px;
                  height: 8px;
                }
                .erp-sidebar-nav::-webkit-scrollbar-track {
                  background: transparent;
                  border-radius: 9999px;
                }
                .erp-sidebar-nav::-webkit-scrollbar-thumb {
                  background: #9ca3af;
                  border: 1px solid transparent;
                  border-radius: 9999px;
                  background-clip: padding-box;
                }
                .erp-sidebar-nav::-webkit-scrollbar-thumb:hover {
                  background: #6b7280;
                  background-clip: padding-box;
                }
                .erp-module-content > div > aside {
                  display: none !important;
                }
                .erp-module-content > div > div[class*="lg:pl-"] {
                  padding-left: 0 !important;
                  min-height: auto !important;
                }
                .erp-module-content > div > div[class*="lg:pl-"] > header {
                  display: none !important;
                }
                .erp-module-content > div > div[class*="lg:pl-"] > main {
                  padding-top: 0 !important;
                }
                .erp-module-content > div > header {
                  display: none !important;
                }
                .erp-module-content > div {
                  min-height: auto !important;
                }
              `}</style>
              {moduleContent}
            </div>
          ) : (
            <>
              <div className="mb-2.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                    Overview
                  </p>
                  <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {activePage === "Dashboard"
                      ? "Good morning, Admin! 👋"
                      : `${activePage} Overview`}
                  </h1>
                  <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">
                    {dashboardMode === "overall"
                      ? "Here's the overall picture of your workspace."
                      : `Showing saved records for ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setDashboardMode("overall")}
                      aria-pressed={dashboardMode === "overall"}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                        dashboardMode === "overall"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Overall Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardMode("day")}
                      aria-pressed={dashboardMode === "day"}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                        dashboardMode === "day"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Day-wise Dashboard
                    </button>
                  </div>
                </div>
                <div className="relative z-20" ref={calendarRef}>
                  <button
                    type="button"
                    aria-label="Choose dashboard date"
                    aria-expanded={calendarOpen}
                    onClick={() => setCalendarOpen((open) => !open)}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:shadow-md sm:text-sm"
                  >
                    <CalendarDays className="text-violet-600" size={16} />
                    <span>
                      {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                        "en-GB",
                        {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </span>
                    <ChevronDown
                      className={`text-slate-400 transition-transform ${
                        calendarOpen ? "rotate-180" : ""
                      }`}
                      size={14}
                    />
                  </button>

                  {calendarOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[min(375px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-slate-800">
                          View dashboard by date
                        </h3>
                      </div>

                      <label className="block">
                        <span className="sr-only">Choose date</span>
                        <input
                          type="date"
                          aria-label="Choose dashboard date"
                          value={selectedDate}
                          onChange={(event) => {
                            if (event.target.value) {
                              setSelectedDate(event.target.value);
                            }
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </label>

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            const todayString = `${today.getFullYear()}-${String(
                              today.getMonth() + 1
                            ).padStart(2, "0")}-${String(today.getDate()).padStart(
                              2,
                              "0"
                            )}`;
                            setSelectedDate(todayString);
                          }}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-violet-600 transition hover:bg-violet-50"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalendarOpen(false)}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          Close
                        </button>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {dashboardMode === "day"
                          ? "Choose a date to view records saved for that day. Records without a saved date cannot be matched historically."
                          : "The overall dashboard shows all saved records. The selected year controls the revenue chart."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {activePage !== "Dashboard" && (
                <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 p-5 text-sm text-violet-900">
                  <p className="font-semibold">{activePage} module selected</p>
                  <p className="mt-1 text-violet-700">
                    This module's full functionality will be added in upcoming steps.
                  </p>
                  <button
                    onClick={() => navigate("Dashboard")}
                    className="mt-3 font-semibold underline"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}

              {dashboardMode === "day" && (
                <div className="mb-2.5 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CalendarDays size={21} className="mt-0.5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        Showing records for {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                      <p className="mt-1 text-xs text-blue-800">
                        Cards and charts below use records dated on the selected day.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashboardMode("overall")}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                  >
                    <ChartNoAxesColumn size={16} />
                    View Overall Data
                  </button>
                </div>
              )}

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.title}
                    className={`group relative overflow-hidden rounded-2xl border border-slate-200/70 p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-3 ${
                      stat.color === "violet"
                        ? "bg-gradient-to-br from-white via-white to-violet-50/90"
                        : stat.color === "green"
                        ? "bg-gradient-to-br from-white via-white to-emerald-50/90"
                        : stat.color === "blue"
                        ? "bg-gradient-to-br from-white via-white to-blue-50/90"
                        : "bg-gradient-to-br from-white via-white to-orange-50/90"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          stat.color === "violet"
                            ? "bg-violet-100 text-violet-600"
                            : stat.color === "green"
                            ? "bg-emerald-100 text-emerald-600"
                            : stat.color === "blue"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        <stat.icon size={22} strokeWidth={2.5} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-500 sm:text-sm">
                          {stat.title}
                        </p>
                        <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
                          {stat.key === "revenueTotal"
                            ? formatINR(dashboardData[stat.key])
                            : dashboardData[stat.key]}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
                          <span className="text-slate-500">{stat.note}</span>
                        </div>
                      </div>

                      <svg
                        viewBox="0 0 84 34"
                        className={`hidden h-9 w-[68px] shrink-0 sm:block lg:w-[76px] ${
                          stat.color === "violet"
                            ? "text-violet-500"
                            : stat.color === "green"
                            ? "text-emerald-500"
                            : stat.color === "blue"
                            ? "text-blue-500"
                            : "text-orange-500"
                        }`}
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d={stat.line}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={`${stat.line} L82 34 L2 34 Z`}
                          fill="currentColor"
                          opacity=".08"
                          stroke="none"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </section>

              <section className="mt-2.5 grid grid-cols-1 gap-3 2xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-3 2xl:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <ChartNoAxesColumn size={22} className="mt-0.5 text-violet-600" strokeWidth={2.5} />
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {dashboardMode === "overall" ? "Revenue Overview" : `Revenue on ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {dashboardMode === "overall"
                            ? `Monthly revenue for ${dashboardData.selectedYear}`
                            : "Revenue from invoices dated on the selected day"}
                        </p>
                      </div>
                    </div>

                    <select
                      aria-label="Revenue period"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option>This Year</option>
                      <option>Last 6 Months</option>
                      <option>This Month</option>
                    </select>
                  </div>

                  <div className="mt-3 flex h-[112px] gap-3 sm:gap-4">
                    <div className="flex flex-col justify-between pb-6 text-[11px] text-slate-400">
                      <span>2L</span><span>1.5L</span><span>1L</span><span>50K</span><span>0</span>
                    </div>

                    <div className="relative flex min-w-0 flex-1 flex-col">
                      <div className="absolute inset-0 bottom-6 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map((line) => (
                          <div key={line} className="border-t border-dashed border-slate-100" />
                        ))}
                      </div>

                      <div className="relative flex min-h-0 flex-1 items-end gap-1.5 sm:gap-3">
                        {dashboardData.monthlyRevenue.map((amount, index) => {
                          const maxRevenue = Math.max(
                            ...dashboardData.monthlyRevenue,
                            1
                          );
                          const height =
                            amount > 0
                              ? Math.max(4, (amount / maxRevenue) * 100)
                              : 0;
                          const isCurrentMonth =
                            index === dashboardData.selectedMonth;

                          return (
                            <div
                              key={MONTHS[index]}
                              className="group relative flex h-full min-w-0 flex-1 items-end"
                            >
                              <div
                                title={`${MONTHS[index]}: ${formatINR(amount)}`}
                                style={{ height: `${height}%` }}
                                className={`w-full rounded-t-md transition-all duration-200 group-hover:opacity-80 ${
                                  isCurrentMonth
                                    ? "bg-violet-600 shadow-md shadow-violet-200"
                                    : "bg-violet-200 group-hover:bg-violet-300"
                                }`}
                              />
                              {isCurrentMonth && amount > 0 && (
                                <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-100 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm sm:block">
                                  {formatINR(amount)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-2 flex justify-between text-[10px] text-slate-500 sm:text-xs">
                        {MONTHS.map((month, index) => (
                          <span
                            key={month}
                            className={
                              index === dashboardData.selectedMonth
                                ? "font-bold text-violet-700"
                                : ""
                            }
                          >
                            {month}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400">
                    Revenue is counted from dated invoices {dashboardMode === "overall" ? "in the selected year" : "on"}{" "}
                    {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                      "en-GB",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                    . Chart year: {dashboardData.selectedYear}. Undated invoices
                    are excluded; records without dates cannot be matched to a specific day.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4">
                  <div className="flex items-center gap-3">
                    <Activity size={22} className="text-violet-600" strokeWidth={2.5} />
                    <div>
                      <h2 className="font-bold text-slate-900">Project Status</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {dashboardMode === "overall" ? "Status across all saved projects" : "Projects dated on the selected day"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 py-1.5 sm:flex-row 2xl:flex-col min-[1500px]:flex-row">
                    <div
                      className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#10b981 0deg ${
                          dashboardData.projectsCount
                            ? (dashboardData.projectStatus.completed /
                                dashboardData.projectsCount) *
                              360
                            : 0
                        }deg, #6366f1 ${
                          dashboardData.projectsCount
                            ? (dashboardData.projectStatus.completed /
                                dashboardData.projectsCount) *
                              360
                            : 0
                        }deg ${
                          dashboardData.projectsCount
                            ? ((dashboardData.projectStatus.completed +
                                dashboardData.projectStatus.inProgress) /
                                dashboardData.projectsCount) *
                              360
                            : 0
                        }deg, #f59e0b ${
                          dashboardData.projectsCount
                            ? ((dashboardData.projectStatus.completed +
                                dashboardData.projectStatus.inProgress) /
                                dashboardData.projectsCount) *
                              360
                            : 0
                        }deg ${
                          dashboardData.projectsCount
                            ? ((dashboardData.projectStatus.completed +
                                dashboardData.projectStatus.inProgress +
                                dashboardData.projectStatus.onHold) /
                                dashboardData.projectsCount) *
                              360
                            : 0
                        }deg, #e2e8f0 ${
                          dashboardData.projectsCount
                            ? ((dashboardData.projectStatus.completed +
                                dashboardData.projectStatus.inProgress +
                                dashboardData.projectStatus.onHold) /
                                dashboardData.projectsCount) *
                              360
                            : 0
                        }deg 360deg)`,
                      }}
                    >
                      <div className="flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-2xl font-bold">
                          {dashboardData.projectsCount}
                        </span>
                        <span className="text-xs text-slate-500">Projects</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2 md:min-w-[145px]">
                      {[
                        ["Completed", dashboardData.projectStatus.completed, "bg-emerald-500"],
                        ["In Progress", dashboardData.projectStatus.inProgress, "bg-indigo-500"],
                        ["On Hold", dashboardData.projectStatus.onHold, "bg-amber-500"],
                        ["Not Started", dashboardData.projectStatus.notStarted, "bg-slate-300"],
                      ].map(([label, value, color]) => (
                        <div key={label} className="flex items-center gap-2 text-sm">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                          <span className="flex-1 text-slate-600">{label}</span>
                          <span className="font-semibold text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-2.5 grid grid-cols-1 gap-3 xl:grid-cols-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Zap size={22} className="text-violet-600" strokeWidth={2.5} />
                      <div>
                        <h2 className="font-bold text-slate-900">Recent Activities</h2>
                        <p className="mt-1 text-xs text-slate-500">Latest actions across your ERP</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("Reports")}
                      className="whitespace-nowrap text-xs font-semibold text-violet-600 hover:text-violet-800"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 px-4 pb-1">
                    {visibleActivities.map((item) => (
                      <div key={item.title} className="flex items-center gap-3 py-1.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            item.tone === "violet"
                              ? "bg-violet-50 text-violet-600"
                              : item.tone === "green"
                              ? "bg-emerald-50 text-emerald-600"
                              : item.tone === "orange"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          <item.icon size={17} strokeWidth={2.5} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.module} <span className="px-1 text-slate-300">•</span> {item.time}
                          </p>
                        </div>
                      </div>
                    ))}

                    {visibleActivities.length === 0 && (
                      <p className="py-8 text-center text-sm text-slate-500">
                        No matching activities found.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={22} className="text-violet-600" strokeWidth={2.5} />
                      <div>
                        <h2 className="font-bold text-slate-900">Upcoming Tasks</h2>
                        <p className="mt-1 text-xs text-slate-500">Your task checklist</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                      {tasks.length - completedTasks.length} left
                    </span>
                  </div>

                  <div className="mt-3 space-y-0">
                    {tasks.map((task, index) => {
                      const isDone = completedTasks.includes(index);

                      return (
                        <label
                          key={task.title}
                          className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() =>
                              setCompletedTasks((current) =>
                                isDone
                                  ? current.filter((id) => id !== index)
                                  : [...current, index]
                              )
                            }
                            className="mt-1 h-4 w-4 accent-violet-600"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              isDone
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }`}
                          >
                            {task.title}
                            <span className="mt-1 block text-xs text-slate-400">
                              {task.date}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="relative flex min-h-[165px] flex-col justify-between overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 p-5 shadow-sm">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-200/50" />
                  <div className="absolute -bottom-12 right-10 h-36 w-36 rounded-full bg-white/50" />

                  <div className="relative">
                    <span className="inline-flex rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700">
                      Workspace tip
                    </span>
                    <h2 className="mt-3 max-w-[240px] text-lg font-bold leading-snug text-slate-900">
                      Streamline your workflow
                    </h2>
                    <p className="mt-2 max-w-[250px] text-sm leading-6 text-slate-600">
                      Manage your business modules from one organized workspace.
                    </p>
                  </div>

                  <div className="relative mt-4">
                    <button
                      onClick={() => navigate("Reports")}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-300/60 transition hover:bg-violet-700"
                    >
                      Explore features <ArrowRight size={16} />
                    </button>
                  </div>

                  <div className="pointer-events-none absolute bottom-5 right-5 hidden text-violet-400/80 sm:block">
                    <TrendingUp size={64} strokeWidth={2.2} />
                  </div>
                </div>
              </section>

              <footer className="py-3 text-center text-xs text-slate-400">
                ERP System <span className="px-1.5">·</span> Dashboard preview{" "}
                <span className="px-1.5">·</span> Sample data
              </footer>
            </>
          )}
        </main>
      </div>

      {profileModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProfileModalOpen(false);
            }
          }}
        >
          <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your administrator account details.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close profile"
                onClick={() => setProfileModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-xl font-bold text-violet-700">
                  {userInitials}
                </span>
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {displayName}
                  </p>
                  <p className="text-sm text-slate-500">{displayRole}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email address
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail size={17} className="text-slate-400" />
                  <span>{displayEmail}</span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Profile information is currently displayed from the ERP
                interface. Editable profile fields can be connected to your
                user account later.
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;