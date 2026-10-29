
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  CalendarCheck,
  ClipboardList,
  FileText,
  Search,
  Bell,
  LogOut,
  RefreshCw,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Settings,
  Pencil,
  Mail,
  Phone,
  BriefcaseBusiness,
  Clock3,
  CalendarDays,
  Send,
  CheckCircle2,
  CircleAlert,
  Plane,
  Check,
  CircleHelp,
  Download,
  Plus,
  Building2,
  Ticket,
  MessageSquare,
  ExternalLink,
  HelpCircle,
  MapPin,
  Camera,
  ShieldCheck,
  Video,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";
const OFFICE_LATITUDE = Number(import.meta.env.VITE_OFFICE_LATITUDE);
const OFFICE_LONGITUDE = Number(import.meta.env.VITE_OFFICE_LONGITUDE);
const OFFICE_RADIUS_METERS = Number(import.meta.env.VITE_OFFICE_RADIUS_METERS || 150);

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location services."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date().toISOString(),
      }),
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access and try again.",
          2: "Your location could not be determined. Check GPS/location settings.",
          3: "Location request timed out. Please try again.",
        };
        reject(new Error(messages[error.code] || "Could not access your location."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}


async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("erp-token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    sessionStorage.removeItem("erp-token");
    sessionStorage.removeItem("erp-user");
    window.location.reload();
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My Profile", icon: UserRound },
  { label: "Attendance", icon: CalendarCheck },
  { label: "Leave Requests", icon: ClipboardList },
  { label: "Tasks", icon: CheckCircle2 },
  { label: "Support Tickets", icon: Ticket },
  { label: "Help Center", icon: CircleHelp },
];

const cardClass =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm";

function getInitials(name = "Employee") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "E"
  );
}

function formatDate(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function getStatusClass(status = "") {
  const value = String(status).toLowerCase();

  if (value.includes("approv") || value.includes("present") || value === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value.includes("reject") || value.includes("absent") || value === "cancelled") {
    return "bg-rose-50 text-rose-700";
  }

  if (value.includes("pending") || value.includes("progress")) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon size={23} />
      </div>
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
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
      type="button"
      onClick={onClick}
      className={`${cardClass} flex min-w-0 items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          colors[color] || colors.violet
        }`}
      >
        <Icon size={24} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-500">{title}</span>
        <span className="mt-1 block truncate text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        <span className="mt-1 block text-xs text-slate-500">{subtitle}</span>
      </span>
    </button>
  );
}

const EMPLOYEE_ROUTES = {
  Dashboard: "/employee/dashboard",
  "My Profile": "/employee/profile",
  Attendance: "/employee/attendance",
  "Leave Requests": "/employee/leave-requests",
  Tasks: "/employee/tasks",
  "Support Tickets": "/employee/support-tickets",
  "Help Center": "/employee/help-center",
};

const EMPLOYEE_PAGE_BY_PATH = Object.fromEntries(
  Object.entries(EMPLOYEE_ROUTES).map(([page, path]) => [path, page])
);

export default function EmployeePanel({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDashboardDate, setSelectedDashboardDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const activePage =
    EMPLOYEE_PAGE_BY_PATH[location.pathname] || "Dashboard";

  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskActionId, setTaskActionId] = useState("");

  // Employee Support Tickets and Help Center
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("All");
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");
  const [openFaq, setOpenFaq] = useState(-1);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "IT Support",
    priority: "Medium",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState(false);
  const [attendanceCameraOpen, setAttendanceCameraOpen] = useState(false);
  const [attendanceLocation, setAttendanceLocation] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState("");
  const [attendanceStep, setAttendanceStep] = useState("idle");
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [search, setSearch] = useState("");

  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const displayName = profile?.name || user?.name || "Employee";
  const initials = getInitials(displayName);
  const displayEmail = profile?.email || user?.email || "—";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        apiRequest("/employees/me"),
        apiRequest("/attendance"),
        apiRequest("/leave-requests"),
        apiRequest("/tasks/my"),
      ]);

      if (results[0].status === "fulfilled") {
        setProfile(results[0].value.data || null);
      } else {
        throw results[0].reason;
      }

      if (results[1].status === "fulfilled") {
        const result = results[1].value;
        // Normalize the attendance API response without assuming one wrapper shape.
        const attendanceRows = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.attendance)
          ? result.attendance
          : Array.isArray(result.records)
          ? result.records
          : Array.isArray(result.data?.attendance)
          ? result.data.attendance
          : Array.isArray(result.data?.records)
          ? result.data.records
          : Array.isArray(result.data?.data)
          ? result.data.data
          : [];
        // The server response is the source of truth. Do not merge an old
        // client-side record into a fresh response: that can keep a stale
        // checkout time visible even when today's server record has no checkout.
        setAttendance(attendanceRows);
      } else {
        // Keep the last known attendance state if a refresh fails.
        console.error("Could not load employee attendance:", results[1].reason);
      }

      if (results[2].status === "fulfilled") {
        const result = results[2].value;
        setLeaveRequests(Array.isArray(result.data) ? result.data : []);
      } else {
        setLeaveRequests([]);
      }

      // Tasks API returns { success: true, data: [...] }.
      // Handle it explicitly; otherwise the task response is fetched but never
      // copied into React state, leaving the Tasks section empty.
      if (results[3].status === "fulfilled") {
        const result = results[3].value;
        setTasks(Array.isArray(result.data) ? result.data : []);
      } else {
        setTasks([]);
        console.error("Could not load employee tasks:", results[3].reason);
      }
    } catch (err) {
      setError(err.message || "Could not load employee profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!EMPLOYEE_PAGE_BY_PATH[location.pathname]) {
      navigate("/employee/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem("erp-token");
    if (!token) return undefined;

    async function loadNotifications() {
      try {
        const [listResponse, countResponse] = await Promise.all([
          fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const listResult = await listResponse.json().catch(() => ({}));
        const countResult = await countResponse.json().catch(() => ({}));
        if (!listResponse.ok || !listResult.success) {
          throw new Error(listResult.message || "Could not load notifications.");
        }
        if (active) {
          setNotifications(Array.isArray(listResult.data) ? listResult.data : []);
          if (countResponse.ok && countResult.success) setUnreadCount(countResult.count || 0);
          setNotificationError("");
        }
      } catch (err) {
        if (active) setNotificationError(err.message || "Notifications are currently unavailable.");
      }
    }

    loadNotifications();
    return () => { active = false; };
  }, []);

  async function markNotificationRead(id) {
    const token = sessionStorage.getItem("erp-token");
    if (!token || !id) return;
    try {
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not mark notification as read.");
      setNotifications((items) => items.map((item) => item._id === id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setNotificationError(err.message || "Could not update notification.");
    }
  }

  async function markAllNotificationsRead() {
    const token = sessionStorage.getItem("erp-token");
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update notifications.");
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      setNotificationError("");
    } catch (err) {
      setNotificationError(err.message || "Could not update notifications.");
    }
  }

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredAttendance = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return attendance;

    return attendance.filter((record) =>
      [
        record.date,
        record.status,
        record.checkIn,
        record.checkOut,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [attendance, search]);

  const pendingLeaves = leaveRequests.filter(
    (item) => String(item.status).toLowerCase() === "pending"
  ).length;

  const today = new Date();

  const monthAttendance = attendance.filter((record) => {
    if (!record.date) return false;

    const date = new Date(record.date);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  });

  const presentDays = monthAttendance.filter((record) =>
    String(record.status || "").toLowerCase().includes("present")
  ).length;

  const monthLabel = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [calendarDate]);

  function getAttendanceForDay(day) {
    if (!day) return null;

    return attendance.find((record) => {
      if (!record.date) return false;

      const date = new Date(record.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === calendarDate.getFullYear() &&
        date.getMonth() === calendarDate.getMonth() &&
        date.getDate() === day
      );
    });
  }

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const getRecordDateKey = (record) => {
    const value = record?.date || record?.attendanceDate || record?.createdAt || record?.checkInAt || "";
    if (!value) return "";
    // Date-only ISO strings should not be converted through local timezone.
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : getLocalDateKey(parsed);
  };

  const hasAttendanceTime = (value) => {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim();
    return normalized !== "" && normalized !== "--" && normalized.toLowerCase() !== "null" && normalized.toLowerCase() !== "undefined";
  };

  const getCheckInValue = (record) =>
    record?.checkIn ?? record?.checkInTime ?? record?.check_in ?? record?.checkInAt ?? record?.check_in_time;

  const getCheckOutValue = (record) =>
    record?.checkOut ?? record?.checkOutTime ?? record?.check_out ?? record?.checkOutAt ?? record?.check_out_time;

  const todayAttendance = attendance.find(
    (record) => getRecordDateKey(record) === getLocalDateKey()
  );

  const hasCheckedInToday = hasAttendanceTime(getCheckInValue(todayAttendance));
  const hasCheckedOutToday = hasAttendanceTime(getCheckOutValue(todayAttendance));

  // Dashboard date selection filters the overview to the chosen calendar day.
  const selectedDashboardAttendance = attendance.find(
    (record) => getRecordDateKey(record) === selectedDashboardDate
  );
  const selectedDashboardDateObject = new Date(`${selectedDashboardDate}T12:00:00`);
  const selectedDashboardDateLabel = selectedDashboardDateObject.toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const selectedDayLeaves = leaveRequests.filter((request) => {
    const from = String(request.fromDate || "").slice(0, 10);
    const to = String(request.toDate || request.fromDate || "").slice(0, 10);
    return from && to && from <= selectedDashboardDate && to >= selectedDashboardDate;
  });
  const selectedDayTasks = tasks.filter((task) =>
    String(task.dueDate || "").slice(0, 10) === selectedDashboardDate
  );

  async function handleCheckIn() {
    setError("");
    setNotice("");
    setCameraError("");
    setCapturedFaceImage("");
    setAttendanceLocation(null);
    setAttendanceAction(true);
    setAttendanceStep("location");

    try {
      if (
        !Number.isFinite(OFFICE_LATITUDE) ||
        !Number.isFinite(OFFICE_LONGITUDE) ||
        OFFICE_LATITUDE < -90 ||
        OFFICE_LATITUDE > 90 ||
        OFFICE_LONGITUDE < -180 ||
        OFFICE_LONGITUDE > 180
      ) {
        throw new Error(
          "Office location is not configured. Set VITE_OFFICE_LATITUDE and VITE_OFFICE_LONGITUDE in the frontend .env file, then restart Vite."
        );
      }

      const position = await getCurrentPosition();
      const distance = getDistanceInMeters(
        position.latitude,
        position.longitude,
        OFFICE_LATITUDE,
        OFFICE_LONGITUDE
      );

      if (position.accuracy > 150) {
        throw new Error(
          `Location accuracy is too low (${Math.round(position.accuracy)} m). Turn on precise location and try again.`
        );
      }
      if (distance > OFFICE_RADIUS_METERS) {
        throw new Error(
          `You are outside the office attendance zone (${Math.round(distance)} m away; allowed radius ${OFFICE_RADIUS_METERS} m). Check-in is blocked.`
        );
      }

      setAttendanceLocation({ ...position, distance: Math.round(distance) });
      setAttendanceStep("face");
      // Location checking is complete. Re-enable the capture button inside the modal.
      // Previously this stayed true from handleCheckIn(), leaving Capture disabled.
      setAttendanceAction(false);
      setAttendanceCameraOpen(true);
    } catch (err) {
      setError(err.message || "Could not verify your location.");
      setAttendanceStep("idle");
      setAttendanceAction(false);
    }
  }

  useEffect(() => {
    if (!attendanceCameraOpen) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      setCameraReady(false);
      return undefined;
    }

    let cancelled = false;
    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access requires HTTPS or localhost and a supported browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        setCameraError("");
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err.name === "NotAllowedError"
              ? "Camera permission was denied. Allow camera access in your browser settings."
              : err.message || "Could not start the camera."
          );
        }
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
  }, [attendanceCameraOpen]);

  function cancelAttendanceCamera() {
    setAttendanceCameraOpen(false);
    setAttendanceLocation(null);
    setCapturedFaceImage("");
    setAttendanceStep("idle");
    setAttendanceAction(false);
    setCameraError("");
  }

  async function captureAttendanceFace() {
    setCameraError("");
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture the camera image.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.82);
      setCapturedFaceImage(image);
      setAttendanceStep("submitting");

      // The backend must validate this GPS evidence and compare the image with
      // the employee's enrolled face before saving attendance.
      const result = await apiRequest("/attendance/my/check-in", {
        method: "POST",
        body: JSON.stringify({
          location: attendanceLocation,
          faceImage: image,
          verificationMethod: "gps-face-capture",
        }),
      });

      // Support both the legacy response flags and the Attendance model response.
      // The current model stores verification evidence on the attendance record.
      const savedAttendance =
        result.attendance ||
        result.data?.attendance ||
        (result.data && result.data.faceVerification ? result.data : null);

      const locationVerified =
        result.locationVerified === true ||
        savedAttendance?.location?.verificationStatus === "Verified";

      const faceVerified =
        result.faceVerified === true ||
        savedAttendance?.faceVerification?.status === "Verified";

      const verificationCompleted =
        result.verificationCompleted === true ||
        savedAttendance?.verificationCompleted === true;

      if (!locationVerified || !faceVerified) {
        throw new Error(
          "The server did not confirm both GPS and face verification. Check-in has not been confirmed. Please try again or contact your administrator."
        );
      }

      if (
        savedAttendance &&
        savedAttendance.verificationCompleted !== undefined &&
        !verificationCompleted
      ) {
        throw new Error(
          "The server returned an attendance record, but it did not mark verification as completed. Check-in has not been confirmed."
        );
      }

      setNotice(
        result.message ||
          "GPS and face verification confirmed. Check-in recorded successfully."
      );
      // Reflect the successful, server-verified check-in immediately in the UI.
      const checkInRecord = savedAttendance || result.data || result.attendance || {};
      const savedCheckIn =
        getCheckInValue(checkInRecord) ||
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAttendance((current) => {
        const todayKey = getLocalDateKey();
        const index = current.findIndex((record) => getRecordDateKey(record) === todayKey);
        const merged = {
          ...(index >= 0 ? current[index] : {}),
          ...checkInRecord,
          date: todayKey,
          checkIn: savedCheckIn,
          // A check-in must never inherit or invent a checkout time.
          // Keep checkout blank unless the check-in API explicitly returns one.
          checkOut: hasAttendanceTime(getCheckOutValue(checkInRecord))
            ? getCheckOutValue(checkInRecord)
            : "--",
          status: checkInRecord.status || (index >= 0 ? current[index].status : "Present") || "Present",
        };
        if (index >= 0) return current.map((record, i) => i === index ? merged : record);
        return [...current, merged];
      });
      setAttendanceCameraOpen(false);
      setAttendanceStep("idle");
      setCapturedFaceImage("");
      await loadData();
    } catch (err) {
      setCameraError(err.message || "Could not verify your face and check in.");
      setAttendanceStep("face");
    } finally {
      setAttendanceAction(false);
    }
  }

  async function handleCheckOut() {
    setError("");
    setNotice("");
    setAttendanceAction(true);

    try {
      const result = await apiRequest("/attendance/my/check-out", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const checkOutRecord = result.attendance || result.data?.attendance || result.data || {};
      const savedCheckOut = getCheckOutValue(checkOutRecord);

      // Never manufacture a checkout timestamp on the client. Only display a
      // checkout time returned by the server after the checkout request.
      if (hasAttendanceTime(savedCheckOut)) {
        setAttendance((current) => {
          const todayKey = getLocalDateKey();
          const index = current.findIndex((record) => getRecordDateKey(record) === todayKey);
          if (index < 0) return current;
          return current.map((record, i) => i === index
            ? { ...record, ...checkOutRecord, date: todayKey, checkOut: savedCheckOut }
            : record
          );
        });
        setNotice(result.message || "Check-out recorded successfully.");
      } else {
        setNotice("The server did not return a saved check-out time. Refreshing attendance to verify the saved record.");
      }
      await loadData();
    } catch (err) {
      setError(err.message || "Could not check out.");
    } finally {
      setAttendanceAction(false);
    }
  }

  async function submitLeave(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (leaveForm.toDate < leaveForm.fromDate) {
      setError("To date cannot be earlier than the from date.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest("/leave-requests", {
        method: "POST",
        body: JSON.stringify(leaveForm),
      });

      setNotice(result.message || "Leave request submitted successfully.");

      setLeaveForm({
        leaveType: "Casual Leave",
        fromDate: "",
        toDate: "",
        reason: "",
      });

      await loadData();
      changePage("Leave Requests");
    } catch (err) {
      setError(err.message || "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTaskStatus(taskId, status) {
    if (!taskId) return;

    setError("");
    setNotice("");
    setTaskActionId(taskId);

    try {
      const result = await apiRequest(`/tasks/${taskId}/my-status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      const updatedTask = result.data;
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task._id === taskId
            ? { ...task, ...(updatedTask && typeof updatedTask === "object" ? updatedTask : {}), status }
            : task
        )
      );
      setNotice(result.message || "Task status updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update task status.");
    } finally {
      setTaskActionId("");
    }
  }

  function logout() {
    if (window.confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  }

  function changePage(page) {
    setMobileMenuOpen(false);
    setSearch("");
    setError("");
    const route = EMPLOYEE_ROUTES[page];
    if (route && route !== location.pathname) {
      navigate(route);
    }
  }

  const loadSupportTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketError("");
    try {
      let result;
      try {
        result = await apiRequest("/support-tickets/my");
      } catch (firstError) {
        result = await apiRequest("/support-tickets");
      }
      const rows = Array.isArray(result.data) ? result.data : Array.isArray(result.tickets) ? result.tickets : [];
      setSupportTickets(rows);
    } catch (err) {
      setTicketError(err.message || "Could not load support tickets.");
      setSupportTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePage === "Support Tickets") loadSupportTickets();
  }, [activePage, loadSupportTickets]);

  async function submitSupportTicket(event) {
    event.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      setTicketError("Please enter a subject and describe your issue.");
      return;
    }
    setTicketSubmitting(true);
    setTicketError("");
    setTicketSuccess("");
    try {
      await apiRequest("/support-tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: ticketForm.subject.trim(),
          category: ticketForm.category,
          priority: ticketForm.priority,
          description: ticketForm.description.trim(),
          requestType: "employee-support",
        }),
      });
      setTicketSuccess("Your support ticket has been submitted.");
      setTicketForm({ subject: "", category: "IT Support", priority: "Medium", description: "" });
      setTicketFormOpen(false);
      await loadSupportTickets();
    } catch (err) {
      setTicketError(err.message || "Could not submit the support ticket.");
    } finally {
      setTicketSubmitting(false);
    }
  }

  function renderSupportTickets() {
    const filtered = supportTickets.filter((ticket) => {
      const query = ticketSearch.trim().toLowerCase();
      const matchesQuery = !query || [ticket.subject, ticket.category, ticket._id, ticket.ticketNumber, ticket.status].some((value) => String(value || "").toLowerCase().includes(query));
      const status = String(ticket.status || "Open").toLowerCase();
      const matchesStatus = ticketStatusFilter === "All" || status === ticketStatusFilter.toLowerCase();
      return matchesQuery && matchesStatus;
    });
    const statusClass = (status) => {
      const value = String(status || "Open").toLowerCase();
      if (value.includes("resolv") || value.includes("clos")) return "bg-emerald-50 text-emerald-700";
      if (value.includes("progress") || value.includes("assign")) return "bg-blue-50 text-blue-700";
      if (value.includes("urgent") || value.includes("high")) return "bg-rose-50 text-rose-700";
      return "bg-amber-50 text-amber-700";
    };
    return (
      <div className="space-y-5">
        <section className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading title="Support Tickets" subtitle="Create a support request and track updates from your support team." action={<button type="button" onClick={() => { setTicketFormOpen((value) => !value); setTicketError(""); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Plus size={17} /> New ticket</button>} />
          {ticketError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{ticketError}</div>}
          {ticketSuccess && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ticketSuccess}</div>}
          {ticketFormOpen && <form onSubmit={submitSupportTicket} className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:p-5">
            <h3 className="mb-4 font-bold text-slate-900">Create a support request</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Subject *<input required maxLength={140} value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-violet-400" placeholder="Briefly describe the issue" /></label>
              <label className="text-sm font-medium text-slate-700">Category<select value={ticketForm.category} onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3"><option>IT Support</option><option>HR</option><option>Attendance</option><option>Payroll</option><option>Software Issue</option><option>Other</option></select></label>
              <label className="text-sm font-medium text-slate-700">Priority<select value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description *<textarea required minLength={5} rows={4} value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-violet-400" placeholder="Explain what happened and what help you need..." /></label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setTicketFormOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={ticketSubmitting} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{ticketSubmitting ? "Submitting..." : "Submit ticket"}</button></div>
          </form>}
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5"><Search size={17} className="text-slate-400" /><input value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)} placeholder="Search tickets..." className="w-full bg-transparent text-sm outline-none" /></div>
            <select value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>All</option><option>Open</option><option>Assigned</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select>
          </div>
          <div className="mb-3 flex justify-end"><button type="button" onClick={loadSupportTickets} disabled={ticketsLoading} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 disabled:opacity-60"><RefreshCw size={15} className={ticketsLoading ? "animate-spin" : ""} /> Refresh tickets</button></div>
          {ticketsLoading ? <div className="py-10 text-center text-sm text-slate-500">Loading your tickets...</div> : filtered.length === 0 ? <EmptyState icon={Ticket} title="No tickets found" description="Your support requests will appear here. Create a new ticket if you need help." /> : <div className="space-y-3">{filtered.map((ticket) => <article key={ticket._id || ticket.id || ticket.ticketNumber} className="rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-slate-900">{ticket.subject || "Support request"}</p><p className="mt-1 text-xs text-slate-500">{ticket.ticketNumber || `Ticket #${String(ticket._id || ticket.id || "").slice(-6)}`} · {ticket.category || "General"} · {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "Recently created"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(ticket.status)}`}>{ticket.status || "Open"}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ticket.description || "No description provided."}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">Priority: {ticket.priority || "Medium"}</span>{ticket.assignedTo?.name && <span>Assigned to: {ticket.assignedTo.name}</span>}</div>{(ticket.adminReply || ticket.resolutionNote) && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Support team update</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{ticket.adminReply || ticket.resolutionNote}</p></div>}</article>)}</div>}
        </section>
      </div>
    );
  }

  function renderHelpCenter() {
    const faqs = [
      { category: "Attendance", question: "How do I check in or check out?", answer: "Open Attendance from the sidebar and use the available check-in or check-out action. If the action is unavailable, contact HR or IT support." },
      { category: "Leave Requests", question: "How can I apply for leave?", answer: "Open Leave Requests, complete the leave type, date range and reason, then submit your request. You can return to the same page to track its status." },
      { category: "Tasks", question: "Where can I see my assigned tasks?", answer: "Open Tasks from the sidebar. Your assigned work and available status information will be displayed there." },
      { category: "Profile", question: "How can I update my employee details?", answer: "Open My Profile. If a field cannot be edited, contact your HR or system administrator." },
      { category: "Technical Issue", question: "What should I do if the ERP page is not working?", answer: "Refresh the page and sign in again if needed. If the issue continues, create a Support Ticket and include the steps that caused the issue." },
      { category: "Support Tickets", question: "How do I track my support request?", answer: "Open Support Tickets to see your requests, current status and any available response or resolution note from the support team." },
    ];
    return <div className="space-y-5"><section className={`${cardClass} p-5 sm:p-6`}><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><HelpCircle size={25} /></div><div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-slate-900">Help Center</h2><p className="mt-1 text-sm leading-6 text-slate-500">Quick answers to common employee portal questions.</p></div><button type="button" onClick={() => changePage("Support Tickets")} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><MessageSquare size={16} /> Contact support</button></div><div className="mt-6 space-y-3">{faqs.map((faq, index) => <div key={faq.question} className="overflow-hidden rounded-xl border border-slate-200"><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq((current) => current === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50"><span><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-violet-600">{faq.category}</span><span className="text-sm font-semibold text-slate-800">{faq.question}</span></span><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} /></button>{openFaq === index && <div className="border-t border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600">{faq.answer}</div>}</div>)}</div><div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="font-semibold text-slate-900">Still need help?</p><p className="mt-1 text-sm text-slate-600">Create a ticket and the support team can follow up with you.</p></div><button type="button" onClick={() => changePage("Support Tickets")} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 sm:mt-0">Open Support Tickets <ExternalLink size={15} /></button></div></section></div>;
  }

  function changeMonth(amount) {
    setCalendarDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1
        )
    );
  }

  const profileFields = [
    ["Employee ID", profile?.employeeId],
    ["Email", displayEmail],
    ["Phone", profile?.phone],
    ["Department", profile?.department],
    ["Designation", profile?.designation],
    ["Joining Date", formatDate(profile?.joiningDate)],
    ["Employment Type", profile?.employmentType],
    ["Status", profile?.status],
  ];

  function renderProfile() {
    return (
      <div className={`${cardClass} p-5 sm:p-7`}>
        <SectionHeading
          title="My Profile"
          subtitle="Your employee information and employment details"
          action={
            <button
              type="button"
              onClick={() => setShowProfileEdit((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={15} />
              {showProfileEdit ? "Close" : "Edit profile"}
            </button>
          }
        />

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-violet-700 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {profile?.designation || "Employee"}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {profile?.status || "Employee"}
            </span>
          </div>
        </div>

        {showProfileEdit && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Profile editing is not connected yet. Your current employee
            details are displayed below. We will connect editing after checking
            your employee backend routes.
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {profileFields.map(([label, value]) => {
            const Icon =
              label === "Email"
                ? Mail
                : label === "Phone"
                ? Phone
                : label === "Department"
                ? Building2
                : label === "Designation"
                ? BriefcaseBusiness
                : label === "Joining Date"
                ? CalendarDays
                : UserRound;

            return (
              <div
                key={label}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon size={15} />
                  {label}
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                  {value || "Not available"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAttendance() {
    const hasCheckedIn = hasCheckedInToday;
    const hasCheckedOut = hasCheckedOutToday;

    return (
      <div className="space-y-5">
        <div className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            title="Today's Attendance"
            subtitle={`Record your workday for ${formatDate(new Date())}`}
          />
          <div className="flex flex-col gap-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
                <Clock3 size={23} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {hasCheckedOut
                    ? "Your workday is complete"
                    : hasCheckedIn
                    ? "You're checked in"
                    : "Ready to start your workday?"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Check-in: <strong>{getCheckInValue(todayAttendance) || "—"}</strong>
                  {" · "}
                  Check-out: <strong>{getCheckOutValue(todayAttendance) || "—"}</strong>
                </p>
                <div className="mt-2">
                  <StatusBadge status={todayAttendance?.status || "Not checked in"} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={attendanceAction || hasCheckedIn || hasCheckedOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <CheckCircle2 size={17} />
                {attendanceAction ? "Verifying..." : hasCheckedIn ? "Checked in" : "Check in"}
              </button>
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={attendanceAction || !hasCheckedIn || hasCheckedOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clock3 size={17} />
                {hasCheckedOut ? "Checked out" : "Check out"}
              </button>
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            title="Attendance Overview"
            subtitle="Your available attendance records"
          />

          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-semibold text-slate-800">{monthLabel}</h3>
            <button
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-2 text-xs font-medium text-slate-400"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              const record = getAttendanceForDay(day);
              const status = String(record?.status || "").toLowerCase();
              const isToday =
                day === today.getDate() &&
                calendarDate.getMonth() === today.getMonth() &&
                calendarDate.getFullYear() === today.getFullYear();

              let dayColor = "border-slate-100 bg-white text-slate-700";

              if (record && status.includes("present")) {
                dayColor = "border-emerald-200 bg-emerald-50 text-emerald-700";
              } else if (record && status.includes("absent")) {
                dayColor = "border-rose-200 bg-rose-50 text-rose-700";
              } else if (record && status.includes("leave")) {
                dayColor = "border-slate-200 bg-slate-100 text-slate-600";
              }

              if (isToday) {
                dayColor =
                  "border-violet-600 bg-violet-600 font-bold text-white shadow-sm";
              }

              return (
                <div
                  key={`${day ?? "empty"}-${index}`}
                  title={record ? `Attendance: ${record.status}` : undefined}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xs sm:text-sm ${day ? dayColor : "border-transparent"} ${record ? "font-semibold" : ""}`}
                >
                  {day || ""}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Present
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Absent
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Leave
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
              Today
            </span>
          </div>
        </div>

        <div className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            title="Attendance History"
            subtitle="Records returned by the attendance API"
          />

          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search attendance..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          {filteredAttendance.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No attendance records found"
              description="Your attendance records will appear here when available."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Check-in</th>
                    <th className="px-3 py-3 font-medium">Check-out</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((record, index) => (
                    <tr
                      key={record._id || index}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-3 py-4 font-medium">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-3 py-4">{getCheckInValue(record) || "—"}</td>
                      <td className="px-3 py-4">{getCheckOutValue(record) || "—"}</td>
                      <td className="px-3 py-4">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderLeaveRequests() {
    return (
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            title="Apply for Leave"
            subtitle="Submit a request for Admin/HR approval"
          />

          <form onSubmit={submitLeave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Leave type
              </label>
              <select
                required
                value={leaveForm.leaveType}
                onChange={(event) =>
                  setLeaveForm({
                    ...leaveForm,
                    leaveType: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Earned Leave</option>
                <option>Unpaid Leave</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  From date
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={leaveForm.fromDate}
                  onChange={(event) =>
                    setLeaveForm({
                      ...leaveForm,
                      fromDate: event.target.value,
                      toDate:
                        leaveForm.toDate &&
                        leaveForm.toDate < event.target.value
                          ? ""
                          : leaveForm.toDate,
                    })
                  }
                  className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  To date
                </label>
                <input
                  type="date"
                  required
                  min={leaveForm.fromDate || new Date().toISOString().slice(0, 10)}
                  value={leaveForm.toDate}
                  onChange={(event) =>
                    setLeaveForm({
                      ...leaveForm,
                      toDate: event.target.value,
                    })
                  }
                  className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Reason
                </label>
                <span className="text-xs text-slate-400">
                  {leaveForm.reason.length}/200
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={200}
                value={leaveForm.reason}
                onChange={(event) =>
                  setLeaveForm({
                    ...leaveForm,
                    reason: event.target.value,
                  })
                }
                placeholder="Enter your reason for leave..."
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
              {submitting ? "Submitting..." : "Submit leave request"}
            </button>
          </form>
        </div>

        <div className={`${cardClass} p-5 sm:p-6`}>
          <SectionHeading
            title="My Leave Requests"
            subtitle="Track your submitted leave applications"
          />

          {leaveRequests.length === 0 ? (
            <EmptyState
              icon={Plane}
              title="No leave requests yet"
              description="When you apply for leave, your request and its approval status will appear here."
            />
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((request, index) => (
                <article
                  key={request._id || index}
                  className="rounded-xl border border-slate-100 p-4 transition hover:border-violet-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Plane size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {request.leaveType || "Leave"}
                        </h3>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(request.fromDate)} – {formatDate(request.toDate)}
                      </p>
                      {request.reason && (
                        <p className="mt-3 break-words text-sm leading-5 text-slate-600">
                          {request.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderTasks() {
    const taskCounts = {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "Pending").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      completed: tasks.filter((task) => task.status === "Completed").length,
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });

    return (
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total tasks", value: taskCounts.total, color: "text-violet-700 bg-violet-50" },
            { label: "Pending", value: taskCounts.pending, color: "text-blue-700 bg-blue-50" },
            { label: "In progress", value: taskCounts.inProgress, color: "text-amber-700 bg-amber-50" },
            { label: "Completed", value: taskCounts.completed, color: "text-emerald-700 bg-emerald-50" },
          ].map((item) => (
            <div key={item.label} className={`${cardClass} flex items-center gap-3 p-4`}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                <ClipboardList size={21} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              </div>
            </div>
          ))}
        </section>

        <section className={`${cardClass} p-5 sm:p-7`}>
          <SectionHeading
            title="My Tasks"
            subtitle="Tasks assigned to you by Admin or your manager"
            action={
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            }
          />

          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No tasks assigned yet"
              description="When Admin assigns a task to your employee account, it will appear here."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {sortedTasks.map((task) => {
                const isUpdating = taskActionId === task._id;
                const priorityClass =
                  task.priority === "High"
                    ? "bg-rose-50 text-rose-700"
                    : task.priority === "Low"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-amber-50 text-amber-700";

                return (
                  <article
                    key={task._id}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:shadow-sm sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                        <ClipboardList size={21} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="break-words font-bold text-slate-900">
                            {task.title || "Untitled task"}
                          </h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass}`}>
                            {task.priority || "Medium"} priority
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {typeof task.projectId === "object"
                            ? task.projectId?.name || task.projectId?.title || task.project || "Project"
                            : task.project || "Project not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Due date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Current status</p>
                        <div className="mt-1">
                          <StatusBadge status={task.status || "Pending"} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Update task status
                      </label>
                      <select
                        value={task.status || "Pending"}
                        disabled={isUpdating}
                        onChange={(event) => updateTaskStatus(task._id, event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-wait disabled:bg-slate-50"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      {isUpdating && (
                        <p className="mt-2 text-xs text-violet-600">Saving status...</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderDashboard() {
    const latestAttendance = attendance
      .filter((record) => String(record.date || "").slice(0, 10) === selectedDashboardDate)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return (
      <>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-700 p-6 text-white shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-[-70px] right-[22%] h-44 w-44 rounded-full bg-blue-300/10" />

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-violet-100">
                {selectedDashboardDate === getLocalDateKey() ? "Good to see you again," : "Workspace overview for,"}
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {displayName}! 👋
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100 sm:text-base">
                {selectedDashboardDate === getLocalDateKey()
                  ? "Here's your overview for today. Stay productive and keep up the great work!"
                  : `Here's the available overview and records for ${selectedDashboardDateLabel}.`}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <CalendarDays size={25} />
              <div>
                <p className="text-xs text-violet-100">Selected date</p>
                <p className="mt-1 font-semibold">
                  {formatDate(selectedDashboardDateObject, { weekday: "short" })}
                </p>
                <p className="text-sm text-violet-100">
                  {selectedDashboardDateObject.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${cardClass} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Clock3 size={22} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Selected Date Attendance</p>
              <p className="mt-1 text-sm text-slate-500">
                Check-in: {getCheckInValue(selectedDashboardAttendance) || "—"} · Check-out: {getCheckOutValue(selectedDashboardAttendance) || "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={attendanceAction || selectedDashboardDate !== getLocalDateKey() || hasAttendanceTime(getCheckInValue(selectedDashboardAttendance)) || hasAttendanceTime(getCheckOutValue(selectedDashboardAttendance))}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CheckCircle2 size={16} />
              {attendanceAction ? "Please wait..." : hasAttendanceTime(getCheckInValue(selectedDashboardAttendance)) ? "Checked in" : "Check in"}
            </button>
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={attendanceAction || selectedDashboardDate !== getLocalDateKey() || !hasAttendanceTime(getCheckInValue(selectedDashboardAttendance)) || hasAttendanceTime(getCheckOutValue(selectedDashboardAttendance))}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clock3 size={16} />
              {hasAttendanceTime(getCheckOutValue(selectedDashboardAttendance)) ? "Checked out" : "Check out"}
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            icon={UserRound}
            title="My Department"
            value={profile?.department || "Not assigned"}
            subtitle={profile?.designation || "Employee"}
            color="violet"
            onClick={() => changePage("My Profile")}
          />
          <StatCard
            icon={CalendarCheck}
            title="Attendance on selected date"
            value={selectedDashboardAttendance ? (String(selectedDashboardAttendance.status || "").toLowerCase().includes("present") ? "Present" : selectedDashboardAttendance.status || "Recorded") : "No record"}
            subtitle={selectedDashboardDateLabel}
            color="green"
            onClick={() => changePage("Attendance")}
          />
          <StatCard
            icon={Plane}
            title="Pending leave requests"
            value={selectedDayLeaves.length}
            subtitle="Leave requests covering this date"
            color="blue"
            onClick={() => changePage("Leave Requests")}
          />
          <StatCard
            icon={ClipboardList}
            title="Tasks due"
            value={selectedDayTasks.length}
            subtitle="Tasks due on selected date"
            color="orange"
            onClick={() => changePage("Tasks")}
          />
        </section>

        <section className="grid items-start gap-4 2xl:grid-cols-3">
          <div className={`${cardClass} p-5 2xl:col-span-1`}>
            <SectionHeading
              title="My Profile"
              subtitle="Your employee information"
              action={
                <button
                  onClick={() => changePage("My Profile")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  View profile <ChevronRight size={14} />
                </button>
              }
            />

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl font-bold text-violet-700">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {profile?.designation || "Employee"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {profile?.employeeId || "Employee ID unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                [Mail, "Email", displayEmail],
                [Phone, "Phone", profile?.phone],
                [Building2, "Department", profile?.department],
                [BriefcaseBusiness, "Employment", profile?.employmentType],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
                  <span className="w-24 shrink-0 text-slate-500">{label}</span>
                  <span className="min-w-0 break-words font-medium text-slate-800">
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${cardClass} p-5 2xl:col-span-1`}>
            <SectionHeading
              title="Attendance Overview"
              subtitle={monthLabel}
              action={
                <button
                  onClick={() => changePage("Attendance")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  View all <ChevronRight size={14} />
                </button>
              }
            />

            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <button
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div
                  key={`${day}-${index}`}
                  className="py-1.5 text-xs font-medium text-slate-400"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((day, index) => {
                const record = getAttendanceForDay(day);
                const status = String(record?.status || "").toLowerCase();
                const isToday =
                  day === today.getDate() &&
                  calendarDate.getMonth() === today.getMonth() &&
                  calendarDate.getFullYear() === today.getFullYear();

                let color = "text-slate-700 hover:bg-slate-50";

                if (status.includes("present")) {
                  color = "bg-emerald-100 font-semibold text-emerald-800";
                } else if (status.includes("absent")) {
                  color = "bg-rose-100 font-semibold text-rose-800";
                } else if (status.includes("leave")) {
                  color = "bg-slate-200 font-semibold text-slate-700";
                }

                if (isToday) {
                  color = "bg-violet-600 font-bold text-white shadow-sm";
                }

                return (
                  <div
                    key={`${day ?? "blank"}-${index}`}
                    title={record?.status || undefined}
                    className={`flex aspect-square items-center justify-center rounded-lg text-xs sm:text-sm ${
                      day ? color : ""
                    }`}
                  >
                    {day || ""}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Absent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-600" />
                Today
              </span>
            </div>
          </div>

          <div className={`${cardClass} p-5 2xl:col-span-1`}>
            <SectionHeading
              title="Apply for Leave"
              subtitle="Request time off"
            />

            <form onSubmit={submitLeave} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Leave type
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(event) =>
                    setLeaveForm({
                      ...leaveForm,
                      leaveType: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                >
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Earned Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    From date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={leaveForm.fromDate}
                    onChange={(event) =>
                      setLeaveForm({
                        ...leaveForm,
                        fromDate: event.target.value,
                        toDate:
                          leaveForm.toDate &&
                          leaveForm.toDate < event.target.value
                            ? ""
                            : leaveForm.toDate,
                      })
                    }
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    To date
                  </label>
                  <input
                    type="date"
                    required
                    min={leaveForm.fromDate || new Date().toISOString().slice(0, 10)}
                    value={leaveForm.toDate}
                    onChange={(event) =>
                      setLeaveForm({
                        ...leaveForm,
                        toDate: event.target.value,
                      })
                    }
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-xs outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Reason
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={200}
                  value={leaveForm.reason}
                  onChange={(event) =>
                    setLeaveForm({
                      ...leaveForm,
                      reason: event.target.value,
                    })
                  }
                  placeholder="Enter your reason..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {leaveForm.reason.length}/200
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-3 text-sm font-semibold text-white hover:from-violet-700 hover:to-purple-700 disabled:opacity-60"
              >
                <Send size={16} />
                {submitting ? "Submitting..." : "Submit leave request"}
              </button>

              <button
                type="button"
                onClick={() => changePage("Leave Requests")}
                className="w-full py-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
              >
                View all leave requests →
              </button>
            </form>
          </div>
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-3">
          <div className={`${cardClass} p-5`}>
            <SectionHeading
              title="Recent Attendance"
              subtitle="Latest available records"
              action={
                <button
                  onClick={() => changePage("Attendance")}
                  className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  View all →
                </button>
              }
            />

            {latestAttendance.length === 0 ? (
              <p className="py-5 text-sm text-slate-500">
                No attendance records found for the selected date.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {latestAttendance.map((record, index) => (
                  <div
                    key={record._id || index}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <span className="text-sm font-bold">
                        {record.date
                          ? new Date(record.date).getDate()
                          : "—"}
                      </span>
                      <span className="text-[10px]">
                        {record.date
                          ? new Date(record.date).toLocaleDateString("en-US", {
                              month: "short",
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {record.status || "Attendance record"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {record.checkIn || "—"} – {record.checkOut || "—"}
                      </p>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        String(record.status).toLowerCase().includes("absent")
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${cardClass} p-5`}>
            <SectionHeading
              title="My Leave Requests"
              subtitle="Your recent applications"
              action={
                <button
                  onClick={() => changePage("Leave Requests")}
                  className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  View all →
                </button>
              }
            />

            {selectedDayLeaves.length === 0 ? (
              <p className="py-5 text-sm text-slate-500">
                No leave requests cover the selected date.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDayLeaves.slice(0, 3).map((request, index) => (
                  <div
                    key={request._id || index}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Plane size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {request.leaveType || "Leave"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(request.fromDate)} –{" "}
                        {formatDate(request.toDate)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 p-5 shadow-sm">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-200/60" />
            <div className="relative">
              <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700">
                Workspace tip
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Stay organized and productive
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep your employee information up to date and check your
                attendance and leave status regularly.
              </p>
              <button
                onClick={() => changePage("My Profile")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                View my profile <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderPage() {
    switch (activePage) {
      case "My Profile":
        return renderProfile();
      case "Attendance":
        return renderAttendance();
      case "Leave Requests":
        return renderLeaveRequests();
      case "Tasks":
        return renderTasks();
      case "Support Tickets":
        return renderSupportTickets();
      case "Help Center":
        return renderHelpCenter();
      default:
        return renderDashboard();
    }
  }

  const pageSubtitle = {
    Dashboard: "Your personal workspace overview",
    "My Profile": "View your employment details",
    Attendance: "Review your attendance history",
    "Leave Requests": "Apply for leave and track requests",
    Tasks: "Review your assigned work",
    "Support Tickets": "Create a request and track support updates",
    "Help Center": "Find answers to common employee questions",
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${
          isSidebarCollapsed ? "w-[84px]" : "w-[280px]"
        } flex-col bg-[#0b1020] text-slate-300 shadow-xl transition-all duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className={`flex h-[86px] shrink-0 items-center gap-3 border-b border-white/10 ${
          isSidebarCollapsed ? "justify-center px-2" : "px-[18px]"
        }`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-950/30">
            <Building2 size={25} />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold tracking-tight text-white">ERP WORKSPACE</p>
              <p className="mt-1 truncate text-sm text-slate-400">Employee Portal</p>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {!isSidebarCollapsed && <div className="px-3 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151b2b] px-3 py-3">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>}

        {!isSidebarCollapsed && <p className="px-6 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>}

        <nav className={`flex-1 space-y-1 overflow-y-auto pb-4 ${
          isSidebarCollapsed ? "px-2 pt-5" : "px-[15px]"
        }`}>
          {NAV_ITEMS.filter((item) =>
            item.label.toLowerCase().includes(search.toLowerCase())
          ).map((item) => (
            <button
              key={item.label}
              onClick={() => changePage(item.label)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`flex w-full items-center ${
                isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
              } rounded-xl py-3.5 text-left text-[15px] transition ${
                activePage === item.label
                  ? "bg-gradient-to-r from-violet-600 to-purple-700 font-semibold text-white shadow-lg shadow-violet-950/30"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <item.icon size={20} strokeWidth={2} />
              {!isSidebarCollapsed && <span className="flex-1">{item.label}</span>}
              {!isSidebarCollapsed && activePage === item.label && (
                <ChevronRight size={15} className="text-violet-200" />
              )}
            </button>
          ))}
        </nav>

        <div className={`mt-auto border-t border-white/10 ${
          isSidebarCollapsed ? "p-2" : "p-[15px]"
        }`}>
          <div className={`mb-2 flex items-center rounded-xl border border-white/[0.06] bg-[#151b2b] ${
            isSidebarCollapsed ? "justify-center p-2" : "gap-3 p-3"
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-200 text-base font-bold text-violet-800">
              {initials}
            </div>
            {!isSidebarCollapsed && <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-xs text-slate-400">{profile?.employeeId || "Employee"}</p>
            </div>}
          </div>

          <button
            onClick={logout}
            title={isSidebarCollapsed ? "Logout" : undefined}
            className={`flex w-full items-center rounded-xl py-3 text-[15px] text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300 ${
              isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
            }`}
          >
            <LogOut size={19} />
            {!isSidebarCollapsed && "Logout"}
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-1 flex w-full items-center rounded-xl py-3 text-sm text-slate-400 transition hover:bg-white/[0.07] hover:text-white ${
              isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
            }`}
          >
            {isSidebarCollapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
            {!isSidebarCollapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${
        isSidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[280px]"
      }`}>
        <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="hidden w-full max-w-[420px] items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 sm:flex">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search anything... (Ctrl + K)"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="min-w-0 sm:hidden">
              <p className="truncate text-sm font-bold">{activePage}</p>
              <p className="truncate text-xs text-slate-500">Employee Portal</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                title="Notifications"
                onClick={() => { setNotificationsOpen((open) => !open); setProfileMenuOpen(false); }}
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {notificationsOpen && <>
                <button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setNotificationsOpen(false)} />
                <section className="absolute right-0 top-[calc(100%+14px)] z-50 w-[min(450px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                    <div><h3 className="font-bold text-slate-900">Notifications</h3><p className="mt-0.5 text-sm text-slate-500">{unreadCount} unread</p></div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && <button type="button" onClick={markAllNotificationsRead} className="text-xs font-semibold text-violet-600 hover:text-violet-800">Mark all read</button>}
                      <button type="button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
                    </div>
                  </div>
                  {notificationError && <p className="px-5 pt-3 text-xs text-rose-600">{notificationError}</p>}
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? <div className="flex flex-col items-center px-5 py-10 text-center"><Bell size={28} className="text-slate-300" /><p className="mt-4 text-sm font-medium text-slate-700">No notifications yet</p><p className="mt-1 text-sm text-slate-500">New updates will appear here.</p></div> : notifications.map((item) => <button key={item._id} type="button" onClick={() => { if (!item.isRead) markNotificationRead(item._id); if (item.link) window.location.assign(item.link); }} className={`flex w-full gap-3 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50 ${item.isRead ? "bg-white" : "bg-violet-50/60"}`}><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-sm text-slate-600">{item.message}</span><span className="mt-2 block text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span></span></button>)}
                  </div>
                </section>
              </>}
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="relative">
              <button type="button" aria-expanded={profileMenuOpen} onClick={() => { setProfileMenuOpen((open) => !open); setNotificationsOpen(false); }} className={`flex items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition hover:bg-slate-50 ${profileMenuOpen ? "bg-slate-100" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{initials}</div>
                <div className="hidden min-w-0 sm:block"><p className="max-w-[145px] truncate text-sm font-semibold text-slate-800">{displayName}</p><p className="text-xs text-slate-500">{profile?.employeeId || "Employee"}</p></div>
                <ChevronDown size={16} className={`hidden text-slate-500 transition sm:block ${profileMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {profileMenuOpen && <>
                <button aria-label="Close profile menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileMenuOpen(false)} />
                <section className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">{initials}</div>
                    <div className="min-w-0"><p className="truncate font-bold text-slate-900">{displayName}</p><p className="mt-1 truncate text-sm text-slate-500">{displayEmail}</p><p className="mt-1 text-xs text-slate-400">Employee · {profile?.employeeId || "ID unavailable"}</p></div>
                  </div>
                  <div className="space-y-1 p-2.5">
                    <button type="button" onClick={() => { changePage("My Profile"); setProfileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${activePage === "My Profile" ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}><UserRound size={19} className="text-slate-500" />My Profile</button>
                    <button type="button" onClick={() => { setProfileMenuOpen(false); setNotice("Account settings are not available in the employee portal yet."); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"><Settings size={19} className="text-slate-500" />Account Settings</button>
                  </div>
                  <div className="border-t border-slate-100 p-2.5"><button type="button" onClick={() => { setProfileMenuOpen(false); logout(); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"><LogOut size={19} />Logout</button></div>
                </section>
              </>}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1800px] space-y-5 p-3 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                Employee Workspace
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {activePage === "Dashboard"
                  ? `Welcome back, ${displayName}! 👋`
                  : activePage}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {pageSubtitle[activePage]}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Choose dashboard date"
                  aria-expanded={datePickerOpen}
                  onClick={() => setDatePickerOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <CalendarDays size={17} className="text-violet-600" />
                  <span>{selectedDashboardDateLabel}</span>
                  <ChevronDown size={15} className={`text-slate-400 transition ${datePickerOpen ? "rotate-180" : ""}`} />
                </button>
                {datePickerOpen && <>
                  <button type="button" aria-label="Close date picker" className="fixed inset-0 z-30 cursor-default" onClick={() => setDatePickerOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[min(300px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <p className="mb-3 text-sm font-semibold text-slate-800">View dashboard by date</p>
                    <input
                      type="date"
                      value={selectedDashboardDate}
                      onChange={(event) => {
                        if (event.target.value) setSelectedDashboardDate(event.target.value);
                        setDatePickerOpen(false);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                    <div className="mt-3 flex justify-between gap-2">
                      <button type="button" onClick={() => { setSelectedDashboardDate(getLocalDateKey()); setDatePickerOpen(false); }} className="rounded-lg px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50">Today</button>
                      <button type="button" onClick={() => setDatePickerOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Close</button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Dashboard attendance, leave requests and due tasks update for the selected date. Check-in/out is available only for today.</p>
                  </div>
                </>}
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
            >
              <CircleAlert size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
              <button
                aria-label="Dismiss error"
                onClick={() => setError("")}
                className="rounded p-1 hover:bg-rose-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">{notice}</div>
              <button
                aria-label="Dismiss notice"
                onClick={() => setNotice("")}
                className="rounded p-1 hover:bg-emerald-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {loading ? (
            <div className={`${cardClass} flex items-center gap-3 p-8 text-sm text-slate-500`}>
              <RefreshCw size={19} className="animate-spin text-violet-600" />
              Loading your employee workspace...
            </div>
          ) : (
            renderPage()
          )}

          {attendanceCameraOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="attendance-verification-title">
              <section className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                  <div>
                    <div className="flex items-center gap-2 text-violet-700"><ShieldCheck size={20} /><span className="text-xs font-bold uppercase tracking-wider">Secure attendance</span></div>
                    <h2 id="attendance-verification-title" className="mt-2 text-xl font-bold text-slate-900">Face verification</h2>
                    <p className="mt-1 text-sm text-slate-500">Keep your face visible and look directly at the camera.</p>
                  </div>
                  <button type="button" onClick={cancelAttendanceCamera} aria-label="Cancel attendance verification" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <MapPin size={18} className="mt-0.5 shrink-0" />
                    <div><p className="font-semibold">Office location verified locally</p><p className="mt-0.5 text-xs leading-5">{attendanceLocation ? `Within ${attendanceLocation.distance} m of the configured office point · GPS accuracy ±${Math.round(attendanceLocation.accuracy)} m` : "Waiting for location..."}</p></div>
                  </div>
                  {cameraError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{cameraError}</div>}
                  <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                    <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
                    {!cameraReady && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-sm text-white"><Video size={28} />Starting camera...</div>}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-56 w-44 max-w-[65%] rounded-[48%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.15)]" /></div>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">Your camera image will be sent to the attendance server for verification. Check-in should only be accepted if the server confirms both face matching and office geofence validation.</p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={cancelAttendanceCamera} disabled={attendanceStep === "submitting"} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={captureAttendanceFace} disabled={!cameraReady || attendanceAction || attendanceStep === "submitting"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Camera size={17} />{attendanceStep === "submitting" ? "Verifying face..." : "Capture & check in"}</button>
                  </div>
                </div>
              </section>
            </div>
          )}

          <footer className="py-2 text-center text-xs text-slate-400">
            ERP Workspace · Employee Portal
          </footer>
        </main>
      </div>
    </div>
  );
}
        