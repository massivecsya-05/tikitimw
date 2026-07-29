import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { useNotifications, useNotificationPreference } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const Notifications = () => {
  const { user, loading } = useAuth();
  const [filter, setFilter] = useState<"all" | "tickets">("all");
  const { data: notifications = [], unreadCount, markRead, markAllRead, isLoading } = useNotifications();
  const { data: eventNotificationsEnabled = true, update: updatePreference } = useNotificationPreference();

  if (loading) return null;
  if (!user) return <Navigate to="/auth?redirect=/notifications" />;

  const filtered = filter === "tickets" ? notifications.filter((n) => n.type === "event") : notifications;

  return (
    <PageShell hideFooter>
      <div className="container mx-auto px-4 pt-6 pb-28 max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-extrabold text-3xl">Notifications</h1>
          {unreadCount > 0 && (
            <button type="button" onClick={() => markAllRead.mutate()} className="text-xs text-primary font-medium min-h-12 px-2">
              Mark all read
            </button>
          )}
        </div>

        <div className="inline-flex items-center bg-muted rounded-full p-1 mb-4">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors min-h-10 ${
              filter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("tickets")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors min-h-10 ${
              filter === "tickets" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Tickets
          </button>
        </div>

        <label className="flex items-center justify-between gap-3 py-3 mb-3 cursor-pointer border-b border-border/60">
          <span className="text-sm text-muted-foreground">Notify me about new events</span>
          <input
            type="checkbox"
            checked={eventNotificationsEnabled}
            onChange={(e) => updatePreference.mutate(e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
        </label>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Loading\u2026</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
              No notifications here
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.is_read && markRead.mutate(n.id)}
                className="w-full text-left flex items-start gap-3 p-4 rounded-2xl border border-border/60 bg-card shadow-card"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 grid place-items-center text-white font-display font-extrabold">
                  T
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-sm truncate">{n.title}</div>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default Notifications;
