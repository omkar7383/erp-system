import { useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
  Activity, Bell, BriefcaseBusiness, Check, ChevronDown, ChevronRight,
  ChevronUp, ContactRound, FileBarChart, FileText, Filter, House, Layers3,
  LayoutDashboard, Menu, Pencil, Plus, Search, Settings, Trash2, UsersRound,
  X, Zap, ArrowRight, Download, Mail, UserRound, Building2, CircleDollarSign,
  UserCheck, UserX, MoreHorizontal, Camera, ShieldCheck, RefreshCw
} from "lucide-react";

const API_URL = "http://localhost:5000/api/employees";
const FACE_MODELS_URL = "/models";
let faceModelsLoadingPromise = null;

async function ensureFaceModelsLoaded() {
  if (
    faceapi.nets.ssdMobilenetv1.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  ) {
    return;
  }

  if (!faceModelsLoadingPromise) {
    faceModelsLoadingPromise = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_MODELS_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL),
    ]).catch((error) => {
      faceModelsLoadingPromise = null;
      throw error;
    });
  }

  await faceModelsLoadingPromise;
}

// Backend fields ko existing UI ke fields mein convert karta hai.
function mapEmployee(employee) {
  return {
    ...employee,
    id: employee._id,
    position: employee.designation || "",
    salary: String(employee.salary ?? ""),
    phone: employee.phone || "",
    joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : "",
    employmentType: employee.employmentType || "Full-time",
    employeeCode: employee.employeeCode || employee.employeeId || "",
    faceEnrollmentStatus: employee.faceEnrollmentStatus || employee.faceEnrollment?.status || "Not Enrolled",
  };
}

function getAuthHeaders(json = false) {
  const token = sessionStorage.getItem("erp-token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token || ""}`,
  };
}
const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  department: "Engineering",
  position: "",
  salary: "",
  status: "Active",
  joiningDate: new Date().toISOString().slice(0, 10),
  employmentType: "Full-time",
  employeeCode: "",
};
const departments = ["Engineering", "HR", "Finance", "Marketing", "Sales", "Operations"];
const statusStyles = { Active: "bg-emerald-50 text-emerald-700", "On Leave": "bg-amber-50 text-amber-700", Inactive: "bg-slate-100 text-slate-600" };
const navGroups = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "CRM", icon: ContactRound, children: [{ label: "Clients", href: "/crm/clients" }, { label: "Leads", href: "/crm/leads" }, { label: "Contacts", href: "/crm/contacts" }] },
  { label: "Projects", icon: BriefcaseBusiness, children: [{ label: "All Projects", href: "/projects" }, { label: "Tasks", href: "/tasks" }, { label: "Proposals", href: "/proposals" }] },
  { label: "HRMS", icon: UsersRound, children: [{ label: "Employees", href: "/employees" }, { label: "Attendance", href: "/attendance" }, { label: "Leave Requests", href: "/leave-requests" }] },
  { label: "Finance", icon: FileText, children: [{ label: "Invoices", href: "/invoices" }, { label: "Expenses", href: "/expenses" }, { label: "Payments", href: "/payments" }] },
  { label: "Assets", icon: Layers3, children: [{ label: "All Assets", href: "/assets" }, { label: "Assignments", href: "/assignments" }] },
  { label: "Reports", icon: FileBarChart, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
const money = (amount) => Number(amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const style = { purple: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", orange: "bg-amber-50 text-amber-600" }[tone];
  return <div className="flex min-h-[132px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_16px_rgba(28,42,78,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"><span className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl ${style}`}><Icon size={28} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-600">{title}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div></div>;
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  // Keep a dashboard-readable cache in sync with this API-backed module.
  useEffect(() => {
    try {
      localStorage.setItem("erp-employees", JSON.stringify(employees));
      window.dispatchEvent(new Event("erp-data-updated"));
    } catch (error) {
      console.warn("Could not sync employees dashboard cache:", error);
    }
  }, [employees]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState(["HRMS"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [enrollmentEmployee, setEnrollmentEmployee] = useState(null);
  const [biometricConsent, setBiometricConsent] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [enrollmentSaving, setEnrollmentSaving] = useState(false);
  const [enrollmentNotice, setEnrollmentNotice] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    async function loadEmployees() {
      setLoading(true);
      setApiError("");
      try {
        const response = await fetch(API_URL, { headers: getAuthHeaders() });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || `Failed to load employees (${response.status})`);
        }
        setEmployees(Array.isArray(result.data) ? result.data.map(mapEmployee) : []);
      } catch (error) {
        setApiError(error.message || "Could not load employees from the server.");
      } finally {
        setLoading(false);
      }
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    if (!enrollmentEmployee || capturedImage) return undefined;

    let cancelled = false;
    async function startCamera() {
      setCameraError("");
      setCameraReady(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported in this browser. Use localhost or HTTPS and try again.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setCameraReady(true);
        }
      } catch (error) {
        setCameraError(error.message || "Could not access the camera. Check browser permissions.");
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [enrollmentEmployee, capturedImage]);

  function openFaceEnrollment(employee) {
    setEnrollmentEmployee(employee);
    setBiometricConsent(false);
    setCameraError("");
    setCapturedImage("");
    setEnrollmentNotice("");
  }

  function closeFaceEnrollment() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setEnrollmentEmployee(null);
    setBiometricConsent(false);
    setCameraReady(false);
    setCapturedImage("");
    setCameraError("");
    setEnrollmentNotice("");
  }

  function captureEnrollmentImage() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.88));
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraReady(false);
    setCameraError("");
  }

  async function submitFaceEnrollment() {
    if (!enrollmentEmployee) return;
    if (!biometricConsent) {
      setCameraError("Employee consent is required before face enrollment.");
      return;
    }
    if (!capturedImage) {
      setCameraError("Capture a clear face image before submitting.");
      return;
    }

    setEnrollmentSaving(true);
    setCameraError("");
    setEnrollmentNotice("");
    try {
      // Generate a real 128-value face descriptor in the browser.
      // Model files in public/models must be complete and compatible with face-api.js.
      try {
        await ensureFaceModelsLoaded();
      } catch (modelError) {
        throw new Error(
          `Face models could not be loaded. Check public/models files and refresh the page. Details: ${modelError.message}`
        );
      }

      const imageElement = new Image();
      imageElement.src = capturedImage;
      await new Promise((resolve, reject) => {
        imageElement.onload = resolve;
        imageElement.onerror = () => reject(new Error("Could not load the captured face image."));
      });

      let detection;
      try {
        detection = await faceapi
          .detectSingleFace(
            imageElement,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
      } catch (modelError) {
        // A tensor shape/weight-count error normally means the model manifest and shard
        // files do not belong to the same model release; changing JSX cannot repair that.
        if (/tensor|shape|values|weight/i.test(modelError.message || "")) {
          throw new Error(
            "Face model weights do not match their manifest. Re-download all model manifest and shard files from the same face-api.js model release, then refresh. Details: " + modelError.message
          );
        }
        throw modelError;
      }

      if (!detection) {
        throw new Error(
          "No clear face detected. Retake the photo with your face centered, facing forward, and in good lighting."
        );
      }

      const faceDescriptor = Array.from(detection.descriptor);
      if (faceDescriptor.length !== 128 || !faceDescriptor.every(Number.isFinite)) {
        throw new Error("A valid 128-value face descriptor could not be generated. Please retake the photo.");
      }

      const response = await fetch(`${API_URL}/${enrollmentEmployee.id}/face-enrollment`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          faceDescriptor,
          consentGiven: biometricConsent,
          consentVersion: "v1",
          provider: "face-api.js",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message ||
          (response.status === 404
            ? "Face-enrollment API is not available yet. Backend route must be added before this feature can save enrollment."
            : `Face enrollment failed (${response.status}).`)
        );
      }

      const updatedEmployee = result.data?.employee || result.data || {};
      setEmployees((current) => current.map((employee) =>
        employee.id === enrollmentEmployee.id
          ? {
              ...employee,
              faceEnrollmentStatus:
                updatedEmployee.faceEnrollmentStatus ||
                updatedEmployee.faceEnrollment?.status ||
                "Enrolled",
              faceEnrollment: updatedEmployee.faceEnrollment || employee.faceEnrollment,
            }
          : employee
      ));
      setEnrollmentNotice(result.message || "Face enrollment saved successfully.");
      window.setTimeout(() => closeFaceEnrollment(), 1200);
    } catch (error) {
      setCameraError(error.message || "Could not save face enrollment.");
    } finally {
      setEnrollmentSaving(false);
    }
  }

  const filteredEmployees = useMemo(() => employees.filter((employee) => {
    const matchesSearch = [employee.name, employee.email, employee.phone, employee.employeeCode, employee.position, employee.department].join(" ").toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (department === "All" || employee.department === department) && (statusFilter === "All" || employee.status === statusFilter);
  }), [employees, search, department, statusFilter]);

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const leaveCount = employees.filter((e) => e.status === "On Leave").length;
  const deptCount = new Set(employees.map((e) => e.department).filter(Boolean)).size;
  const payroll = employees.filter((e) => e.status === "Active").reduce((sum, e) => sum + Number(e.salary || 0), 0);

  function openAddForm() { setEditingId(null); setForm(emptyForm); setShowForm(true); }
  function openEditForm(employee) { setEditingId(employee.id); setForm({ ...emptyForm, ...employee }); setShowForm(true); }
  async function saveEmployee(event) {
    event.preventDefault();
    setSaving(true);
    setApiError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      ...(editingId === null ? { password: form.password } : {}),
      department: form.department,
      designation: form.position.trim(),
      salary: Number(form.salary || 0),
      status: form.status,
      phone: form.phone.trim(),
      joiningDate: form.joiningDate,
      employmentType: form.employmentType,
    };

    try {
      const isEditing = editingId !== null;
      const response = await fetch(isEditing ? `${API_URL}/${editingId}` : API_URL, {
        method: isEditing ? "PUT" : "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Could not save employee (${response.status})`);
      }

      const savedEmployee = mapEmployee(result.data);
      if (isEditing) {
        setEmployees((current) => current.map((employee) => employee.id === editingId ? savedEmployee : employee));
      } else {
        setEmployees((current) => [savedEmployee, ...current]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      setApiError(error.message || "Could not save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(id) {
    const employee = employees.find((item) => item.id === id);
    if (!window.confirm(`Delete ${employee?.name || "this employee"}? This action cannot be undone.`)) return;

    setApiError("");
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Could not delete employee (${response.status})`);
      }
      setEmployees((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setApiError(error.message || "Could not delete employee.");
    }
  }
  function toggleGroup(label) { setExpandedGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]); }
  function exportCsv() {
    const headers = ["Employee ID", "Name", "Email", "Phone", "Department", "Position", "Employment Type", "Joining Date", "Salary", "Status"];
    const rows = filteredEmployees.map((e) => [e.employeeCode, e.name, e.email, e.phone, e.department, e.position, e.employmentType, e.joiningDate, e.salary, e.status]);
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["\uFEFF", [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "erp-employees.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen bg-[#f7f8fc] text-[#172033]">
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-white/5 bg-[#151a30] text-slate-200 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <a href="/" className="flex h-[78px] shrink-0 items-center gap-3 px-7 text-white"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600"><Layers3 size={23} /></span><span className="text-[19px] font-bold tracking-tight">ERP System</span></a>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">{navGroups.map((group) => { const Icon = group.icon; const expanded = expandedGroups.includes(group.label); if (group.children) return <div key={group.label}><button onClick={() => toggleGroup(group.label)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium ${group.label === "HRMS" ? "bg-white/[0.035] text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><Icon size={20} /><span className="flex-1">{group.label}</span>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{expanded && <div className="mt-1 space-y-1">{group.children.map((child) => { const active = child.label === "Employees"; const ChildIcon = child.label === "Employees" ? UsersRound : child.label === "Attendance" ? Activity : FileText; return <a key={child.label} href={child.href} className={`flex items-center gap-3 rounded-xl px-7 py-3 text-[13px] ${active ? "bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white shadow-md" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}><ChildIcon size={17} />{child.label}</a>; })}</div>}</div>; return <a key={group.label} href={group.href} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"><Icon size={20} />{group.label}</a>; })}</nav>
      <div className="m-3 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200"><Zap size={17} /></span>Upgrade to Pro</div><p className="mt-3 text-xs leading-5 text-slate-300">Unlock advanced features for your business.</p><button onClick={() => window.alert("Upgrade options can be connected here later.")} className="mt-3 flex w-full items-center justify-between text-xs font-semibold text-slate-100">Explore plans <ArrowRight size={15} /></button></div>
    </aside>
    <div className="min-h-screen lg:pl-[264px]">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-7 lg:px-8"><div className="flex min-w-0 flex-1 items-center gap-3"><button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button><div className="flex h-11 w-full max-w-[460px] items-center gap-3 rounded-xl border border-slate-200 bg-[#fbfcff] px-4 text-slate-400"><Search size={19} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /></div></div><div className="flex shrink-0 items-center gap-4 sm:gap-6"><button aria-label="Notifications" onClick={() => window.alert("You're all caught up!")} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><Bell size={21} /></button><button onClick={() => window.alert("Signed in as demo administrator.")} className="flex items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white">A</span><span className="hidden sm:block"><span className="block text-sm font-semibold text-slate-900">Admin</span><span className="mt-0.5 block text-xs text-slate-500">Administrator</span></span><ChevronDown size={16} className="hidden text-slate-500 sm:block" /></button></div></header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 sm:py-8 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500"><House size={14} />ERP <ChevronRight size={14} />HRMS <ChevronRight size={14} /><span className="font-semibold text-violet-700">Employees</span></div><h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-[#11182b] sm:text-[36px]">Employees</h1><p className="mt-2 text-[15px] text-slate-500 sm:text-base">Manage your team, employee information and payroll overview.</p></div><button onClick={openAddForm} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200/70 transition hover:bg-violet-700 sm:self-auto"><Plus size={19} />Add Employee</button></div>
        {apiError && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{apiError}</div>}
        {loading && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading employees from database...</div>}
        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard title="Total Employees" value={employees.length} detail="All employee records" icon={UsersRound} tone="purple" /><MetricCard title="Active Employees" value={activeCount} detail="Currently active" icon={UserCheck} tone="green" /><MetricCard title="On Leave" value={leaveCount} detail="Temporarily away" icon={UserX} tone="orange" /><MetricCard title="Monthly Active Payroll" value={money(payroll)} detail={`${deptCount} departments`} icon={CircleDollarSign} tone="blue" /></section>
        <section className="mt-6 overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(28,42,78,0.045)]">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 p-5 sm:p-6 xl:flex-row xl:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><UsersRound size={22} /></span><div><h2 className="text-[17px] font-bold text-slate-900">All Employees</h2><p className="mt-1 text-sm text-slate-500">{filteredEmployees.length} employee(s) found</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-3.5 sm:w-[250px]"><Search size={18} className="text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="min-w-0 w-full bg-transparent text-sm outline-none" /></div><select value={department} onChange={(e) => setDepartment(e.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-500"><option value="All">All Departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select><div className="relative"><button onClick={() => setShowFilter((v) => !v)} className={`inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${statusFilter !== "All" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><Filter size={17} />Status</button>{showFilter && <div className="absolute right-0 top-14 z-20 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{["All", "Active", "On Leave", "Inactive"].map((status) => <button key={status} onClick={() => { setStatusFilter(status); setShowFilter(false); }} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${statusFilter === status ? "bg-violet-50 font-semibold text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>{status === "All" ? "All statuses" : status}</button>)}</div>}</div><button onClick={exportCsv} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={17} />Export</button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] border-collapse text-left"><thead><tr className="border-b border-slate-200/80 bg-[#fafbfe] text-[11px] font-semibold uppercase tracking-wide text-slate-500">{["Employee", "Department", "Position", "Monthly Salary", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredEmployees.map((employee, index) => <tr key={employee.id} className="transition hover:bg-[#fbfaff]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700"][index % 4]}`}>{initials(employee.name)}</span><span><span className="block text-sm font-semibold text-slate-900">{employee.name}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Mail size={13} />{employee.email}</span><span className="mt-1 block text-xs text-slate-500">{employee.employeeCode ? `ID: ${employee.employeeCode} · ` : ""}{employee.phone || "No phone number"}</span><span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${employee.faceEnrollmentStatus === "Enrolled" ? "text-emerald-700" : "text-amber-700"}`}><ShieldCheck size={12} />Face: {employee.faceEnrollmentStatus}</span></span></div></td><td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-sm text-slate-600"><Building2 size={15} className="text-slate-400" />{employee.department}</span></td><td className="px-5 py-4 text-sm text-slate-600">{employee.position || "—"}</td><td className="px-5 py-4 text-sm font-semibold text-slate-800">{money(employee.salary)}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[employee.status] || statusStyles.Inactive}`}><span className={`h-2 w-2 rounded-full ${employee.status === "Active" ? "bg-emerald-500" : employee.status === "On Leave" ? "bg-amber-500" : "bg-slate-400"}`} />{employee.status}</span></td><td className="px-5 py-4"><div className="flex items-center gap-2"><button title="Enroll face / update biometric consent" onClick={() => openFaceEnrollment(employee)} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${employee.faceEnrollmentStatus === "Enrolled" ? "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}><Camera size={16} /></button><button title="Edit employee" onClick={() => openEditForm(employee)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"><Pencil size={16} /></button><button title="Delete employee" onClick={() => deleteEmployee(employee.id)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 size={16} /></button></div></td></tr>)}{filteredEmployees.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center"><Search size={24} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-900">No employees found</p><p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p><button onClick={() => { setSearch(""); setDepartment("All"); setStatusFilter("All"); }} className="mt-3 text-sm font-semibold text-violet-700">Clear filters</button></td></tr>}</tbody></table></div>
          <div className="border-t border-slate-200/80 px-5 py-4 text-sm text-slate-500">Showing {filteredEmployees.length} of {employees.length} employees</div>
        </section>
      </main>
    </div>
    {enrollmentEmployee && <div onClick={(e) => { if (e.target === e.currentTarget && !enrollmentSaving) closeFaceEnrollment(); }} className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="face-enrollment-title" className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Camera size={22} /></span><h2 id="face-enrollment-title" className="mt-3 text-xl font-bold text-slate-900">Face Enrollment</h2><p className="mt-1 text-sm text-slate-500">Employee: <strong className="text-slate-700">{enrollmentEmployee.name}</strong></p></div>
          <button type="button" disabled={enrollmentSaving} onClick={closeFaceEnrollment} aria-label="Close face enrollment" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-5 text-blue-800">Ask the employee for consent first. Capture a clear, front-facing image in good lighting. Face data must be processed and stored securely by the backend.</div>
          {cameraError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{cameraError}</div>}
          {enrollmentNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{enrollmentNotice}</div>}
          <div className="overflow-hidden rounded-xl bg-slate-950">
            {capturedImage ? <img src={capturedImage} alt="Captured employee face preview" className="mx-auto max-h-72 w-full object-contain" /> : <video ref={videoRef} autoPlay playsInline muted className="max-h-80 min-h-56 w-full object-contain" />}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex flex-wrap gap-2">
            {!capturedImage ? <button type="button" onClick={captureEnrollmentImage} disabled={!cameraReady} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Camera size={16} />{cameraReady ? "Capture Face" : "Starting camera..."}</button> : <button type="button" onClick={() => { setCapturedImage(""); setCameraError(""); }} disabled={enrollmentSaving} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} />Retake Photo</button>}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5">
            <input type="checkbox" checked={biometricConsent} onChange={(e) => setBiometricConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" />
            <span className="text-sm leading-5 text-slate-700">The employee has been informed and explicitly consents to their face data being used for attendance verification. <span className="mt-1 block text-xs text-slate-500">Do not check this box without the employee's permission.</span></span>
          </label>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={closeFaceEnrollment} disabled={enrollmentSaving} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={submitFaceEnrollment} disabled={enrollmentSaving || !capturedImage || !biometricConsent} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{enrollmentSaving ? "Saving Enrollment..." : <><ShieldCheck size={17} />Save Face Enrollment</>}</button>
        </div>
      </section>
    </div>}
    {showForm && <div onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"><form onSubmit={saveEmployee} className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><UsersRound size={22} /></span><h2 className="mt-4 text-xl font-bold text-slate-900">{editingId !== null ? "Edit Employee" : "Add New Employee"}</h2><p className="mt-1 text-sm text-slate-500">Keep employee details up to date.</p>{editingId !== null && form.employeeCode && <p className="mt-2 text-xs font-semibold text-violet-700">Employee ID: {form.employeeCode}</p>}{editingId === null && <p className="mt-2 text-xs text-slate-500">Employee ID will be generated automatically after saving.</p>}</div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Full Name<input required name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700">Email Address<input required type="email" name="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label>{editingId === null && <label className="text-sm font-medium text-slate-700">Temporary Password<input required type="password" name="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /><span className="mt-1 block text-xs text-slate-400">Give this password securely to the employee.</span></label>}<label className="text-sm font-medium text-slate-700">Employee ID<input type="text" value={form.employeeCode || (editingId !== null ? "Not assigned" : "Auto-generated after saving")} readOnly aria-readonly="true" className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500 outline-none" /><span className="mt-1 block text-xs text-slate-400">Generated automatically by the server.</span></label><label className="text-sm font-medium text-slate-700">Phone Number<input required type="tel" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Enter phone number" pattern="[0-9+() -]{7,20}" title="Enter a valid phone number" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700">Job Position<input required name="position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Enter position" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700">Monthly Salary (₹)<input required type="number" min="0" name="salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Enter salary" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700">Department<select name="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100">{departments.map((d) => <option key={d}>{d}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Joining Date<input required type="date" name="joiningDate" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></label><label className="text-sm font-medium text-slate-700">Employment Type<select name="employmentType" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option>Full-time</option><option>Part-time</option><option>Intern</option><option>Contract</option></select></label><label className="text-sm font-medium text-slate-700">Status<select name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><option>Active</option><option>On Leave</option><option>Inactive</option></select></label></div><div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : editingId !== null ? "Save Changes" : "Add Employee"}</button></div></form></div>}
  </div>;
}
