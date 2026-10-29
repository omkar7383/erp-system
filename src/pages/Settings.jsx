import { useEffect, useState } from "react";

import {

  Building2,

  BellRing,

  CalendarDays,

  Check,

  CheckCircle2,

  Clock3,

  CalendarDays as WorkingDaysIcon,

  Eye,

  Timer,

  Globe2,

  Mail,

  MapPin,

  Palette,

  Phone,

  RotateCcw,

  Save,

  LogOut,

  Settings2,

  ShieldCheck,

  SlidersHorizontal,

  Wallet,

  X,

} from "lucide-react";



const STORAGE_KEY = "erp-settings";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const ATTENDANCE_DEFAULTS = {

  officeStartTime: "09:00",

  gracePeriodMinutes: 15,

  officeEndTime: "18:00",

  minimumWorkingHours: 8,

  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],

  minimumHoursForHalfDay: 4,

  halfDayEndTime: "13:00",

  timezone: "Asia/Kolkata",

};



function getAuthToken() {
  const storageKeys = ["erp-token", "token", "authToken", "accessToken"];

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of storageKeys) {
      const value = storage.getItem(key);
      if (value && value.trim()) {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === "string" && parsed.trim()) return parsed;
          if (parsed && typeof parsed === "object") {
            const nestedToken = parsed.token || parsed.accessToken || parsed.authToken;
            if (typeof nestedToken === "string" && nestedToken.trim()) return nestedToken;
          }
        } catch {
          return value.trim();
        }
        return value.trim();
      }
    }
  }
  return "";
}



async function attendanceSettingsRequest(method = "GET", body) {
  const token = getAuthToken();
  if (!token) {
    throw new Error(
      "Login token was not found in sessionStorage/localStorage. Sign in again, then verify which storage key your login code uses."
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/attendance/settings`, {

    method,

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${token}`,

    },

    ...(body ? { body: JSON.stringify(body) } : {}),

  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {

    throw new Error(result.message || "Could not load attendance settings.");

  }

  return result.data;

}



const defaultSettings = {

  companyName: "ERP System",

  email: "admin@erp.com",

  phone: "",

  website: "",

  address: "",

  currency: "INR",

  dateFormat: "DD/MM/YYYY",

  timezone: "Asia/Kolkata",

  theme: "Light",

  emailNotifications: true,

  systemNotifications: true,

};



const inputClass =

  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";



const buttonSecondary =

  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100";



function loadSettings() {

  try {

    const saved = localStorage.getItem(STORAGE_KEY);

    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;

  } catch {

    return defaultSettings;

  }

}



function SectionHeading({ icon: Icon, title, description, tone = "violet" }) {

  const tones = {

    violet: "bg-violet-50 text-violet-700",

    blue: "bg-blue-50 text-blue-700",

    emerald: "bg-emerald-50 text-emerald-700",

  };

  return (

    <div className="mb-6 flex items-start gap-3">

      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>

        <Icon size={21} />

      </span>

      <div>

        <h2 className="text-base font-bold text-slate-900">{title}</h2>

        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>

      </div>

    </div>

  );

}



function Settings({ onLogout }) {

  const [settings, setSettings] = useState(loadSettings);

  const [attendanceSettings, setAttendanceSettings] = useState({ ...ATTENDANCE_DEFAULTS });

  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [attendanceError, setAttendanceError] = useState("");

  const [savedMessage, setSavedMessage] = useState("");



  useEffect(() => {

    let active = true;

    attendanceSettingsRequest()

      .then((data) => {

        if (active && data) setAttendanceSettings({ ...ATTENDANCE_DEFAULTS, ...data });

      })

      .catch((error) => {

        if (active) setAttendanceError(`${error.message} Make sure the backend is running and you are signed in as Admin/HR.`);

      })

      .finally(() => {

        if (active) setAttendanceLoading(false);

      });

    return () => { active = false; };

  }, []);



  useEffect(() => {

    if (!savedMessage) return;

    const timer = window.setTimeout(() => setSavedMessage(""), 3000);

    return () => window.clearTimeout(timer);

  }, [savedMessage]);



  function updateField(event) {

    const { name, value, type, checked } = event.target;

    setSettings((current) => ({

      ...current,

      [name]: type === "checkbox" ? checked : value,

    }));

  }



  function updateAttendanceField(event) {

    const { name, value, type, checked } = event.target;

    setAttendanceSettings((current) => ({

      ...current,

      [name]: type === "checkbox"

        ? (checked

            ? [...current.workingDays, value].filter((day, index, all) => all.indexOf(day) === index)

            : current.workingDays.filter((day) => day !== value))

        : (type === "number" ? Number(value) : value),

    }));

  }



  async function saveSettings(event) {

    event.preventDefault();

    try {

      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      await attendanceSettingsRequest("PUT", attendanceSettings);

      setAttendanceError("");

      setSavedMessage("General and attendance settings saved successfully.");

    } catch (error) {

      setSavedMessage("");

      setAttendanceError(error.message || "Could not save settings.");

    }

  }



  function resetSettings() {

    if (!window.confirm("Reset all settings to their default values?")) return;

    setSettings({ ...defaultSettings });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));

    setAttendanceSettings({ ...ATTENDANCE_DEFAULTS });

    attendanceSettingsRequest("PUT", ATTENDANCE_DEFAULTS)

      .then(() => setSavedMessage("Settings reset to defaults."))

      .catch((error) => setAttendanceError(error.message || "General settings reset, but attendance settings could not be reset."));

  }



  return (

    // Page content only — App.jsx provides the shared sidebar and top navbar.

    <div className="min-h-full bg-[#f6f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-[1240px] space-y-6">

        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

          <div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-violet-700">

              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />

              Workspace / Preferences

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">

              Settings

            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">

              Manage your company profile, workspace preferences, and notification settings.

            </p>

          </div>

          {savedMessage && (

            <div

              role="status"

              className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 md:self-auto"

            >

              <CheckCircle2 size={17} />

              {savedMessage}

              <button onClick={() => setSavedMessage("")} className="ml-1 rounded p-0.5 hover:bg-emerald-100" aria-label="Dismiss message">

                <X size={14} />

              </button>

            </div>

          )}

        </header>



        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)\_280px]">

          <form onSubmit={saveSettings} className="min-w-0 space-y-5">

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">

              <SectionHeading

                icon={Building2}

                title="Company profile"

                description="Basic information about your business."

              />

              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

                <label className="block text-sm font-semibold text-slate-700">

                  Company name <span className="text-rose-500">*</span>

                  <input required name="companyName" value={settings.companyName} onChange={updateField} className={inputClass} placeholder="Your company name" />

                </label>

                <label className="block text-sm font-semibold text-slate-700">

                  Company email

                  <span className="relative mt-1.5 block">

                    <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input type="email" name="email" value={settings.email} onChange={updateField} className={`${inputClass} mt-0 pl-9`} placeholder="company@example.com" />

                  </span>

                </label>

                <label className="block text-sm font-semibold text-slate-700">

                  Phone number

                  <span className="relative mt-1.5 block">

                    <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input name="phone" value={settings.phone} onChange={updateField} className={`${inputClass} mt-0 pl-9`} placeholder="Company phone number" />

                  </span>

                </label>

                <label className="block text-sm font-semibold text-slate-700">

                  Website

                  <span className="relative mt-1.5 block">

                    <Globe2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input type="url" name="website" value={settings.website} onChange={updateField} className={`${inputClass} mt-0 pl-9`} placeholder="https\://example.com" />

                  </span>

                </label>

                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">

                  Company address

                  <span className="relative mt-1.5 block">

                    <MapPin size={16} className="pointer-events-none absolute left-3 top-4 text-slate-400" />

                    <textarea name="address" value={settings.address} onChange={updateField} className={`${inputClass} mt-0 min-h-24 pl-9`} rows={3} placeholder="Enter company address" />

                  </span>

                </label>

              </div>

            </section>



            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">

              <SectionHeading

                icon={SlidersHorizontal}

                title="General preferences"

                description="Choose how dates, currency, time, and appearance preferences are stored."

                tone="blue"

              />

              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

                <label className="block text-sm font-semibold text-slate-700">

                  Currency

                  <span className="relative mt-1.5 block">

                    <Wallet size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <select name="currency" value={settings.currency} onChange={updateField} className={`${inputClass} appearance-none pl-9`}>

                      <option value="INR">INR — Indian Rupee (₹)</option>

                      <option value="USD">USD — US Dollar ($)</option>

                      <option value="EUR">EUR — Euro (€)</option>

                      <option value="GBP">GBP — British Pound (£)</option>

                    </select>

                  </span>

                </label>

                <label className="block text-sm font-semibold text-slate-700">

                  Date format

                  <span className="relative mt-1.5 block">

                    <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <select name="dateFormat" value={settings.dateFormat} onChange={updateField} className={`${inputClass} appearance-none pl-9`}>

                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>

                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>

                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>

                    </select>

                  </span>

                </label>

                <label className="block text-sm font-semibold text-slate-700">

                  Timezone

                  <span className="relative mt-1.5 block">

                    <Clock3 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <select name="timezone" value={settings.timezone} onChange={updateField} className={`${inputClass} appearance-none pl-9`}>

                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>

                      <option value="UTC">UTC</option>

                      <option value="America/New_York">America/New_York</option>

                      <option value="Europe/London">Europe/London</option>

                    </select>

                  </span>

                </label>

                <label className="block text-sm font-semibold text-slate-700">

                  Appearance preference

                  <span className="relative mt-1.5 block">

                    <Palette size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                    <select name="theme" value={settings.theme} onChange={updateField} className={`${inputClass} appearance-none pl-9`}>

                      <option value="Light">Light</option>

                      <option value="Dark">Dark (preference only)</option>

                      <option value="System">Use system preference (preference only)</option>

                    </select>

                  </span>

                </label>

              </div>

              <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-800">

                <ShieldCheck size={18} className="mt-0.5 shrink-0" />

                <p>Currency, date, and theme options are saved as preferences. They do not automatically change formatting or the whole application theme yet.</p>

              </div>

            </section>



            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">

              <SectionHeading

                icon={Clock3}

                title="Attendance settings"

                description="Configure office timing and the rules used when employees check in. Changes are saved to the backend database."

                tone="violet"

              />

              {attendanceError && (

                <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-800">

                  {attendanceError}

                </div>

              )}

              {attendanceLoading ? (

                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading attendance settings…</p>

              ) : (

                <>

                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

                    <label className="block text-sm font-semibold text-slate-700">

                      Office check-in time

                      <input type="time" name="officeStartTime" required value={attendanceSettings.officeStartTime} onChange={updateAttendanceField} className={inputClass} />

                    </label>

                    <label className="block text-sm font-semibold text-slate-700">

                      Grace period (minutes)

                      <input type="number" name="gracePeriodMinutes" min="0" max="180" required value={attendanceSettings.gracePeriodMinutes} onChange={updateAttendanceField} className={inputClass} />

                      <span className="mt-1 block text-xs font-normal text-slate-500">Extra time allowed before marking an employee Late.</span>

                    </label>

                    <label className="block text-sm font-semibold text-slate-700">

                      Office check-out time

                      <input type="time" name="officeEndTime" required value={attendanceSettings.officeEndTime} onChange={updateAttendanceField} className={inputClass} />

                    </label>

                    <label className="block text-sm font-semibold text-slate-700">

                      Minimum working hours

                      <input type="number" name="minimumWorkingHours" min="1" max="24" step="0.5" required value={attendanceSettings.minimumWorkingHours} onChange={updateAttendanceField} className={inputClass} />

                    </label>

                  </div>



                  <div className="my-6 border-t border-slate-100" />

                  <div className="mb-3 flex items-center gap-2">

                    <WorkingDaysIcon size={19} className="text-slate-500" />

                    <h3 className="font-bold text-slate-900">Working days</h3>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {

                      const selected = attendanceSettings.workingDays.includes(day);

                      return (

                        <label key={day} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200"}`}>

                          <input type="checkbox" name="workingDays" value={day} checked={selected} onChange={updateAttendanceField} className="accent-violet-600" />

                          {day}

                        </label>

                      );

                    })}

                  </div>



                  <div className="my-6 border-t border-slate-100" />

                  <div className="mb-4 flex items-center gap-2">

                    <Timer size={19} className="text-slate-500" />

                    <h3 className="font-bold text-slate-900">Half-day settings</h3>

                  </div>

                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

                    <label className="block text-sm font-semibold text-slate-700">

                      Minimum hours for half day

                      <input type="number" name="minimumHoursForHalfDay" min="1" max="12" step="0.5" required value={attendanceSettings.minimumHoursForHalfDay} onChange={updateAttendanceField} className={inputClass} />

                    </label>

                    <label className="block text-sm font-semibold text-slate-700">

                      Half-day cutoff time

                      <input type="time" name="halfDayEndTime" required value={attendanceSettings.halfDayEndTime} onChange={updateAttendanceField} className={inputClass} />

                    </label>

                    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">

                      Attendance timezone

                      <select name="timezone" value={attendanceSettings.timezone} onChange={updateAttendanceField} className={inputClass}>

                        <option value="Asia/Kolkata">(GMT+05:30) Asia/Kolkata — India</option>

                        <option value="UTC">UTC</option>

                        <option value="Europe/London">Europe/London</option>

                        <option value="America/New_York">America/New_York</option>

                      </select>

                    </label>

                  </div>

                  <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-5 text-blue-800">

                    <div className="mb-1 flex items-center gap-2 font-semibold"><Eye size={17} /> Current rules preview</div>

                    <p>Present through {(() => { const [h, m] = attendanceSettings.officeStartTime.split(":").map(Number); const total = h * 60 + m + Number(attendanceSettings.gracePeriodMinutes || 0); return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; })()} inclusive; after that check-in is marked Late.</p>

                    <p className="mt-1">Office hours: {attendanceSettings.officeStartTime}–{attendanceSettings.officeEndTime}. Half-day threshold: {attendanceSettings.minimumHoursForHalfDay} hours, cutoff {attendanceSettings.halfDayEndTime}.</p>

                  </div>

                </>

              )}

            </section>



            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">

              <SectionHeading

                icon={BellRing}

                title="Notifications"

                description="Set your preferred notification options for the workspace."

                tone="emerald"

              />

              <div className="space-y-3">

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/30">

                  <span className="flex items-start gap-3">

                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Mail size={17} /></span>

                    <span>

                      <span className="block text-sm font-semibold text-slate-800">Email notifications</span>

                      <span className="mt-1 block text-sm leading-5 text-slate-500">Preference for receiving updates by email.</span>

                    </span>

                  </span>

                  <input type="checkbox" name="emailNotifications" checked={settings.emailNotifications} onChange={updateField} className="h-4 w-4 shrink-0 accent-violet-600" />

                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/30">

                  <span className="flex items-start gap-3">

                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><BellRing size={17} /></span>

                    <span>

                      <span className="block text-sm font-semibold text-slate-800">System notifications</span>

                      <span className="mt-1 block text-sm leading-5 text-slate-500">Preference for alerts inside the ERP workspace.</span>

                    </span>

                  </span>

                  <input type="checkbox" name="systemNotifications" checked={settings.systemNotifications} onChange={updateField} className="h-4 w-4 shrink-0 accent-violet-600" />

                </label>

              </div>

              <p className="mt-3 text-xs leading-5 text-slate-400">These toggles save your preferences; notification delivery is not connected yet.</p>

            </section>



            <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">

                    <LogOut size={19} />

                  </span>

                  <div>

                    <h2 className="font-bold text-slate-900">Logout</h2>

                    <p className="mt-1 text-sm leading-5 text-slate-500">

                      Sign out of the current ERP admin session on this browser.

                    </p>

                  </div>

                </div>

                <button

                  type="button"

                  onClick={() => onLogout?.()}

                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100"

                >

                  <LogOut size={16} />

                  Log out

                </button>

              </div>

            </section>



            <div className="flex flex-col-reverse justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">

              <button type="button" onClick={resetSettings} className={buttonSecondary}>

                <RotateCcw size={16} />

                Reset to defaults

              </button>

              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100">

                <Save size={17} />

                Save settings

              </button>

            </div>

          </form>



          <aside className="space-y-5">

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Settings2 size={20} /></span>

                <div>

                  <h2 className="font-bold text-slate-900">Settings overview</h2>

                  <p className="mt-1 text-xs text-slate-500">Current saved preferences</p>

                </div>

              </div>

              <div className="mt-5 space-y-4">

                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">

                  <span className="text-sm text-slate-500">Company</span>

                  <span className="max-w-[150px] break-words text-right text-sm font-semibold text-slate-800">{settings.companyName || "Not set"}</span>

                </div>

                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">

                  <span className="text-sm text-slate-500">Currency</span>

                  <span className="text-sm font-semibold text-slate-800">{settings.currency}</span>

                </div>

                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">

                  <span className="text-sm text-slate-500">Timezone</span>

                  <span className="max-w-[150px] break-words text-right text-sm font-semibold text-slate-800">{settings.timezone}</span>

                </div>

                <div className="flex items-start justify-between gap-3">

                  <span className="text-sm text-slate-500">Notifications</span>

                  <span className="text-right text-sm font-semibold text-slate-800">{Number(settings.emailNotifications) + Number(settings.systemNotifications)} of 2 enabled</span>

                </div>

              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">

                General preferences are stored in this browser; attendance rules are stored in the backend database.

              </div>

            </div>



            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"><Check size={20} /></span>

              <h3 className="mt-4 font-bold text-slate-900">Keep your workspace up to date</h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">Review company details and preferences whenever your business information changes.</p>

            </div>

          </aside>

        </div>

      </div>

    </div>

  );

}



export default Settings;
