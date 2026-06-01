import { apiRequest, unwrapData } from "./api";
import type { BloodRequest } from "../types/request";
import { getMyNotifications } from "./notificationService";

function getValue(obj: any, ...keys: string[]) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return undefined;
}

function mapResponseStatusToMobileStatus(responseStatus?: string) {
  if (!responseStatus) return "Bekleme";

  if (responseStatus === "Accepted") return "Talep Onaylandı";
  if (responseStatus === "Rejected") return "Uygun Değilim";
  if (responseStatus === "Pending") return "Bekleme";

  return responseStatus;
}

function mapBackendStatus(status?: string) {
  if (!status) return "Bekleme";

  if (status === "ReadyForApproval") return "Bekleme";
  if (status === "Pending") return "Bekleme";
  if (status === "Completed") return "Tamamlandı";

  return status;
}

function normalizeRequest(raw: any, notification?: any): BloodRequest {
  const requestId = Number(
    getValue(raw, "id", "Id", "requestId", "RequestId") ||
      getValue(notification, "requestId", "RequestId") ||
      0
  );

  const requesterId = Number(
    getValue(raw, "requesterId", "RequesterId", "userId", "UserId") || 0
  );

  const notificationStatus = mapResponseStatusToMobileStatus(
    getValue(notification, "responseStatus", "ResponseStatus")
  );

  const backendStatus = mapBackendStatus(
    getValue(raw, "status", "Status", "durum", "Durum")
  );

  const createdDate =
    getValue(raw, "createdDate", "CreatedDate", "createdAt", "CreatedAt") ||
    getValue(notification, "sentDate", "SentDate");

  return {
    id: requestId,
    requesterId,

    userNotificationId: Number(
      getValue(notification, "userNotificationId", "UserNotificationId") || 0
    ),

    bloodType:
      getValue(raw, "bloodType", "BloodType", "kanGrubu", "KanGrubu") ||
      extractBloodTypeFromMessage(getValue(notification, "message", "Message")) ||
      "-",

    urgency:
      getValue(raw, "urgency", "Urgency", "aciliyet", "Aciliyet") || "Acil",

    status: notification ? notificationStatus : backendStatus,

    createdDate,
    createdAt: createdDate,

    hospitalName:
      getValue(raw, "hospitalName", "HospitalName") ||
      extractHospitalFromMessage(getValue(notification, "message", "Message")) ||
      "Hastane bilgisi girilmedi",

    city:
      getValue(raw, "city", "City", "il", "Il") ||
      "İstanbul",

    district:
      getValue(raw, "district", "District", "ilce", "Ilce") ||
      "Başakşehir",

    description:
      getValue(raw, "description", "Description", "aciklama", "Aciklama") ||
      getValue(notification, "message", "Message") ||
      "Bu kan talebi için uygun bağışçıların hastane ile iletişime geçmesi beklenmektedir.",

    unitCount: Number(
      getValue(
        raw,
        "unitCount",
        "UnitCount",
        "unit",
        "Unit",
        "quantity",
        "Quantity"
      ) || 1
    ),
  };
}

function extractBloodTypeFromMessage(message?: string) {
  if (!message) return "";

  const bloodTypes = ["AB+", "AB-", "A+", "A-", "B+", "B-", "0+", "0-", "O+", "O-"];

  return bloodTypes.find((type) => message.includes(type)) || "";
}

function extractHospitalFromMessage(message?: string) {
  if (!message) return "";

  const marker = " bünyesinde";
  const markerIndex = message.indexOf(marker);

  if (markerIndex > 0) {
    return message.substring(0, markerIndex).trim();
  }

  return "";
}

async function getRequestByIdSafe(requestId: number) {
  try {
    const response = await apiRequest<any>(`/api/Requests/getbyid/${requestId}`, {
      method: "GET",
    });

    return unwrapData<any>(response);
  } catch (error) {
    console.warn("Talep detayı alınamadı:", requestId, error);
    return null;
  }
}

async function getAllRequestsFallback(): Promise<BloodRequest[]> {
  try {
    const response = await apiRequest<any>("/api/Requests/getall", {
      method: "GET",
    });

    const data = unwrapData<any[]>(response);

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => normalizeRequest(item));
  } catch (error) {
    console.warn("Request fallback alınamadı:", error);
    return [];
  }
}

export async function getBloodRequests(): Promise<BloodRequest[]> {
  const notifications = await getMyNotifications();

  if (notifications && notifications.length > 0) {
    const requests = await Promise.all(
      notifications.map(async (notification) => {
        const requestId = Number(
          getValue(notification, "requestId", "RequestId") || 0
        );

        const requestDetail = await getRequestByIdSafe(requestId);

        return normalizeRequest(requestDetail || {}, notification);
      })
    );

    return requests.sort((a, b) => {
      const dateA = new Date(a.createdDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.createdDate || b.createdAt || 0).getTime();

      return dateB - dateA;
    });
  }

  return getAllRequestsFallback();
}

export async function getBloodRequestById(id: number): Promise<BloodRequest> {
  const notifications = await getMyNotifications();

  const notification = notifications.find((item: any) => {
    const notificationRequestId = Number(
      getValue(item, "requestId", "RequestId") || 0
    );

    return notificationRequestId === id;
  });

  const requestDetail = await getRequestByIdSafe(id);

  return normalizeRequest(requestDetail || {}, notification);
}

export async function updateRequestStatus(
  requestId: number,
  status: string
): Promise<any> {
  return apiRequest<any>(
    `/api/Requests/updatestatus/${requestId}/${encodeURIComponent(status)}`,
    {
      method: "PUT",
    }
  );
}