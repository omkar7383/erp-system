
import { useState } from "react";
import { connectSocket } from "../utils/socket";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Handshake,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  FolderKanban,
  ReceiptText,
  CalendarCheck,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Boxes,
  LoaderCircle,
  Shield,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const ROLES = {
  admin: {
    title: "Admin",
    loginTitle: "Admin Login",
    portal: "ADMIN PORTAL",
    description: "Sign in to access the admin dashboard.",
    headline: "Manage your business efficiently.",
    details:
      "Access all modules including projects, clients, employees, finance, assets and more.",
    button: "Sign in to Admin Panel",
    icon: ShieldCheck,
    color: "violet",
    placeholder: "admin@company.com",
  },
  employee: {
    title: "Employee",
    loginTitle: "Employee Login",
    portal: "EMPLOYEE PORTAL",
    description: "Sign in to access your employee portal.",
    headline: "Your work, your progress.",
    details:
      "View your profile, attendance, leave requests and stay updated.",
    button: "Sign in to Employee Portal",
    icon: Users,
    color: "blue",
    placeholder: "employee@company.com",
  },
  client: {
    title: "Client",
    loginTitle: "Client Login",
    portal: "CLIENT PORTAL",
    description: "Sign in to access your client portal.",
    headline: "Collaborate with confidence.",
    details:
      "Access your projects, proposals, invoices and stay connected.",
    button: "Sign in to Client Portal",
    icon: Handshake,
    color: "orange",
    placeholder: "client@company.com",
  },
};

const ROLE_STYLES = {
  admin: {
    iconBg: "bg-violet-100",
    iconText: "text-violet-700",
    border: "border-violet-200",
    hover: "hover:border-violet-400 hover:bg-violet-50/50",
    arrowBg: "bg-violet-100",
    arrowText: "text-violet-700",
    button: "bg-violet-600 hover:bg-violet-700",
    badge: "bg-violet-100 text-violet-700",
  },
  employee: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    border: "border-blue-100",
    hover: "hover:border-blue-300 hover:bg-blue-50/50",
    arrowBg: "bg-blue-100",
    arrowText: "text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  client: {
    iconBg: "bg-orange-100",
    iconText: "text-orange-700",
    border: "border-orange-100",
    hover: "hover:border-orange-300 hover:bg-orange-50/50",
    arrowBg: "bg-orange-100",
    arrowText: "text-orange-700",
    button: "bg-orange-500 hover:bg-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
};

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-950/20">
        <ShieldCheck size={25} strokeWidth={2.2} />
      </div>
      <span
        className={`font-bold tracking-tight text-white ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        ERP System
      </span>
    </div>
  );
}

function BrandPanel({ role }) {
  const currentRole = role ? ROLES[role] : null;
  const styles = role ? ROLE_STYLES[role] : null;

  return (
    <section className="login-brand-panel relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-[#101344] to-indigo-950 p-8 text-white lg:flex lg:p-9 xl:p-12">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />

      <div className="relative z-10">
        <Brand />
      </div>

      <div className="relative z-10 my-12 max-w-xl">
        {currentRole ? (
          <>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-xs font-bold tracking-[0.16em] ${styles.badge}`}
            >
              {currentRole.portal}
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight xl:text-5xl">
              {currentRole.headline}
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              {currentRole.details}
            </p>

            <div className="mt-9 space-y-4">
              {(role === "admin"
                ? [
                    [FolderKanban, "Complete System Access"],
                    [Users, "Manage All Teams"],
                    [ChartNoAxesCombined, "Track Business Growth"],
                    [CalendarCheck, "Detailed Reports"],
                    [Boxes, "Advanced Settings"],
                  ]
                : role === "employee"
                  ? [
                      [Users, "View Your Profile"],
                      [CalendarCheck, "Check Attendance"],
                      [BriefcaseBusiness, "Submit Leave Requests"],
                    ]
                  : [
                      [FolderKanban, "View Your Projects"],
                      [ReceiptText, "Check Invoices"],
                      [Handshake, "Stay Connected"],
                    ]
              ).map(([Icon, label]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-violet-200">
                    <Icon size={19} />
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full bg-violet-500/15 px-4 py-2 text-xs font-bold tracking-[0.16em] text-violet-300">
              BUSINESS WORKSPACE
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight xl:text-5xl">
              Everything you need, in one place.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Manage projects, clients, employees, invoices, assets and
              business operations through a single, powerful ERP system.
            </p>

            <div className="mt-9 space-y-4">
              {[
                [Users, "Manage Employees"],
                [FolderKanban, "Track Projects"],
                [ReceiptText, "Handle Finances"],
                [Boxes, "Organize Assets"],
                [ChartNoAxesCombined, "Get Insights"],
              ].map(([Icon, label]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/25 text-indigo-200">
                    <Icon size={19} />
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-10 right-5 hidden w-[min(28rem,62%)] rotate-[-6deg] rounded-2xl border border-white/20 bg-white/10 p-3 shadow-2xl shadow-black/30 backdrop-blur-md xl:block">
        <div className="rounded-xl bg-white p-4 text-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">ERP Overview</p>
              <p className="mt-1 text-sm font-bold">Business dashboard</p>
            </div>
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><ChartNoAxesCombined size={18} /></span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 p-2"><span className="block h-1.5 w-6 rounded bg-violet-300" /><span className="mt-2 block h-3 w-8 rounded bg-slate-200" /></div>
            <div className="rounded-lg bg-slate-50 p-2"><span className="block h-1.5 w-6 rounded bg-blue-300" /><span className="mt-2 block h-3 w-8 rounded bg-slate-200" /></div>
            <div className="rounded-lg bg-slate-50 p-2"><span className="block h-1.5 w-6 rounded bg-orange-300" /><span className="mt-2 block h-3 w-8 rounded bg-slate-200" /></div>
          </div>
          <div className="mt-4 flex h-16 items-end gap-2 rounded-lg bg-slate-50 px-3 pb-2">
            <span className="h-5 flex-1 rounded-t bg-violet-200" />
            <span className="h-8 flex-1 rounded-t bg-violet-300" />
            <span className="h-6 flex-1 rounded-t bg-blue-300" />
            <span className="h-11 flex-1 rounded-t bg-violet-500" />
            <span className="h-9 flex-1 rounded-t bg-indigo-400" />
            <span className="h-12 flex-1 rounded-t bg-blue-500" />
          </div>
        </div>
      </div>

      <p className="relative z-10 text-sm text-slate-400">
        ERP Management System
      </p>
    </section>
  );
}

function RoleSelection({ onSelect }) {
  const roleDescriptions = {
    admin: "Access the full system and manage all operations.",
    employee: "View your profile, attendance and leave requests.",
    client: "Access your projects, proposals and invoices.",
  };

  return (
    <div className="mx-auto w-full max-w-[610px]">
      <div className="mb-7 text-center">
        <span className="inline-flex rounded-full bg-violet-50 px-5 py-3 text-[11px] font-extrabold tracking-[0.2em] text-violet-700 sm:text-xs">
          WELCOME TO ERP SYSTEM
        </span>

        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[42px] sm:leading-[1.12]">
          Choose Your Login
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-[17px]">
          Select your role to continue to your dedicated workspace.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        {Object.entries(ROLES).map(([role, item]) => {
          const Icon = item.icon;
          const styles = ROLE_STYLES[role];

          return (
            <button
              key={role}
              type="button"
              onClick={() => onSelect(role)}
              className={`group flex w-full items-center gap-4 rounded-2xl border ${styles.border} bg-white/90 px-4 py-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:gap-6 sm:px-6 sm:py-5 ${styles.hover}`}
            >
              <span
                className={`flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full ${styles.iconBg} ${styles.iconText} sm:h-[76px] sm:w-[76px]`}
              >
                <Icon size={34} strokeWidth={2.2} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold tracking-tight text-slate-950 sm:text-[23px]">
                  {item.title}
                </span>
                <span className="mt-1 block max-w-[350px] text-sm leading-5 text-slate-500 sm:text-[17px] sm:leading-6">
                  {roleDescriptions[role]}
                </span>
              </span>

              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.arrowBg} ${styles.arrowText} transition group-hover:translate-x-1 sm:h-14 sm:w-14`}
              >
                <ArrowRight size={26} strokeWidth={2.4} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="whitespace-nowrap text-xs font-medium text-slate-400 sm:text-sm">
          SECURE ACCESS
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 sm:px-6 sm:py-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm sm:h-14 sm:w-14">
          <ShieldCheck size={32} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950 sm:text-base">
            Your account is secure and protected.
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
            Only authorized users can access their assigned workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  role,
  onBack,
  onLogin,
}) {
  const config = ROLES[role];
  const styles = ROLE_STYLES[role];
  const Icon = config.icon;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token || !data.user?.role) {
        throw new Error("The server returned an incomplete login response.");
      }

      // Selecting a role is not proof of authorization.
      // The account role must match the selected login portal.
      if (data.user.role !== role) {
        throw new Error(
          `This account is not registered as ${config.title}. Please select the correct login role.`
        );
      }

      sessionStorage.setItem("erp-token", data.token);
      sessionStorage.setItem("erp-user", JSON.stringify(data.user));

      // Connect Socket.IO after a successful login using the JWT token.
      connectSocket(data.token);

      onLogin(data.user);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Check that the backend is running."
          : err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-violet-700"
      >
        <ArrowLeft size={17} />
        Back to role selection
      </button>

      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText}`}
      >
        <Icon size={28} />
      </div>

      <span
        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] ${styles.badge}`}
      >
        {config.portal}
      </span>

      <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
        {config.loginTitle}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {config.description}
      </p>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor={`${role}-email`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10">
            <Mail size={19} className="shrink-0 text-slate-400" />

            <input
              id={`${role}-email`}
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={config.placeholder}
              className="w-full min-w-0 bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${role}-password`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10">
            <Lock size={19} className="shrink-0 text-slate-400" />

            <input
              id={`${role}-password`}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full min-w-0 bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="shrink-0 text-slate-400 transition hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 -mt-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-violet-600 focus:ring-2 focus:ring-violet-500/20"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setError("Please contact your administrator to reset your password.")}
            className="text-xs font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`group relative flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${styles.button}`}
        >
          {loading && <LoaderCircle size={18} className="animate-spin" />}
          {loading ? "Signing in..." : config.button}
          {!loading && <ArrowRight size={18} className="absolute right-5 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />}
        </button>
      </form>

      <div className="mt-7 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
        <p className="text-xs leading-5 text-slate-500">
          Your login is verified securely. Access is limited to your assigned
          account role.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        ERP Management System
      </p>
    </div>
  );
}

export default function AdminLogin({ onLogin }) {
  const location = useLocation();
  const navigate = useNavigate();

  // The URL is the source of truth for the selected login portal.
  const roleFromPath = location.pathname.startsWith("/login/")
    ? location.pathname.split("/")[2]
    : null;
  const selectedRole = ["admin", "employee", "client"].includes(roleFromPath)
    ? roleFromPath
    : null;

  function handleRoleSelect(role) {
    navigate(`/login/${role}`);
  }

  function handleBackToRoles() {
    navigate("/login");
  }

  return (
    <main className="login-page min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]">
      <BrandPanel role={selectedRole} />

      <section className="login-form-panel relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-white to-slate-50 px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="w-full max-w-[650px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Brand compact />
            <span className="text-xs font-medium text-slate-400">
              Secure access
            </span>
          </div>

          {selectedRole ? (
            <LoginForm
              key={selectedRole}
              role={selectedRole}
              onBack={handleBackToRoles}
              onLogin={onLogin}
            />
          ) : (
            <RoleSelection onSelect={handleRoleSelect} />
          )}
        </div>
      </section>
    </main>
  );
}
