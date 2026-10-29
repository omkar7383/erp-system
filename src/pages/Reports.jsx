import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  RefreshCw,
  UsersRound,
  Wallet,
  Boxes,
  CalendarCheck,
  Plane,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const EMPTY_DATA = {
  employees: [],
  projects: [],
  invoices: [],
  expenses: [],
  assets: [],
  assignments: [],
  attendance: [],
  leaveRequests: [],
  payments: [],
};

async function fetchRecords(endpoint, token) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.message || `Failed to load ${endpoint}`);
  }

  const records = Array.isArray(result) ? result : result?.data;
  if (!Array.isArray(records)) {
    throw new Error(`Unexpected response from /api/${endpoint}`);
  }

  return records;
}

function amountOf(record) {
  const raw = record.amount ?? record.total ?? record.value ?? record.cost ?? 0;
  const amount = Number(String(raw).replace(/[₹,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const cardStyles = [
  { icon: UsersRound, tone: "bg-violet-50 text-violet-700", accent: "border-t-violet-500" },
  { icon: BriefcaseBusiness, tone: "bg-blue-50 text-blue-700", accent: "border-t-blue-500" },
  { icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-700", accent: "border-t-emerald-500" },
  { icon: Wallet, tone: "bg-amber-50 text-amber-700", accent: "border-t-amber-500" },
  { icon: Boxes, tone: "bg-indigo-50 text-indigo-700", accent: "border-t-indigo-500" },
  { icon: ClipboardList, tone: "bg-cyan-50 text-cyan-700", accent: "border-t-cyan-500" },
  { icon: CalendarCheck, tone: "bg-rose-50 text-rose-700", accent: "border-t-rose-500" },
  { icon: Plane, tone: "bg-orange-50 text-orange-700", accent: "border-t-orange-500" },
];

function SummaryCard({ label, value, note, style }) {
  const Icon = style.icon;
  return (
    <div className={`rounded-2xl border border-slate-200/80 border-t-2 ${style.accent} bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.tone}`}>
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

const tabOptions = ["Overview", "Finance", "HR", "Assets"];

function Reports() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportType, setReportType] = useState("Overview");
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("erp-token");
      if (!token) {
        setData(EMPTY_DATA);
        setError("Your session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const [
          employees,
          projects,
          invoices,
          expenses,
          assets,
          assignments,
          attendance,
          leaveRequests,
          payments,
        ] = await Promise.all([
          fetchRecords("employees", token),
          fetchRecords("projects", token),
          fetchRecords("invoices", token),
          fetchRecords("expenses", token),
          fetchRecords("assets", token),
          fetchRecords("assignments", token),
          fetchRecords("attendance", token),
          fetchRecords("leave-requests", token),
          fetchRecords("payments", token),
        ]);

        if (!cancelled) {
          setData({
            employees,
            projects,
            invoices,
            expenses,
            assets,
            assignments,
            attendance,
            leaveRequests,
            payments,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load reports from the server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const totalInvoiceAmount = data.invoices.reduce((sum, item) => sum + amountOf(item), 0);
  const totalExpenses = data.expenses.reduce((sum, item) => sum + amountOf(item), 0);
  const totalPayments = data.payments.reduce((sum, item) => sum + amountOf(item), 0);
  const availableAssets = data.assets.filter((item) => item.status === "Available").length;
  const assignedAssets = data.assets.filter((item) => item.status === "Assigned").length;
  const maintenanceAssets = data.assets.filter((item) => item.status === "Maintenance").length;
  const retiredAssets = data.assets.filter((item) => item.status === "Retired").length;

  const departmentRows = useMemo(() => {
    const counts = {};
    data.employees.forEach((employee) => {
      const department = employee.department || employee.team || "Unspecified";
      counts[department] = (counts[department] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data.employees]);

  const financeRows = [
    ["Invoices", data.invoices.length, totalInvoiceAmount],
    ["Expenses", data.expenses.length, totalExpenses],
    ["Payments", data.payments.length, totalPayments],
  ];

  const assetRows = [
    ["Available", availableAssets],
    ["Assigned", assignedAssets],
    ["Maintenance", maintenanceAssets],
    ["Retired", retiredAssets],
  ];

  function exportCSV() {
    let rows;
    if (reportType === "Finance") {
      rows = [["Category", "Records", "Total Amount (INR)"], ...financeRows];
    } else if (reportType === "HR") {
      rows = [["Department", "Employees"], ...departmentRows];
    } else if (reportType === "Assets") {
      rows = [["Asset Status", "Count"], ...assetRows];
    } else {
      rows = [
        ["Metric", "Value"],
        ["Employees", data.employees.length],
        ["Projects", data.projects.length],
        ["Invoices", data.invoices.length],
        ["Invoice Total INR", totalInvoiceAmount],
        ["Expenses", data.expenses.length],
        ["Expense Total INR", totalExpenses],
        ["Assets", data.assets.length],
        ["Assignments", data.assignments.length],
        ["Attendance Records", data.attendance.length],
        ["Leave Requests", data.leaveRequests.length],
      ];
    }

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `erp-${reportType.toLowerCase().replace(/\s+/g, "-")}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const overviewCards = [
    { label: "Total employees", value: data.employees.length, note: "Saved employee records", style: cardStyles[0] },
    { label: "Total projects", value: data.projects.length, note: "Saved project records", style: cardStyles[1] },
    { label: "Invoice value", value: formatCurrency(totalInvoiceAmount), note: `${data.invoices.length} invoice records`, style: cardStyles[2] },
    { label: "Total expenses", value: formatCurrency(totalExpenses), note: `${data.expenses.length} expense records`, style: cardStyles[3] },
    { label: "Total assets", value: data.assets.length, note: "Registered assets", style: cardStyles[4] },
    { label: "Assignments", value: data.assignments.length, note: "Asset assignment records", style: cardStyles[5] },
    { label: "Attendance records", value: data.attendance.length, note: "Saved attendance entries", style: cardStyles[6] },
    { label: "Leave requests", value: data.leaveRequests.length, note: "Saved leave requests", style: cardStyles[7] },
  ];

  return (
    // Content only: App.jsx provides the common ERP sidebar and top navbar.
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Analytics & insights
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">
              Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Get a quick overview of your ERP records and export module summaries.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRefreshKey((key) => key + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh data"}
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
            >
              <ArrowDownToLine size={17} />
              Export CSV
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
          {tabOptions.map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-violet-100 ${
                reportType === type
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {type}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-2 px-3 text-xs text-slate-400 sm:inline-flex">
            <Activity size={15} />
            MongoDB-backed data
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold">Could not load reports</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1">Check that the backend is running, the API routes are registered, and you are logged in.</p>
          </div>
        )}

        {loading && !error && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
            Loading report data from the server...
          </div>
        )}

        {!loading && !error && reportType === "Overview" && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  note={card.note}
                  style={card.style}
                />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
                  <div>
                    <h2 className="font-bold text-slate-900">Finance snapshot</h2>
                    <p className="mt-1 text-sm text-slate-500">Current invoice, expense and payment totals.</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <CircleDollarSign size={20} />
                  </span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {[
                    { label: "Invoice value", value: formatCurrency(totalInvoiceAmount), count: `${data.invoices.length} records` },
                    { label: "Expenses", value: formatCurrency(totalExpenses), count: `${data.expenses.length} records` },
                    { label: "Payments", value: formatCurrency(totalPayments), count: `${data.payments.length} records` },
                  ].map((item) => (
                    <div key={item.label} className="p-5">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{item.value}</p>
                      <p className="mt-2 text-xs text-slate-400">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <FileBarChart size={20} />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-900">Report notes</h2>
                    <p className="mt-1 text-xs text-slate-500">How these figures are calculated</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" /><span>Counts use records fetched from the ERP backend.</span></li>
                  <li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" /><span>Finance totals use each record’s amount, total, value, or cost field when available.</span></li>
                  <li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" /><span>This is an operational summary, not an audited financial statement.</span></li>
                </ul>
              </div>
            </section>
          </>
        )}

        {!loading && !error && reportType === "Finance" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
              <div>
                <h2 className="font-bold text-slate-900">Finance summary</h2>
                <p className="mt-1 text-sm text-slate-500">Totals based on saved finance records.</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CircleDollarSign size={20} /></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500">
                  <tr><th className="px-5 py-4">Category</th><th className="px-5 py-4">Records</th><th className="px-5 py-4">Total amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financeRows.map(([label, count, amount]) => (
                    <tr key={label} className="hover:bg-violet-50/30">
                      <td className="px-5 py-4 font-semibold text-slate-800">{label}</td>
                      <td className="px-5 py-4 text-slate-600">{count}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && !error && reportType === "HR" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5">
              <h2 className="font-bold text-slate-900">Department-wise employees</h2>
              <p className="mt-1 text-sm text-slate-500">Employees grouped by their saved department.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500">
                  <tr><th className="px-5 py-4">Department</th><th className="px-5 py-4">Employees</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departmentRows.map(([department, count]) => (
                    <tr key={department} className="hover:bg-violet-50/30">
                      <td className="px-5 py-4 font-medium text-slate-800">{department}</td>
                      <td className="px-5 py-4 text-slate-600">{count}</td>
                    </tr>
                  ))}
                  {departmentRows.length === 0 && (
                    <tr><td colSpan="2" className="px-5 py-12 text-center text-slate-500">No employee records found yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && !error && reportType === "Assets" && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {assetRows.map(([status, count], index) => (
              <SummaryCard
                key={status}
                label={status}
                value={count}
                note="Assets in this status"
                style={{
                  ...cardStyles[(index + 4) % cardStyles.length],
                  icon: index === 0 ? CheckCircle2 : index === 1 ? Boxes : index === 2 ? Activity : Plane,
                }}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export default Reports;
