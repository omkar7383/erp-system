import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  House,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Target,
  Trash2,
  Users,
  UsersRound,
  UserRoundPlus,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/clients";

function getAuthHeaders(json = false) {
  const token = sessionStorage.getItem("erp-token");

  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        `Request failed (${response.status})`
    );
  }

  return payload;
}

function normalizeClient(client) {
  return {
    ...client,
    id: client.id || client._id,
    addedDate:
      client.addedDate ||
      (client.createdAt ? String(client.createdAt).slice(0, 10) : ""),
  };
}

const emptyForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "Lead",
  password: "",
};

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

/* Open Gmail in the browser with a pre-filled compose window. */
function openGmailCompose(client, onError) {
  if (!client?.email) {
    onError?.("This client does not have an email address.");
    return;
  }

  const subject = "Regarding our business relationship";
  const body = `Hi ${client.name || "there"},\n\n\nBest regards`;
  const gmailUrl = new URL("https://mail.google.com/mail/");

  gmailUrl.searchParams.set("view", "cm");
  gmailUrl.searchParams.set("fs", "1");
  gmailUrl.searchParams.set("to", client.email);
  gmailUrl.searchParams.set("su", subject);
  gmailUrl.searchParams.set("body", body);

  // Directly navigate to Gmail; this avoids the system mailto handler / Outlook.
  window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
}

function IconButton({
  label,
  onClick,
  tone = "neutral",
  children,
}) {
  const styles = {
    neutral:
      "border-slate-200 text-slate-600 hover:bg-slate-50",
    purple:
      "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100",
    red:
      "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

/* Statistics cards */

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  color,
}) {
  const styles = {
    purple: {
      bg: "bg-violet-100/80",
      text: "text-violet-600",
      card: "from-white via-white to-violet-50/70",
      bar: "bg-violet-500",
      softBar: "bg-violet-200",
      trend: "text-emerald-600 bg-emerald-50",
    },
    green: {
      bg: "bg-emerald-100/80",
      text: "text-emerald-600",
      card: "from-white via-white to-emerald-50/70",
      bar: "bg-emerald-500",
      softBar: "bg-emerald-200",
      trend: "text-slate-500 bg-slate-100",
    },
    blue: {
      bg: "bg-blue-100/80",
      text: "text-blue-600",
      card: "from-white via-white to-blue-50/70",
      bar: "bg-blue-500",
      softBar: "bg-blue-200",
      trend: "text-slate-500 bg-slate-100",
    },
  }[color];

  const barHeights = [
    "h-3",
    "h-4",
    "h-6",
    "h-8",
    "h-10",
  ];

  return (
    <div
      className={`flex min-h-[108px] items-center gap-4 rounded-2xl border border-slate-200/60 bg-gradient-to-br ${styles.card} px-4 py-3.5 shadow-[0_4px_16px_rgba(28,42,78,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(28,42,78,0.08)] sm:gap-5 sm:px-5`}
    >
      <span
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${styles.bg} ${styles.text}`}
      >
        <Icon size={31} strokeWidth={2.4} />
      </span>

      <div className="min-w-0 flex-1 self-center">
        <p className="text-[12px] font-semibold leading-4 text-slate-600 sm:text-[13px]">
          {title}
        </p>

        <p className="mt-1 text-[27px] font-bold leading-8 tracking-tight text-slate-950">
          {value}
        </p>

        <p className="mt-1.5 flex items-center gap-2 text-[11px] leading-4 text-slate-500 sm:text-xs">
          <span
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold ${styles.trend}`}
          >
            ↗
          </span>

          <span>{detail}</span>
        </p>
      </div>

      {/* Decorative mini bar chart */}

      <div
        className="hidden h-[46px] w-[54px] shrink-0 items-end justify-end gap-[3px] sm:flex"
        aria-hidden="true"
      >
        {barHeights.map((height, index) => (
          <span
            key={height}
            className={`w-[7px] rounded-t-[3px] ${
              index < 2 ? styles.softBar : styles.bar
            } ${height} ${index === 3 ? "opacity-90" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function CRM() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [clientToConvert, setClientToConvert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 5;

  /* Load clients from backend */

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(API_URL, {
          headers: getAuthHeaders(),
        });

        const payload = await parseApiResponse(response);

        const rows = Array.isArray(payload)
          ? payload
          : payload.data || payload.clients || [];

        if (!cancelled) {
          setClients(rows.map(normalizeClient));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load clients. Check the backend server and API route."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Statistics */

  const activeCount = clients.filter(
    (client) => client.status === "Active"
  ).length;

  const leadCount = clients.filter(
    (client) => client.status === "Lead"
  ).length;

  /* Search and filtering */

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clients.filter((client) => {
      const searchableText = [
        client.name,
        client.company,
        client.email,
        client.phone,
        client.status,
      ]
        .map((value) => value || "")
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const pageClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  /* Add client */

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  /* Edit client */

  function openEditForm(client) {
    setEditingId(client.id);

    setForm({
      name: client.name || "",
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      status: client.status || "Lead",
      password: "",
    });

    setShowForm(true);
    setOpenMenuId(null);
    setError("");
  }

  /* Save client */

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const isEditing = editingId !== null;

    if (!isEditing && form.password.length < 8) {
      setError(
        "Temporary password must be at least 8 characters."
      );
      setSaving(false);
      return;
    }

    const values = {
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
    };

    if (!isEditing) {
      values.password = form.password;
    }

    try {
      const response = await fetch(
        isEditing
          ? `${API_URL}/${editingId}`
          : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify(values),
        }
      );

      const payload = await parseApiResponse(response);

      const savedClient = normalizeClient(
        payload.data || payload.client || payload
      );

      if (isEditing) {
        setClients((current) =>
          current.map((client) =>
            client.id === editingId
              ? savedClient
              : client
          )
        );
      } else {
        setClients((current) => [
          savedClient,
          ...current,
        ]);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message || "Unable to save client.");
    } finally {
      setSaving(false);
    }
  }

  /* Delete client - confirmation modal */

  async function deleteClient(id) {
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    setClientToDelete(client);
    setOpenMenuId(null);
  }

  async function confirmDeleteClient() {
    if (!clientToDelete) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${clientToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      await parseApiResponse(response);

      setClients((current) =>
        current.filter((client) => client.id !== clientToDelete.id)
      );
      setSelectedIds((current) =>
        current.filter((selectedId) => selectedId !== clientToDelete.id)
      );
      setClientToDelete(null);
    } catch (err) {
      setError(err.message || "Unable to delete client.");
    } finally {
      setActionLoading(false);
    }
  }

  /* Convert a lead into an active client */

  async function confirmConvertToClient() {
    if (!clientToConvert) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${clientToConvert.id}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ ...clientToConvert, status: "Active" }),
      });

      const payload = await parseApiResponse(response);
      const updatedClient = normalizeClient(
        payload.data || payload.client || payload
      );

      setClients((current) =>
        current.map((client) =>
          client.id === clientToConvert.id
            ? { ...client, ...updatedClient, status: "Active" }
            : client
        )
      );
      setClientToConvert(null);
    } catch (err) {
      setError(err.message || "Unable to convert lead to client.");
    } finally {
      setActionLoading(false);
    }
  }

  /* Table selection */

  function toggleAllVisible(checked) {
    const visibleIds = pageClients.map(
      (client) => client.id
    );

    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, ...visibleIds])]
        : current.filter((id) => !visibleIds.includes(id))
    );
  }

  const allVisibleSelected =
    pageClients.length > 0 &&
    pageClients.every((client) =>
      selectedIds.includes(client.id)
    );

  /* Export CSV */

  function exportCsv() {
    const headers = [
      "Client",
      "Company",
      "Email",
      "Phone",
      "Status",
      "Added Date",
    ];

    const rows = filteredClients.map((client) => [
      client.name,
      client.company,
      client.email,
      client.phone,
      client.status,
      formatDate(client.addedDate),
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
    anchor.download = "erp-clients.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#172033]">
      {/* 
        No top navbar or sidebar is rendered here.
        The existing shared ERP layout handles those components.
      */}

      <main className="mx-auto w-full max-w-[1600px] px-5 py-5 sm:px-7 lg:px-8">
        {/* Error message */}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Page heading */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <House size={14} />
              <span>ERP</span>
              <ChevronRight size={14} />
              <span>CRM</span>
              <ChevronRight size={14} />
              <span className="font-semibold text-violet-700">
                Clients
              </span>
            </div>

            <h1 className="border-l-[3px] border-violet-600 pl-2 text-[29px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[32px]">
              Clients
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-[15px]">
              Manage your client relationships in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(109,40,217,0.22)] transition hover:from-violet-700 hover:to-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:self-auto"
          >
            <Plus size={19} />
            Add Client
          </button>
        </div>

        {/* Statistics cards */}

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Total Clients"
            value={clients.length}
            detail="+1 this month"
            icon={UsersRound}
            color="purple"
          />

          <MetricCard
            title="Active Clients"
            value={activeCount}
            detail="+0 this month"
            icon={Users}
            color="green"
          />

          <MetricCard
            title="Potential Leads"
            value={leadCount}
            detail="+0 this month"
            icon={Target}
            color="blue"
          />
        </section>

        {/* Clients table card */}

        <section className="mt-5 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.04)]">
          {/* Table header and table-level search */}

          <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 p-4 sm:p-5 xl:flex-row xl:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <UsersRound size={19} />
              </span>

              <div>
                <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
                  All Clients
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredClients.length} client(s) found

                  {selectedIds.length > 0 && (
                    <span className="ml-2 text-violet-700">
                      · {selectedIds.length} selected
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search within clients table */}

              <div className="flex h-10 min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:w-[260px]">
                <Search
                  size={19}
                  className="shrink-0 text-slate-500"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search name, company, email..."
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />

                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="text-slate-400"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Status filter */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowFilter((value) => !value)
                  }
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
                    statusFilter !== "All"
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={18} />
                  Filter

                  {statusFilter !== "All" && (
                    <span className="h-2 w-2 rounded-full bg-violet-600" />
                  )}
                </button>

                {showFilter && (
                  <div className="absolute right-0 top-14 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Filter by status
                    </p>

                    {[
                      "All",
                      "Active",
                      "Lead",
                      "Inactive",
                    ].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(status);
                          setShowFilter(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                          statusFilter === status
                            ? "bg-violet-50 font-semibold text-violet-700"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {status}

                        {statusFilter === status && (
                          <Check size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export */}

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>

          {/* Table */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  <th className="w-14 px-5 py-3.5">
                    <input
                      type="checkbox"
                      aria-label="Select all visible clients"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        toggleAllVisible(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                    />
                  </th>

                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3.5">Company</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Added Date</th>
                  <th className="px-5 py-3.5 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Loading clients from database...
                    </td>
                  </tr>
                )}

                {!loading &&
                  pageClients.map((client, index) => {
                    const avatars = [
                      "bg-violet-100 text-violet-700",
                      "bg-blue-100 text-blue-700",
                      "bg-orange-100 text-orange-700",
                      "bg-emerald-100 text-emerald-700",
                    ];

                    const statusStyle =
                      client.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : client.status === "Lead"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600";

                    const dotStyle =
                      client.status === "Active"
                        ? "bg-emerald-500"
                        : client.status === "Lead"
                          ? "bg-blue-500"
                          : "bg-slate-500";

                    return (
                      <tr
                        key={client.id}
                        className="group transition-colors hover:bg-[#fbfaff]"
                      >
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${client.name}`}
                            checked={selectedIds.includes(client.id)}
                            onChange={() =>
                              setSelectedIds((current) =>
                                current.includes(client.id)
                                  ? current.filter(
                                      (id) => id !== client.id
                                    )
                                  : [...current, client.id]
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex min-w-[210px] items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                avatars[index % avatars.length]
                              }`}
                            >
                              {initials(client.name)}
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900">
                                {client.name}
                              </span>

                              <span className="mt-1 block truncate text-xs text-slate-500">
                                {client.email}
                              </span>
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {client.company || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                            <Phone
                              size={15}
                              className="text-slate-500"
                            />
                            {client.phone || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${dotStyle}`}
                            />
                            {client.status || "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <CalendarDays
                              size={16}
                              className="text-slate-500"
                            />
                            {formatDate(client.addedDate)}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <IconButton
                              label={`Edit ${client.name}`}
                              tone="purple"
                              onClick={() => openEditForm(client)}
                            >
                              <Pencil size={17} />
                            </IconButton>

                            {client.status === "Lead" && (
                              <IconButton
                                label={`Convert ${client.name} to client`}
                                tone="neutral"
                                onClick={() => {
                                  setClientToConvert(client);
                                  setOpenMenuId(null);
                                }}
                              >
                                <UserRoundPlus size={17} className="text-emerald-600" />
                              </IconButton>
                            )}

                            <IconButton
                              label={`Delete ${client.name}`}
                              tone="red"
                              onClick={() => deleteClient(client.id)}
                            >
                              <Trash2 size={17} />
                            </IconButton>

                            <div className="relative">
                              <IconButton
                                label={`More actions for ${client.name}`}
                                onClick={() =>
                                  setOpenMenuId((value) =>
                                    value === client.id
                                      ? null
                                      : client.id
                                  )
                                }
                              >
                                <MoreHorizontal size={18} />
                              </IconButton>

                              {openMenuId === client.id && (
                                <div className="absolute right-0 top-11 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingClient(client);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                                  >
                                    <Eye size={15} />
                                    View client
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!client.email}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      openGmailCompose(client, setError);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Mail size={15} />
                                    Send email
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && pageClients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <Search size={22} />
                        </span>

                        <p className="mt-4 font-semibold text-slate-900">
                          No clients found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Try another search or change the status filter.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("All");
                          }}
                          className="mt-4 text-sm font-semibold text-violet-700"
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

          <div className="flex flex-col justify-between gap-3 border-t border-slate-200/80 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <p className="text-sm text-slate-500">
              {filteredClients.length === 0
                ? "Showing 0 clients"
                : `Showing ${
                    (currentPage - 1) * pageSize + 1
                  } to ${Math.min(
                    currentPage * pageSize,
                    filteredClients.length
                  )} of ${filteredClients.length} clients`}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage((value) => Math.max(1, value - 1))
                }
                aria-label="Previous page"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              )
                .slice(
                  Math.max(0, currentPage - 3),
                  currentPage + 2
                )
                .map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => setPage(number)}
                    className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold ${
                      number === currentPage
                        ? "bg-violet-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {number}
                  </button>
                ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((value) =>
                    Math.min(totalPages, value + 1)
                  )
                }
                aria-label="Next page"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* View Client modal */}
      {viewingClient && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingClient(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-client-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-lg font-bold text-violet-700">
                  {initials(viewingClient.name)}
                </span>
                <div className="min-w-0">
                  <h2 id="view-client-title" className="truncate text-xl font-bold text-slate-900">
                    {viewingClient.name || "Client details"}
                  </h2>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {viewingClient.company || "Company not provided"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingClient(null)}
                aria-label="Close client details"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 sm:px-7">
              {[
                { label: "Client name", value: viewingClient.name },
                { label: "Company", value: viewingClient.company },
                { label: "Email address", value: viewingClient.email },
                { label: "Phone number", value: viewingClient.phone },
                { label: "Status", value: viewingClient.status },
                { label: "Added date", value: formatDate(viewingClient.addedDate) },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1.5 break-words text-sm font-semibold text-slate-900">
                    {item.value || "—"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => setViewingClient(null)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!viewingClient.email}
                onClick={() => {
                  openGmailCompose(viewingClient, setError);
                  setViewingClient(null);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail size={16} />
                Send email
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Convert to Client confirmation modal */}
      {clientToConvert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="convert-client-title" className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><UserRoundPlus size={22} /></span>
                <div>
                  <h2 id="convert-client-title" className="text-sm font-bold text-slate-900">Convert to Client</h2>
                  <p className="mt-1 text-xs text-slate-500">Move this lead to clients.</p>
                </div>
              </div>
              <button type="button" onClick={() => setClientToConvert(null)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={17} /></button>
            </div>

            <div className="px-5 py-4">
              <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-xs leading-5 text-slate-600">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>This will move the selected lead to the Clients list and mark the lead as an active client.</span>
              </div>

              <div className="mt-3 space-y-1 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs leading-5 text-slate-500">
                <p><span className="font-medium text-slate-500">Name:</span> <span className="text-slate-700">{clientToConvert.name || "—"}</span></p>
                <p><span className="font-medium text-slate-500">Company:</span> <span className="text-slate-700">{clientToConvert.company || "—"}</span></p>
                <p><span className="font-medium text-slate-500">Email:</span> <span className="text-slate-700">{clientToConvert.email || "—"}</span></p>
                <p><span className="font-medium text-slate-500">Phone:</span> <span className="text-slate-700">{clientToConvert.phone || "—"}</span></p>
                <p><span className="font-medium text-slate-500">Status:</span> <span className="text-slate-700">{clientToConvert.status || "Lead"}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" disabled={actionLoading} onClick={() => setClientToConvert(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={confirmConvertToClient} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{actionLoading ? "Converting..." : "Convert to Client"}</button>
            </div>
          </section>
        </div>
      )}

      {/* Delete Client confirmation modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-client-title" className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={22} /></span>
                <div>
                  <h2 id="delete-client-title" className="text-sm font-bold text-slate-900">Delete Client</h2>
                  <p className="mt-1 text-xs text-slate-500">Permanently remove this client.</p>
                </div>
              </div>
              <button type="button" onClick={() => setClientToDelete(null)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={17} /></button>
            </div>

            <div className="px-5 py-4">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={29} /></span>
                <h3 className="mt-3 text-sm font-bold text-slate-900">Are you sure you want to delete this client?</h3>
                <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">This action cannot be undone. All client data, contacts, and associated information will be permanently removed.</p>
              </div>

              <div className="mt-4 space-y-1 rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-xs leading-5 text-slate-500">
                <p><span className="font-medium">Name:</span> <span className="text-slate-700">{clientToDelete.name || "—"}</span></p>
                <p><span className="font-medium">Company:</span> <span className="text-slate-700">{clientToDelete.company || "—"}</span></p>
                <p><span className="font-medium">Email:</span> <span className="text-slate-700">{clientToDelete.email || "—"}</span></p>
                <p><span className="font-medium">Phone:</span> <span className="text-slate-700">{clientToDelete.phone || "—"}</span></p>
                <p><span className="font-medium">Added Date:</span> <span className="text-slate-700">{formatDate(clientToDelete.addedDate)}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" disabled={actionLoading} onClick={() => setClientToDelete(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={actionLoading} onClick={confirmDeleteClient} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{actionLoading ? "Deleting..." : "Delete Client"}</button>
            </div>
          </section>
        </div>
      )}

      {/* Add / Edit Client modal */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <UsersRound size={22} />
                </span>

                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                  {editingId !== null
                    ? "Edit Client"
                    : "Add New Client"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the client's details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  name: "name",
                  label: "Client Name",
                  type: "text",
                  placeholder: "Enter full name",
                },
                {
                  name: "company",
                  label: "Company",
                  type: "text",
                  placeholder: "Enter company name",
                },
                {
                  name: "email",
                  label: "Email Address",
                  type: "email",
                  placeholder: "name@company.com",
                },
                {
                  name: "phone",
                  label: "Phone Number",
                  type: "tel",
                  placeholder: "Enter phone number",
                },
              ].map((field) => (
                <label key={field.name} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    {field.label}
                  </span>

                  <input
                    required
                    type={field.type}
                    value={form[field.name]}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
              ))}

              {editingId === null && (
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Temporary Password
                  </span>

                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    placeholder="At least 8 characters"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Set a temporary password and share it securely with the client.
                  </p>
                </label>
              )}

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                >
                  <option>Lead</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Add Client"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}