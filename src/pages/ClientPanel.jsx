
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  FileText,
  CreditCard,
  FileCheck,
  Headphones,
  UserRound,
  Search,
  ChevronDown,
  Menu,
  X,
  BriefcaseBusiness,
  CalendarDays,
  CircleHelp,
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  Send,
  MessageSquare,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import { connectSocket, disconnectSocket } from "../utils/socket";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My Projects", icon: FolderKanban },
  { label: "Tasks", icon: CheckSquare },
  { label: "Invoices", icon: FileText },
  { label: "Payments", icon: CreditCard },
  { label: "Proposals", icon: FileCheck },
  { label: "Support Tickets", icon: Headphones },
  { label: "My Profile", icon: UserRound },
  { label: "Help & Support", icon: CircleHelp },
];

const pageRoutes = {
  Dashboard: "/client/dashboard",
  "My Projects": "/client/projects",
  Tasks: "/client/tasks",
  Invoices: "/client/invoices",
  Payments: "/client/payments",
  Proposals: "/client/proposals",
  "Support Tickets": "/client/tickets",
  "My Profile": "/client/profile",
  "Help & Support": "/client/help",
};

const routePages = Object.fromEntries(
  Object.entries(pageRoutes).map(([page, path]) => [path, page])
);

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken(user) {
  return (
    user?.token ||
    user?.accessToken ||
    sessionStorage.getItem("erp-token") ||
    localStorage.getItem("erp-token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function rowsFrom(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(number)
    : String(value ?? "—");
}

function normalizeProject(p) {
  return {
    ...p,
    id: p._id || p.id || p.name,
    name: p.name || p.title || "Untitled project",
    type: p.type || p.category || p.description || "Project",
    progress: Number(p.progress ?? 0),
    status: p.status || "Planning",
    due: formatDate(
      p.deadline || p.dueDate || p.due || p.endDate
    ),
  };
}

function normalizeTask(t) {
  return {
    ...t,
    id: t._id || t.id || t.name || t.title,
    name: t.name || t.title || t.taskName || "Untitled task",
    date: formatDate(
      t.dueDate || t.deadline || t.date || t.createdAt
    ),
    status: t.status || (t.completed ? "Completed" : "Pending"),
  };
}

function normalizeInvoice(i) {
  return {
    ...i,
    id:
      i.invoiceNumber ||
      i.invoiceNo ||
      i.number ||
      i._id ||
      i.id ||
      "Invoice",
    date: formatDate(
      i.issueDate || i.invoiceDate || i.date || i.createdAt
    ),
    amount: money(
      i.totalAmount ?? i.amount ?? i.total ?? i.grandTotal ?? 0
    ),
    status: i.status || "Pending",
  };
}

function normalizePayment(p) {
  return {
    ...p,
    amountRaw: Number(p.amount ?? p.total ?? 0),
    id:
      p.paymentId ||
      p.transactionId ||
      p.reference ||
      p._id ||
      p.id ||
      "Payment",
    date: formatDate(p.paymentDate || p.date || p.createdAt),
    amount: money(p.amount ?? p.total ?? 0),
    status: p.status || "Paid",
  };
}

function normalizeProposal(p) {
  return {
    ...p,
    id: p.proposalNumber || p.title || p._id || p.id || "Proposal",
    name: p.title || p.name || p.proposalName || "Proposal",
    date: formatDate(p.createdAt || p.date || p.proposalDate),
    amount: money(p.amount ?? p.budget ?? p.total ?? 0),
    status: p.status || "Pending",
  };
}

function normalizeTicket(ticket) {
  return {
    ...ticket,
    id: ticket.ticketNumber || ticket._id || ticket.id || "Ticket",
    name: ticket.subject || ticket.title || "Support request",
    date: formatDate(ticket.createdAt || ticket.date),
    status: ticket.status || "Open",
    priority: ticket.priority || "Medium",
    description: ticket.description || "",
    resolutionNote: ticket.resolutionNote || "",
  };
}

const card =
  "rounded-xl border border-slate-200/80 bg-white shadow-sm";

const button =
  "rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50";

function Badge({ children }) {
  const styles = {
    Paid: "bg-emerald-50 text-emerald-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Resolved: "bg-emerald-50 text-emerald-700",
    "In Progress": "bg-blue-50 text-blue-700",
    Assigned: "bg-violet-50 text-violet-700",
    Closed: "bg-slate-100 text-slate-600",
    Urgent: "bg-rose-100 text-rose-700",
    High: "bg-orange-50 text-orange-700",
    Pending: "bg-rose-50 text-rose-600",
    Open: "bg-rose-50 text-rose-600",
    "Not Started": "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
        styles[children] || "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ title, onViewAll }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
        {title}
      </h2>

      {onViewAll && (
        <button onClick={onViewAll} className={button}>
          View All <ArrowUpRight size={13} className="ml-1 inline" />
        </button>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, color, onClick }) {
  const colors = {
    violet: "bg-violet-50 text-violet-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <button
      onClick={onClick}
      className={`${card} flex min-w-0 items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}
      >
        <Icon size={23} />
      </span>

      <span className="min-w-0">
        <span className="block text-xs text-slate-500 sm:text-sm">
          {title}
        </span>
        <span className="mt-1 block truncate text-xl font-bold text-slate-900">
          {value}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          {subtitle}
        </span>
      </span>
    </button>
  );
}

export default function ClientPanel({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [proposals, setProposals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [apiStatus, setApiStatus] = useState({});

  const [tickets, setTickets] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "Technical Issue",
    priority: "Medium",
    description: "",
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketMessage, setTicketMessage] = useState({
    type: "",
    text: "",
  });

  const [helpForm, setHelpForm] = useState({
    type: "Help Request",
    subject: "",
    message: "",
  });
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [helpSubmitting, setHelpSubmitting] = useState(false);
  const [helpMessage, setHelpMessage] = useState({
    type: "",
    text: "",
  });

  const activePage = routePages[location.pathname] || "Dashboard";
  const clientName = user?.name || "Rohit Sharma";
  const clientEmail = user?.email || "client@example.com";

  const clientInitials =
    String(clientName)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "C";

  // Connect the authenticated client's socket for real-time notifications.
  useEffect(() => {
    const token = getToken(user);

    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }

    return () => {
      // Do not disconnect here: this effect can rerun when user props change.
    };
  }, [user]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadClientData() {
      setLoading(true);
      setApiError("");

      const token = getToken(user);

      const endpoints = [
        {
          key: "projects",
          path: "/projects",
          setter: setProjects,
          normalizer: normalizeProject,
          aliases: ["projects"],
        },
        {
          key: "tasks",
          path: "/tasks",
          setter: setTasks,
          normalizer: normalizeTask,
          aliases: ["tasks"],
        },
        {
          key: "invoices",
          path: "/invoices",
          setter: setInvoices,
          normalizer: normalizeInvoice,
          aliases: ["invoices"],
        },
        {
          key: "payments",
          path: "/payments",
          setter: setPayments,
          normalizer: normalizePayment,
          aliases: ["payments"],
        },
        {
          key: "proposals",
          path: "/proposals",
          setter: setProposals,
          normalizer: normalizeProposal,
          aliases: ["proposals"],
        },
        {
          key: "tickets",
          path: "/support-tickets",
          setter: setTickets,
          normalizer: normalizeTicket,
          aliases: ["tickets", "supportTickets"],
        },
        {
          key: "feedback",
          path: "/feedback",
          setter: setFeedbackItems,
          normalizer: (item) => item,
          aliases: ["feedback", "items"],
        },
      ];

      const failures = [];

      await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(
              `${API_BASE}${endpoint.path}`,
              {
                headers: {
                  Accept: "application/json",
                  ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {}),
                },
              }
            );

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(
                payload.message ||
                  `${response.status} ${response.statusText}`
              );
            }

            const data = rowsFrom(payload, endpoint.aliases).map(
              endpoint.normalizer
            );

            if (!cancelled) {
              endpoint.setter(data);
              setApiStatus((previous) => ({
                ...previous,
                [endpoint.key]: "ok",
              }));
            }
          } catch (error) {
            console.error(
              `Client Panel ${endpoint.key} API error:`,
              error
            );

            failures.push(`${endpoint.key}: ${error.message}`);

            if (!cancelled) {
              endpoint.setter([]);
              setApiStatus((previous) => ({
                ...previous,
                [endpoint.key]: "error",
              }));
            }
          }
        })
      );

      if (!cancelled) {
        setLoading(false);

        if (failures.length) {
          setApiError(
            `Some data could not load — ${failures.join(
              "; "
            )}. Check backend, token, and API routes.`
          );
        }
      }
    }

    loadClientData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!routePages[location.pathname]) {
      navigate("/client/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  function changePage(page) {
    const targetRoute = pageRoutes[page] || pageRoutes.Dashboard;

    navigate(targetRoute);
    setMobileMenuOpen(false);
    setSearch("");
  }

  async function submitTicket(event) {
    event.preventDefault();
    setTicketMessage({ type: "", text: "" });

    const token = getToken(user);

    if (!token) {
      setTicketMessage({
        type: "error",
        text: "Your login session was not found. Please log in again.",
      });
      return;
    }

    setTicketSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ticketForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.message || `Request failed (${response.status})`
        );
      }

      const createdTicket = payload.ticket || payload.data || payload;

      setTickets((current) => [
        normalizeTicket(createdTicket),
        ...current.filter(
          (ticket) =>
            ticket.id !==
            (createdTicket.ticketNumber || createdTicket._id)
        ),
      ]);

      setTicketForm({
        subject: "",
        category: "Technical Issue",
        priority: "Medium",
        description: "",
      });

      setTicketMessage({
        type: "success",
        text: `Ticket ${
          createdTicket.ticketNumber || ""
        } created successfully.`,
      });
    } catch (error) {
      console.error("Create support ticket error:", error);

      setTicketMessage({
        type: "error",
        text: error.message || "Could not create support ticket.",
      });
    } finally {
      setTicketSubmitting(false);
    }
  }

  async function submitHelpFeedback(event) {
    event.preventDefault();
    setHelpMessage({ type: "", text: "" });

    const token = getToken(user);

    if (!token) {
      setHelpMessage({
        type: "error",
        text: "Your login session was not found. Please log in again.",
      });
      return;
    }

    setHelpSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: helpForm.type,
          subject: helpForm.subject.trim(),
          message: helpForm.message.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.message || `Request failed (${response.status})`
        );
      }

      const created = payload.feedback || payload.data || payload;

      setFeedbackItems((current) => [
        created,
        ...current.filter(
          (item) => String(item._id) !== String(created._id)
        ),
      ]);

      setHelpForm({
        type: "Help Request",
        subject: "",
        message: "",
      });

      setHelpMessage({
        type: "success",
        text: `${helpForm.type} submitted successfully.`,
      });
    } catch (error) {
      console.error("Submit help/feedback error:", error);

      setHelpMessage({
        type: "error",
        text: error.message || "Could not submit your request.",
      });
    } finally {
      setHelpSubmitting(false);
    }
  }

  const filteredProjects = projects.filter((project) =>
    `${project.name} ${project.type} ${project.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const pendingInvoices = invoices.filter(
    (invoice) =>
      !["paid", "completed", "complete"].includes(
        String(invoice.status).toLowerCase()
      )
  );

  const totalPaid = payments
    .filter((payment) =>
      ["paid", "completed", "success", "successful"].includes(
        String(payment.status).toLowerCase()
      )
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amountRaw ?? payment.amount ?? 0),
      0
    );

  function handleLogout() {
    disconnectSocket();
    onLogout?.();
  }

  function renderDashboard() {
    return (
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-blue-600 to-blue-800 p-6 text-white sm:p-8">
          <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm text-blue-100">Welcome back,</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                {clientName}! 👋
              </h1>
              <p className="mt-3 text-sm text-blue-100">
                Here's an overview of your projects, invoices and recent updates.
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-4">
              <CalendarDays size={23} />
              <p className="mt-2 text-sm">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                })}
              </p>
              <p className="font-semibold">
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="mt-2 text-xs text-blue-100">
                Let's keep building! 🚀
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={BriefcaseBusiness}
            title="Total Projects"
            value={projects.length}
            subtitle="View all projects →"
            color="violet"
            onClick={() => changePage("My Projects")}
          />
          <StatCard
            icon={CalendarDays}
            title="Active Projects"
            value={
              projects.filter(
                (project) =>
                  !["completed", "cancelled"].includes(
                    String(project.status).toLowerCase()
                  )
              ).length
            }
            subtitle="Currently active"
            color="green"
            onClick={() => changePage("My Projects")}
          />
          <StatCard
            icon={FileText}
            title="Pending Invoices"
            value={pendingInvoices.length}
            subtitle="View pending invoices →"
            color="blue"
            onClick={() => changePage("Invoices")}
          />
          <StatCard
            icon={CreditCard}
            title="Total Payments"
            value={money(totalPaid)}
            subtitle="View payment history →"
            color="orange"
            onClick={() => changePage("Payments")}
          />
        </section>

        <section className="grid items-start gap-4 2xl:grid-cols-3">
          <div className={`${card} p-4 sm:p-5 2xl:col-span-1`}>
            <SectionTitle
              title="My Projects"
              onViewAll={() => changePage("My Projects")}
            />
            <div className="divide-y divide-slate-100">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <FolderKanban size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {project.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {project.type}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                    <Badge>{project.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-4 sm:p-5 2xl:col-span-1`}>
            <SectionTitle
              title="Recent Invoices"
              onViewAll={() => changePage("Invoices")}
            />
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{invoice.id}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {invoice.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{invoice.amount}</p>
                    <div className="mt-1">
                      <Badge>{invoice.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-4 sm:p-5`}>
            <SectionTitle title="Payment Overview" />
            <p className="mb-4 text-xs text-slate-500">
              Monthly payment activity · Live API data
            </p>
            <div className="flex h-48 items-end justify-around gap-2 border-b border-l border-slate-100 px-2">
              {[35, 23, 62, 46, 35, 70].map((height, index) => (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div
                    className="w-full max-w-8 rounded-t-md bg-violet-600"
                    style={{ height: `${height}%` }}
                  />
                  <span className="mb-2 text-[10px] text-slate-500">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-5 text-xs text-slate-600">
              <span>
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />
                Paid
              </span>
              <span>
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-violet-200" />
                Pending
              </span>
            </div>
          </div>
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-3">
          <div className={`${card} p-4 sm:p-5`}>
            <SectionTitle
              title="Recent Tasks"
              onViewAll={() => changePage("Tasks")}
            />
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <CheckCircle2
                    className={
                      task.status === "Completed"
                        ? "text-emerald-500"
                        : "text-slate-300"
                    }
                    size={22}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{task.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.date}
                    </p>
                  </div>
                  <Badge>{task.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-4 sm:p-5`}>
            <SectionTitle
              title="Support Tickets"
              onViewAll={() => changePage("Support Tickets")}
            />
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Headphones size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ticket.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.id} · {ticket.date}
                    </p>
                  </div>
                  <Badge>{ticket.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderPage() {
    if (activePage === "Dashboard") return renderDashboard();

    if (activePage === "My Projects") {
      return (
        <section className={`${card} p-5`}>
          <SectionTitle title="My Projects" />
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{project.name}</h3>
                  <Badge>{project.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {project.type}
                </p>
                <div className="mt-5 flex justify-between text-xs">
                  <span>Project progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-violet-600"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Target date: {project.due}
                </p>
              </article>
            ))}
            {filteredProjects.length === 0 && (
              <p className="text-sm text-slate-500">
                No matching projects found.
              </p>
            )}
          </div>
        </section>
      );
    }

    if (activePage === "Invoices" || activePage === "Payments") {
      const rows = activePage === "Payments" ? payments : invoices;

      return (
        <section className={`${card} p-5`}>
          <SectionTitle title={activePage} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-slate-500">
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="p-3 font-medium">{item.id}</td>
                    <td className="p-3">{item.date}</td>
                    <td className="p-3 font-semibold">{item.amount}</td>
                    <td className="p-3">
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && (
            <p className="mt-4 text-xs text-slate-500">
              Loading {activePage.toLowerCase()} from backend…
            </p>
          )}
          {!loading && rows.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              No {activePage.toLowerCase()} records returned by the backend.
            </p>
          )}
        </section>
      );
    }

    if (activePage === "Tasks") {
      return (
        <section className={`${card} p-5`}>
          <SectionTitle title="My Tasks" />
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 border-b border-slate-100 py-4"
            >
              <CheckCircle2
                className={
                  task.status === "Completed"
                    ? "text-emerald-500"
                    : "text-violet-600"
                }
                size={20}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{task.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.date}
                </p>
              </div>
              <Badge>{task.status}</Badge>
            </div>
          ))}
          {!loading && tasks.length === 0 && (
            <p className="py-6 text-sm text-slate-500">
              No tasks returned by the backend.
            </p>
          )}
        </section>
      );
    }

    if (activePage === "Support Tickets") {
      return (
        <div className="space-y-5">
          <section className={`${card} p-5 sm:p-6`}>
            <SectionTitle title="Create a Support Ticket" />
            <p className="mb-5 text-sm text-slate-500">
              Describe the issue you're facing. Our team will review it and assign it to the right person.
            </p>

            {ticketMessage.text && (
              <div
                role="status"
                className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                  ticketMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {ticketMessage.text}
              </div>
            )}

            <form
              onSubmit={submitTicket}
              className="grid gap-4 md:grid-cols-2"
            >
              <label className="block text-sm font-medium text-slate-700">
                Subject *
                <input
                  required
                  maxLength={160}
                  value={ticketForm.subject}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      subject: event.target.value,
                    })
                  }
                  placeholder="e.g. Unable to access project"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Category
                <select
                  value={ticketForm.category}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      category: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                >
                  <option>Technical Issue</option>
                  <option>Project Issue</option>
                  <option>Billing</option>
                  <option>Account</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Priority
                <select
                  value={ticketForm.priority}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      priority: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Describe your issue *
                <textarea
                  required
                  minLength={5}
                  maxLength={4000}
                  rows={4}
                  value={ticketForm.description}
                  onChange={(event) =>
                    setTicketForm({
                      ...ticketForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Explain what happened and what you need help with..."
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} />
                  {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </section>

          <section className={`${card} p-5 sm:p-6`}>
            <SectionTitle title="My Tickets" />
            {loading && (
              <p className="py-4 text-sm text-slate-500">
                Loading tickets...
              </p>
            )}
            {!loading && tickets.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <Headphones size={28} className="mx-auto text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  No support tickets yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Your submitted requests will appear here.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                        <Headphones size={19} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-slate-900">
                          {ticket.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {ticket.id} · Created {ticket.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{ticket.status}</Badge>
                      <Badge>{ticket.priority}</Badge>
                    </div>
                  </div>
                  {ticket.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {ticket.description}
                    </p>
                  )}
                  {ticket.resolutionNote && (
                    <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-800">
                        Resolution / Latest update
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                        {ticket.resolutionNote}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (activePage === "My Profile") {
      return (
        <section className={`${card} p-5`}>
          <SectionTitle title="My Profile" />
          <div className="flex items-center gap-4 rounded-xl bg-violet-50 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-xl font-bold text-white">
              {clientName
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold">{clientName}</h3>
              <p className="mt-1 text-sm text-slate-500">{clientEmail}</p>
              <p className="mt-1 text-xs text-slate-500">Client account</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Profile information is taken from the authenticated user passed to this panel.
          </p>
        </section>
      );
    }

    if (activePage === "Proposals") {
      return (
        <section className={`${card} p-5`}>
          <SectionTitle title="Proposals" />
          {proposals.map((proposal) => (
            <div
              key={proposal._id || proposal.id}
              className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-4"
            >
              <FileCheck className="text-violet-600" size={21} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{proposal.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {proposal.date}
                </p>
              </div>
              <p className="text-sm font-semibold">{proposal.amount}</p>
              <Badge>{proposal.status}</Badge>
            </div>
          ))}
          {!loading && proposals.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No proposals returned by the backend.
            </p>
          )}
        </section>
      );
    }

    return (
      <section className={`${card} p-5 sm:p-6`}>
        <SectionTitle title="Help & Feedback" />
        <p className="mb-5 text-sm text-slate-500">
          Need assistance or want to share an idea? Send your message to the support team.
        </p>

        {helpMessage.text && (
          <div
            role="status"
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              helpMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {helpMessage.text}
          </div>
        )}

        <form
          onSubmit={submitHelpFeedback}
          className="max-w-2xl space-y-4"
        >
          <label className="block text-sm font-medium text-slate-700">
            What would you like to send?
            <select
              value={helpForm.type}
              onChange={(event) =>
                setHelpForm({ ...helpForm, type: event.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            >
              <option>Help Request</option>
              <option>Feedback</option>
              <option>Feature Suggestion</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Subject *
            <input
              required
              maxLength={160}
              value={helpForm.subject}
              onChange={(event) =>
                setHelpForm({ ...helpForm, subject: event.target.value })
              }
              placeholder="Enter a short subject"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Message *
            <textarea
              required
              minLength={5}
              maxLength={4000}
              rows={5}
              value={helpForm.message}
              onChange={(event) =>
                setHelpForm({ ...helpForm, message: event.target.value })
              }
              placeholder="Write your question, issue, or feedback..."
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={helpSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageSquare size={16} />
              {helpSubmitting ? "Submitting..." : "Send message"}
            </button>
            <button
              type="button"
              onClick={() => changePage("Support Tickets")}
              className={button}
            >
              View Support Tickets
            </button>
          </div>
        </form>

        <section className="mt-8 max-w-4xl border-t border-slate-100 pt-6">
          <SectionTitle title="My Help & Feedback Submissions" />
          {loading && (
            <p className="py-3 text-sm text-slate-500">
              Loading submissions...
            </p>
          )}
          {!loading && feedbackItems.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              You haven't submitted any help requests or feedback yet.
            </p>
          )}
          <div className="space-y-3">
            {feedbackItems.map((item) => (
              <article
                key={item._id || `${item.createdAt}${item.subject}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                      {item.type || "Help Request"}
                    </p>
                    <h3 className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {item.subject}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <Badge>{item.status || "New"}</Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                  {item.message}
                </p>
                {item.adminReply && (
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-800">
                      Reply from Admin
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                      {item.adminReply}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#0b1020] text-slate-300 shadow-xl transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <p className="font-bold text-white">ERP WORKSPACE</p>
            <p className="text-xs text-slate-400">Client Portal</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => changePage(label)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                activePage === label
                  ? "bg-gradient-to-r from-violet-700 to-indigo-700 text-white shadow"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 lg:ml-60">
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 sm:flex sm:w-[220px] md:w-[300px] xl:w-[360px]">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                aria-label="Search client portal"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects, tasks..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <span className="truncate text-sm font-semibold text-slate-700 sm:hidden">
              {activePage}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <NotificationBell />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Open account profile menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
                className={`flex items-center gap-2 rounded-xl p-1.5 transition ${
                  profileMenuOpen ? "bg-slate-100" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {clientInitials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">
                    {clientName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    Client Portal
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={`hidden text-slate-500 transition-transform sm:block ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-base font-bold text-violet-700">
                      {clientInitials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {clientName}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {clientEmail}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Client Portal
                      </p>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        changePage("My Profile");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                    >
                      <UserRound size={19} className="text-slate-500" />
                      <span className="font-medium">My Profile</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut size={19} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-4 p-3 sm:p-4 lg:p-4">
          {activePage !== "Dashboard" && (
            <div className="mb-1">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                Client Portal
              </p>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">
                {activePage}
              </h1>
              <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">
                Manage your projects and stay updated with your workspace.
              </p>
            </div>
          )}

          {apiError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {apiError}
            </div>
          )}

          {loading && (
            <p className="text-sm text-slate-500">
              Loading client data from backend…
            </p>
          )}

          {renderPage()}

          <footer className="py-3 text-center text-xs text-slate-400">
            © 2026 ERP Workspace · Client Portal
          </footer>
        </div>
      </main>
    </div>
  );
}
