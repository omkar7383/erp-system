
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  ContactRound,
  Download,
  FileBarChart,
  FileText,
  Filter,
  House,
  Layers3,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Trash2,
  UsersRound,
  X,
  Zap,
  ArrowRight,
  UserCheck,
  UserX,
  Timer,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  ScanFace,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const departments = [
  "Engineering",
  "HR",
  "Finance",
  "Marketing",
  "Sales",
  "Operations",
];

const emptyForm = {
  name: "",
  employeeId: "",
  department: "Engineering",
  date: new Date().toLocaleDateString("en-CA"),
  checkIn: "09:00",
  status: "Present",
};

const statusStyles = {
  Present: "bg-emerald-50 text-emerald-700",
  Absent: "bg-rose-50 text-rose-700",
  Late: "bg-amber-50 text-amber-700",
  "Half Day": "bg-amber-50 text-amber-700",
  "On Leave": "bg-blue-50 text-blue-700",
};

const navGroups = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  {
    label: "CRM",
    icon: ContactRound,
    children: [
      { label: "Clients", href: "/crm/clients" },
      { label: "Leads", href: "/crm/leads" },
      { label: "Contacts", href: "/crm/contacts" },
    ],
  },
  {
    label: "Projects",
    icon: BriefcaseBusiness,
    children: [
      { label: "All Projects", href: "/projects" },
      { label: "Tasks", href: "/tasks" },
      { label: "Proposals", href: "/proposals" },
    ],
  },
  {
    label: "HRMS",
    icon: UsersRound,
    children: [
      { label: "Employees", href: "/employees" },
      { label: "Attendance", href: "/attendance" },
      { label: "Leave Requests", href: "/leave-requests" },
    ],
  },
  {
    label: "Finance",
    icon: FileText,
    children: [
      { label: "Invoices", href: "/invoices" },
      { label: "Expenses", href: "/expenses" },
      { label: "Payments", href: "/payments" },
    ],
  },
  {
    label: "Assets",
    icon: Layers3,
    children: [
      { label: "All Assets", href: "/assets" },
      { label: "Assignments", href: "/assignments" },
    ],
  },
  { label: "Reports", icon: FileBarChart, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function formatTime(value) {
  if (!value || value === "--") return "—";

  return value;
}

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const style = {
    purple: "bg-violet-50 text-violet-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <div className="flex min-h-[132px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_16px_rgba(28,42,78,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <span
        className={`flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl ${style}`}
      >
        <Icon size={26} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function VerificationBadge({ record }) {
  const gpsVerified =
    record.location?.verificationStatus === "Verified";

  const faceVerified =
    record.faceVerification?.status === "Verified";

  const fullyVerified =
    record.verificationCompleted === true &&
    gpsVerified &&
    faceVerified;

  if (fullyVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
        <ShieldCheck size={14} />
        Face + GPS
      </span>
    );
  }

  if (gpsVerified || faceVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
        <ShieldAlert size={14} />
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
      <Activity size={14} />
      {record.verificationMethod || "Manual"}
    </span>
  );
}

function VerificationDetails({ record }) {
  const gpsStatus =
    record.location?.verificationStatus || "Pending";

  const faceStatus =
    record.faceVerification?.status || "Not Verified";

  return (
    <div className="min-w-[155px] space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <MapPin
          size={14}
          className={
            gpsStatus === "Verified"
              ? "text-emerald-600"
              : "text-slate-400"
          }
        />

        <span className="text-slate-600">
          GPS: <strong>{gpsStatus}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <ScanFace
          size={14}
          className={
            faceStatus === "Verified"
              ? "text-emerald-600"
              : "text-slate-400"
          }
        />

        <span className="text-slate-600">
          Face: <strong>{faceStatus}</strong>
        </span>
      </div>

      {typeof record.location?.distanceFromOffice === "number" && (
        <p className="text-xs text-slate-400">
          Distance: {Math.round(record.location.distanceFromOffice)} m
        </p>
      )}
    </div>
  );
}

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeLoadError, setEmployeeLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState(["HRMS"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  const authHeaders = useCallback((json = false) => {
    const token = sessionStorage.getItem("erp-token");

    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  function mapRecord(record) {
    return {
      ...record,
      id: record._id || record.id,
      checkIn: record.checkIn || "--",
      checkOut: record.checkOut || "",
    };
  }

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setApiError("");

    try {
      const response = await fetch(`${API_URL}/attendance`, {
        headers: authHeaders(),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to load attendance records."
        );
      }

      const list = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.attendance)
          ? result.attendance
          : [];

      setRecords(list.map(mapRecord));
    } catch (error) {
      setApiError(
        error.message || "Could not connect to the attendance API."
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const loadEmployees = useCallback(async () => {
    setEmployeeLoadError("");

    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: authHeaders(),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to load employees.");
      }

      const list = Array.isArray(result)
        ? result
        : result.data || result.employees || [];

      setEmployees(
        list
          .map((employee) => ({
            ...employee,
            id: employee._id || employee.id,
            name:
              employee.name ||
              employee.fullName ||
              employee.employeeName ||
              "",
            department:
              employee.department || employee.departmentName || "",
            employeeId: employee.employeeId || employee.empId || "",
          }))
          .filter((employee) => employee.name)
      );
    } catch (error) {
      setEmployeeLoadError(
        error.message || "Could not load employees."
      );
    }
  }, [authHeaders]);

  useEffect(() => {
    loadRecords();
    loadEmployees();
  }, [loadRecords, loadEmployees]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesSearch = `${record.name || ""} ${
          record.department || ""
        }`
          .toLowerCase()
          .includes(search.trim().toLowerCase());

        const matchesDate =
          !selectedDate || record.date === selectedDate;

        const matchesStatus =
          statusFilter === "All" || record.status === statusFilter;

        const isVerified =
          record.verificationCompleted === true &&
          record.location?.verificationStatus === "Verified" &&
          record.faceVerification?.status === "Verified";

        const matchesVerification =
          verificationFilter === "All" ||
          (verificationFilter === "Verified" && isVerified) ||
          (verificationFilter === "Manual" && !isVerified);

        return (
          matchesSearch &&
          matchesDate &&
          matchesStatus &&
          matchesVerification
        );
      }),
    [records, search, selectedDate, statusFilter, verificationFilter]
  );

  const todayRecords = records.filter(
    (record) => record.date === today
  );

  const presentCount = todayRecords.filter(
    (record) =>
      record.status === "Present" || record.status === "Late"
  ).length;

  const absentCount = todayRecords.filter(
    (record) => record.status === "Absent"
  ).length;

  const lateCount = todayRecords.filter(
    (record) => record.status === "Late"
  ).length;

  const verifiedCount = todayRecords.filter(
    (record) =>
      record.verificationCompleted === true &&
      record.location?.verificationStatus === "Verified" &&
      record.faceVerification?.status === "Verified"
  ).length;

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  const filteredEmployees = employees.filter((employee) => {
    const term = employeeSearch.trim().toLowerCase();

    return (
      !term ||
      `${employee.name} ${employee.employeeId} ${employee.department}`
        .toLowerCase()
        .includes(term)
    );
  });

  function selectEmployee(employee) {
    setForm((current) => ({
      ...current,
      name: employee.name,
      employeeId: employee.id,
      department: employee.department || current.department,
    }));

    setEmployeeSearch(employee.name);
    setEmployeeDropdownOpen(false);
  }

  function clearEmployeeSelection() {
    setForm((current) => ({
      ...current,
      name: "",
      employeeId: "",
      department: "Engineering",
    }));

    setEmployeeSearch("");
    setEmployeeDropdownOpen(true);
  }

  async function addRecord(event) {
    event.preventDefault();
    setApiError("");

    if (!form.name.trim()) {
      setApiError("Please select an employee.");
      return;
    }

    const payload = {
      ...form,
      checkIn: form.status === "Absent" ? "--" : form.checkIn,
    };

    try {
      const response = await fetch(`${API_URL}/attendance`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Could not add attendance."
        );
      }

      const newRecord = result.data || result.attendance;

      if (newRecord) {
        setRecords((current) => [
          mapRecord(newRecord),
          ...current,
        ]);
      } else {
        await loadRecords();
      }

      setShowForm(false);
      setForm({ ...emptyForm, date: today });
      setEmployeeSearch("");
      setEmployeeDropdownOpen(false);
    } catch (error) {
      setApiError(error.message || "Could not add attendance.");
    }
  }

  async function updateStatus(id, status) {
    setApiError("");

    const current = records.find((record) => record.id === id);

    if (!current) return;

    const payload = {
      status,
      checkIn:
        status === "Absent"
          ? "--"
          : current.checkIn === "--"
            ? "09:00"
            : current.checkIn,
    };

    try {
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Could not update attendance."
        );
      }

      const updatedRecord = result.data || result.attendance;

      if (updatedRecord) {
        setRecords((items) =>
          items.map((record) =>
            record.id === id ? mapRecord(updatedRecord) : record
          )
        );
      } else {
        await loadRecords();
      }
    } catch (error) {
      setApiError(error.message || "Could not update attendance.");
    }
  }

  async function deleteRecord(id) {
    if (!window.confirm("Delete this attendance record?")) return;

    setApiError("");

    try {
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Could not delete attendance."
        );
      }

      setRecords((current) =>
        current.filter((record) => record.id !== id)
      );
    } catch (error) {
      setApiError(error.message || "Could not delete attendance.");
    }
  }

  function toggleGroup(label) {
    setExpandedGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedDate("");
    setStatusFilter("All");
    setVerificationFilter("All");
  }

  function exportCsv() {
    const headers = [
      "Employee",
      "Department",
      "Date",
      "Check In",
      "Check Out",
      "Status",
      "Verification Method",
      "Verification Completed",
      "GPS Status",
      "Face Status",
      "Distance From Office (m)",
    ];

    const rows = filteredRecords.map((record) => [
      record.name,
      record.department,
      record.date,
      record.checkIn,
      record.checkOut,
      record.status,
      record.verificationMethod || "Manual",
      record.verificationCompleted ? "Yes" : "No",
      record.location?.verificationStatus || "Pending",
      record.faceVerification?.status || "Not Verified",
      record.location?.distanceFromOffice ?? "",
    ]);

    const quote = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "erp-attendance.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#172033]">
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-white/5 bg-[#151a30] text-slate-200 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <a
          href="/"
          className="flex h-[78px] shrink-0 items-center gap-3 px-7 text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
            <Layers3 size={23} />
          </span>
          <span className="text-[19px] font-bold tracking-tight">
            ERP System
          </span>
        </a>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">
          {navGroups.map((group) => {
            const Icon = group.icon;
            const expanded = expandedGroups.includes(group.label);

            if (group.children) {
              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium ${
                      group.label === "HRMS"
                        ? "bg-white/[0.035] text-white"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="flex-1">{group.label}</span>
                    {expanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {expanded && (
                    <div className="mt-1 space-y-1">
                      {group.children.map((child) => {
                        const active = child.label === "Attendance";

                        const ChildIcon =
                          child.label === "Employees"
                            ? UsersRound
                            : child.label === "Attendance"
                              ? CalendarDays
                              : FileText;

                        return (
                          <a
                            key={child.label}
                            href={child.href}
                            className={`flex items-center gap-3 rounded-xl px-7 py-3 text-[13px] ${
                              active
                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white shadow-md"
                                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                            }`}
                          >
                            <ChildIcon size={17} />
                            {child.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <a
                key={group.label}
                href={group.href}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                <Icon size={20} />
                {group.label}
              </a>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">
              <Zap size={17} />
            </span>
            Upgrade to Pro
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-300">
            Unlock advanced features for your business.
          </p>
          <button
            onClick={() =>
              window.alert("Upgrade options can be connected here later.")
            }
            className="mt-3 flex w-full items-center justify-between text-xs font-semibold text-slate-100"
          >
            Explore plans <ArrowRight size={15} />
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-7 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-slate-400">
              <Search size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              aria-label="Refresh attendance"
              title="Refresh attendance"
              onClick={() => {
                loadRecords();
                loadEmployees();
              }}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={19}
                className={loading ? "animate-spin" : ""}
              />
            </button>

            <button
              aria-label="Notifications"
              onClick={() => window.alert("You're all caught up!")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            >
              <Bell size={21} />
            </button>

            <button
              onClick={() =>
                window.alert("Signed in as demo administrator.")
              }
              className="flex items-center gap-3 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white">
                A
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-semibold text-slate-900">
                  Admin
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Administrator
                </span>
              </span>
              <ChevronDown
                size={16}
                className="hidden text-slate-500 sm:block"
              />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-8 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                <House size={14} />
                ERP
                <ChevronRight size={14} />
                HRMS
                <ChevronRight size={14} />
                <span className="font-semibold text-violet-700">
                  Attendance
                </span>
              </div>

              <h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[36px]">
                Attendance
              </h1>

              <p className="mt-2 text-[15px] text-slate-500 sm:text-base">
                Track employee attendance, check-in times and verification.
              </p>
            </div>

            <button
              onClick={() => {
                setForm({ ...emptyForm, date: today });
                setEmployeeSearch("");
                setEmployeeDropdownOpen(false);
                setApiError("");
                setShowForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200/70 transition hover:bg-violet-700 sm:self-auto"
            >
              <Plus size={19} />
              Add Attendance
            </button>
          </div>

          <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Present Today"
              value={presentCount}
              detail="Present and late records"
              icon={UserCheck}
              tone="green"
            />
            <MetricCard
              title="Absent Today"
              value={absentCount}
              detail="Marked absent today"
              icon={UserX}
              tone="orange"
            />
            <MetricCard
              title="Late Today"
              value={lateCount}
              detail="Arrived after schedule"
              icon={Timer}
              tone="blue"
            />
            <MetricCard
              title="Face + GPS Verified"
              value={verifiedCount}
              detail="Fully verified today"
              icon={ShieldCheck}
              tone="purple"
            />
          </section>

          <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.045)]">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 p-5 sm:p-6 xl:flex-row xl:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <CalendarDays size={22} />
                </span>
                <div>
                  <h2 className="text-[17px] font-bold text-slate-900">
                    Attendance Records
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredRecords.length} record(s) found
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-500">
                  <CalendarDays size={17} />
                  <input
                    type="date"
                    aria-label="Filter by date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="min-w-0 bg-transparent text-sm text-slate-700 outline-none"
                  />
                </label>

                <div className="relative">
                  <button
                    onClick={() => setShowFilter((value) => !value)}
                    className={`inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
                      statusFilter !== "All" ||
                      verificationFilter !== "All"
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Filter size={17} />
                    Filters
                    <ChevronDown size={15} />
                  </button>

                  {showFilter && (
                    <div className="absolute right-0 top-14 z-30 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Attendance Status
                      </label>

                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value)
                        }
                        className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                      >
                        {[
                          "All",
                          "Present",
                          "Late",
                          "Absent",
                          "Half Day",
                          "On Leave",
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status === "All" ? "All statuses" : status}
                          </option>
                        ))}
                      </select>

                      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Verification
                      </label>

                      <select
                        value={verificationFilter}
                        onChange={(event) =>
                          setVerificationFilter(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                      >
                        <option value="All">All verification types</option>
                        <option value="Verified">Face + GPS verified</option>
                        <option value="Manual">Manual / incomplete</option>
                      </select>

                      <button
                        onClick={() => setShowFilter(false)}
                        className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                      >
                        Apply filters
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={clearFilters}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <X size={16} />
                  Clear
                </button>

                <button
                  onClick={exportCsv}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download size={17} />
                  Export
                </button>
              </div>
            </div>

            {apiError && (
              <div
                role="alert"
                className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {apiError}
                <button
                  onClick={loadRecords}
                  className="ml-2 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && (
              <p className="px-5 py-4 text-sm text-slate-500">
                Loading attendance records...
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {[
                      "Employee",
                      "Department",
                      "Date",
                      "Check-in",
                      "Check-out",
                      "Status",
                      "Verification",
                      "GPS / Face Details",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-5 py-4">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#fbfaff]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                              [
                                "bg-violet-100 text-violet-700",
                                "bg-blue-100 text-blue-700",
                                "bg-orange-100 text-orange-700",
                                "bg-emerald-100 text-emerald-700",
                              ][index % 4]
                            }`}
                          >
                            {initials(record.name)}
                          </span>

                          <span className="text-sm font-semibold text-slate-900">
                            {record.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {record.department || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(record.date)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <Clock3 size={15} className="text-slate-400" />
                          {formatTime(record.checkIn)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <Clock3 size={15} className="text-slate-400" />
                          {formatTime(record.checkOut)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          aria-label={`Status for ${record.name}`}
                          value={record.status}
                          onChange={(event) =>
                            updateStatus(record.id, event.target.value)
                          }
                          className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ${
                            statusStyles[record.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <option>Present</option>
                          <option>Late</option>
                          <option>Absent</option>
                          <option>Half Day</option>
                          <option>On Leave</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <VerificationBadge record={record} />
                      </td>

                      <td className="px-5 py-4">
                        <VerificationDetails record={record} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          aria-label={`Delete attendance for ${record.name}`}
                          title="Delete attendance"
                          onClick={() => deleteRecord(record.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <Search
                          size={24}
                          className="mx-auto text-slate-400"
                        />
                        <p className="mt-3 font-semibold text-slate-900">
                          No attendance records found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing the search, date or status filter.
                        </p>
                        <button
                          onClick={clearFilters}
                          className="mt-3 text-sm font-semibold text-violet-700"
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200/80 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filteredRecords.length} record(s)</span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-600" />
                Verified count includes records with both GPS and face verified.
              </span>
            </div>
          </section>
        </main>
      </div>

      {showForm && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
              setEmployeeDropdownOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
        >
          <form
            onSubmit={addRecord}
            className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <CalendarDays size={22} />
                </span>
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Add Attendance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manually record an employee's attendance.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEmployeeDropdownOpen(false);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Employee Name <span className="text-rose-500">*</span>

                  <div className="relative mt-1.5">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      required
                      autoComplete="off"
                      value={employeeSearch || form.name}
                      onFocus={() => {
                        setEmployeeSearch("");
                        setEmployeeDropdownOpen(true);
                      }}
                      onChange={(event) => {
                        setEmployeeSearch(event.target.value);
                        setEmployeeDropdownOpen(true);

                        if (
                          form.name &&
                          event.target.value !== form.name
                        ) {
                          setForm((current) => ({
                            ...current,
                            name: "",
                            employeeId: "",
                            department: "Engineering",
                          }));
                        }
                      }}
                      placeholder="Search employee name or ID..."
                      className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                    />

                    <button
                      type="button"
                      aria-label="Toggle employee list"
                      onClick={() =>
                        setEmployeeDropdownOpen((open) => !open)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </label>

                {employeeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {employeeLoadError ? (
                      <div className="p-3 text-sm text-rose-600">
                        {employeeLoadError}
                        <button
                          type="button"
                          onClick={loadEmployees}
                          className="ml-2 font-semibold underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : filteredEmployees.length ? (
                      filteredEmployees.map((employee) => (
                        <button
                          key={
                            employee.id ||
                            employee.employeeId ||
                            employee.name
                          }
                          type="button"
                          onClick={() => selectEmployee(employee)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-violet-50 ${
                            form.name === employee.name
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-700"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                            {initials(employee.name)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {employee.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {employee.employeeId || "Employee"}
                              {employee.department
                                ? ` · ${employee.department}`
                                : ""}
                            </span>
                          </span>

                          {form.name === employee.name && (
                            <Check size={17} />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500">
                        {employees.length
                          ? "No employees match your search."
                          : "No employees found. Add employees in the Employees module first."}
                      </div>
                    )}
                  </div>
                )}

                {form.name && (
                  <p className="mt-1.5 text-xs text-emerald-700">
                    Selected: {form.name}
                    {form.employeeId ? ` · ${form.employeeId}` : ""}
                    <button
                      type="button"
                      onClick={clearEmployeeSelection}
                      className="ml-2 font-semibold text-violet-700"
                    >
                      Change
                    </button>
                  </p>
                )}
              </div>

              <label className="text-sm font-medium text-slate-700">
                Department
                <select
                  name="department"
                  value={form.department}
                  disabled={Boolean(form.name)}
                  onChange={updateField}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                >
                  {[...new Set([...departments, form.department].filter(Boolean))].map(
                    (department) => (
                      <option key={department}>{department}</option>
                    )
                  )}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  Filled automatically from the selected employee.
                </span>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Date
                <input
                  required
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={updateField}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Check-in Time
                <input
                  type="time"
                  name="checkIn"
                  value={form.checkIn}
                  onChange={updateField}
                  disabled={form.status === "Absent"}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none disabled:bg-slate-100 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                >
                  <option>Present</option>
                  <option>Late</option>
                  <option>Absent</option>
                </select>
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEmployeeDropdownOpen(false);
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Save Attendance
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
