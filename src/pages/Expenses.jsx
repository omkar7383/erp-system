import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowDownToLine, CalendarDays, CheckCircle2, ChevronDown,
  CircleDollarSign, Clock3, FileText, Filter, MoreHorizontal, Plus, Search,
  TrendingDown, Wallet, X, Pencil, Trash2, ReceiptText, LayoutDashboard,
  BriefcaseBusiness, Users, Settings, BarChart3
} from "lucide-react";

const API_URL = "/expenses";
const API_BASE = "http://localhost:5000/api";
const getToken = () => sessionStorage.getItem("erp-token");
async function apiRequest(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload;
}
const unwrapList = (payload) => {
  const rows = Array.isArray(payload) ? payload : payload.data || payload.invoices || payload.expenses || payload.payments || [];
  return rows.map((item) => ({ ...item, id: item.id || item._id }));
};
const unwrapItem = (payload) => {
  const item = payload.data || payload.invoice || payload.expense || payload.payment || payload;
  return { ...item, id: item.id || item._id };
};

const initialExpenses = [
  { id: 1, title: "Office Rent", category: "Office", date: "2026-10-01", amount: 25000, paidBy: "Admin", status: "Paid", notes: "Monthly office rent" },
  { id: 2, title: "Internet Bill", category: "Utilities", date: "2026-10-10", amount: 1500, paidBy: "Rahul", status: "Paid", notes: "Office internet" },
  { id: 3, title: "Software Subscription", category: "Software", date: "2026-10-18", amount: 4500, paidBy: "Admin", status: "Pending", notes: "Monthly subscription" },
];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const emptyForm = { title: "", category: "Office", date: todayISO(), amount: "", paidBy: "", status: "Pending", notes: "" };
const categories = ["Office", "Travel", "Utilities", "Software", "Equipment", "Marketing", "Salary", "Other"];
const currency = n => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const statusClass = { Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", Pending: "bg-amber-50 text-amber-700 ring-amber-600/20" };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [paidByDropdownOpen, setPaidByDropdownOpen] = useState(false);
  const [paidBySearch, setPaidBySearch] = useState("");

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const payload = await apiRequest(API_URL);
      setExpenses(unwrapList(payload));
      setApiError("");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExpenses(); }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEmployees = async () => {
      setEmployeeLoading(true);
      try {
        const payload = await apiRequest("/employees");
        const list = unwrapList(payload);
        if (!cancelled) setEmployees(list);
      } catch (error) {
        if (!cancelled) {
          setEmployees([]);
          console.error("Could not load employees:", error.message);
        }
      } finally {
        if (!cancelled) setEmployeeLoading(false);
      }
    };

    loadEmployees();
    return () => { cancelled = true; };
  }, []);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);


  const employeeOptions = useMemo(() => {
    const normalized = employees.map((employee) => {
      const name = employee.name || employee.fullName || employee.employeeName || employee.email || "Unnamed employee";
      const employeeCode = employee.employeeId || employee.empId || employee.code || "";
      const email = employee.email || "";
      return {
        id: String(employee.id || employee._id || name),
        name: String(name),
        label: employeeCode ? `${name} (${employeeCode})` : name,
        searchText: `${name} ${employeeCode} ${email}`.toLowerCase(),
      };
    });

    return [
      { id: "company-account", name: "Company Account", label: "Company Account", searchText: "company account company" },
      ...normalized,
    ];
  }, [employees]);

  const filteredEmployeeOptions = employeeOptions.filter((employee) =>
    employee.searchText.includes(paidBySearch.trim().toLowerCase())
  );

  const filtered = useMemo(() => expenses.filter(expense =>
    [expense.title, expense.paidBy, expense.notes, expense.category].join(" ").toLowerCase().includes(search.toLowerCase()) &&
    (categoryFilter === "All" || expense.category === categoryFilter) &&
    (statusFilter === "All" || expense.status === statusFilter)
  ), [expenses, search, categoryFilter, statusFilter]);

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const paid = expenses.filter(expense => expense.status === "Paid").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const pending = expenses.filter(expense => expense.status === "Pending").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: todayISO() });
    setPaidBySearch("");
    setPaidByDropdownOpen(false);
    setShowForm(true);
  };
  const openEdit = expense => {
    setEditingId(expense.id);
    setForm({ title: expense.title, category: expense.category, date: expense.date, amount: String(expense.amount), paidBy: expense.paidBy, status: expense.status, notes: expense.notes || "" });
    setPaidBySearch(expense.paidBy || "");
    setPaidByDropdownOpen(false);
    setShowForm(true);
  };
  const saveExpense = async event => {
    event.preventDefault();
    const data = { ...form, amount: Number(form.amount) };
    try {
      if (editingId !== null) {
        const payload = await apiRequest(`${API_URL}/${editingId}`, { method: "PUT", body: JSON.stringify(data) });
        const updated = unwrapItem(payload);
        setExpenses(current => current.map(expense => expense.id === editingId ? updated : expense));
      } else {
        const payload = await apiRequest(API_URL, { method: "POST", body: JSON.stringify(data) });
        setExpenses(current => [unwrapItem(payload), ...current]);
      }
      setApiError("");
      setShowForm(false); setEditingId(null); setForm(emptyForm);
    } catch (error) {
      setApiError(error.message);
      window.alert(`Could not save expense: ${error.message}`);
    }
  };
  const deleteExpense = async id => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await apiRequest(`${API_URL}/${id}`, { method: "DELETE" });
      setExpenses(current => current.filter(expense => expense.id !== id));
    } catch (error) {
      setApiError(error.message);
      window.alert(`Could not delete expense: ${error.message}`);
    }
  };
  const exportCSV = () => {
    const rows = [["Expense", "Category", "Date", "Amount", "Paid by", "Status", "Notes"], ...filtered.map(x => [x.title, x.category, x.date, x.amount, x.paidBy, x.status, x.notes])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "expenses.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const metrics = [
    { label: "Total expenses", value: currency(total), hint: "All recorded business costs", icon: CircleDollarSign, tone: "violet" },
    { label: "Paid expenses", value: currency(paid), hint: "Already settled", icon: CheckCircle2, tone: "emerald" },
    { label: "Pending expenses", value: currency(pending), hint: "Awaiting payment", icon: Clock3, tone: "amber" },
    { label: "Expense records", value: expenses.length, hint: "Total transactions logged", icon: ReceiptText, tone: "blue" },
  ];

  return <div className="min-h-full bg-[#f7f8fc] text-slate-900">
    <div className="min-w-0 w-full">
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <div className="mb-5 flex items-center gap-2 text-xs text-slate-500"><span>Home</span><span>›</span><span>Finance</span><span>›</span><span>Spend management</span><span>›</span><span className="font-semibold text-violet-600">Expenses</span></div>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-violet-600"><span className="h-2 w-2 rounded-full bg-violet-600"/> Finance / Spend management</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Expenses</h1><p className="mt-2 text-sm text-slate-500">Track business spending and keep every expense organized.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={exportCSV} className={secondary}><ArrowDownToLine size={16}/> Export</button><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"><Plus size={17}/> Add expense</button></div>
        </div>

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({label, value, hint, icon: Icon, tone}) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,.025)]"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><div className={`rounded-xl p-3 ${tone==="violet"?"bg-violet-50 text-violet-600":tone==="emerald"?"bg-emerald-50 text-emerald-600":tone==="amber"?"bg-amber-50 text-amber-600":"bg-sky-50 text-sky-600"}`}><Icon size={20}/></div></div><div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><TrendingDown size={14} className="text-slate-400"/>{hint}</div></div>)}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,.025)]">{apiError && <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700"><span>{apiError}</span><button onClick={loadExpenses} className="font-semibold underline">Retry</button></div>}{loading && <div className="px-5 py-4 text-sm text-slate-500">Loading expenses...</div>}
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><ReceiptText size={20}/></div><div><h2 className="text-base font-semibold text-slate-900">Expense records</h2><p className="mt-1 text-sm text-slate-500">Review expenses, categories, and payment progress.</p></div></div></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filtered.length} records</span></div>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses, payer or notes..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></div>
            <div className="relative"><Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-violet-400 sm:w-48"><option value="All">All categories</option>{categories.map(category=><option key={category}>{category}</option>)}</select></div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400"><option value="All">All statuses</option><option>Paid</option><option>Pending</option></select>
            <button onClick={()=>{setSearch("");setCategoryFilter("All");setStatusFilter("All");}} className={secondary}>Clear filters</button>
          </div>

          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr>{["Expense","Category","Date","Amount","Paid by","Status","Actions"].map(heading=><th key={heading} className="px-5 py-3.5 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
            {filtered.map(expense=><tr key={expense.id} className="transition hover:bg-slate-50/70">
              <td className="px-5 py-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><ReceiptText size={18}/></div><div><div className="font-semibold text-slate-800">{expense.title}</div>{expense.notes&&<div className="mt-1 max-w-xs text-xs text-slate-500">{expense.notes}</div>}</div></div></td>
              <td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{expense.category}</span></td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays size={14} className="text-slate-400"/>{expense.date}</span></td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{currency(expense.amount)}</td>
              <td className="px-5 py-4 text-slate-600">{expense.paidBy}</td>
              <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass[expense.status]||statusClass.Pending}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{expense.status}</span></td>
              <td className="px-5 py-4"><div className="flex items-center gap-1"><button title="Edit expense" onClick={()=>openEdit(expense)} className="rounded-lg p-2 text-slate-500 hover:bg-violet-50 hover:text-violet-700"><Pencil size={16}/></button><button title="Delete expense" onClick={()=>deleteExpense(expense.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button><button title="More options" onClick={()=>window.alert(`Expense: ${expense.title}\nCategory: ${expense.category}\nNotes: ${expense.notes||"—"}`)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={16}/></button></div></td>
            </tr>)}
            {!filtered.length&&<tr><td colSpan="7" className="px-5 py-16 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><ReceiptText size={22}/></div><p className="font-semibold text-slate-700">No expenses found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p></td></tr>}
          </tbody></table></div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing <strong className="text-slate-700">{filtered.length}</strong> of <strong className="text-slate-700">{expenses.length}</strong> expense records</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Data connected to server</span></div>
        </section>
      </main>
    </div>

    {showForm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget){setShowForm(false);setPaidByDropdownOpen(false);}}}><form onSubmit={saveExpense} onClick={e=>{if(!e.target.closest("#expense-paid-by-search") && !e.target.closest(".expense-paid-by-options")) setPaidByDropdownOpen(false);}} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-6"><div><h2 className="text-xl font-bold text-slate-950">{editingId!==null?"Edit expense":"Add expense"}</h2><p className="mt-1 text-sm text-slate-500">Fill in the expense details.</p></div><button type="button" onClick={()=>{setShowForm(false);setPaidByDropdownOpen(false);}} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19}/></button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Expense title<input required name="title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className={inputClass}/></label><label className="text-sm font-medium text-slate-700">Category<select name="category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className={inputClass}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Date<input required type="date" name="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className={inputClass}/></label><label className="text-sm font-medium text-slate-700">Amount (₹)<input required type="number" min="0.01" step="0.01" name="amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className={inputClass}/></label><div className="relative text-sm font-medium text-slate-700">
  <label htmlFor="expense-paid-by-search">Paid by <span className="text-rose-500">*</span></label>
  <input
    id="expense-paid-by-search"
    required
    name="paidBy"
    autoComplete="off"
    placeholder="Search employee or choose Company Account"
    value={paidByDropdownOpen ? paidBySearch : (form.paidBy || "")}
    onFocus={() => {
      setPaidBySearch(form.paidBy || "");
      setPaidByDropdownOpen(true);
    }}
    onChange={e => {
      setPaidBySearch(e.target.value);
      setForm({ ...form, paidBy: e.target.value });
      setPaidByDropdownOpen(true);
    }}
    className={inputClass}
  />
  {paidByDropdownOpen && <div className="expense-paid-by-options absolute left-0 right-0 top-full z-[70] mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
    {employeeLoading && <div className="px-3 py-2 text-xs text-slate-500">Loading employees...</div>}
    {!employeeLoading && filteredEmployeeOptions.map(employee => (
      <button
        key={employee.id}
        type="button"
        onMouseDown={event => event.preventDefault()}
        onClick={() => {
          setForm({ ...form, paidBy: employee.name });
          setPaidBySearch(employee.name);
          setPaidByDropdownOpen(false);
        }}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-violet-50 ${form.paidBy === employee.name ? "bg-violet-50 text-violet-700" : "text-slate-700"}`}
      >
        <span>{employee.label}</span>
        {form.paidBy === employee.name && <CheckCircle2 size={16} className="text-violet-600" />}
      </button>
    ))}
    {!employeeLoading && filteredEmployeeOptions.length === 0 && (
      <div className="px-3 py-3 text-xs text-slate-500">
        No matching employees. You can still enter a name manually.
      </div>
    )}
  </div>}
  <p className="mt-1 text-xs font-normal text-slate-500">Select an employee or Company Account.</p>
</div><label className="text-sm font-medium text-slate-700">Status<select name="status" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inputClass}><option>Pending</option><option>Paid</option></select></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Notes<textarea rows="3" name="notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={inputClass}/></label></div><div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 p-5"><button type="button" onClick={()=>{setShowForm(false);setPaidByDropdownOpen(false);}} className={secondary}>Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">{editingId!==null?"Save changes":"Add expense"}</button></div></form></div>}
  </div>;
}
