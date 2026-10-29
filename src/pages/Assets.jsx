import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Laptop,
  MapPin,
  Monitor,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
  Pencil,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/assets";

function getToken() { return sessionStorage.getItem("erp-token"); }
async function apiRequest(path = "", options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Assets API request failed");
  return payload;
}
function normalizeAsset(item) { return { ...item, id: String(item.id || item._id), value: String(item.value ?? "") }; }

const emptyAsset = {
  name: "",
  category: "Laptop",
  assetTag: "",
  purchaseDate: "",
  value: "",
  status: "Available",
  location: "",
  locationCustom: "",
};

const statusStyles = {
  Available: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Assigned: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  Maintenance: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  Retired: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100";

function formatCurrency(value) {
  const number = Number(String(value ?? "").replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}

function categoryIcon(category) {
  if (category === "Laptop" || category === "Desktop") return Laptop;
  if (category === "Monitor") return Monitor;
  if (category === "Furniture") return Boxes;
  return Package;
}

function Assets() {
  const [assets, setAssets] = useState([]);
  // Keep a dashboard-readable cache in sync with this API-backed module.
  useEffect(() => {
    try {
      localStorage.setItem("erp-assets", JSON.stringify(assets));
      window.dispatchEvent(new Event("erp-data-updated"));
    } catch (error) {
      console.warn("Could not sync assets dashboard cache:", error);
    }
  }, [assets]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAsset);

  async function loadAssets() {
    setLoading(true);
    setApiError("");
    try {
      const result = await apiRequest();
      const rows = Array.isArray(result) ? result : result.data || result.assets || [];
      setAssets(rows.map(normalizeAsset));
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssets(); }, []);

  const filteredAssets = useMemo(() => {
    const term = search.toLowerCase().trim();
    return assets.filter((asset) => {
      const matchesSearch = [
        asset.name,
        asset.category,
        asset.assetTag,
        asset.location,
        asset.status,
      ].some((value) => String(value || "").toLowerCase().includes(term));
      const matchesStatus = statusFilter === "All" || asset.status === statusFilter;
      const matchesCategory =
        categoryFilter === "All" || asset.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [assets, search, statusFilter, categoryFilter]);

  const stats = [
    {
      label: "Total assets",
      value: assets.length,
      helper: "All registered items",
      icon: Boxes,
      iconClass: "bg-violet-50 text-violet-700",
      valueClass: "text-slate-900",
    },
    {
      label: "Available",
      value: assets.filter((asset) => asset.status === "Available").length,
      helper: "Ready to assign",
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-700",
      valueClass: "text-emerald-700",
    },
    {
      label: "Assigned",
      value: assets.filter((asset) => asset.status === "Assigned").length,
      helper: "Currently in use",
      icon: ShieldCheck,
      iconClass: "bg-blue-50 text-blue-700",
      valueClass: "text-blue-700",
    },
    {
      label: "Maintenance",
      value: assets.filter((asset) => asset.status === "Maintenance").length,
      helper: "Needs attention",
      icon: Wrench,
      iconClass: "bg-amber-50 text-amber-700",
      valueClass: "text-amber-700",
    },
  ];

  function openAddForm() {
    setEditingId(null);
    setForm(emptyAsset);
    setShowForm(true);
  }

  function openEditForm(asset) {
    setEditingId(asset.id);
    const knownLocations = [
      "IT Department",
      "HR Department",
      "Finance Department",
      "Marketing Department",
      "Operations",
      "Storage Room",
      "Reception",
    ];
    const savedLocation = String(asset.location || "");
    setForm({
      ...emptyAsset,
      ...asset,
      location: !savedLocation
        ? ""
        : knownLocations.includes(savedLocation)
          ? savedLocation
          : "Other",
      locationCustom: knownLocations.includes(savedLocation) ? "" : savedLocation,
    });
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedTag = form.assetTag.trim().toLowerCase();
    const duplicate = assets.some(
      (asset) => String(asset.assetTag || "").trim().toLowerCase() === normalizedTag && String(asset.id) !== String(editingId)
    );
    if (duplicate) {
      window.alert("This asset tag already exists. Please use a unique tag.");
      return;
    }
    const cleaned = {
      ...form,
      name: form.name.trim(),
      assetTag: form.assetTag.trim(),
      location: (form.location === "Other"
        ? form.locationCustom
        : form.location).trim(),
      value: Number(form.value || 0),
    };
    try {
      if (editingId !== null) {
        const result = await apiRequest(`/${editingId}`, { method: "PUT", body: JSON.stringify(cleaned) });
        const saved = normalizeAsset(result.data || result.asset || result);
        setAssets((current) => current.map((asset) => String(asset.id) === String(editingId) ? saved : asset));
      } else {
        const result = await apiRequest("", { method: "POST", body: JSON.stringify(cleaned) });
        const saved = normalizeAsset(result.data || result.asset || result);
        setAssets((current) => [saved, ...current]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyAsset);
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function deleteAsset(id) {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    try {
      await apiRequest(`/${id}`, { method: "DELETE" });
      setAssets((current) => current.filter((asset) => String(asset.id) !== String(id)));
    } catch (error) {
      window.alert(error.message);
    }
  }

    function exportCSV() {
    const columns = [
      "name",
      "category",
      "assetTag",
      "purchaseDate",
      "value",
      "status",
      "location",
    ];
    const rows = [
      columns,
      ...filteredAssets.map((asset) =>
        columns.map((column) => asset[column] ?? "")
      ),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assets.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
  };

  return (
    // Page content only: the global sidebar and top navbar are supplied by App.jsx.
    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Operations / Asset management
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">
              Assets
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage company equipment, monitor availability, and keep asset records organized.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV} className={buttonSecondary}>
              <ArrowDownToLine size={17} />
              Export CSV
            </button>
            <button
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
            >
              <Plus size={18} />
              Add asset
            </button>
          </div>
        </div>

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
                    <Icon size={21} strokeWidth={2} />
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {apiError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Could not load assets: {apiError} <button onClick={loadAssets} className="ml-2 font-semibold underline">Retry</button></div>}
        {loading && <p className="text-sm text-slate-500">Loading assets from server...</p>}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Asset inventory</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and manage all registered equipment.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {filteredAssets.length} {filteredAssets.length === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-4 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search asset, tag, category, location..."
                aria-label="Search assets"
                className={`${inputClass} pl-10`}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
              <label className="relative block">
                <span className="sr-only">Filter by category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className={`${inputClass} min-w-[170px] appearance-none pr-9`}
                >
                  <option value="All">All categories</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Printer">Printer</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>
              <label className="relative block">
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={`${inputClass} min-w-[170px] appearance-none pr-9`}
                >
                  <option value="All">All statuses</option>
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Retired">Retired</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>
              {(search || statusFilter !== "All" || categoryFilter !== "All") && (
                <button onClick={clearFilters} className={buttonSecondary}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Asset tag</th>
                  <th className="px-5 py-4">Purchase date</th>
                  <th className="px-5 py-4">Value</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => {
                  const Icon = categoryIcon(asset.category);
                  return (
                    <tr key={asset.id} className="transition hover:bg-violet-50/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                            <Icon size={19} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">{asset.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{asset.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">{asset.assetTag || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{asset.purchaseDate || "—"}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{formatCurrency(asset.value)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <MapPin size={14} className="text-slate-400" />
                          {asset.location || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[asset.status] || statusStyles.Retired}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(asset)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                            aria-label={`Edit ${asset.name}`}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAsset(asset.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            aria-label={`Delete ${asset.name}`}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <Search size={22} />
                        </span>
                        <p className="mt-3 font-semibold text-slate-800">No assets found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing your search or filters, or add a new asset.
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
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing <span className="font-semibold text-slate-700">{filteredAssets.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{assets.length}</span> assets
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity size={14} />
              Inventory records are saved in the database
            </span>
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-form-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
                  Asset inventory
                </p>
                <h2 id="asset-form-title" className="mt-1 text-xl font-bold text-slate-900">
                  {editingId !== null ? "Edit asset" : "Add new asset"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the equipment details below.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Asset name <span className="text-rose-500">*</span>
                  <input required name="name" value={form.name} onChange={handleChange} className={inputClass} placeholder="e.g. Dell Latitude Laptop" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Asset tag <span className="text-rose-500">*</span>
                  <input required name="assetTag" value={form.assetTag} onChange={handleChange} className={inputClass} placeholder="e.g. AST-003" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Category <span className="text-rose-500">*</span>
                  <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                    <option>Laptop</option>
                    <option>Desktop</option>
                    <option>Monitor</option>
                    <option>Mobile</option>
                    <option>Printer</option>
                    <option>Furniture</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Purchase date
                  <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleChange} className={inputClass} />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Purchase value (₹)
                  <input type="number" min="0" name="value" value={form.value} onChange={handleChange} className={inputClass} placeholder="55000" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Status
                  <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                    <option>Available</option>
                    <option>Assigned</option>
                    <option>Maintenance</option>
                    <option>Retired</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  Location
                  <select
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select location</option>
                    <option value="IT Department">IT Department</option>
                    <option value="HR Department">HR Department</option>
                    <option value="Finance Department">Finance Department</option>
                    <option value="Marketing Department">Marketing Department</option>
                    <option value="Operations">Operations</option>
                    <option value="Storage Room">Storage Room</option>
                    <option value="Reception">Reception</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                {form.location === "Other" && (
                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Enter location
                    <input
                      name="locationCustom"
                      value={form.locationCustom}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Enter custom location"
                      required
                    />
                  </label>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} className={buttonSecondary}>
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100">
                  <Plus size={17} />
                  {editingId !== null ? "Save changes" : "Add asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;
