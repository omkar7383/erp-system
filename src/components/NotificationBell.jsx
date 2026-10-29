import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, X } from "lucide-react";
import { connectSocket } from "../utils/socket";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Read token from supported storage keys.
function getToken() {
  const keys = ["erp-token", "token", "authToken", "accessToken"];

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of keys) {
      const token = storage.getItem(key);

      if (token) {
        return token;
      }
    }
  }

  return null;
}

export default function NotificationBell() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [readPending, setReadPending] = useState([]);

  // Load notifications and unread count from the backend.
  const loadNotifications = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setError("Please log in to view notifications.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [notificationsResponse, countResponse] =
        await Promise.all([
          fetch(`${API_URL}/notifications`, { headers }),
          fetch(`${API_URL}/notifications/unread-count`, {
            headers,
          }),
        ]);

      const notificationsResult =
        await notificationsResponse.json();

      const countResult = await countResponse.json();

      if (
        !notificationsResponse.ok ||
        !notificationsResult.success
      ) {
        throw new Error(
          notificationsResult.message ||
            "Failed to load notifications."
        );
      }

      if (!countResponse.ok || !countResult.success) {
        throw new Error(
          countResult.message ||
            "Failed to load unread notifications."
        );
      }

      setNotifications(
        Array.isArray(notificationsResult.data)
          ? notificationsResult.data
          : []
      );

      setUnreadCount(Number(countResult.count) || 0);
    } catch (err) {
      console.error("Load notifications error:", err);
      setError(err.message || "Unable to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect the socket and listen for incoming notifications.
  useEffect(() => {
    let active = true;

    const token = getToken();

    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return () => {
        active = false;
      };
    }

    const socket = connectSocket(token);

    function handleNewNotification(notification) {
      if (!active || !notification?._id) return;

      let isNew = false;

      setNotifications((current) => {
        if (
          current.some(
            (item) => item._id === notification._id
          )
        ) {
          return current;
        }

        isNew = true;

        return [notification, ...current].slice(0, 50);
      });

      if (isNew && !notification.isRead) {
        setUnreadCount((count) => count + 1);
      }
    }

    socket?.on("new_notification", handleNewNotification);

    loadNotifications();

    return () => {
      active = false;
      socket?.off("new_notification", handleNewNotification);
    };
  }, [loadNotifications]);

  // Mark one notification as read.
  const markAsRead = async (id) => {
    const notification = notifications.find(
      (item) => item._id === id
    );

    if (
      !notification ||
      notification.isRead ||
      readPending.includes(id)
    ) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Please log in again.");
      return;
    }

    setReadPending((current) => [...current, id]);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not mark notification as read."
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item._id === id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Mark notification read error:", err);
      setError(err.message || "Could not update notification.");
    } finally {
      setReadPending((current) =>
        current.filter((pendingId) => pendingId !== id)
      );
    }
  };

  // Mark all notifications as read.
  const markAllAsRead = async () => {
    const token = getToken();

    if (!token || unreadCount === 0) return;

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not update notifications."
        );
      }

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all notifications read error:", err);
      setError(err.message || "Could not update notifications.");
    }
  };

  // Mark as read and navigate only to internal application paths.
  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    const link = notification.link;

    if (
      typeof link === "string" &&
      link.startsWith("/") &&
      !link.startsWith("//")
    ) {
      navigate(link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);

          if (nextOpen) {
            loadNotifications();
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                Notifications
              </h3>

              <p className="text-xs text-slate-500">
                {unreadCount} unread
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  aria-label="Mark all notifications as read"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                >
                  <CheckCheck size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="border-b border-red-100 bg-red-50 p-3 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell
                  className="mx-auto text-slate-300"
                  size={28}
                />

                <p className="mt-3 text-sm font-medium text-slate-700">
                  No notifications yet
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  New updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`border-b border-slate-100 p-4 ${
                    notification.isRead
                      ? "bg-white"
                      : "bg-violet-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!notification.isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-600" />
                    )}

                    <div className="min-w-0 flex-1">
                      {notification.link ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleNotificationClick(notification)
                          }
                          className="text-left text-sm font-semibold text-slate-900 hover:text-violet-700"
                        >
                          {notification.title}
                        </button>
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </p>
                      )}

                      <p className="mt-1 break-words text-sm text-slate-600">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {notification.createdAt
                          ? new Date(
                              notification.createdAt
                            ).toLocaleString()
                          : ""}
                      </p>

                      {!notification.isRead && (
                        <button
                          type="button"
                          disabled={readPending.includes(
                            notification._id
                          )}
                          onClick={() =>
                            markAsRead(notification._id)
                          }
                          className="mt-2 text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-50"
                        >
                          {readPending.includes(notification._id)
                            ? "Updating..."
                            : "Mark as read"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}