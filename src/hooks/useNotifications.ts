import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchNotifications,
  fetchNotificationPreference,
  updateNotificationPreference,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/api";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(user!.id, notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      markAllNotificationsRead(
        user!.id,
        (query.data ?? []).filter((n) => !n.is_read).map((n) => n.id),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const deleteNotif = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
  return { ...query, unreadCount, markRead, markAllRead, deleteNotif };
}

export function useNotificationPreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-preference", user?.id],
    queryFn: () => fetchNotificationPreference(user!.id),
    enabled: !!user,
  });

  const update = useMutation({
    mutationFn: (enabled: boolean) => updateNotificationPreference(user!.id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preference", user?.id] }),
  });

  return { ...query, update };
}

