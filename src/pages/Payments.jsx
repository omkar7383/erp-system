import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowDownToLine, CalendarDays, CheckCircle2, ChevronDown,
  CircleDollarSign, Clock3, CreditCard, FileText, Filter, Plus, Search,
  TrendingUp, Wallet, X, Pencil, Trash2, ReceiptText, Landmark,
  LayoutDashboard, BriefcaseBusiness, Users, Settings, BarChart3, MoreHorizontal
} from "lucide-react";

const API_URL = "/payments";
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

const getClientName = (client) =>
  client?.name || client?.clientName || client?.companyName || client?.company || client?.client || "";
const getInvoiceClientName = (invoice) =>
  typeof invoice?.client === "object"
    ? getClientName(invoice.client)
    : invoice?.client || invoice?.clientName || "";
const getInvoiceNumber = (invoice) => invoice?.number || invoice?.invoiceNumber || "";

const initialPayments = [
  { id: 1, reference: "PAY-1001", client: "ABC Technologies", invoice: "INV-1001", date: "2026-10-12", amount: 45000, method: "Bank Transfer", status: "Paid" },
  { id: 2, reference: "PAY-1002", client: "Bright Solutions", invoice: "INV-1002", date: "2026-10-15", amount: 28000, method: "UPI", status: "Paid" },
  { id: 3, reference: "PAY-1003", client: "Global Services", invoice: "INV-1003", date: "2026-10-18", amount: 15000, method: "Card", status: "Pending" },
];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const emptyForm = { client: "", invoice: "", date: todayISO(), amount: "", method: "Bank Transfer", status: "Pending" };
const methods = ["Bank Transfer", "UPI", "Cash", "Card", "Cheque", "Other"];
const currency = n => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const statusClass = { Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", Pending: "bg-amber-50 text-amber-700 ring-amber-600/20", Failed: "bg-rose-50 text-rose-700 ring-rose-600/20" };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const payload = await apiRequest(API_URL);
      setPayments(unwrapList(payload));
      setApiError("");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDropdownData() {
      try {
        const [clientsPayload, invoicesPayload] = await Promise.all([
          apiRequest("/clients"),
          apiRequest("/invoices"),
        ]);

        if (!cancelled) {
          setClients(unwrapList(clientsPayload));
          setInvoices(unwrapList(invoicesPayload));
        }
      } catch (error) {
        // Payment records remain usable if either optional dropdown endpoint fails.
        console.warn("Could not load client/invoice dropdown data:", error.message);
      }
    }

    loadDropdownData();
    return () => { cancelled = true; };
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);


  const filtered = useMemo(() => payments.filter(payment =>
    [payment.reference, payment.client, payment.invoice, payment.method].join(" ").toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === "All" || payment.status === statusFilter) &&
    (methodFilter === "All" || payment.method === methodFilter)
  ), [payments, search, statusFilter, methodFilter]);

  const totalReceived = payments.filter(payment => payment.status === "Paid").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalPending = payments.filter(payment => payment.status === "Pending").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalFailed = payments.filter(payment => payment.status === "Failed").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm, date: todayISO() }); setShowForm(true); };

  const handleInvoiceSelect = (invoiceId) => {
    const selectedInvoice = invoices.find((item) => String(item.id || item._id) === invoiceId);
    if (!selectedInvoice) {
      setForm((current) => ({ ...current, invoice: "" }));
      return;
    }

    const invoiceNumber = getInvoiceNumber(selectedInvoice);
    const clientName = getInvoiceClientName(selectedInvoice);
    setForm((current) => ({
      ...current,
      invoice: invoiceNumber,
      ...(clientName ? { client: clientName } : {}),
      ...(selectedInvoice.amount !== undefined ? { amount: String(selectedInvoice.amount) } : {}),
    }));
  };
  const openEdit = payment => {
    setEditingId(payment.id);
    setForm({ client: payment.client, invoice: payment.invoice || "", date: payment.date, amount: String(payment.amount), method: payment.method, status: payment.status });
    setShowForm(true);
  };
  const savePayment = async event => {
    event.preventDefault();
    const data = { ...form, amount: Number(form.amount) };
    try {
      if (editingId !== null) {
        const payload = await apiRequest(`${API_URL}/${editingId}`, { method: "PUT", body: JSON.stringify(data) });
        const updated = unwrapItem(payload);
        setPayments(current => current.map(payment => payment.id === editingId ? updated : payment));
      } else {
        const nextNumber = payments.reduce((max, payment) => Math.max(max, Number(String(payment.reference).replace("PAY-", "")) || 1000), 1000) + 1;
        const payload = await apiRequest(API_URL, { method: "POST", body: JSON.stringify({ ...data, reference: `PAY-${nextNumber}` }) });
        setPayments(current => [unwrapItem(payload), ...current]);
      }
      setApiError("");
      setShowForm(false); setEditingId(null); setForm(emptyForm);
    } catch (error) {
      setApiError(error.message);
      window.alert(`Could not save payment: ${error.message}`);
    }
  };
  const deletePayment = async id => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    try {
      await apiRequest(`${API_URL}/${id}`, { method: "DELETE" });
      setPayments(current => current.filter(payment => payment.id !== id));
    } catch (error) {
      setApiError(error.message);
      window.alert(`Could not delete payment: ${error.message}`);
    }
  };
  const exportCSV = () => {
    const rows = [["Reference", "Client", "Invoice", "Date", "Method", "Amount", "Status"], ...filtered.map(x => [x.reference, x.client, x.invoice, x.date, x.method, x.amount, x.status])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const metrics = [
    { label: "Payment records", value: payments.length, hint: "All recorded transactions", icon: ReceiptText, tone: "violet" },
    { label: "Total received", value: currency(totalReceived), hint: "Payments marked as paid", icon: CheckCircle2, tone: "emerald" },
    { label: "Pending amount", value: currency(totalPending), hint: "Awaiting confirmation", icon: Clock3, tone: "amber" },
    { label: "Failed amount", value: currency(totalFailed), hint: "Requires review", icon: CircleDollarSign, tone: "rose" },
  ];

  return <div className="min-h-full bg-[#f7f8fc] text-slate-900">
    <div className="min-w-0 w-full">
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <div className="mb-5 flex items-center gap-2 text-xs text-slate-500"><span>Home</span><span>›</span><span>Finance</span><span>›</span><span>Cash flow</span><span>›</span><span className="font-semibold text-violet-600">Payments</span></div>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-violet-600"><span className="h-2 w-2 rounded-full bg-violet-600"/> Finance / Cash flow</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Payments</h1><p className="mt-2 text-sm text-slate-500">Monitor incoming payments and keep transaction records up to date.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportCSV} className={secondary}><ArrowDownToLine size={16}/> Export</button><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"><Plus size={17}/> Record payment</button></div></div>

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({label, value, hint, icon: Icon, tone}) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,.025)]"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><div className={`rounded-xl p-3 ${tone==="violet"?"bg-violet-50 text-violet-600":tone==="emerald"?"bg-emerald-50 text-emerald-600":tone==="amber"?"bg-amber-50 text-amber-600":"bg-rose-50 text-rose-600"}`}><Icon size={20}/></div></div><div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><TrendingUp size={14} className="text-slate-400"/>{hint}</div></div>)}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,.025)]">{apiError && <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700"><span>{apiError}</span><button onClick={loadPayments} className="font-semibold underline">Retry</button></div>}{loading && <div className="px-5 py-4 text-sm text-slate-500">Loading payments...</div>}
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><ReceiptText size={20}/></div><div><h2 className="text-base font-semibold text-slate-900">Payment transactions</h2><p className="mt-1 text-sm text-slate-500">Search and review payment records by client, method, or status.</p></div></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filtered.length} records</span></div>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reference, client or invoice..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></div>
            <div className="relative"><Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-violet-400 sm:w-40"><option value="All">All statuses</option><option>Paid</option><option>Pending</option><option>Failed</option></select></div>
            <select value={methodFilter} onChange={e=>setMethodFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400"><option value="All">All payment methods</option>{methods.map(method=><option key={method}>{method}</option>)}</select>
            <button onClick={()=>{setSearch("");setStatusFilter("All");setMethodFilter("All");}} className={secondary}>Clear filters</button>
          </div>

          <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr>{["Reference","Client","Invoice","Date","Method","Amount","Status","Actions"].map(heading=><th key={heading} className="px-5 py-3.5 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
            {filtered.map(payment=><tr key={payment.id} className="transition hover:bg-slate-50/70">
              <td className="px-5 py-4"><div className="font-semibold text-violet-700">{payment.reference}</div><div className="mt-1 text-xs text-slate-400">Payment reference</div></td>
              <td className="px-5 py-4"><div className="font-semibold text-slate-800">{payment.client}</div></td>
              <td className="px-5 py-4 text-slate-600">{payment.invoice||"—"}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays size={14} className="text-slate-400"/>{payment.date}</span></td>
              <td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-slate-600">{payment.method==="Bank Transfer"?<Landmark size={15} className="text-slate-400"/>:<CreditCard size={15} className="text-slate-400"/>}{payment.method}</span></td>
              <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{currency(payment.amount)}</td>
              <td className="px-5 py-4"><select aria-label={`Status for ${payment.reference}`} value={payment.status} onChange={async event=>{const status=event.target.value;try{const payload=await apiRequest(`${API_URL}/${payment.id}`,{method:"PATCH",body:JSON.stringify({status})});const updated=unwrapItem(payload);setPayments(current=>current.map(item=>item.id===payment.id?updated:item));}catch(error){setApiError(error.message);window.alert(`Could not update payment: ${error.message}`);}}} className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset outline-none ${statusClass[payment.status]||statusClass.Pending}`}><option>Paid</option><option>Pending</option><option>Failed</option></select></td>
              <td className="px-5 py-4"><div className="flex items-center gap-1"><button title="Edit payment" onClick={()=>openEdit(payment)} className="rounded-lg p-2 text-slate-500 hover:bg-violet-50 hover:text-violet-700"><Pencil size={16}/></button><button title="Delete payment" onClick={()=>deletePayment(payment.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button><button title="Payment details" onClick={()=>window.alert(`Reference: ${payment.reference}\nClient: ${payment.client}\nMethod: ${payment.method}`)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={16}/></button></div></td>
            </tr>)}
            {!filtered.length&&<tr><td colSpan="8" className="px-5 py-16 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Wallet size={22}/></div><p className="font-semibold text-slate-700">No payments found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p></td></tr>}
          </tbody></table></div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing <strong className="text-slate-700">{filtered.length}</strong> of <strong className="text-slate-700">{payments.length}</strong> payment records</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Data connected to server</span></div>
        </section>
      </main>
    </div>

    {showForm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={event=>{if(event.target===event.currentTarget)setShowForm(false);}}><form onSubmit={savePayment} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-6"><div><h2 className="text-xl font-bold text-slate-950">{editingId!==null?"Edit payment":"Record payment"}</h2><p className="mt-1 text-sm text-slate-500">Add the transaction details below.</p></div><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19}/></button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Client name<select required name="client" value={form.client} onChange={event=>setForm({...form,client:event.target.value})} className={inputClass}><option value="">Select a client</option>{clients.map(client=>{const name=getClientName(client);return name?<option key={client.id||client._id||name} value={name}>{name}{client.email?` — ${client.email}`:""}</option>:null;})}{form.client && !clients.some(client=>getClientName(client)===form.client) && <option value={form.client}>{form.client} (existing payment)</option>}</select>{clients.length===0&&<span className="mt-1 block text-xs text-amber-600">No CRM clients loaded. Check the /api/clients endpoint.</span>}</label><label className="text-sm font-medium text-slate-700">Invoice number<select name="invoice" value={invoices.find(item=>getInvoiceNumber(item)===form.invoice)?.id || invoices.find(item=>getInvoiceNumber(item)===form.invoice)?._id || ""} onChange={event=>handleInvoiceSelect(event.target.value)} className={inputClass}><option value="">Select an invoice (optional)</option>{invoices.map(invoice=>{const number=getInvoiceNumber(invoice);const id=invoice.id||invoice._id;return number?<option key={id||number} value={id}>{number}{getInvoiceClientName(invoice)?` — ${getInvoiceClientName(invoice)}`:""}</option>:null;})}{form.invoice && !invoices.some(item=>getInvoiceNumber(item)===form.invoice) && <option value="">{form.invoice} (saved invoice)</option>}</select>{invoices.length===0&&<span className="mt-1 block text-xs text-amber-600">No invoices loaded. Check the /api/invoices endpoint.</span>}</label><label className="text-sm font-medium text-slate-700">Payment date<input required type="date" name="date" value={form.date} onChange={event=>setForm({...form,date:event.target.value})} className={inputClass}/></label><label className="text-sm font-medium text-slate-700">Amount (₹)<input required type="number" min="0.01" step="0.01" name="amount" value={form.amount} onChange={event=>setForm({...form,amount:event.target.value})} className={inputClass}/></label><label className="text-sm font-medium text-slate-700">Payment method<select name="method" value={form.method} onChange={event=>setForm({...form,method:event.target.value})} className={inputClass}>{methods.map(method=><option key={method}>{method}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Status<select name="status" value={form.status} onChange={event=>setForm({...form,status:event.target.value})} className={inputClass}><option>Pending</option><option>Paid</option><option>Failed</option></select></label></div><div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 p-5"><button type="button" onClick={()=>setShowForm(false)} className={secondary}>Cancel</button><button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">{editingId!==null?"Save changes":"Record payment"}</button></div></form></div>}
  </div>;
}
