import { apiRequest } from "./api";

export async function getMyNotifications() {
  const response = await apiRequest<any>("/api/Notifications/getmy", {
    method: "GET",
  });

  return response?.Data ?? response?.data ?? [];
}

export async function respondToNotification(
  userNotificationId: number,
  responseStatus: "Accepted" | "Rejected" | "Pending"
) {
  return apiRequest("/api/Notifications/respond", {
    method: "POST",
    body: JSON.stringify({
      UserNotificationId: userNotificationId,
      ResponseStatus: responseStatus,
    }),
  });
}