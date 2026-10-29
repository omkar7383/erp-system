
import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  X,
  Search,
  UserRound,
  CalendarDays,
  FileCheck2,
  Clock3,
  ShieldCheck,
  BriefcaseBusiness,
  Filter,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

const API = "http://localhost:5000/api";

const documentTypes = [
  { value: "NDA_IP", label: "NDA / IP Agreement", icon: ShieldCheck },
  { value: "OFFER_LETTER", label: "Offer Letter", icon: BriefcaseBusiness },
  { value: "JOINING_LETTER", label: "Joining Letter", icon: FileCheck2 },
  {
    value: "INTERNSHIP_COMPLETION",
    label: "Internship Completion Letter",
    icon: FileText,
  },
];

const emptyForm = {
  employeeId: "",
  documentType: "OFFER_LETTER",
  documentNumber: "",
  issueDate: new Date().toISOString().slice(0, 10),
  remarks: "",
  status: "Draft",
};

const statusStyles = {
  Draft: "bg-amber-50 text-amber-700 ring-amber-200",
  Generated: "bg-blue-50 text-blue-700 ring-blue-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Revoked: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function HRDocuments() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("erp-token")}`,
    };
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [documentsResponse, employeesResponse] = await Promise.all([
        fetch(`${API}/hr-documents`, { headers: getHeaders() }),
        fetch(`${API}/employees`, { headers: getHeaders() }),
      ]);

      if (!documentsResponse.ok || !employeesResponse.ok) {
        throw new Error(
          "Data load nahi hua. Login session aur backend check karo."
        );
      }

      const documentsData = await documentsResponse.json();
      const employeesData = await employeesResponse.json();

      setDocuments(
        Array.isArray(documentsData)
          ? documentsData
          : documentsData.documents || documentsData.data || []
      );

      setEmployees(
        Array.isArray(employeesData)
          ? employeesData
          : employeesData.employees || employeesData.data || []
      );
    } catch (err) {
      setError(err.message || "Server se connect nahi ho pa raha.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function getDocumentId(doc) {
    return doc?._id || doc?.id;
  }

  function unwrapDocument(result) {
    return result?.data?.document || result?.data || result?.document || result;
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm, issueDate: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(doc) {
    const employeeId =
      typeof doc.employeeId === "object"
        ? doc.employeeId?._id || ""
        : doc.employeeId || "";

    setEditingId(getDocumentId(doc));
    setForm({
      employeeId,
      documentType: doc.documentType || "OFFER_LETTER",
      documentNumber: doc.documentNumber || "",
      issueDate: doc.issueDate
        ? new Date(doc.issueDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      remarks: doc.remarks || "",
      status: doc.status || "Draft",
    });
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDocument(event) {
    event.preventDefault();
    setFormError("");

    if (!form.employeeId || !form.documentType || !form.issueDate) {
      setFormError("Employee, document type aur issue date required hain.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        issueDate: new Date(`${form.issueDate}T12:00:00`).toISOString(),
      };

      if (!payload.documentNumber.trim()) delete payload.documentNumber;

      const isEditing = Boolean(editingId);
      const response = await fetch(
        isEditing ? `${API}/hr-documents/${editingId}` : `${API}/hr-documents`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            (isEditing ? "Document update nahi hua." : "Document create nahi hua.")
        );
      }

      const savedDocument = unwrapDocument(result);

      if (isEditing) {
        setDocuments((current) =>
          current.map((doc) =>
            String(getDocumentId(doc)) === String(editingId)
              ? savedDocument
              : doc
          )
        );
      } else {
        setDocuments((current) => [savedDocument, ...current]);
      }

      setForm({ ...emptyForm, issueDate: new Date().toISOString().slice(0, 10) });
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(err.message || "Document save karte waqt error aaya.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument(doc) {
    const id = getDocumentId(doc);
    if (!id) {
      setError("Document ID nahi mila, is record ko delete nahi kar sakte.");
      return;
    }

    const typeLabel =
      documentTypes.find((type) => type.value === doc.documentType)?.label ||
      doc.documentType ||
      "document";

    if (!window.confirm(`Delete "${typeLabel}" document? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API}/hr-documents/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Document delete nahi hua.");
      }

      setDocuments((current) =>
        current.filter((item) => String(getDocumentId(item)) !== String(id))
      );
      if (selectedDocument && String(getDocumentId(selectedDocument)) === String(id)) {
        setSelectedDocument(null);
      }
    } catch (err) {
      setError(err.message || "Document delete karte waqt error aaya.");
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const employeeName =
      doc.employeeId?.name ||
      doc.employeeId?.fullName ||
      doc.employeeId?.employeeName ||
      doc.employeeId?.email ||
      "";

    const typeLabel =
      documentTypes.find((type) => type.value === doc.documentType)?.label ||
      doc.documentType ||
      "";

    const matchesSearch =
      `${typeLabel} ${employeeName} ${doc.documentNumber || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesType =
      typeFilter === "ALL" || doc.documentType === typeFilter;

    const matchesStatus =
      statusFilter === "ALL" || (doc.status || "Draft") === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = [
    {
      label: "Total Documents",
      count: documents.length,
      icon: FileText,
      style: "bg-violet-50 text-violet-700",
      note: "All document records",
    },
    {
      label: "Draft",
      count: documents.filter((doc) => (doc.status || "Draft") === "Draft")
        .length,
      icon: Clock3,
      style: "bg-amber-50 text-amber-700",
      note: "Awaiting completion",
    },
    {
      label: "Generated",
      count: documents.filter((doc) => doc.status === "Generated").length,
      icon: FileCheck2,
      style: "bg-blue-50 text-blue-700",
      note: "Generated documents",
    },
    {
      label: "Approved",
      count: documents.filter((doc) => doc.status === "Approved").length,
      icon: ShieldCheck,
      style: "bg-emerald-50 text-emerald-700",
      note: "Approved records",
    },
  ];

  return (
    <div className="min-h-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            <span className="h-2 w-2 rounded-full bg-violet-600" />
            Human Resources
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            HR Documents
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage employee letters and internship documents.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
              setFormError("");
            } else {
              openCreateForm();
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Close Form" : "Create Document"}
        </button>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {stat.count}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${stat.style}`}>
                <stat.icon size={22} />
              </div>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {stat.note}
            </p>
          </div>
        ))}
      </section>

      {/* Document types */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">
            Document Categories
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your available document types.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {documentTypes.map((type) => {
            const Icon = type.icon;
            const count = documents.filter(
              (doc) => doc.documentType === type.value
            ).length;

            return (
              <button
                key={type.value}
                onClick={() =>
                  setTypeFilter((current) =>
                    current === type.value ? "ALL" : type.value
                  )
                }
                className={`rounded-2xl border bg-white p-4 text-left transition hover:border-violet-300 hover:shadow-sm ${
                  typeFilter === type.value
                    ? "border-violet-400 ring-2 ring-violet-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {type.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {count} record{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition ${
                      typeFilter === type.value ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={saveDocument}
          className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm"
        >
          <div className="flex items-start gap-3 border-b border-slate-100 bg-violet-50/50 p-5 sm:p-6">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                {editingId ? "Edit Document Record" : "Create Document Record"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingId ? "Update the document information below." : "Enter the employee and document information below."}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {formError && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound size={16} className="text-violet-600" />
                  Select Employee *
                </span>
                <select
                  name="employeeId"
                  value={form.employeeId}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">Choose an employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name ||
                        employee.fullName ||
                        employee.employeeName ||
                        employee.email ||
                        employee._id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileText size={16} className="text-violet-600" />
                  Document Type *
                </span>
                <select
                  name="documentType"
                  value={form.documentType}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                >
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Document Number
                </span>
                <input
                  name="documentNumber"
                  value={form.documentNumber}
                  onChange={updateField}
                  placeholder="e.g. HR-OFF-001"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays size={16} className="text-violet-600" />
                  Issue Date *
                </span>
                <input
                  type="date"
                  name="issueDate"
                  value={form.issueDate}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Status *
                </span>
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="Draft">Draft</option>
                  <option value="Generated">Generated</option>
                  <option value="Approved">Approved</option>
                  <option value="Revoked">Revoked</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">
                  Remarks
                </span>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={updateField}
                  rows={3}
                  placeholder="Add any additional notes..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </label>

            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-100 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update Document" : "Save Record"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Documents table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              All Documents
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredDocuments.length} of {documents.length} document
              record(s)
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Search and filters */}
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/70 p-4 md:grid-cols-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
            />
          </div>

          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-violet-400"
            >
              <option value="ALL">All document types</option>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-violet-400"
            >
              <option value="ALL">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Generated">Generated</option>
              <option value="Approved">Approved</option>
              <option value="Revoked">Revoked</option>
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading documents...
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 text-sm font-semibold text-violet-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <FileText size={27} />
            </div>
            <h3 className="font-semibold text-slate-800">
              No matching documents
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the filters or create a new document record.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="mt-4 text-sm font-semibold text-violet-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Document</th>
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Issue Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const type = documentTypes.find(
                    (item) => item.value === doc.documentType
                  );
                  const employeeName =
                    doc.employeeId?.name ||
                    doc.employeeId?.fullName ||
                    doc.employeeId?.employeeName ||
                    doc.employeeId?.email ||
                    "Employee";

                  return (
                    <tr
                      key={doc._id}
                      className="transition hover:bg-violet-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                            <FileText size={19} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {type?.label || doc.documentType}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {doc.documentNumber || "No document number"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {employeeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700">
                            {employeeName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {doc.issueDate
                          ? new Date(doc.issueDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                            statusStyles[doc.status || "Draft"] ||
                            statusStyles.Draft
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {doc.status || "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View document"
                            onClick={() => setSelectedDocument(doc)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            title="Edit document"
                            onClick={() => openEditForm(doc)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title="Delete document"
                            onClick={() => deleteDocument(doc)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
          <span>Showing {filteredDocuments.length} document(s)</span>
          <span>HR Documents Management</span>
        </div>
      </section>

      {selectedDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedDocument(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Document Details</h2>
                <p className="mt-1 text-sm text-slate-500">Review this HR document record.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close document details"
              >
                <X size={19} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                ["Document Type", documentTypes.find((type) => type.value === selectedDocument.documentType)?.label || selectedDocument.documentType || "—"],
                ["Document Number", selectedDocument.documentNumber || "Not provided"],
                ["Employee", selectedDocument.employeeId?.name || selectedDocument.employeeId?.fullName || selectedDocument.employeeId?.employeeName || selectedDocument.employeeId?.email || (typeof selectedDocument.employeeId === "string" ? selectedDocument.employeeId : "Employee")],
                ["Issue Date", selectedDocument.issueDate ? new Date(selectedDocument.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"],
                ["Status", selectedDocument.status || "Draft"],
                ["Remarks", selectedDocument.remarks || "No remarks"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-3 gap-3 border-b border-slate-100 pb-3 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="col-span-2 break-words text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDocument(null);
                  openEditForm(selectedDocument);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                <Pencil size={16} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
