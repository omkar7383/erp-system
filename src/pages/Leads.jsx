import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Handshake,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  UserRoundCheck,
  UserRoundPlus,
  UsersRound,
  X,
  RefreshCw,
  Download,
  Eye,
  ExternalLink,
  CalendarDays,
  Info,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/leads";
const CLIENTS_API_URL = "http://localhost:5000/api/clients";
const PAGE_SIZE = 5;

const EMPTY_FORM = {
  name: "",
  company: "",
  email: "",
  source: "Website",
  status: "New",
};

function getAuthHeaders() {
  const token = sessionStorage.getItem("erp-token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Request failed. Please try again.");
  }

  return result;
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

/* Compact KPI Card */

function MetricCard({ title, value, description, icon: Icon, color }) {
  const themes = {
    purple: {
      icon: "bg-violet-100 text-violet-600",
      bar: "bg-violet-500",
      glow: "from-violet-50/80",
      dot: "bg-violet-500",
    },
    blue: {
      icon: "bg-blue-100 text-blue-600",
      bar: "bg-blue-500",
      glow: "from-blue-50/80",
      dot: "bg-blue-500",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      bar: "bg-emerald-500",
      glow: "from-emerald-50/80",
      dot: "bg-emerald-500",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      bar: "bg-orange-500",
      glow: "from-orange-50/80",
      dot: "bg-orange-500",
    },
  };

  const theme = themes[color];
  const bars = [9, 14, 19, 25, 31];

  return (
    <div
      className={`group relative min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br ${theme.glow} to-white p-4 shadow-[0_2px_8px_rgba(30,41,59,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}
        >
          <Icon size={23} strokeWidth={2.5} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold leading-tight tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className="hidden h-10 shrink-0 items-end gap-[3px] sm:flex">
          {bars.map((height, index) => (
            <span
              key={index}
              style={{ height: `${height}px` }}
              className={`w-[4px] rounded-t-sm ${theme.bar} transition-opacity ${
                index === bars.length - 1 ? "opacity-100" : "opacity-55"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${theme.icon}`}
        >
          <ArrowUpRight size={11} strokeWidth={2.5} />
        </span>

        <p className="truncate text-[11px] font-medium text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  title,
  onClick,
  children,
  variant = "default",
}) {
  const styles = {
    default:
      "border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700",
    edit: "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100",
    convert:
      "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    delete:
      "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    New: "bg-blue-50 text-blue-700 ring-blue-600/10",
    Contacted: "bg-amber-50 text-amber-700 ring-amber-600/10",
    Qualified: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Lost: "bg-rose-50 text-rose-700 ring-rose-600/10",
  };

  const dots = {
    New: "bg-blue-500",
    Contacted: "bg-amber-500",
    Qualified: "bg-emerald-500",
    Lost: "bg-rose-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-slate-100 text-slate-600 ring-slate-500/10"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dots[status] || "bg-slate-400"
        }`}
      />
      {status || "Unknown"}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [openMenuPosition, setOpenMenuPosition] = useState({ top: 0, left: 0 });
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [emailLead, setEmailLead] = useState(null);

  async function loadLeads() {
    setLoading(true);
    setApiError("");

    try {
      const response = await fetch(API_URL, {
        headers: getAuthHeaders(),
      });

      const result = await parseResponse(response);
      const records = Array.isArray(result) ? result : result.data;

      setLeads(
        (records || []).map((lead) => ({
          ...lead,
          id: lead._id || lead.id,
        }))
      );
    } catch (error) {
      setApiError(error.message || "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const newCount = leads.filter((lead) => lead.status === "New").length;

  const qualifiedCount = leads.filter(
    (lead) => lead.status === "Qualified"
  ).length;

  const contactedCount = leads.filter(
    (lead) => lead.status === "Contacted"
  ).length;

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const searchableText = [
        lead.name,
        lead.company,
        lead.email,
        lead.source,
        lead.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(term);
      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  /* Pagination: 5 leads per page */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredLeads.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const pageLeads = filteredLeads.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(lead) {
    setEditingId(lead.id);

    setForm({
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      source: lead.source || "Website",
      status: lead.status || "New",
    });

    setShowForm(true);
    setOpenMenuId(null);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setApiError("");

    const values = {
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      source: form.source,
      status: form.status,
    };

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(values),
        }
      );

      const result = await parseResponse(response);
      const savedLead = result.data || result.lead || result;

      if (isEditing) {
        setLeads((current) =>
          current.map((lead) =>
            lead.id === editingId
              ? {
                  ...savedLead,
                  id: savedLead._id || savedLead.id || editingId,
                }
              : lead
          )
        );
      } else {
        setLeads((current) => [
          {
            ...savedLead,
            id: savedLead._id || savedLead.id,
          },
          ...current,
        ]);

        setPage(1);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setApiError(error.message || "Could not save lead.");
      window.alert(error.message || "Could not save lead.");
    } finally {
      setSaving(false);
    }
  }

  function deleteLead(id) {
    const lead = leads.find((item) => item.id === id);
    if (!lead) return;
    setConfirmAction({ type: "delete", lead });
    setOpenMenuId(null);
  }

  function convertLead(lead) {
    if (!lead) return;
    setConfirmAction({ type: "convert", lead });
    setOpenMenuId(null);
  }

  async function confirmDeleteLead() {
    const lead = confirmAction?.lead;
    if (!lead) return;
    setSaving(true);
    setApiError("");
    try {
      const response = await fetch(`${API_URL}/${lead.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      await parseResponse(response);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setConfirmAction(null);
      setOpenMenuId(null);
    } catch (error) {
      setApiError(error.message || "Could not delete lead.");
      window.alert(error.message || "Could not delete lead.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmConvertLead() {
    const lead = confirmAction?.lead;
    if (!lead) return;
    setSaving(true);
    try {
      const clientResponse = await fetch(CLIENTS_API_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: lead.name || "",
          company: lead.company || "",
          email: lead.email || "",
          phone: lead.phone || "",
          status: "Active",
          addedDate: new Date().toISOString().slice(0, 10),
        }),
      });
      await parseResponse(clientResponse);
      const deleteResponse = await fetch(`${API_URL}/${lead.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      await parseResponse(deleteResponse);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setConfirmAction(null);
      setOpenMenuId(null);
      window.alert(`${lead.name} has been converted to a client.`);
    } catch (error) {
      window.alert(error.message || "Could not convert lead to client.");
    } finally {
      setSaving(false);
    }
  }

  function openGmailCompose(lead) {
    if (!lead?.email) {
      window.alert("This lead does not have an email address.");
      return;
    }
    const subject = "Regarding Our Services";
    const body = `Hi ${lead.name || "there"},\n\nI hope you're doing well.\n\n`;
    const url = new URL("https://mail.google.com/mail/");
    url.searchParams.set("view", "cm");
    url.searchParams.set("fs", "1");
    url.searchParams.set("to", lead.email);
    url.searchParams.set("su", subject);
    url.searchParams.set("body", body);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setEmailLead(null);
    setOpenMenuId(null);
  }

  function exportCsv() {
    const headers = ["Lead", "Company", "Email", "Source", "Status"];

    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.company,
      lead.email,
      lead.source,
      lead.status,
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
    anchor.download = "erp-leads.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setShowFilter(false);
  }

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter(
    (number) =>
      number === 1 ||
      number === totalPages ||
      Math.abs(number - currentPage) <= 1
  );

  return (
    <div className="min-h-full bg-[#f7f8fc] px-4 py-6 text-slate-900 sm:px-6 sm:py-7 xl:px-8">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>CRM</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-violet-700">Leads</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Leads
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Manage potential customers and track sales opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/20 sm:self-auto"
        >
          <Plus size={18} />
          Add Lead
        </button>
      </div>

      {/* API Error */}
      {apiError && leads.length > 0 && (
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center">
          <span>{apiError}</span>

          <button
            type="button"
            onClick={loadLeads}
            className="inline-flex items-center gap-2 font-semibold hover:underline"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={leads.length}
          description="All sales opportunities"
          icon={UsersRound}
          color="purple"
        />

        <MetricCard
          title="New Leads"
          value={newCount}
          description="Awaiting first contact"
          icon={UserRoundPlus}
          color="blue"
        />

        <MetricCard
          title="Qualified Leads"
          value={qualifiedCount}
          description="Ready for next steps"
          icon={Target}
          color="green"
        />

        <MetricCard
          title="Contacted Leads"
          value={contactedCount}
          description="Follow-up in progress"
          icon={Handshake}
          color="orange"
        />
      </section>

      {/* Leads Table */}
      <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Target size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                All Leads
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredLeads.length}{" "}
                {filteredLeads.length === 1 ? "lead" : "leads"} found
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 sm:w-[260px]">
              <Search size={18} className="shrink-0 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search leads..."
                aria-label="Search leads"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilter((value) => !value)}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition sm:w-auto ${
                  statusFilter !== "All"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal size={17} />
                Filter
                <ChevronDown size={15} />
              </button>

              {showFilter && (
                <>
                  <button
                    type="button"
                    aria-label="Close filter"
                    onClick={() => setShowFilter(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />

                  <div className="absolute right-0 top-14 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Filter by status
                    </p>

                    {["All", "New", "Contacted", "Qualified", "Lost"].map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setStatusFilter(status);
                            setShowFilter(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                            statusFilter === status
                              ? "bg-violet-50 font-semibold text-violet-700"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {status}

                          {statusFilter === status && <Check size={16} />}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        {statusFilter !== "All" && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
            <span className="text-xs text-slate-500">Active filter:</span>

            <span className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              {statusFilter}

              <button
                type="button"
                aria-label="Remove status filter"
                onClick={() => setStatusFilter("All")}
              >
                <X size={13} />
              </button>
            </span>

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-violet-700"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Lead</th>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                      <span className="text-sm text-slate-500">
                        Loading leads...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && apiError && leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-900">
                      Unable to load leads
                    </p>

                    <p className="mt-2 text-sm text-slate-500">{apiError}</p>

                    <button
                      type="button"
                      onClick={loadLeads}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      <RefreshCw size={15} />
                      Try again
                    </button>
                  </td>
                </tr>
              )}

              {!loading &&
                !apiError &&
                pageLeads.map((lead, index) => {
                  const avatarColors = [
                    "bg-violet-100 text-violet-700",
                    "bg-blue-100 text-blue-700",
                    "bg-amber-100 text-amber-700",
                    "bg-emerald-100 text-emerald-700",
                    "bg-rose-100 text-rose-700",
                  ];

                  return (
                    <tr
                      key={lead.id}
                      className="group transition-colors hover:bg-[#fbfaff]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              avatarColors[index % avatarColors.length]
                            }`}
                          >
                            {getInitials(lead.name)}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {lead.name || "Unnamed lead"}
                            </p>

                            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                              <Mail size={12} />
                              {lead.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2
                            size={15}
                            className="shrink-0 text-slate-400"
                          />
                          {lead.company || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <Globe size={15} className="text-slate-400" />
                          {lead.source || "Other"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={lead.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton
                            title="Edit lead"
                            variant="edit"
                            onClick={() => openEditForm(lead)}
                          >
                            <Pencil size={15} />
                          </ActionButton>

                          <ActionButton
                            title="Convert to client"
                            variant="convert"
                            onClick={() => convertLead(lead)}
                          >
                            <UserRoundCheck size={16} />
                          </ActionButton>

                          <ActionButton
                            title="Delete lead"
                            variant="delete"
                            onClick={() => deleteLead(lead.id)}
                          >
                            <Trash2 size={15} />
                          </ActionButton>

                          <div className="relative">
                            <ActionButton
                              title="More actions"
                              onClick={(event) => {
                                if (openMenuId === lead.id) {
                                  setOpenMenuId(null);
                                  return;
                                }

                                const rect = event.currentTarget.getBoundingClientRect();
                                const menuHeight = 145;
                                const menuWidth = 192;
                                const top = rect.top >= menuHeight + 8
                                  ? rect.top - menuHeight - 8
                                  : rect.bottom + 8;
                                const left = Math.max(
                                  8,
                                  Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth)
                                );

                                setOpenMenuPosition({ top, left });
                                setOpenMenuId(lead.id);
                              }}
                            >
                              <MoreHorizontal size={18} />
                            </ActionButton>

                            {openMenuId === lead.id && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Close actions menu"
                                  onClick={() => setOpenMenuId(null)}
                                  className="fixed inset-0 z-40 cursor-default"
                                />

                                <div
                                  style={{ top: openMenuPosition.top, left: openMenuPosition.left }}
                                  className="fixed z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingLead(lead);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Eye size={15} />
                                    View Lead
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEmailLead(lead);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Mail size={15} />
                                    Send Email
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => convertLead(lead)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <UserRoundCheck size={15} />
                                    Convert to client
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !apiError && pageLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                        <Search size={24} />
                      </div>

                      <h3 className="mt-4 text-base font-semibold text-slate-900">
                        No leads found
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Try changing your search or filter.
                      </p>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-4 rounded-lg bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <p className="text-sm text-slate-500">
            {filteredLeads.length === 0
              ? "Showing 0 leads"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(
                  currentPage * PAGE_SIZE,
                  filteredLeads.length
                )} of ${filteredLeads.length} leads`}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>

            {pageNumbers.map((number, index) => {
              const previousNumber = pageNumbers[index - 1];

              return (
                <span key={number} className="flex items-center gap-2">
                  {previousNumber && number - previousNumber > 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setPage(number)}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
                      number === currentPage
                        ? "bg-violet-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {number}
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Add / Edit Lead Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-7">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  {editingId !== null ? (
                    <Pencil size={22} />
                  ) : (
                    <UserRoundPlus size={23} />
                  )}
                </div>

                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                  {editingId !== null ? "Edit Lead" : "Add New Lead"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingId !== null
                    ? "Update the lead's information below."
                    : "Enter the details to add a new lead."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-7">
              <FormField
                label="Lead Name"
                value={form.name}
                required
                placeholder="Enter full name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <FormField
                label="Company"
                value={form.company}
                placeholder="Enter company name"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    company: event.target.value,
                  }))
                }
              />

              <div className="sm:col-span-2">
                <FormField
                  label="Email Address"
                  type="email"
                  value={form.email}
                  required
                  placeholder="name@company.com"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Lead Source
                </span>

                <select
                  value={form.source}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                >
                  <option>Website</option>
                  <option>Referral</option>
                  <option>LinkedIn</option>
                  <option>Social Media</option>
                  <option>Cold Call</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Lead Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                >
                  <option>New</option>
                  <option>Contacted</option>
                  <option>Qualified</option>
                  <option>Lost</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 p-6 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    {editingId !== null ? "Save Changes" : "Add Lead"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Lead Details Modal */}
      {viewingLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && setViewingLead(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Eye size={21} /></div>
                <div><h2 className="text-lg font-bold text-slate-900">Lead Details</h2><p className="text-sm text-slate-500">View complete lead information.</p></div>
              </div>
              <button type="button" onClick={() => setViewingLead(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{getInitials(viewingLead.name)}</div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{viewingLead.name || "Unnamed lead"}</p><div className="mt-1"><StatusBadge status={viewingLead.status} /></div></div></div>
              {[["Email", viewingLead.email || "—"], ["Company", viewingLead.company || "—"], ["Source", viewingLead.source || "—"], ["Added Date", viewingLead.createdAt || viewingLead.addedDate || viewingLead.created_at ? new Date(viewingLead.createdAt || viewingLead.addedDate || viewingLead.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"], ["Status", viewingLead.status || "Unknown"]].map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] items-start gap-3 border-b border-slate-100 py-2.5 last:border-0"><span className="text-sm font-medium text-slate-500">{label}</span><span className="break-words text-sm font-medium text-slate-800">{value}</span></div>)}
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { const lead = viewingLead; setViewingLead(null); openEditForm(lead); }} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100"><Pencil size={15} /> Edit Lead</button><button type="button" onClick={() => { const lead = viewingLead; setViewingLead(null); convertLead(lead); }} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"><UserRoundCheck size={15} /> Convert to Client</button></div>
              <button type="button" onClick={() => setViewingLead(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Confirmation / Preview Modal */}
      {emailLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && setEmailLead(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Mail size={21} /></div><div><h2 className="font-bold text-slate-900">Send Email</h2><p className="text-sm text-slate-500">Open Gmail to contact this lead.</p></div></div><button type="button" onClick={() => setEmailLead(null)} aria-label="Close email preview" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
            <div className="space-y-4 p-5 sm:p-6">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">To</span><input readOnly value={emailLead.email || "No email address available"} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Subject</span><input readOnly value="Regarding Our Services" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Message</span><textarea readOnly rows={5} value={`Hi ${emailLead.name || "there"},

I hope you're doing well.

`} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700" /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 p-4"><button type="button" onClick={() => setEmailLead(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => openGmailCompose(emailLead)} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><ExternalLink size={15} /> Open Gmail</button></div>
          </div>
        </div>
      )}

      {/* Convert / Delete Confirmation Modals */}
      {confirmAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && !saving && setConfirmAction(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {confirmAction.type === "convert" ? (
              <>
                <div className="flex items-start justify-between p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><UserRoundCheck size={22} /></div><div><h2 className="font-bold text-slate-900">Convert to Client</h2><p className="mt-0.5 text-xs text-slate-500">Move this lead to clients.</p></div></div><button disabled={saving} type="button" onClick={() => setConfirmAction(null)} className="text-slate-400 hover:text-slate-700"><X size={19} /></button></div>
                <div className="mx-5 flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><Info size={16} className="mt-0.5 shrink-0" /><span>This will add the selected lead to the Clients list and remove it from Leads.</span></div>
                <div className="m-5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm"><p><span className="text-slate-500">Name: </span><span className="font-medium text-slate-800">{confirmAction.lead.name || "—"}</span></p><p><span className="text-slate-500">Company: </span><span className="font-medium text-slate-800">{confirmAction.lead.company || "—"}</span></p><p><span className="text-slate-500">Email: </span><span className="break-all font-medium text-slate-800">{confirmAction.lead.email || "—"}</span></p><p><span className="text-slate-500">Source: </span><span className="font-medium text-slate-800">{confirmAction.lead.source || "—"}</span></p><p className="flex items-center gap-2"><span className="text-slate-500">Status:</span><StatusBadge status={confirmAction.lead.status} /></p></div>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 p-4"><button disabled={saving} type="button" onClick={() => setConfirmAction(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button disabled={saving} type="button" onClick={confirmConvertLead} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? "Converting..." : "Convert to Client"}</button></div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={22} /></div><div><h2 className="font-bold text-slate-900">Delete Lead</h2><p className="mt-0.5 text-xs text-slate-500">Permanently remove this lead.</p></div></div><button disabled={saving} type="button" onClick={() => setConfirmAction(null)} className="text-slate-400 hover:text-slate-700"><X size={19} /></button></div>
                <div className="px-5 pb-2 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={28} /></div><h3 className="mt-4 text-sm font-bold text-slate-900">Are you sure you want to delete this lead?</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">This action cannot be undone. All lead data and associated information will be permanently removed.</p></div>
                <div className="mx-5 my-4 space-y-2 rounded-xl border border-rose-100 bg-rose-50/70 p-4 text-sm"><p><span className="text-slate-500">Name: </span><span className="font-medium text-slate-800">{confirmAction.lead.name || "—"}</span></p><p><span className="text-slate-500">Company: </span><span className="font-medium text-slate-800">{confirmAction.lead.company || "—"}</span></p><p><span className="text-slate-500">Email: </span><span className="break-all font-medium text-slate-800">{confirmAction.lead.email || "—"}</span></p><p><span className="text-slate-500">Source: </span><span className="font-medium text-slate-800">{confirmAction.lead.source || "—"}</span></p><p className="flex items-center gap-2"><span className="text-slate-500">Status:</span><StatusBadge status={confirmAction.lead.status} /></p></div>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 p-4"><button disabled={saving} type="button" onClick={() => setConfirmAction(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button disabled={saving} type="button" onClick={confirmDeleteLead} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? "Deleting..." : "Delete Lead"}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}