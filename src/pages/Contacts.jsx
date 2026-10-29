import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ContactRound,
  Download,
  Filter,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  UserRoundPlus,
  X,
  Phone,
  Eye,
  RefreshCw,
} from "lucide-react";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  type: "Lead",
  status: "New",
};

const PAGE_SIZE = 5;
const API_URL = "http://localhost:5000/api/contacts";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function normalizeContact(contact) {
  return {
    ...contact,
    id: contact._id || contact.id,
    role: contact.role || contact.jobTitle || "",
    company: contact.company || "",
    email: contact.email || "",
    phone: contact.phone || "",
    type: contact.type || contact.contactType || "Lead",
    status: contact.status || "New",
  };
}

async function apiRequest(path = "", options = {}) {
  const token = sessionStorage.getItem("erp-token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message ||
        result.error ||
        `Request failed (${response.status})`
    );
  }

  return result;
}

/* -------------------------------------------------------
   KPI Card
------------------------------------------------------- */

function MetricCard({ title, value, detail, icon: Icon, color }) {
  const themes = {
    purple: {
      icon: "bg-violet-100 text-violet-600",
      bar: "bg-violet-500",
      glow: "from-violet-50/80",
    },
    blue: {
      icon: "bg-blue-100 text-blue-600",
      bar: "bg-blue-500",
      glow: "from-blue-50/80",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      bar: "bg-emerald-500",
      glow: "from-emerald-50/80",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      bar: "bg-orange-500",
      glow: "from-orange-50/80",
    },
  };

  const theme = themes[color];
  const barHeights = [12, 18, 24, 31, 37];

  return (
    <div
      className={`group min-w-0 rounded-xl border border-slate-200/80 bg-gradient-to-br ${theme.glow} to-white p-4 shadow-[0_2px_8px_rgba(30,41,59,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}
        >
          <Icon size={23} strokeWidth={2.4} />
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
          {barHeights.map((height, index) => (
            <span
              key={index}
              style={{ height: `${height}px` }}
              className={`w-1 rounded-t-sm ${theme.bar} ${
                index < 3 ? "opacity-60" : "opacity-100"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Activity size={10} strokeWidth={2.5} />
        </span>

        <p className="truncate text-[11px] font-medium text-slate-500">
          {detail}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Icon Action Button
------------------------------------------------------- */

function IconButton({
  label,
  onClick,
  tone = "neutral",
  children,
}) {
  const themes = {
    neutral:
      "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    purple:
      "border-violet-100 bg-violet-50 text-violet-600 hover:bg-violet-100",
    red:
      "border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100",
    green:
      "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${themes[tone]}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------
   Contact Type Badge
------------------------------------------------------- */

function TypeBadge({ type }) {
  const normalizedType = String(type || "").toLowerCase();

  const styles =
    normalizedType === "client"
      ? "bg-violet-50 text-violet-700"
      : "bg-orange-50 text-orange-600";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold ${styles}`}
    >
      {type || "—"}
    </span>
  );
}

/* -------------------------------------------------------
   Contact Status Badge
------------------------------------------------------- */

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "").toLowerCase();

  const themes = {
    active: {
      wrapper: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    },
    contacted: {
      wrapper: "bg-orange-50 text-orange-700",
      dot: "bg-orange-500",
    },
    new: {
      wrapper: "bg-blue-50 text-blue-700",
      dot: "bg-blue-500",
    },
    inactive: {
      wrapper: "bg-slate-100 text-slate-600",
      dot: "bg-slate-400",
    },
    lost: {
      wrapper: "bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
    },
  };

  const theme = themes[normalizedStatus] || themes.inactive;

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold ${theme.wrapper}`}
    >
      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
      {status || "—"}
    </span>
  );
}

/* -------------------------------------------------------
   Form Field
------------------------------------------------------- */

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

/* -------------------------------------------------------
   Form Select
------------------------------------------------------- */

function FormSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------------------------------
   Contacts Page
------------------------------------------------------- */

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [showFilter, setShowFilter] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("All");

  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  /* Load contacts */

  async function loadContacts() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest();

      const rows = Array.isArray(result)
        ? result
        : result.data || result.contacts || [];

      setContacts(rows.map(normalizeContact));
    } catch (err) {
      setError(err.message || "Could not load contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Company filter options */

  const companies = useMemo(
    () =>
      [
        ...new Set(
          contacts
            .map((contact) => (contact.company || "").trim())
            .filter(Boolean)
        ),
      ].sort(),
    [contacts]
  );

  /* Search and filter */

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const haystack = [
        contact.name,
        contact.email,
        contact.phone,
        contact.company,
        contact.role,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(term);
      const matchesCompany =
        companyFilter === "All" || contact.company === companyFilter;

      return matchesSearch && matchesCompany;
    });
  }, [contacts, search, companyFilter]);

  /* Pagination */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContacts.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const pageContacts = filteredContacts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, companyFilter]);

  /* KPI counts */

  const clientCount = contacts.filter(
    (contact) =>
      String(contact.type || contact.contactType || "").toLowerCase() ===
      "client"
  ).length;

  const newCount = contacts.filter(
    (contact) => String(contact.status || "").toLowerCase() === "new"
  ).length;

  const activeCount = contacts.filter(
    (contact) => String(contact.status || "").toLowerCase() === "active"
  ).length;

  /* Add contact */

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  /* Edit contact */

  function openEditForm(contact) {
    setEditingId(contact.id);

    setForm({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      role: contact.role || "",
      type: contact.type || contact.contactType || "Lead",
      status: contact.status || "New",
    });

    setShowForm(true);
    setOpenMenuId(null);
  }

  /* Close form */

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  /* Create or update contact */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || saving) return;

    const values = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        value.trim(),
      ])
    );

    setSaving(true);
    setError("");

    try {
      const result = await apiRequest(
        editingId !== null ? `/${editingId}` : "",
        {
          method: editingId !== null ? "PUT" : "POST",
          body: JSON.stringify(values),
        }
      );

      const saved = normalizeContact(
        result.data || result.contact || result
      );

      if (editingId !== null) {
        setContacts((current) =>
          current.map((contact) =>
            String(contact.id) === String(editingId)
              ? saved
              : contact
          )
        );
      } else {
        setContacts((current) => [saved, ...current]);
        setPage(1);
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err.message || "Could not save contact.");
    } finally {
      setSaving(false);
    }
  }

  /* Delete contact */

  async function deleteContact() {
    if (!deleteTarget?.id || deleting) return;

    setError("");
    setDeleting(true);

    try {
      await apiRequest(`/${deleteTarget.id}`, {
        method: "DELETE",
      });

      setContacts((current) =>
        current.filter((item) => String(item.id) !== String(deleteTarget.id))
      );
      setDeleteTarget(null);
      setOpenMenuId(null);
    } catch (err) {
      setError(err.message || "Could not delete contact.");
    } finally {
      setDeleting(false);
    }
  }

  /* CSV export */

  function exportCsv() {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Job Title",
      "Type",
      "Status",
    ];

    const rows = filteredContacts.map((contact) => [
      contact.name,
      contact.email,
      contact.phone,
      contact.company,
      contact.role,
      contact.type,
      contact.status,
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
    anchor.download = "erp-contacts.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  /* Clear filters */

  function clearFilters() {
    setSearch("");
    setCompanyFilter("All");
    setShowFilter(false);
  }

  /* Avatar colors */

  const avatarColors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];

  /* Pagination numbers */

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter(
    (number) =>
      number === 1 ||
      number === totalPages ||
      Math.abs(number - currentPage) <= 2
  );

  return (
    <div className="min-h-full bg-[#f7f8fc] px-4 py-5 text-[#172033] sm:px-6 sm:py-6 xl:px-7">
      {/* Page heading */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>ERP</span>
            <ChevronRight size={13} />
            <span>CRM</span>
            <ChevronRight size={13} />
            <span className="font-semibold text-violet-700">
              Contacts
            </span>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-8 w-1 rounded-full bg-violet-600" />

            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">
                Contacts
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                Manage your contacts and build stronger relationships.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(109,40,217,0.22)] transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:self-auto"
        >
          <Plus size={18} />
          Add Contact
        </button>
      </div>

      {/* Error message */}

      {error && (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={loadContacts}
            className="inline-flex items-center gap-2 font-semibold hover:underline"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Contacts"
          value={contacts.length}
          detail="All saved contacts"
          icon={UsersRound}
          color="purple"
        />

        <MetricCard
          title="Client Contacts"
          value={clientCount}
          detail="Contacts marked as clients"
          icon={Building2}
          color="blue"
        />

        <MetricCard
          title="New Contacts"
          value={newCount}
          detail="Contacts with new status"
          icon={UserRoundPlus}
          color="green"
        />

        <MetricCard
          title="Active Contacts"
          value={activeCount}
          detail="Contacts marked as active"
          icon={Mail}
          color="orange"
        />
      </section>

      {/* Contacts table */}

      <section className="mt-5 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(28,42,78,0.035)]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-4 sm:p-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <ContactRound size={22} />
            </span>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                All Contacts
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                {filteredContacts.length} contact(s) found
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 sm:w-[275px]">
              <Search size={18} className="shrink-0 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, company..."
                aria-label="Search contacts"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilter((value) => !value)}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition sm:w-auto ${
                  companyFilter !== "All"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={16} />
                Filter
                {showFilter ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              {showFilter && (
                <>
                  <button
                    type="button"
                    aria-label="Close filter"
                    onClick={() => setShowFilter(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />

                  <div className="absolute right-0 top-12 z-20 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Filter by company
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setCompanyFilter("All");
                        setShowFilter(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                        companyFilter === "All"
                          ? "bg-violet-50 font-semibold text-violet-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      All companies
                      {companyFilter === "All" && <Check size={15} />}
                    </button>

                    {companies.map((company) => (
                      <button
                        key={company}
                        type="button"
                        onClick={() => {
                          setCompanyFilter(company);
                          setShowFilter(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                          companyFilter === company
                            ? "bg-violet-50 font-semibold text-violet-700"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{company}</span>
                        {companyFilter === company && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {companyFilter !== "All" && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">Active filter:</span>

            <span className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              {companyFilter}

              <button
                type="button"
                aria-label="Remove company filter"
                onClick={() => setCompanyFilter("All")}
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
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-12 px-4 py-3.5 text-center">#</th>
                <th className="px-3 py-3.5">Name</th>
                <th className="px-3 py-3.5">Email</th>
                <th className="px-3 py-3.5">Phone</th>
                <th className="px-3 py-3.5">Company</th>
                <th className="px-3 py-3.5">Role</th>
                <th className="px-3 py-3.5">Type</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                      <span className="text-sm text-slate-500">
                        Loading contacts...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && contacts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <p className="font-semibold text-slate-900">
                      Unable to load contacts
                    </p>

                    <p className="mt-2 text-sm text-slate-500">{error}</p>

                    <button
                      type="button"
                      onClick={loadContacts}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      <RefreshCw size={15} />
                      Try again
                    </button>
                  </td>
                </tr>
              )}

              {!loading &&
                pageContacts.map((contact, index) => {
                  const contactType =
                    contact.type || contact.contactType || "";

                  const contactStatus = contact.status || "";

                  return (
                    <tr
                      key={contact.id}
                      className="group transition-colors hover:bg-[#fbfaff]"
                    >
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-400">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex min-w-[155px] items-center gap-2.5">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              avatarColors[
                                ((currentPage - 1) * PAGE_SIZE + index) %
                                  avatarColors.length
                              ]
                            }`}
                          >
                            {initials(contact.name)}
                          </span>

                          <p className="truncate text-xs font-semibold text-slate-900">
                            {contact.name || "Unnamed contact"}
                          </p>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className="block max-w-[190px] truncate text-xs text-slate-500">
                          {contact.email || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="whitespace-nowrap text-xs text-slate-600">
                          {contact.phone || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="block max-w-[150px] truncate text-xs text-slate-600">
                          {contact.company || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <span className="block max-w-[120px] truncate text-xs text-slate-600">
                          {contact.role || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        {contactType ? (
                          <TypeBadge type={contactType} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {contactStatus ? (
                          <StatusBadge status={contactStatus} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <IconButton
                            label={`Edit ${contact.name}`}
                            tone="purple"
                            onClick={() => openEditForm(contact)}
                          >
                            <Pencil size={15} />
                          </IconButton>

                          <IconButton
                            label={`Delete ${contact.name}`}
                            tone="red"
                            onClick={() => setDeleteTarget(contact)}
                          >
                            <Trash2 size={15} />
                          </IconButton>

                          <div className="relative">
                            <IconButton
                              label={`More actions for ${contact.name}`}
                              onClick={() =>
                                setOpenMenuId((current) =>
                                  current === contact.id ? null : contact.id
                                )
                              }
                            >
                              <MoreHorizontal size={17} />
                            </IconButton>

                            {openMenuId === contact.id && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Close actions menu"
                                  onClick={() => setOpenMenuId(null)}
                                  className="fixed inset-0 z-10 cursor-default"
                                />

                                <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setViewingContact(contact);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                                  >
                                    <Eye size={15} />
                                    View Details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);

                                      if (!contact.email) {
                                        window.alert("This contact has no email address.");
                                        return;
                                      }

                                      const gmailUrl = new URL("https://mail.google.com/mail/");
                                      gmailUrl.searchParams.set("view", "cm");
                                      gmailUrl.searchParams.set("fs", "1");
                                      gmailUrl.searchParams.set("to", contact.email);
                                      gmailUrl.searchParams.set("su", "Regarding our business relationship");
                                      gmailUrl.searchParams.set(
                                        "body",
                                        `Hi ${contact.name || "there"},\n\n\nBest regards`
                                      );
                                      window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                                  >
                                    <Mail size={15} />
                                    Send Email
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

              {!loading && !error && pageContacts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                        <Search size={22} />
                      </span>

                      <h3 className="mt-4 font-semibold text-slate-900">
                        No contacts found
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Try changing your search or company filter.
                      </p>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-4 rounded-lg bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
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

        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500 sm:text-sm">
            {filteredContacts.length === 0
              ? "Showing 0 contacts"
              : `Showing ${
                  (currentPage - 1) * PAGE_SIZE + 1
                } to ${Math.min(
                  currentPage * PAGE_SIZE,
                  filteredContacts.length
                )} of ${filteredContacts.length} contacts`}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((value) => Math.max(1, value - 1))
              }
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>

            {pageNumbers.map((number, index) => {
              const previousNumber = pageNumbers[index - 1];

              return (
                <span key={number} className="flex items-center gap-1.5">
                  {previousNumber && number - previousNumber > 1 && (
                    <span className="px-1 text-xs text-slate-400">
                      ...
                    </span>
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
                setPage((value) => Math.min(totalPages, value + 1))
              }
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Add / Edit Contact Modal */}

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
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal header */}

            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-7">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <ContactRound size={22} />
                </span>

                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                  {editingId !== null ? "Edit Contact" : "Add New Contact"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add or update the contact's information.
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

            {/* Form fields */}

            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-7">
              <FormField
                label="Full Name"
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
                label="Email Address"
                type="email"
                value={form.email}
                placeholder="name@company.com"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />

              <FormField
                label="Phone Number"
                type="tel"
                value={form.phone}
                placeholder="+91 98765 43210"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
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

              <FormField
                label="Job Title"
                value={form.role}
                placeholder="e.g. Account Manager"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              />

              <FormSelect
                label="Contact Type"
                value={form.type}
                options={[
                  { value: "Lead", label: "Lead" },
                  { value: "Client", label: "Client" },
                ]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              />

              <FormSelect
                label="Contact Status"
                value={form.status}
                options={[
                  { value: "New", label: "New" },
                  { value: "Contacted", label: "Contacted" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              />
            </div>

            {/* Modal footer */}

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
                    {editingId !== null ? "Save Changes" : "Add Contact"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-contact-title"
            className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Trash2 size={21} />
                </span>
                <div>
                  <h2 id="delete-contact-title" className="text-base font-bold text-slate-900">Delete Contact</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Remove this contact</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close delete confirmation"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-5 pt-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 size={29} strokeWidth={2.3} />
              </div>

              <h3 className="mt-4 text-center text-sm font-bold leading-5 text-slate-900">
                Are you sure you want to delete<br className="hidden sm:block" /> this contact?
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-center text-xs leading-4 text-slate-500">
                This action cannot be undone. All contact data and associated information will be permanently removed.
              </p>

              <div className="mt-4 space-y-1 rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-xs text-slate-600">
                <p><span className="font-medium">Name:</span> {deleteTarget.name || "—"}</p>
                <p><span className="font-medium">Email:</span> {deleteTarget.email || "—"}</p>
                <p><span className="font-medium">Phone:</span> {deleteTarget.phone || "—"}</p>
                <p><span className="font-medium">Company:</span> {deleteTarget.company || "—"}</p>
                <p><span className="font-medium">Role:</span> {deleteTarget.role || "—"}</p>
                <p><span className="font-medium">Type:</span> {deleteTarget.type || deleteTarget.contactType || "—"}</p>
                <p><span className="font-medium">Status:</span> {deleteTarget.status || "—"}</p>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={deleteContact}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Deleting...</>
                  ) : (
                    <><Trash2 size={15} /> Delete Contact</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Contact Details Modal */}
      {viewingContact && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingContact(null);
          }}
        >
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Eye size={22} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Contact Details</h2>
                  <p className="mt-1 text-sm text-slate-500">Complete information for this contact.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close contact details"
                onClick={() => setViewingContact(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {initials(viewingContact.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-slate-900">{viewingContact.name || "Unnamed contact"}</h3>
                  <p className="truncate text-sm text-slate-500">{viewingContact.role || "No job title"}</p>
                </div>
                <TypeBadge type={viewingContact.type || viewingContact.contactType || "Lead"} />
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 px-4">
                {[
                  { label: "Email", value: viewingContact.email, icon: Mail },
                  { label: "Phone", value: viewingContact.phone, icon: Phone },
                  { label: "Company", value: viewingContact.company, icon: Building2 },
                  { label: "Role", value: viewingContact.role, icon: UsersRound },
                ].map(({ label, value, icon: DetailIcon }) => (
                  <div key={label} className="flex items-center gap-3 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <DetailIcon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">{label}</p>
                      <p className="mt-0.5 break-words text-sm font-medium text-slate-700">{value || "—"}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-sm text-slate-500">Status</span>
                  <StatusBadge status={viewingContact.status || "—"} />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={() => setViewingContact(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    const selected = viewingContact;
                    setViewingContact(null);
                    openEditForm(selected);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  <Pencil size={15} /> Edit Contact
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selected = viewingContact;
                    setViewingContact(null);
                    if (!selected.email) {
                      window.alert("This contact has no email address.");
                      return;
                    }
                    const gmailUrl = new URL("https://mail.google.com/mail/");
                    gmailUrl.searchParams.set("view", "cm");
                    gmailUrl.searchParams.set("fs", "1");
                    gmailUrl.searchParams.set("to", selected.email);
                    gmailUrl.searchParams.set("su", "Regarding our business relationship");
                    gmailUrl.searchParams.set("body", `Hi ${selected.name || "there"},\n\n\nBest regards`);
                    window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  <Mail size={15} /> Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts;