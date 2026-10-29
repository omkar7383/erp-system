import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowUpRight, CalendarDays, CheckCircle2, ChevronDown,
  CircleDollarSign, Clock3, FileText, Filter, MoreHorizontal, Plus, Search,
  TrendingUp, X, Pencil, Trash2, Wallet, AlertCircle
} from "lucide-react";

const API_URL = "/invoices";
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

const initialInvoices = [
  { id: 1, number: "INV-1001", client: "ABC Technologies", email: "billing@abc.com", issueDate: "2026-10-10", dueDate: "2026-10-25", amount: 45000, status: "Unpaid" },
  { id: 2, number: "INV-1002", client: "Bright Solutions", email: "accounts@bright.com", issueDate: "2026-10-05", dueDate: "2026-10-15", amount: 28000, status: "Paid" },
  { id: 3, number: "INV-1003", client: "Global Services", email: "finance@global.com", issueDate: "2026-09-20", dueDate: "2026-10-10", amount: 65000, status: "Overdue" },
];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const emptyForm = { client: "", email: "", issueDate: todayISO(), dueDate: "", amount: "", status: "Unpaid" };
const currency = (n) => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const getStatus = (invoice) => invoice.status === "Paid" ? "Paid" : invoice.dueDate && invoice.dueDate < todayISO() ? "Overdue" : "Unpaid";
const statusClasses = { Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", Unpaid: "bg-amber-50 text-amber-700 ring-amber-600/20", Overdue: "bg-rose-50 text-rose-700 ring-rose-600/20" };
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const buttonSecondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  // Keep a dashboard-readable cache in sync with this API-backed module.
  useEffect(() => {
    try {
      localStorage.setItem("erp-invoices", JSON.stringify(invoices));
      window.dispatchEvent(new Event("erp-data-updated"));
    } catch (error) {
      console.warn("Could not sync invoices dashboard cache:", error);
    }
  }, [invoices]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [clients, setClients] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const payload = await apiRequest(API_URL);
      setInvoices(unwrapList(payload));
      setApiError("");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  const loadClients = async () => {
    try {
      const payload = await apiRequest("/clients");
      const rows = Array.isArray(payload)
        ? payload
        : payload.data || payload.clients || [];
      setClients(rows.map((client) => ({
        ...client,
        id: client.id || client._id,
        displayName: client.name || client.companyName || client.clientName || client.fullName || client.email || "Unnamed client",
        displayEmail: client.email || client.contactEmail || client.billingEmail || "",
      })));
    } catch (error) {
      // Keep invoice management usable if the CRM clients endpoint is not available.
      setClients([]);
      console.warn("Could not load CRM clients:", error.message);
    }
  };

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setClientDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setClientDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [clientSearch, setClientSearch] = useState("");

  const normalized = useMemo(() => invoices.map(x => ({ ...x, displayStatus: getStatus(x) })), [invoices]);
  const filtered = normalized.filter(x => [x.number, x.client, x.email].join(" ").toLowerCase().includes(search.toLowerCase()) && (statusFilter === "All" || x.displayStatus === statusFilter));
  const filteredClients = clients.filter((client) =>
    `${client.displayName} ${client.displayEmail}`.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 8);
  const total = invoices.reduce((s, x) => s + Number(x.amount || 0), 0);
  const paid = normalized.filter(x => x.displayStatus === "Paid").reduce((s, x) => s + Number(x.amount || 0), 0);
  const unpaid = normalized.filter(x => x.displayStatus === "Unpaid").reduce((s, x) => s + Number(x.amount || 0), 0);
  const overdue = normalized.filter(x => x.displayStatus === "Overdue").reduce((s, x) => s + Number(x.amount || 0), 0);
  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm, issueDate: todayISO() }); setClientSearch(""); setClientDropdownOpen(false); setShowForm(true); };
  const openEdit = (x) => { setEditingId(x.id); setForm({ client:x.client || "", email:x.email || "", issueDate:x.issueDate, dueDate:x.dueDate, amount:String(x.amount), status:x.status }); setClientSearch(x.client || ""); setClientDropdownOpen(false); setShowForm(true); };
  const save = async (e) => {
    e.preventDefault();
    if (form.dueDate < form.issueDate) return window.alert("Due date cannot be earlier than issue date.");
    const data = { ...form, amount: Number(form.amount) };
    try {
      if (editingId !== null) {
        const payload = await apiRequest(`${API_URL}/${editingId}`, { method: "PUT", body: JSON.stringify(data) });
        const updated = unwrapItem(payload);
        setInvoices(curr => curr.map(x => x.id === editingId ? updated : x));
      } else {
        const next = invoices.reduce((m, x) => Math.max(m, Number(String(x.number).replace("INV-","")) || 1000), 1000) + 1;
        const payload = await apiRequest(API_URL, { method: "POST", body: JSON.stringify({ ...data, number: `INV-${next}` }) });
        setInvoices(curr => [unwrapItem(payload), ...curr]);
      }
      setApiError("");
      setShowForm(false); setEditingId(null); setForm(emptyForm);
    } catch (error) {
      setApiError(error.message);
      window.alert(`Could not save invoice: ${error.message}`);
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await apiRequest(`${API_URL}/${id}`, { method: "DELETE" });
      setInvoices(curr => curr.filter(x => x.id !== id));
    } catch (error) {
      setApiError(error.message);
      window.alert(`Could not delete invoice: ${error.message}`);
    }
  };
  const exportCSV = () => {
    const rows = [["Invoice","Client","Email","Issue date","Due date","Amount","Status"], ...filtered.map(x => [x.number,x.client,x.email,x.issueDate,x.dueDate,x.amount,x.displayStatus])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "invoices.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const metrics = [
    { label:"Total invoiced", value:currency(total), hint:`${invoices.length} invoice records`, icon:FileText, tone:"violet" },
    { label:"Paid amount", value:currency(paid), hint:"Successfully collected", icon:CheckCircle2, tone:"emerald" },
    { label:"Awaiting payment", value:currency(unpaid), hint:"Not yet past due", icon:Clock3, tone:"amber" },
    { label:"Overdue amount", value:currency(overdue), hint:"Needs follow-up", icon:AlertCircle, tone:"rose" },
  ];
  return <div className="min-h-full bg-[#f7f8fc] text-slate-900">
    <div className="min-w-0 w-full">
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5 flex items-center gap-2 text-xs text-slate-500"><span>Home</span><span>›</span><span>Finance</span><span>›</span><span>Accounts</span><span>›</span><span className="font-semibold text-violet-600">Invoices</span></div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-violet-600"><span className="h-2 w-2 rounded-full bg-violet-600"/> Finance / Accounts</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Invoices</h1><p className="mt-2 text-sm text-slate-500">Create, track, and manage your client invoices in one place.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={exportCSV} className={buttonSecondary}><ArrowDownToLine size={16}/> Export</button><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"><Plus size={17}/> Create invoice</button></div>
      </div>
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({label,value,hint,icon:Icon,tone}) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,.025)]"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><div className={`rounded-xl p-3 ${tone==="violet"?"bg-violet-50 text-violet-600":tone==="emerald"?"bg-emerald-50 text-emerald-600":tone==="amber"?"bg-amber-50 text-amber-600":"bg-rose-50 text-rose-600"}`}><Icon size={20}/></div></div><div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><TrendingUp size={14} className="text-slate-400"/>{hint}</div></div>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,.025)]">{apiError && <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700"><span>{apiError}</span><button onClick={loadInvoices} className="font-semibold underline">Retry</button></div>}{loading && <div className="px-5 py-4 text-sm text-slate-500">Loading invoices...</div>}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold text-slate-900">All invoices</h2><p className="mt-1 text-sm text-slate-500">A clear overview of billing and payment status.</p></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filtered.length} records</span></div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice, client or email..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></div>
          <div className="relative"><Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-violet-400"><option>All</option><option>Paid</option><option>Unpaid</option><option>Overdue</option></select></div>
          <button onClick={()=>{setSearch("");setStatusFilter("All");}} className={buttonSecondary}>Clear filters</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr>{["Invoice","Client","Issue date","Due date","Amount","Status","Actions"].map(h=><th key={h} className="px-5 py-3.5 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
          {filtered.map(x=><tr key={x.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="font-semibold text-violet-700">{x.number}</div><div className="mt-1 text-xs text-slate-400">Invoice document</div></td><td className="px-5 py-4"><div className="font-semibold text-slate-800">{x.client}</div><div className="mt-1 text-xs text-slate-500">{x.email}</div></td><td className="whitespace-nowrap px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays size={14} className="text-slate-400"/>{x.issueDate}</span></td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{x.dueDate}</td><td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{currency(x.amount)}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[x.displayStatus]}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{x.displayStatus}</span></td><td className="px-5 py-4"><div className="flex items-center gap-1"><button title="Edit invoice" onClick={()=>openEdit(x)} className="rounded-lg p-2 text-slate-500 hover:bg-violet-50 hover:text-violet-700"><Pencil size={16}/></button><button title={x.status==="Paid"?"Mark unpaid":"Mark paid"} onClick={async()=>{try{const status=x.status==="Paid"?"Unpaid":"Paid";const payload=await apiRequest(`${API_URL}/${x.id}`,{method:"PATCH",body:JSON.stringify({status})});const updated=unwrapItem(payload);setInvoices(curr=>curr.map(i=>i.id===x.id?updated:i));}catch(error){setApiError(error.message);window.alert(`Could not update invoice: ${error.message}`);}}} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><CheckCircle2 size={16}/></button><button title="Delete invoice" onClick={()=>remove(x.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button></div></td></tr>)}
          {!filtered.length&&<tr><td colSpan="7" className="px-5 py-16 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileText size={22}/></div><p className="font-semibold text-slate-700">No invoices found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p></td></tr>}
        </tbody></table></div>
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing <strong className="text-slate-700">{filtered.length}</strong> of <strong className="text-slate-700">{invoices.length}</strong> invoices</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Data connected to server</span></div>
      </section>
    </main>
    </div>
    {showForm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false);}}><form onSubmit={save} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-6"><div><h2 className="text-xl font-bold text-slate-950">{editingId!==null?"Edit invoice":"Create invoice"}</h2><p className="mt-1 text-sm text-slate-500">Enter the billing details below.</p></div><button type="button" onClick={()=>{setShowForm(false);setClientDropdownOpen(false);}} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19}/></button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><div ref={clientDropdownRef} className="relative text-sm font-medium text-slate-700"><label htmlFor="invoice-client-search">Client name</label><div className="relative mt-1.5"><input id="invoice-client-search" required autoComplete="off" value={clientDropdownOpen ? clientSearch : form.client} onFocus={() => { setClientSearch(form.client || ""); setClientDropdownOpen(true); }} onChange={(e) => { setClientSearch(e.target.value); setForm((current) => ({ ...current, client: e.target.value, email: "" })); setClientDropdownOpen(true); }} placeholder="Search and select a client..." className={inputClass} /><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>{clientDropdownOpen && <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{filteredClients.length ? filteredClients.map((client) => <button key={client.id || client.displayName} type="button" onClick={() => { setForm((current) => ({ ...current, client: client.displayName, email: client.displayEmail || current.email })); setClientSearch(client.displayName); setClientDropdownOpen(false); }} className="flex w-full items-start justify-between rounded-lg px-3 py-2.5 text-left hover:bg-violet-50"><span><span className="block font-medium text-slate-800">{client.displayName}</span>{client.displayEmail && <span className="mt-0.5 block text-xs font-normal text-slate-500">{client.displayEmail}</span>}</span>{form.client === client.displayName && <CheckCircle2 size={16} className="mt-0.5 text-violet-600" />}</button>) : <div className="px-3 py-4 text-sm font-normal text-slate-500">No clients found. You can still enter a client name manually.</div>}</div>}</div><label className="text-sm font-medium text-slate-700">Client email<input name="email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="billing@example.com" className={inputClass}/></label>{[["issueDate","Issue date","date"],["dueDate","Due date","date"],["amount","Amount (₹)","number"]].map(([name,label,type])=><label key={name} className="text-sm font-medium text-slate-700">{label}<input required name={name} type={type} min={type==="number"?"0.01":undefined} step={type==="number"?"0.01":undefined} value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})} className={inputClass}/></label>)}<label className="text-sm font-medium text-slate-700">Payment status<select name="status" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inputClass}><option>Unpaid</option><option>Paid</option></select></label></div><div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 p-5"><button type="button" onClick={()=>{setShowForm(false);setClientDropdownOpen(false);}} className={buttonSecondary}>Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">{editingId!==null?"Save changes":"Create invoice"}</button></div></form></div>}
  </div>;
}
  