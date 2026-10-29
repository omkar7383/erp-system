import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Laptop,
  MapPin,
  Monitor,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
  X,
  RotateCcw,
} from "lucide-react";

const ASSIGNMENTS_API = "http://localhost:5000/api/assignments";
const ASSETS_API = "http://localhost:5000/api/assets";
const EMPLOYEES_API = "http://localhost:5000/api/employees";

function getToken() { return sessionStorage.getItem("erp-token"); }
async function apiRequest(base, path = "", options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "API request failed");
  return payload;
}
function rowsFrom(result, key) { return Array.isArray(result) ? result : result.data || result[key] || []; }
function normalizeRecord(item) { return { ...item, id: String(item.id || item._id), assetId: String(item.assetId?._id || item.assetId || ""), employeeId: String(item.employeeId?._id || item.employeeId || "") }; }

const emptyAssignment = {
  assetId: "",
  employeeId: "",
  assignedDate: new Date().toISOString().slice(0, 10),
  expectedReturnDate: "",
  status: "Assigned",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100";

const statusStyles = {
  Assigned: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  Returned: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Overdue: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

function getEmployeeName(employee) {
  if (!employee) return "Unknown employee";
  return (
    employee.name ||
    employee.fullName ||
    employee.employeeName ||
    employee.email ||
    `Employee #${employee.id || employee._id}`
  );
}

function getAssetName(asset) {
  return asset ? asset.name || asset.assetTag : "Unknown asset";
}

function getCategoryIcon(category) {
  if (category === "Laptop" || category === "Desktop") return Laptop;
  if (category === "Monitor") return Monitor;
  if (category === "Furniture") return Package;
  return ClipboardList;
}

function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAssignment);

  async function loadData() {
    setLoading(true);
    setApiError("");
    try {
      const [assignmentResult, assetResult, employeeResult] = await Promise.all([
        apiRequest(ASSIGNMENTS_API),
        apiRequest(ASSETS_API),
        apiRequest(EMPLOYEES_API),
      ]);
      setAssignments(rowsFrom(assignmentResult, "assignments").map(normalizeRecord));
      setAssets(rowsFrom(assetResult, "assets").map(normalizeRecord));
      setEmployees(rowsFrom(employeeResult, "employees").map(normalizeRecord));
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const today = new Date().toISOString().slice(0, 10);

  function getAsset(assetId) {
    return assets.find((asset) => String(asset.id) === String(assetId));
  }

  function getEmployee(employeeId) {
    return employees.find(
      (employee) => String(employee.id) === String(employeeId)
    );
  }

  const filteredAssignments = useMemo(() => {
    const term = search.toLowerCase().trim();
    return assignments.filter((assignment) => {
      const asset = assets.find(
        (item) => String(item.id) === String(assignment.assetId)
      );
      const employee = employees.find(
        (item) => String(item.id) === String(assignment.employeeId)
      );
      const text = [
        getAssetName(asset),
        asset?.assetTag,
        getEmployeeName(employee),
        assignment.status,
        assignment.notes,
        assignment.assignedDate,
        assignment.expectedReturnDate,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = text.includes(term);
      const displayedStatus =
        assignment.status === "Assigned" &&
        assignment.expectedReturnDate &&
        assignment.expectedReturnDate < today
          ? "Overdue"
          : assignment.status;
      const matchesStatus =
        statusFilter === "All" || displayedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assignments, assets, employees, search, statusFilter, today]);

  const stats = [
    {
      label: "Total assignments",
      value: assignments.length,
      helper: "All assignment records",
      icon: ClipboardList,
      iconClass: "bg-violet-50 text-violet-700",
      valueClass: "text-slate-900",
    },
    {
      label: "Currently assigned",
      value: assignments.filter((item) => item.status === "Assigned").length,
      helper: "Equipment in use",
      icon: ShieldCheck,
      iconClass: "bg-blue-50 text-blue-700",
      valueClass: "text-blue-700",
    },
    {
      label: "Returned",
      value: assignments.filter((item) => item.status === "Returned").length,
      helper: "Assignments completed",
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-700",
      valueClass: "text-emerald-700",
    },
    {
      label: "Overdue",
      value: assignments.filter(
        (item) =>
          item.status === "Assigned" &&
          item.expectedReturnDate &&
          item.expectedReturnDate < today
      ).length,
      helper: "Return date has passed",
      icon: CircleAlert,
      iconClass: "bg-rose-50 text-rose-700",
      valueClass: "text-rose-700",
    },
  ];

  function openForm() {
    setForm({ ...emptyAssignment, assignedDate: today });
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function updateAssetStatus(assetId, status) {
    const asset = assets.find((item) => String(item.id) === String(assetId));
    if (!asset) return;
    const result = await apiRequest(ASSETS_API, `/${asset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const updated = normalizeRecord(result.data || result.asset || result);
    setAssets((current) => current.map((item) => String(item.id) === String(assetId) ? updated : item));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const asset = getAsset(form.assetId);
    const employee = getEmployee(form.employeeId);
    if (!asset || !employee) {
      window.alert("Please select a valid asset and employee.");
      return;
    }
    if (asset.status === "Retired" || asset.status === "Maintenance") {
      window.alert("This asset is not available for assignment.");
      return;
    }
    if (assignments.some((item) => String(item.assetId) === String(form.assetId) && item.status === "Assigned")) {
      window.alert("This asset already has an active assignment.");
      return;
    }
    if (form.expectedReturnDate && form.expectedReturnDate < form.assignedDate) {
      window.alert("Return date cannot be earlier than the assignment date.");
      return;
    }
    try {
      const payload = { ...form, assetId: asset.id, employeeId: employee.id, status: "Assigned" };
      const result = await apiRequest(ASSIGNMENTS_API, "", { method: "POST", body: JSON.stringify(payload) });
      const created = normalizeRecord(result.data || result.assignment || result);
      setAssignments((current) => [created, ...current]);
      await updateAssetStatus(asset.id, "Assigned");
      setShowForm(false);
      setForm({ ...emptyAssignment, assignedDate: today });
    } catch (error) {
      window.alert(error.message);
      loadData();
    }
  }

  async function updateStatus(assignment, newStatus) {
    if (newStatus === "Assigned" && assignments.some((item) => item.id !== assignment.id && String(item.assetId) === String(assignment.assetId) && item.status === "Assigned")) {
      window.alert("This asset already has another active assignment.");
      return;
    }
    try {
      const result = await apiRequest(ASSIGNMENTS_API, `/${assignment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = normalizeRecord(result.data || result.assignment || result);
      const updatedAssignments = assignments.map((item) => item.id === assignment.id ? updated : item);
      setAssignments(updatedAssignments);
      const stillAssigned = updatedAssignments.some((item) => String(item.assetId) === String(assignment.assetId) && item.status === "Assigned");
      await updateAssetStatus(assignment.assetId, stillAssigned ? "Assigned" : "Available");
    } catch (error) {
      window.alert(error.message);
      loadData();
    }
  }

  async function deleteAssignment(assignment) {
    if (!window.confirm("Delete this assignment record?")) return;
    try {
      await apiRequest(ASSIGNMENTS_API, `/${assignment.id}`, { method: "DELETE" });
      const updatedAssignments = assignments.filter((item) => item.id !== assignment.id);
      setAssignments(updatedAssignments);
      const stillAssigned = updatedAssignments.some((item) => String(item.assetId) === String(assignment.assetId) && item.status === "Assigned");
      if (!stillAssigned) await updateAssetStatus(assignment.assetId, "Available");
    } catch (error) {
      window.alert(error.message);
      loadData();
    }
  }

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    // Content-only component: App.jsx owns the global sidebar and top navbar.
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Operations / Asset management
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">
              Asset assignments
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Track who is using each company asset, manage returns, and spot overdue equipment quickly.
            </p>
          </div>
          <button
            onClick={openForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
          >
            <Plus size={18} />
            New assignment
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className={`mt-3 text-3xl font-bold tracking-tight ${stat.valueClass}`}>
                      {stat.value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{stat.helper}</p>
                  </div>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}>
                    <Icon size={21} />
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {apiError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Could not load assignments: {apiError} <button onClick={loadData} className="ml-2 font-semibold underline">Retry</button></div>}
        {loading && <p className="text-sm text-slate-500">Loading assignments from server...</p>}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assignment register</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review current allocations and completed returns.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {filteredAssignments.length} {filteredAssignments.length === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search asset, employee or notes..."
                aria-label="Search assignments"
                className={`${inputClass} pl-10`}
              />
            </div>
            <label className="relative block sm:w-48">
              <span className="sr-only">Filter assignment status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="All">All statuses</option>
                <option value="Assigned">Assigned</option>
                <option value="Returned">Returned</option>
                <option value="Overdue">Overdue</option>
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </label>
            {(search || statusFilter !== "All") && (
              <button onClick={clearFilters} className={buttonSecondary}>
                <RotateCcw size={15} />
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Assigned to</th>
                  <th className="px-5 py-4">Assigned date</th>
                  <th className="px-5 py-4">Expected return</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((assignment) => {
                  const asset = getAsset(assignment.assetId);
                  const employee = getEmployee(assignment.employeeId);
                  const isOverdue =
                    assignment.status === "Assigned" &&
                    assignment.expectedReturnDate &&
                    assignment.expectedReturnDate < today;
                  const displayedStatus = isOverdue ? "Overdue" : assignment.status;
                  const Icon = getCategoryIcon(asset?.category);

                  return (
                    <tr key={assignment.id} className="transition hover:bg-violet-50/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                            <Icon size={19} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">{getAssetName(asset)}</p>
                            <p className="mt-1 text-xs text-slate-500">{asset?.assetTag || "No asset tag"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                            <UserRound size={17} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{getEmployeeName(employee)}</p>
                            <p className="mt-1 text-xs text-slate-500">{employee?.department || employee?.email || "Employee"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{assignment.assignedDate || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock size={14} className="text-slate-400" />
                          {assignment.expectedReturnDate || "Not specified"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[displayedStatus] || statusStyles.Assigned}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {displayedStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {assignment.status === "Assigned" ? (
                            <button
                              onClick={() => updateStatus(assignment, "Returned")}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <CheckCircle2 size={14} />
                              Mark returned
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus(assignment, "Assigned")}
                              disabled={
                                !asset ||
                                asset.status === "Retired" ||
                                asset.status === "Maintenance" ||
                                assignments.some(
                                  (item) =>
                                    item.id !== assignment.id &&
                                    String(item.assetId) === String(assignment.assetId) &&
                                    item.status === "Assigned"
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowRightLeft size={14} />
                              Reassign
                            </button>
                          )}
                          <button
                            onClick={() => deleteAssignment(assignment)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            aria-label={`Delete assignment for ${getAssetName(asset)}`}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <Search size={22} />
                        </span>
                        <p className="mt-3 font-semibold text-slate-800">No assignments found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try another search or create an assignment to get started.
                        </p>
                        <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-violet-700 hover:text-violet-800">
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing <span className="font-semibold text-slate-700">{filteredAssignments.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{assignments.length}</span> assignments
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity size={14} />
              Assignment records are saved in the database
            </span>
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-form-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">Asset management</p>
                <h2 id="assignment-form-title" className="mt-1 text-xl font-bold text-slate-900">New assignment</h2>
                <p className="mt-1 text-sm text-slate-500">Select an available asset and the employee receiving it.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  Select asset <span className="text-rose-500">*</span>
                  <select required name="assetId" value={form.assetId} onChange={handleChange} className={inputClass}>
                    <option value="">Choose an available asset</option>
                    {assets
                      .filter(
                        (asset) =>
                          asset.status !== "Retired" &&
                          asset.status !== "Maintenance" &&
                          !assignments.some(
                            (item) =>
                              String(item.assetId) === String(asset.id) &&
                              item.status === "Assigned"
                          )
                      )
                      .map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} ({asset.assetTag || "No tag"})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  Select employee <span className="text-rose-500">*</span>
                  <select required name="employeeId" value={form.employeeId} onChange={handleChange} className={inputClass}>
                    <option value="">Choose an employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {getEmployeeName(employee)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Assignment date <span className="text-rose-500">*</span>
                  <input required type="date" name="assignedDate" value={form.assignedDate} onChange={handleChange} className={inputClass} />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Expected return date
                  <input type="date" name="expectedReturnDate" min={form.assignedDate} value={form.expectedReturnDate} onChange={handleChange} className={inputClass} />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  Notes
                  <textarea name="notes" value={form.notes} onChange={handleChange} className={inputClass} rows="3" placeholder="Optional assignment notes..." />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} className={buttonSecondary}>
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100">
                  <Plus size={17} />
                  Create assignment
                </button>
              </div>
              {assets.length === 0 && (
                <p className="px-6 pb-2 text-sm text-amber-700">Add an asset first from the Assets page.</p>
              )}
              {employees.length === 0 && (
                <p className="px-6 pb-5 text-sm text-amber-700">Add employees first from the Employees page.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assignments;
