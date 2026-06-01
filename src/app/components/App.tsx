import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Clock,
  Droplet,
  Hospital,
  Loader2,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { loginUser, registerUser } from "../../services/authService";
import {
  getMyNotifications,
  respondToNotification,
} from "../../services/notificationService";

import {
  getMyDonorProfile,
  updateMyDonorProfile,
} from "../../services/donorProfileService";

import "./App.css";

const LOGO_IMAGE = "/images/kan_bagi_damla_seffaf.png";

const HOME_HERO_IMAGE =
  "/images/kawaii_superhero_drop_character_sticker_transparent.png";

const THANK_YOU_IMAGE =
  "/images/cheerful_red_droplet_with_sign_transparent.png";

const SUCCESS_IMAGE =
  "/images/connection_through_donation_and_care_transparent.png";

const DETAIL_BLOOD_IMAGE =
  "/images/medical_donation_and_healthcare_infographic_icons_transparent.png";

type Screen =
  | "login"
  | "register"
  | "home"
  | "notifications"
  | "detail"
  | "profile"
  | "history"
  | "centers"
  | "approveSuccess"
  | "notAvailable"
  | "notAvailableSuccess";

type TemporaryDeferral = {
  reason: string;
  startDate: string;
  endDate?: string;
  durationDays: number | null;
};

type DonorProfile = {
  fullName: string;
  bloodType: string;
  city: string;
  district: string;
  phone: string;
  isActive: boolean;

  // Sağlık / hastalık bilgileri
  hasChronicDisease: boolean;
  usesRegularMedication: boolean;
  hadRecentSurgery: boolean;
  hasInfectiousDisease: boolean;
  isPregnantOrBreastfeeding: boolean;
  donatedRecently: boolean;
  isHealthSuitable: boolean;
  healthDescription: string;

  // Mobilde tutulacak geçici bağış engelleri
  temporaryDeferrals: TemporaryDeferral[];
  lastHealthUpdateReminderDate?: string;
};

type MobileBloodRequest = {
  id: number;
  userNotificationId?: number;
  notificationId?: number;
  donorId?: number;
  bloodType?: string;
  hospitalName?: string;
  city?: string;
  district?: string;
  urgency?: string;
  status?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  unitCount?: number;
  description?: string;
  createdAt?: string;
  responseTimeMinutes?: number;
};

type DonationHistoryItem = {
  id: number;
  requestId: number;
  bloodType: string;
  hospitalName: string;
  location: string;
  responseStatus:
  | "Talep Onaylandı"
  | "Uygun Değilim"
  | "Yanıt Vermedi"
  | "Onay İptal Edildi";
  responseDate: string;
  reason?: string;
  note?: string;
};

type BloodCenter = {
  id: number;
  name: string;
  district: string;
  city: string;
  phone: string;
  addressNote: string;
};

const demoBloodCenters: BloodCenter[] = [
  {
    id: 1,
    name: "Başakşehir Çam ve Sakura Şehir Hastanesi",
    district: "Başakşehir",
    city: "İstanbul",
    phone: "Hastane kan merkezi",
    addressNote: "Acil kan bağışı ve yönlendirme noktası",
  },
  {
    id: 2,
    name: "İstanbul Eğitim ve Araştırma Hastanesi",
    district: "Fatih",
    city: "İstanbul",
    phone: "Hastane kan merkezi",
    addressNote: "Kan talebi bildirimlerinde yönlendirilen merkez",
  },
  {
    id: 3,
    name: "Kan Bağışı Koordinasyon Merkezi",
    district: "Kadıköy",
    city: "İstanbul",
    phone: "0212 000 00 00",
    addressNote: "Demo amaçlı kan merkezi kaydı",
  },
];

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

const defaultProfile: DonorProfile = {
  fullName: "Bağışçı",
  bloodType: "-",
  city: "-",
  district: "-",
  phone: "-",
  isActive: true,
  hasChronicDisease: false,
  usesRegularMedication: false,
  hadRecentSurgery: false,
  hasInfectiousDisease: false,
  isPregnantOrBreastfeeding: false,
  donatedRecently: false,
  isHealthSuitable: true,
  healthDescription: "Profil bilgisi henüz yüklenmedi",
  temporaryDeferrals: [],
  lastHealthUpdateReminderDate: getTodayDateString(),
};

function normalizeTextValue(value: string) {
  return value.trim();
}

function normalizeBloodTypeValue(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function normalizeCityValue(value: string) {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");

  const cityMap: Record<string, string> = {
    istanbul: "İstanbul",
    "ıstanbul": "İstanbul",
    izmir: "İzmir",
    ankara: "Ankara",
  };

  return cityMap[normalized] || value.trim();
}

function normalizeDistrictValue(value: string) {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");

  const districtMap: Record<string, string> = {
    buyukcekmece: "Büyükçekmece",
    büyükçekmece: "Büyükçekmece",
    basaksehir: "Başakşehir",
    başakşehir: "Başakşehir",
    kadikoy: "Kadıköy",
    kadıköy: "Kadıköy",
    uskudar: "Üsküdar",
    üsküdar: "Üsküdar",
    fatih: "Fatih",
  };

  return districtMap[normalized] || value.trim();
}

const storageKeys = {
  profile: "kanBagiMobil_profile",
};

function readLocalStorage<T>(key: string, fallbackValue: T): T {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue ? (JSON.parse(savedValue) as T) : fallbackValue;
  } catch (error) {
    console.error("LocalStorage okuma hatası:", key, error);
    return fallbackValue;
  }
}

function writeLocalStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("LocalStorage kayıt hatası:", key, error);
  }
}

function normalizeProfile(profile: Partial<DonorProfile>): DonorProfile {
  return {
    ...defaultProfile,
    ...profile,
    temporaryDeferrals: profile.temporaryDeferrals || [],
    lastHealthUpdateReminderDate:
      profile.lastHealthUpdateReminderDate || getTodayDateString(),
  };
}

function normalizeResponseStatus(status?: string) {
  if (!status) return "Bekleme";

  const normalized = status.trim();

  if (
    [
      "Accepted",
      "Talep Onaylandı",
      "Talebi Kabul Etti",
      "Kabul Edildi",
    ].includes(normalized)
  ) {
    return "Talep Onaylandı";
  }

  if (
    [
      "Rejected",
      "Uygun Değilim",
      "Talebi Reddetti",
      "Reddedildi",
    ].includes(normalized)
  ) {
    return "Uygun Değilim";
  }

  if (
    [
      "Pending",
      "Bekleme",
      "Beklemede",
      "Bildirim Gönderildi",
      "",
    ].includes(normalized)
  ) {
    return "Bekleme";
  }

  return normalized;
}

function isWaitingStatus(status?: string) {
  return [
    "Bekleme",
    "Bildirim Gönderildi",
    "Beklemede",
    "Pending",
    undefined,
    "",
  ].includes(status);
}

function isAnsweredStatus(status?: string) {
  const normalizedStatus = normalizeResponseStatus(status);

  return [
    "Talep Onaylandı",
    "Uygun Değilim",
    "Yanıt Vermedi",
  ].includes(normalizedStatus || "");
}

function isUrgentRequest(request: MobileBloodRequest) {
  const urgency = (request.urgency || "").toLocaleLowerCase("tr-TR");
  const description = (request.description || "").toLocaleLowerCase("tr-TR");

  return (
    urgency.includes("acil") ||
    urgency.includes("yüksek") ||
    urgency.includes("ameliyat") ||
    description.includes("acil") ||
    description.includes("ameliyat")
  );
}

function getResponseDurationMinutes(request: MobileBloodRequest) {
  if (request.responseTimeMinutes) {
    return request.responseTimeMinutes;
  }

  return isUrgentRequest(request) ? 60 : 2880;
}

function getResponseDurationLabel(request: MobileBloodRequest) {
  const minutes = getResponseDurationMinutes(request);

  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days} gün`;
  }

  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} saat`;
  }

  return `${minutes} dakika`;
}

function getRequestStartDate(request: MobileBloodRequest) {
  const possibleDate =
    request.createdAt ||
    (request as any).createdDate ||
    (request as any).requestDate ||
    (request as any).talepTarihi;

  return possibleDate ? new Date(possibleDate) : new Date();
}

function getRequestDeadline(request: MobileBloodRequest) {
  const startDate = getRequestStartDate(request);
  const durationMs = getResponseDurationMinutes(request) * 60 * 1000;

  return new Date(startDate.getTime() + durationMs);
}

function getRemainingMinutes(request: MobileBloodRequest, currentTime: Date) {
  const deadline = getRequestDeadline(request);
  const differenceMs = deadline.getTime() - currentTime.getTime();

  return Math.max(0, Math.ceil(differenceMs / 60000));
}

function getRemainingTimeText(request: MobileBloodRequest, currentTime: Date) {
  const remainingMinutes = getRemainingMinutes(request, currentTime);

  if (remainingMinutes <= 0) {
    return "Süre doldu";
  }

  const days = Math.floor(remainingMinutes / 1440);
  const hours = Math.floor((remainingMinutes % 1440) / 60);
  const minutes = remainingMinutes % 60;

  if (days > 0) {
    return `${days} gün ${hours} saat`;
  }

  if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  }

  return `${minutes} dakika`;
}

function getEffectiveRequestStatus(request: MobileBloodRequest, currentTime: Date) {
  const baseStatus = normalizeResponseStatus(request.status);
  const waitingStatuses = [
    "Bekleme",
    "Bildirim Gönderildi",
    "Beklemede",
    "Pending",
  ];

  if (
    waitingStatuses.includes(baseStatus) &&
    getRemainingMinutes(request, currentTime) <= 0
  ) {
    return "Yanıt Vermedi";
  }

  return baseStatus;
}

function getUserNotificationId(request: MobileBloodRequest | null) {
  if (!request) return 0;

  return Number(
    (request as any).userNotificationId ||
    (request as any).UserNotificationId ||
    (request as any).notificationUserId ||
    0
  );
}

function getField<T = any>(
  item: any,
  pascalKey: string,
  camelKey: string
): T | undefined {
  return item?.[pascalKey] ?? item?.[camelKey];
}

function extractBloodTypeFromMessage(message?: string) {
  if (!message) return "-";

  const match = message.match(/(AB|A|B|0)[+-]/);

  return match ? match[0] : "-";
}

function extractHospitalNameFromMessage(message?: string) {
  if (!message) return "Hastane bilgisi girilmedi";

  const marker = " bünyesinde";

  if (message.includes(marker)) {
    return message.split(marker)[0].trim();
  }

  return "Hastane bilgisi girilmedi";
}

function mapNotificationToMobileRequest(item: any): MobileBloodRequest {
  const userNotificationId = Number(
    getField(item, "UserNotificationId", "userNotificationId") ?? 0
  );

  const notificationId = Number(
    getField(item, "NotificationId", "notificationId") ?? 0
  );

  const requestId = Number(getField(item, "RequestId", "requestId") ?? 0);
  const donorId = Number(getField(item, "DonorId", "donorId") ?? 0);
  const message = String(getField(item, "Message", "message") ?? "");

  const bloodType =
    getField<string>(item, "BloodType", "bloodType") ||
    getField<string>(item, "RequestBloodType", "requestBloodType") ||
    getField<string>(item, "PatientBloodType", "patientBloodType") ||
    getField<string>(item, "NeededBloodType", "neededBloodType") ||
    extractBloodTypeFromMessage(message);

  const hospitalName =
    getField<string>(item, "HospitalName", "hospitalName") ||
    extractHospitalNameFromMessage(message);

  return {
    id: requestId,
    userNotificationId,
    notificationId,
    donorId,
    bloodType,
    hospitalName,

    city:
      getField<string>(item, "City", "city") ||
      getField<string>(item, "RequestCity", "requestCity") ||
      getField<string>(item, "HospitalCity", "hospitalCity") ||
      "",

    district:
      getField<string>(item, "District", "district") ||
      getField<string>(item, "RequestDistrict", "requestDistrict") ||
      getField<string>(item, "HospitalDistrict", "hospitalDistrict") ||
      extractHospitalNameFromMessage(message) ||
      "",

    urgency: getField<string>(item, "Urgency", "urgency") ?? "Acil",

    status:
      getField<string>(item, "ResponseStatus", "responseStatus") ?? "Pending",

    title: getField<string>(item, "Title", "title") ?? "ACİL KAN İHTİYACI!",

    message,
    description: message,

    createdAt:
      getField<string>(item, "SentDate", "sentDate") ??
      new Date().toISOString(),

    isRead: Boolean(getField<boolean>(item, "IsRead", "isRead") ?? false),

    responseTimeMinutes: 10000,
    unitCount: 1,
  };
}

const infectiousDiseaseOptions = [
  "Hepatit B",
  "Hepatit C",
  "HIV / AIDS",
  "Frengi / Sifiliz",
  "Sıtma",
  "Tüberküloz",
];

const chronicDiseaseOptions = [
  "Kanser öyküsü",
  "Otoimmün hastalık",
  "Epilepsi",
  "Kanama bozukluğu",
  "Kronik böbrek hastalığı",
  "Ciddi kalp hastalığı",
  "İnsülin kullanılan diyabet",
];

const temporaryConditionOptions = [
  "Son 2 hafta içinde grip / ateş / enfeksiyon",
  "Son dönemde ameliyat oldum",
  "Son dönemde diş çekimi yaptırdım",
  "Son 12 ay içinde dövme / piercing yaptırdım",
  "Son 12 ay içinde endoskopi / biyopsi oldum",
  "Antibiyotik veya düzenli ilaç kullanıyorum",
  "Hamilelik / emzirme durumu var",
  "Yakın zamanda kan bağışı yaptım",
];

const temporaryDeferralOptions: TemporaryDeferral[] = [
  {
    reason: "Son 2 hafta içinde grip / ateş / enfeksiyon",
    durationDays: 14,
    startDate: "",
  },
  {
    reason: "Son dönemde ameliyat oldum",
    durationDays: 30,
    startDate: "",
  },
  {
    reason: "Son dönemde diş çekimi yaptırdım",
    durationDays: 7,
    startDate: "",
  },
  {
    reason: "Son 12 ay içinde dövme / piercing yaptırdım",
    durationDays: 365,
    startDate: "",
  },
  {
    reason: "Son 12 ay içinde endoskopi / biyopsi oldum",
    durationDays: 365,
    startDate: "",
  },
  {
    reason: "Antibiyotik veya düzenli ilaç kullanıyorum",
    durationDays: null,
    startDate: "",
  },
  {
    reason: "Hamilelik / emzirme durumu var",
    durationDays: null,
    startDate: "",
  },
  {
    reason: "Yakın zamanda kan bağışı yaptım",
    durationDays: 56,
    startDate: "",
  },
];

function addDaysToDate(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateTR(dateString?: string) {
  if (!dateString) return "-";

  return new Date(dateString).toLocaleDateString("tr-TR");
}

function getTemporaryDeferralEndDate(
  startDate: string,
  durationDays: number | null
) {
  if (!durationDays) return undefined;

  return addDaysToDate(startDate, durationDays);
}

function isTemporaryDeferralExpired(deferral: TemporaryDeferral) {
  if (!deferral.endDate) return false;

  const today = new Date(getTodayDateString());
  const endDate = new Date(deferral.endDate);

  return today > endDate;
}

function getActiveTemporaryDeferrals(deferrals?: TemporaryDeferral[]) {
  return (deferrals || []).filter(
    (deferral) => !isTemporaryDeferralExpired(deferral)
  );
}

function shouldShowHealthUpdateReminder(profile: DonorProfile) {
  if (!profile.lastHealthUpdateReminderDate) return true;

  const lastDate = new Date(profile.lastHealthUpdateReminderDate);
  const today = new Date(getTodayDateString());
  const differenceMs = today.getTime() - lastDate.getTime();
  const differenceDays = Math.floor(differenceMs / (1000 * 60 * 60 * 24));

  return differenceDays >= 14;
}

function createTemporaryHealthDescription(deferrals: TemporaryDeferral[]) {
  const activeDeferrals = getActiveTemporaryDeferrals(deferrals);

  if (activeDeferrals.length === 0) {
    return "Yukarıdaki durumlardan hiçbiri yok";
  }

  return activeDeferrals
    .map((deferral) => {
      const startText = `Başlangıç: ${formatDateTR(deferral.startDate)}`;
      const endText = deferral.endDate
        ? `Tahmini bitiş: ${formatDateTR(deferral.endDate)}`
        : "Manuel güncelleme gerekli";

      return `${deferral.reason} (${startText}, ${endText})`;
    })
    .join(" | ");
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [requests, setRequests] = useState<MobileBloodRequest[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationHistoryItem[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<MobileBloodRequest | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [profile, setProfile] = useState<DonorProfile>(() =>
    normalizeProfile(readLocalStorage(storageKeys.profile, defaultProfile))
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    writeLocalStorage(storageKeys.profile, profile);
  }, [profile]);

  useEffect(() => {
    const expiredRequests = requests.filter(
      (request) =>
        isWaitingStatus(request.status) &&
        getRemainingMinutes(request, currentTime) <= 0
    );

    if (expiredRequests.length === 0) return;

    setRequests((prev) =>
      prev.map((request) =>
        expiredRequests.some((expired) => expired.id === request.id)
          ? { ...request, status: "Yanıt Vermedi" }
          : request
      )
    );

    setDonationHistory((prev) => {
      const newHistoryItems = expiredRequests
        .filter(
          (request) =>
            !prev.some(
              (historyItem) =>
                historyItem.requestId === request.id &&
                historyItem.responseStatus === "Yanıt Vermedi"
            )
        )
        .map((request) => ({
          id: Date.now() + request.id,
          requestId: request.id,
          bloodType: request.bloodType || "-",
          hospitalName: request.hospitalName || "Hastane bilgisi girilmedi",
          location:
            request.city || request.district
              ? [request.city, request.district].filter(Boolean).join(" / ")
              : "Konum bilgisi yok",
          responseStatus: "Yanıt Vermedi" as const,
          responseDate: new Date().toLocaleDateString("tr-TR"),
          reason: "Belirlenen süre içinde cevap verilmedi",
        }));

      return newHistoryItems.length > 0 ? [...newHistoryItems, ...prev] : prev;
    });
  }, [currentTime, requests]);

  async function loadRequests() {
    try {
      setIsLoadingRequests(true);

      const notifications = await getMyNotifications();
      const mappedRequests = notifications.map(mapNotificationToMobileRequest);

      setRequests(mappedRequests);
    } catch (error) {
      console.error("Bağışçı bildirimleri alınamadı:", error);
      setRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }

  function openRequestDetail(request: MobileBloodRequest) {
    setSelectedRequest(request);
    setScreen("detail");
  }

  function createHistoryItem(
    request: MobileBloodRequest,
    responseStatus: "Talep Onaylandı" | "Uygun Değilim" | "Onay İptal Edildi",
    reason?: string,
    note?: string
  ): DonationHistoryItem {
    return {
      id: Date.now(),
      requestId: request.id,
      bloodType: request.bloodType || "-",
      hospitalName: request.hospitalName || "Hastane bilgisi girilmedi",
      location:
        request.city || request.district
          ? [request.city, request.district].filter(Boolean).join(" / ")
          : "Konum bilgisi yok",
      responseStatus,
      responseDate: new Date().toLocaleDateString("tr-TR"),
      reason,
      note,
    };
  }

  function updateRequestStatus(requestId: number, status: string) {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status } : request
      )
    );

    setSelectedRequest((prev) =>
      prev && prev.id === requestId ? { ...prev, status } : prev
    );
  }

  function addOrUpdateHistoryItem(historyItem: DonationHistoryItem) {
    setDonationHistory((prev) => [
      historyItem,
      ...prev.filter((item) => item.requestId !== historyItem.requestId),
    ]);
  }

  async function handleApproveRequest() {
    if (!selectedRequest) return;

    const userNotificationId = getUserNotificationId(selectedRequest);

    if (!userNotificationId) {
      alert(
        "Bu talebe ait bildirim kaydı bulunamadı. Cevap database'e kaydedilemedi."
      );
      return;
    }

    try {
      await respondToNotification(userNotificationId, "Accepted");

      const updatedRequest = { ...selectedRequest, status: "Talep Onaylandı" };
      updateRequestStatus(selectedRequest.id, "Talep Onaylandı");
      addOrUpdateHistoryItem(
        createHistoryItem(updatedRequest, "Talep Onaylandı")
      );

      setSelectedRequest(updatedRequest);
      setScreen("approveSuccess");
    } catch (error: any) {
      console.error("Talep onaylanamadı:", error);
      alert(error?.message || "Talep onaylanırken hata oluştu.");
    }
  }

  async function handleCancelApproval() {
    if (!selectedRequest) return;

    const userNotificationId = getUserNotificationId(selectedRequest);

    if (!userNotificationId) {
      alert(
        "Bu talebe ait bildirim kaydı bulunamadı. Cevap database'e kaydedilemedi."
      );
      return;
    }

    try {
      await respondToNotification(userNotificationId, "Pending");

      const updatedRequest = { ...selectedRequest, status: "Bekleme" };

      updateRequestStatus(selectedRequest.id, "Bekleme");
      addOrUpdateHistoryItem(
        createHistoryItem(
          updatedRequest,
          "Onay İptal Edildi",
          "Bağışçı daha önce verdiği yanıtı iptal etti",
          "Talep yeniden yanıtlanabilir duruma alındı."
        )
      );

      setSelectedRequest(updatedRequest);
      setScreen("detail");
    } catch (error: any) {
      console.error("Yanıt iptal edilemedi:", error);
      alert(
        error?.message ||
        "Yanıt iptal edilirken hata oluştu. Backend Pending durumunu kabul etmiyor olabilir."
      );
    }
  }

  async function handleNotAvailableSubmit(reason: string, note: string) {
    if (!selectedRequest) return;

    const userNotificationId = getUserNotificationId(selectedRequest);

    if (!userNotificationId) {
      alert(
        "Bu talebe ait bildirim kaydı bulunamadı. Cevap database'e kaydedilemedi."
      );
      return;
    }

    try {
      await respondToNotification(userNotificationId, "Rejected");

      const updatedRequest = { ...selectedRequest, status: "Uygun Değilim" };
      updateRequestStatus(selectedRequest.id, "Uygun Değilim");
      addOrUpdateHistoryItem(
        createHistoryItem(updatedRequest, "Uygun Değilim", reason, note)
      );

      setSelectedRequest(updatedRequest);
      setScreen("notAvailableSuccess");
    } catch (error: any) {
      console.error("Uygun değilim cevabı kaydedilemedi:", error);
      alert(error?.message || "Cevap kaydedilirken hata oluştu.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("kanBagiMobil_profile");

    setSelectedRequest(null);
    setScreen("login");
  }

  useEffect(() => {
    if (screen === "home" || screen === "notifications") {
      loadRequests();
    }
  }, [screen]);

  return (
    <div className="page">
      <div className="phone">
        {screen === "login" && (
          <LoginScreen
            onLoginSuccess={() => setScreen("home")}
            onRegisterClick={() => setScreen("register")}
          />
        )}

        {screen === "register" && (
          <RegisterScreen
            onRegisterSuccess={(newProfile) => {
              setProfile(newProfile);
              setScreen("home");
            }}
            onBackToLogin={() => setScreen("login")}
          />
        )}

        {screen === "home" && (
          <HomeScreen
            requests={requests}
            loading={isLoadingRequests}
            profile={profile}
            currentTime={currentTime}
            onNotifications={() => setScreen("notifications")}
            onProfile={() => setScreen("profile")}
            onHistory={() => setScreen("history")}
            onCenters={() => setScreen("centers")}
          />
        )}

        {screen === "notifications" && (
          <NotificationScreen
            requests={requests}
            loading={isLoadingRequests}
            currentTime={currentTime}
            onBack={() => setScreen("home")}
            onDetail={openRequestDetail}
          />
        )}

        {screen === "history" && (
          <DonationHistoryScreen
            history={donationHistory}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "centers" && (
          <BloodCentersScreen
            centers={demoBloodCenters}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "profile" && (
          <ProfileScreen
            profile={profile}
            onSave={(updatedProfile) => {
              setProfile(updatedProfile);
              setScreen("home");
            }}
            onBack={() => setScreen("home")}
            onLogout={handleLogout}
          />
        )}

        {screen === "detail" && selectedRequest && (
          <RequestDetailScreen
            request={selectedRequest}
            currentTime={currentTime}
            onBack={() => setScreen("notifications")}
            onApprove={handleApproveRequest}
            onCancelApproval={handleCancelApproval}
            onNotAvailable={() => setScreen("notAvailable")}
          />
        )}

        {screen === "approveSuccess" && selectedRequest && (
          <ApproveSuccessScreen
            request={selectedRequest}
            currentTime={currentTime}
            onBackHome={() => setScreen("home")}
          />
        )}

        {screen === "notAvailable" && selectedRequest && (
          <NotAvailableScreen
            request={selectedRequest}
            onBack={() => setScreen("detail")}
            onSubmit={handleNotAvailableSubmit}
          />
        )}

        {screen === "notAvailableSuccess" && (
          <NotAvailableSuccessScreen onBackHome={() => setScreen("home")} />
        )}
      </div>
    </div>
  );
}

function LoginScreen({
  onLoginSuccess,
  onRegisterClick,
}: {
  onLoginSuccess: () => void;
  onRegisterClick: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    try {
      setLoading(true);
      setErrorMessage("");

      await loginUser({
        email,
        password,
      });

      onLoginSuccess();
    } catch (error) {
      console.error("Giriş hatası:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Giriş yapılamadı.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen login-screen">
      <div className="logo-circle image-logo">
        <img
          src={LOGO_IMAGE}
          alt="Kan Bağı Logo"
          className="app-logo-image"
        />
      </div>

      <h1>Kan Bağı</h1>

      <p className="subtitle">
        Acil kan ihtiyaçlarında uygun bağışçılarla hızlı bağlantı kurun.
      </p>

      <div className="form">
        <label>E-posta</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="ornek@mail.com"
        />

        <label>Şifre</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
        />

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <button
          onClick={handleLogin}
          className="primary-button"
          disabled={loading}
        >
          {loading ? (
            <span className="button-content">
              <Loader2 className="spin" size={18} />
              Giriş yapılıyor
            </span>
          ) : (
            "Giriş Yap"
          )}
        </button>
      </div>

      <p className="bottom-text">
        Hesabın yok mu? <span onClick={onRegisterClick}>Kayıt Ol</span>
      </p>
    </div>
  );
}

function RegisterScreen({
  onRegisterSuccess,
  onBackToLogin,
}: {
  onRegisterSuccess: (profile: DonorProfile) => void;
  onBackToLogin: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState(``);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");

  const [bloodType, setBloodType] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  const [selectedHealthItems, setSelectedHealthItems] = useState<string[]>([]);
  const [hasNoHealthIssue, setHasNoHealthIssue] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function toggleHealthItem(item: string) {
    setHasNoHealthIssue(false);

    setSelectedHealthItems((prev) =>
      prev.includes(item)
        ? prev.filter((selectedItem) => selectedItem !== item)
        : [...prev, item]
    );
  }

  function handleNoHealthIssueChange(checked: boolean) {
    setHasNoHealthIssue(checked);

    if (checked) {
      setSelectedHealthItems([]);
    }
  }

  function isSelectedHealthItem(item: string) {
    return selectedHealthItems.includes(item);
  }

  function getHealthAssessment() {
    const selectedInfectiousDiseases = selectedHealthItems.filter((item) =>
      infectiousDiseaseOptions.includes(item)
    );

    const selectedChronicDiseases = selectedHealthItems.filter((item) =>
      chronicDiseaseOptions.includes(item)
    );

    const healthDescriptionText = hasNoHealthIssue
      ? "Yukarıdaki durumlardan hiçbiri yok"
      : selectedHealthItems.join(", ");

    return {
      hasChronicDisease: selectedChronicDiseases.length > 0,
      usesRegularMedication: selectedHealthItems.includes(
        "Antibiyotik veya düzenli ilaç kullanıyorum"
      ),
      hadRecentSurgery: selectedHealthItems.includes(
        "Son dönemde ameliyat oldum"
      ),
      hasInfectiousDisease: selectedInfectiousDiseases.length > 0,
      isPregnantOrBreastfeeding: selectedHealthItems.includes(
        "Hamilelik / emzirme durumu var"
      ),
      donatedRecently: selectedHealthItems.includes(
        "Yakın zamanda kan bağışı yaptım"
      ),
      isHealthSuitable: hasNoHealthIssue && selectedHealthItems.length === 0,
      healthDescription: healthDescriptionText,
    };
  }

  function createProfileFromForm(): DonorProfile {
    const healthAssessment = getHealthAssessment();

    return {
      fullName: normalizeTextValue(fullName),
      bloodType: normalizeBloodTypeValue(bloodType),
      city: normalizeCityValue(city),
      district: normalizeDistrictValue(district),
      phone: normalizeTextValue(phone),
      isActive: true,
      ...healthAssessment,
      temporaryDeferrals: [],
      lastHealthUpdateReminderDate: getTodayDateString(),
    };
  }

  function validateRegisterForm() {
    if (!fullName.trim()) {
      throw new Error("Ad soyad alanı boş bırakılamaz.");
    }

    if (!email.trim()) {
      throw new Error("E-posta alanı boş bırakılamaz.");
    }

    if (!phone.trim()) {
      throw new Error("Telefon alanı boş bırakılamaz.");
    }

    if (!password.trim()) {
      throw new Error("Şifre alanı boş bırakılamaz.");
    }

    if (!age || Number(age) <= 0) {
      throw new Error("Geçerli bir yaş giriniz.");
    }

    if (!gender.trim()) {
      throw new Error("Cinsiyet seçiniz.");
    }

    if (!bloodType.trim()) {
      throw new Error("Kan grubu seçiniz.");
    }

    if (!city.trim()) {
      throw new Error("İl alanı boş bırakılamaz.");
    }

    if (!district.trim()) {
      throw new Error("İlçe alanı boş bırakılamaz.");
    }
  }

  async function handleRegister() {
    try {
      setLoading(true);
      setErrorMessage("");

      validateRegisterForm();

      const healthAssessment = getHealthAssessment();

      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "Belirtilmedi";

      const normalizedCity = normalizeCityValue(city);
      const normalizedDistrict = normalizeDistrictValue(district);
      const normalizedBloodType = normalizeBloodTypeValue(bloodType);

      const registerPayload = {
        Email: email.trim(),
        Password: password,
        FirstName: firstName,
        LastName: lastName,
        Gender: gender,
        Phone: phone.trim(),
        BloodType: normalizedBloodType,
        Age: Number(age),

        // Backend register DTO içinde City ve District var.
        // Backend donor filtresinde Donor.Region == Request.District kontrol ediliyor.
        // Bu yüzden mobilde girilen ilçe District olarak gönderiliyor.
        City: normalizedCity,
        District: normalizedDistrict,

        // Backend bu alanları kullanıyorsa eşleşmeyi destekler.
        // Kullanmazsa sorun çıkarmaz.
        Region: normalizedDistrict,
        Status: true,
        IsActive: true,

        HasChronicDisease: healthAssessment.hasChronicDisease,
        UsesRegularMedication: healthAssessment.usesRegularMedication,
        HadRecentSurgery: healthAssessment.hadRecentSurgery,
        HasInfectiousDisease: healthAssessment.hasInfectiousDisease,
        IsPregnantOrBreastfeeding: healthAssessment.isPregnantOrBreastfeeding,
        DonatedRecently: healthAssessment.donatedRecently,
        IsHealthSuitable: healthAssessment.isHealthSuitable,
        HealthDescription: healthAssessment.healthDescription,
      };

      await registerUser(registerPayload as any);

      onRegisterSuccess(createProfileFromForm());
    } catch (error) {
      console.error("Kayıt backend hatası:", error);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Backend kayıt işlemi tamamlanamadı.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen register-screen">
      <button onClick={onBackToLogin} className="back-button register-back">
        <ArrowLeft size={20} />
      </button>

      <div className="logo-circle image-logo small-logo">
        <img
          src={LOGO_IMAGE}
          alt="Kan Bağı Logo"
          className="app-logo-image"
        />
      </div>

      <h1>Kayıt Ol</h1>

      <p className="subtitle">
        Gönüllü bağışçı hesabını oluşturarak acil kan çağrılarını takip et.
      </p>

      <div className="form">
        <label>Ad Soyad</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ad Soyad"
        />

        <label>Cinsiyet</label>
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Cinsiyet seçiniz</option>
          <option value="Kadın">Kadın</option>
          <option value="Erkek">Erkek</option>
          <option value="Diğer">Diğer</option>
        </select>

        <label>E-posta</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="ornek@mail.com"
        />

        <label>Telefon</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05551234567"
        />

        <label>Şifre</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
        />

        <label>Yaş</label>
        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          type="number"
          placeholder="Yaş"
        />

        <label>Kan Grubu</label>
        <select
          value={bloodType}
          onChange={(e) => setBloodType(e.target.value)}
        >
          <option value="">Kan grubu seçiniz</option>
          <option value="A+">A Rh+</option>
          <option value="A-">A Rh-</option>
          <option value="B+">B Rh+</option>
          <option value="B-">B Rh-</option>
          <option value="AB+">AB Rh+</option>
          <option value="AB-">AB Rh-</option>
          <option value="0+">0 Rh+</option>
          <option value="0-">0 Rh-</option>
        </select>

        <label>İl</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="İl"
        />

        <label>İlçe</label>
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="İlçe"
        />

        <div className="health-box">
          <h3>Sağlık Beyanı</h3>

          <p className="health-info-text">
            Kan bağışına engel olabilecek hastalık veya durumları seçiniz. Bu
            bilgiler kesin bağış uygunluğu kararı değildir, yalnızca ön
            değerlendirme amacıyla alınır.
          </p>

          <div className="health-category">
            <h4>1. Bulaşıcı Hastalıklar</h4>

            {infectiousDiseaseOptions.map((item) => (
              <label className="check-row" key={item}>
                <input
                  type="checkbox"
                  checked={isSelectedHealthItem(item)}
                  onChange={() => toggleHealthItem(item)}
                />
                {item}
              </label>
            ))}
          </div>

          <div className="health-category">
            <h4>2. Kronik / Ciddi Hastalıklar</h4>

            {chronicDiseaseOptions.map((item) => (
              <label className="check-row" key={item}>
                <input
                  type="checkbox"
                  checked={isSelectedHealthItem(item)}
                  onChange={() => toggleHealthItem(item)}
                />
                {item}
              </label>
            ))}
          </div>

          <div className="health-category">
            <h4>3. Geçici Engel Durumlar</h4>

            {temporaryConditionOptions.map((item) => (
              <label className="check-row" key={item}>
                <input
                  type="checkbox"
                  checked={isSelectedHealthItem(item)}
                  onChange={() => toggleHealthItem(item)}
                />
                {item}
              </label>
            ))}
          </div>

          <div className="health-category no-health-category">
            <h4>4. Hiçbiri</h4>

            <label className="check-row">
              <input
                type="checkbox"
                checked={hasNoHealthIssue}
                onChange={(e) => handleNoHealthIssueChange(e.target.checked)}
              />
              Yukarıdaki durumlardan hiçbiri yok
            </label>
          </div>
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <button
          onClick={handleRegister}
          className="primary-button"
          disabled={loading}
        >
          {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
        </button>
      </div>

      <p className="bottom-text">
        Zaten hesabın var mı? <span onClick={onBackToLogin}>Giriş Yap</span>
      </p>
    </div>
  );
}

function HomeScreen({
  requests,
  loading,
  profile,
  currentTime,
  onNotifications,
  onProfile,
  onHistory,
  onCenters,
}: {
  requests: MobileBloodRequest[];
  loading: boolean;
  profile: DonorProfile;
  currentTime: Date;
  onNotifications: () => void;
  onProfile: () => void;
  onHistory: () => void;
  onCenters: () => void;
}) {
  const activeRequest = requests[0];
  const activeDeferrals = getActiveTemporaryDeferrals(profile.temporaryDeferrals);
  const isDonationAvailable = profile.isActive && activeDeferrals.length === 0;

  return (
    <div className="screen">
      <div className="top-bar">
        <div>
          <p className="small-text">Merhaba,</p>
          <h2>{profile.fullName}</h2>
        </div>

        <button onClick={onProfile} className="profile-icon">
          <User size={22} />
        </button>
      </div>

      <div className="hero-card">
        <div>
          <p className="small-text white">Bugünkü durum</p>
          <h3>
            {isDonationAvailable
              ? "Kan bağışı için müsaitsin"
              : "Şu an bağışa uygun değilsin"}
          </h3>
          <p>
            {isDonationAvailable
              ? "Uygun çağrı geldiğinde sana bildirim gönderilir."
              : "Profil ekranından geçici engel durumunu güncelleyebilirsin."}
          </p>
        </div>

        <img
          src={HOME_HERO_IMAGE}
          alt="Kan bağışı kahramanı"
          className="hero-illustration"
        />
      </div>

      {shouldShowHealthUpdateReminder(profile) && (
        <div className="description-card">
          <h3>Sağlık Bilgisi Güncelleme</h3>
          <p>
            Lütfen geçici bağış engel durumunuzu güncelleyiniz.
          </p>
        </div>
      )}

      {activeDeferrals.length > 0 && (
        <div className="description-card">
          <h3>Geçici Bağış Engeli</h3>
          <p>
            Profilinizde {activeDeferrals.length} adet aktif geçici bağış
            engeli bulunuyor.
          </p>
        </div>
      )}

      <div className="info-grid">
        <div className="info-card">
          <Droplet size={24} />
          <p>Kan Grubum</p>
          <h3>{profile.bloodType}</h3>
        </div>

        <div className="info-card">
          <MapPin size={24} />
          <p>Konum</p>
          <h3>{profile.district}</h3>
        </div>
      </div>

      <div className="alert-card clickable-card" onClick={onNotifications}>
        <div className="alert-icon">
          <Bell size={24} />
        </div>

        <div>
          <h3>
            {loading
              ? "Çağrılar kontrol ediliyor"
              : activeRequest
                ? "Acil Kan Çağrısı Var"
                : "Aktif çağrı bulunamadı"}
          </h3>

          <p>
            {activeRequest
              ? `Yanıt süresi: ${getResponseDurationLabel(activeRequest)} • Kalan: ${getRemainingTimeText(activeRequest, currentTime)}`
              : "Şu anda görüntülenecek aktif kan çağrısı yok."}
          </p>
        </div>
      </div>

      <button onClick={onNotifications} className="primary-button">
        Bildirimleri Gör
      </button>

      <button onClick={onProfile} className="secondary-button">
        Profilimi Düzenle
      </button>

      <div className="home-menu-grid">
        <button onClick={onHistory} className="menu-card-button">
          <CheckCircle size={22} />
          <span>Bağış Geçmişim</span>
        </button>

        <button onClick={onCenters} className="menu-card-button">
          <Hospital size={22} />
          <span>Kan Merkezleri</span>
        </button>
      </div>
    </div>
  );
}
function ProfileScreen({
  profile,
  onSave,
  onBack,
  onLogout,
}: {
  profile: DonorProfile;
  onSave: (profile: DonorProfile) => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [bloodType] = useState(profile.bloodType);
  const [city, setCity] = useState(profile.city);
  const [district, setDistrict] = useState(profile.district);
  const [phone, setPhone] = useState(profile.phone);
  const [isActive, setIsActive] = useState(profile.isActive);

  const [temporaryDeferrals, setTemporaryDeferrals] = useState<
    TemporaryDeferral[]
  >(profile.temporaryDeferrals || []);

  const activeTemporaryDeferrals =
    getActiveTemporaryDeferrals(temporaryDeferrals);

  const hasTemporaryDeferral = activeTemporaryDeferrals.length > 0;
  const isDonationAvailable = isActive && !hasTemporaryDeferral;

  function isTemporaryDeferralSelected(reason: string) {
    return temporaryDeferrals.some((item) => item.reason === reason);
  }

  function getTemporaryDeferral(reason: string) {
    return temporaryDeferrals.find((item) => item.reason === reason);
  }

  function toggleTemporaryDeferral(option: TemporaryDeferral) {
    const isSelected = isTemporaryDeferralSelected(option.reason);

    if (isSelected) {
      setTemporaryDeferrals((prev) =>
        prev.filter((item) => item.reason !== option.reason)
      );
      return;
    }

    const startDate = getTodayDateString();
    const endDate = getTemporaryDeferralEndDate(
      startDate,
      option.durationDays
    );

    setTemporaryDeferrals((prev) => [
      ...prev,
      {
        reason: option.reason,
        durationDays: option.durationDays,
        startDate,
        endDate,
      },
    ]);
  }

  function updateTemporaryDeferralStartDate(reason: string, startDate: string) {
    setTemporaryDeferrals((prev) =>
      prev.map((item) => {
        if (item.reason !== reason) return item;

        return {
          ...item,
          startDate,
          endDate: getTemporaryDeferralEndDate(
            startDate,
            item.durationDays
          ),
        };
      })
    );
  }

  function clearTemporaryDeferrals() {
    setTemporaryDeferrals([]);
    setIsActive(true);
  }

  async function handleSave() {
  const activeDeferrals = getActiveTemporaryDeferrals(temporaryDeferrals);
  const hasActiveDeferral = activeDeferrals.length > 0;
  const healthDescription = createTemporaryHealthDescription(temporaryDeferrals);

  const normalizedCity = normalizeCityValue(city);
  const normalizedDistrict = normalizeDistrictValue(district);
  const finalStatus = !hasActiveDeferral && isActive;
  const finalIsHealthSuitable = !hasActiveDeferral;

  const updatedProfile: DonorProfile = {
    ...profile,
    fullName: normalizeTextValue(fullName),
    bloodType,
    city: normalizedCity,
    district: normalizedDistrict,
    phone: normalizeTextValue(phone),
    isActive: finalStatus,
    isHealthSuitable: finalIsHealthSuitable,
    healthDescription,
    temporaryDeferrals,
    lastHealthUpdateReminderDate: getTodayDateString(),

    usesRegularMedication:
      profile.usesRegularMedication ||
      activeDeferrals.some((item) => item.reason.includes("Antibiyotik")),

    hadRecentSurgery:
      profile.hadRecentSurgery ||
      activeDeferrals.some((item) => item.reason.includes("ameliyat")),

    isPregnantOrBreastfeeding:
      profile.isPregnantOrBreastfeeding ||
      activeDeferrals.some((item) => item.reason.includes("Hamilelik")),

    donatedRecently:
      profile.donatedRecently ||
      activeDeferrals.some((item) =>
        item.reason.includes("Yakın zamanda kan bağışı")
      ),
  };

  // Önce mobil/local profile kaydedilsin.
  onSave(updatedProfile);

  try {
    await updateMyDonorProfile({
      FullName: updatedProfile.fullName,
      Phone: updatedProfile.phone,
      City: updatedProfile.city,
      District: updatedProfile.district,
      Region: updatedProfile.district,
      Status: updatedProfile.isActive,
      IsActive: updatedProfile.isActive,
      IsHealthSuitable: updatedProfile.isHealthSuitable,
      LastDonationDate: null,
    });

    alert("Profil bilgileri backend'e ve mobil ekrana kaydedildi.");
  } catch (error: any) {
    console.warn("Profil backend'e kaydedilemedi, mobilde kaydedildi:", error);

    alert(
      "Geçici sağlık durumu mobilde kaydedildi. Backend'de profil güncelleme endpointi olmadığı için sadece mobilde tutuldu."
    );
  }
}

  return (
    <div className="screen profile-screen">
      <div className="header-row">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
        </button>

        <h2>Profilim</h2>
      </div>

      <div className="profile-summary-card">
        <div className="profile-avatar">
          <User size={30} />
        </div>

        <div>
          <h3>{fullName}</h3>
          <p>
            {bloodType} • {city} / {district}
          </p>
        </div>
      </div>

      <div className="description-card profile-health-summary">
        <h3>Bağış Uygunluk Durumu</h3>

        <p>
          {isDonationAvailable
            ? "Bağışa uygun görünüyorsunuz."
            : "Şu anda bağışa uygun değilsiniz."}
        </p>

        {hasTemporaryDeferral && (
          <p>
            Seçili geçici engel sayısı: {activeTemporaryDeferrals.length}
          </p>
        )}
      </div>

      {shouldShowHealthUpdateReminder(profile) && (
        <div className="description-card">
          <h3>Sağlık Bilgilerinizi Güncelleyin</h3>
          <p>
            Sağlık durumunuzu en az 2 haftada bir kontrol etmeniz önerilir.
            Geçici bağış engeliniz varsa aşağıdan güncelleyebilirsiniz.
          </p>
        </div>
      )}

      <div className="form">
        <label>Ad Soyad</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ad Soyad"
        />

        <label>Kan Grubu</label>
        <input value={bloodType} disabled />

        <p className="info-note">
          Kan grubu bilgisi bağışçı tarafından değiştirilemez. Yanlışlık varsa
          doktor veya yetkili sağlık personeli tarafından güncellenmelidir.
        </p>

        <label>İl</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="İl"
        />

        <label>İlçe</label>
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="İlçe"
        />

        <label>Telefon</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05551234567"
        />

        <div className="active-row">
          <div>
            <h3>Bağış için müsaitim</h3>
            <p>
              Geçici engel seçiliyse sistem sizi otomatik olarak uygun değil
              kabul eder.
            </p>
          </div>

          <input
            className="checkbox-input"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={hasTemporaryDeferral}
          />
        </div>

        <div className="health-box">
          <h3>Geçici Bağış Engel Durumları</h3>

          <p className="health-info-text">
            Aşağıdaki durumlardan biri varsa seçiniz. Seçtiğiniz tarihe göre
            tahmini bitiş tarihi mobilde hesaplanır. Bu bilgi sadece mobil
            ekranda gösterilir.
          </p>

          {temporaryDeferralOptions.map((option) => {
            const selectedDeferral = getTemporaryDeferral(option.reason);
            const isSelected = Boolean(selectedDeferral);
            const isExpired =
              selectedDeferral && isTemporaryDeferralExpired(selectedDeferral);

            return (
              <div className="health-category" key={option.reason}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTemporaryDeferral(option)}
                  />
                  {option.reason}
                </label>

                {isSelected && selectedDeferral && (
                  <div className="description-card">
                    <label>Başlangıç Tarihi</label>
                    <input
                      type="date"
                      value={selectedDeferral.startDate}
                      onChange={(e) =>
                        updateTemporaryDeferralStartDate(
                          option.reason,
                          e.target.value
                        )
                      }
                    />

                    <p>
                      <strong>Başlangıç:</strong>{" "}
                      {formatDateTR(selectedDeferral.startDate)}
                    </p>

                    {selectedDeferral.endDate ? (
                      <p>
                        <strong>Tahmini Bitiş:</strong>{" "}
                        {formatDateTR(selectedDeferral.endDate)}
                      </p>
                    ) : (
                      <p>
                        <strong>Bitiş:</strong> Manuel güncelleme gerekli
                      </p>
                    )}

                    {isExpired && (
                      <p className="info-note">
                        Bu engelin tahmini süresi dolmuş görünüyor. Sağlık
                        durumunuzu güncelleyebilirsiniz.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className="secondary-button"
            onClick={clearTemporaryDeferrals}
          >
            Geçici Engelim Yok
          </button>
        </div>

        <div className="description-card profile-health-summary">
          <h3>Sağlık Beyanı Özeti</h3>
          <p>
            {createTemporaryHealthDescription(temporaryDeferrals) ||
              "Sağlık beyanı bilgisi bulunmuyor."}
          </p>
        </div>

        <button onClick={handleSave} className="primary-button">
          Profili Kaydet
        </button>

        <button className="logout-button" onClick={onLogout}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

function NotificationScreen({
  requests,
  loading,
  currentTime,
  onBack,
  onDetail,
}: {
  requests: MobileBloodRequest[];
  loading: boolean;
  currentTime: Date;
  onBack: () => void;
  onDetail: (request: MobileBloodRequest) => void;
}) {
  return (
    <div className="screen">
      <div className="header-row">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
        </button>

        <h2>Bildirimler</h2>
      </div>

      <p className="screen-note">
        Sana uygun kan talepleri aşağıda listelenmektedir. Detayını görmek
        istediğin çağrıya tıklayabilirsin.
      </p>

      {loading && (
        <div className="loading-box">
          <Loader2 className="spin" size={22} />
          Talepler yükleniyor...
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="empty-box empty-box-vertical">
          <img
            src={THANK_YOU_IMAGE}
            alt="Bildirim bulunamadı"
            className="empty-illustration"
          />
          <p>Gösterilecek kan çağrısı bulunamadı.</p>
        </div>
      )}

      {!loading &&
        requests.map((request) => (
          <NotificationCard
            key={`${request.id}-${request.userNotificationId || request.notificationId}`}
            request={request}
            currentTime={currentTime}
            onDetail={() => onDetail(request)}
          />
        ))}
    </div>
  );
}

function NotificationCard({
  request,
  currentTime,
  onDetail,
}: {
  request: MobileBloodRequest;
  currentTime: Date;
  onDetail: () => void;
}) {
  const effectiveStatus = getEffectiveRequestStatus(request, currentTime);

  return (
    <div className="notification-card">
      <div className="notification-top">
        <div className="notification-icon">
          <Droplet size={22} />
        </div>

        <div>
          <h3>{request.title || "Acil Kan İhtiyacı"}</h3>
          <p>{request.hospitalName || "Hastane bilgisi girilmedi"}</p>
        </div>
      </div>

      <div className="detail-list">
        <p>
          <strong>Kan Grubu:</strong> {request.bloodType || "-"}
        </p>

        <p>
          <strong>Konum:</strong>{" "}
          {request.city || request.district
            ? `${request.city || ""} ${request.district || ""}`.trim()
            : "Konum bilgisi yok"}
        </p>

        <p>
          <strong>Aciliyet:</strong> {request.urgency || "-"}
        </p>

        <p>
          <strong>Yanıt Süresi:</strong> {getResponseDurationLabel(request)}
        </p>

        <p>
          <strong>Kalan Süre:</strong>{" "}
          {getRemainingTimeText(request, currentTime)}
        </p>

        <p>
          <strong>Durum:</strong> {effectiveStatus}
        </p>
      </div>

      <button onClick={onDetail} className="primary-button small-button">
        Detayı Gör
      </button>
    </div>
  );
}

function DonationHistoryScreen({
  history,
  onBack,
}: {
  history: DonationHistoryItem[];
  onBack: () => void;
}) {
  return (
    <div className="screen">
      <div className="header-row">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
        </button>

        <h2>Bağış Geçmişim</h2>
      </div>

      <p className="screen-note">
        Yanıt verdiğin kan talepleri ve durum bilgileri burada listelenir.
      </p>

      {history.length === 0 ? (
        <div className="empty-box empty-box-vertical">
          <img
            src={THANK_YOU_IMAGE}
            alt="Bağış geçmişi bulunamadı"
            className="empty-illustration"
          />
          <p>Henüz yanıt verdiğin bir kan talebi yok.</p>
        </div>
      ) : (
        history.map((item) => (
          <div className="history-card" key={item.id}>
            <div className="history-top">
              <div
                className={
                  item.responseStatus === "Talep Onaylandı"
                    ? "history-status-icon success-history"
                    : "history-status-icon neutral-history"
                }
              >
                {item.responseStatus === "Talep Onaylandı" ? (
                  <CheckCircle size={22} />
                ) : (
                  <Bell size={22} />
                )}
              </div>

              <div>
                <h3>{item.bloodType} Talebi</h3>
                <p>{item.responseDate}</p>
              </div>
            </div>

            <div className="detail-list">
              <p>
                <strong>Hastane:</strong> {item.hospitalName}
              </p>
              <p>
                <strong>Konum:</strong> {item.location}
              </p>
              <p>
                <strong>Yanıt:</strong> {item.responseStatus}
              </p>
              {item.reason && (
                <p>
                  <strong>Neden:</strong> {item.reason}
                </p>
              )}
              {item.note && (
                <p>
                  <strong>Not:</strong> {item.note}
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function BloodCentersScreen({
  centers,
  onBack,
}: {
  centers: BloodCenter[];
  onBack: () => void;
}) {
  return (
    <div className="screen">
      <div className="header-row">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
        </button>

        <h2>Kan Merkezleri</h2>
      </div>

      <p className="screen-note">
        Bağış sürecinde yönlendirilebileceğin hastane ve kan merkezi bilgileri.
      </p>

      {centers.map((center) => (
        <div className="center-card" key={center.id}>
          <div className="center-icon">
            <Hospital size={24} />
          </div>

          <div className="center-content">
            <h3>{center.name}</h3>
            <p>{center.addressNote}</p>

            <div className="center-row">
              <MapPin size={18} />
              <span>
                {center.city} / {center.district}
              </span>
            </div>

            <div className="center-row">
              <Phone size={18} />
              <span>{center.phone}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestDetailScreen({
  request,
  currentTime,
  onBack,
  onApprove,
  onCancelApproval,
  onNotAvailable,
}: {
  request: MobileBloodRequest;
  currentTime: Date;
  onBack: () => void;
  onApprove: () => void;
  onCancelApproval: () => void;
  onNotAvailable: () => void;
}) {
  const effectiveStatus = getEffectiveRequestStatus(request, currentTime);
  const isExpired = effectiveStatus === "Yanıt Vermedi";
  const isApproved = effectiveStatus === "Talep Onaylandı";
  const isNotAvailable = effectiveStatus === "Uygun Değilim";
  const isAnswered = isAnsweredStatus(effectiveStatus);

  return (
    <div className="screen">
      <div className="header-row">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
        </button>

        <h2>Çağrı Detayı</h2>
      </div>

      <div className="detail-hero with-image">
        <div>
          <p>Acil Kan İhtiyacı</p>
          <h1>{request.bloodType || "-"}</h1>
        </div>

        <img
          src={DETAIL_BLOOD_IMAGE}
          alt="Kan talebi görseli"
          className="detail-illustration"
        />
      </div>

      <div className="detail-card">
        <div className="detail-row">
          <Hospital size={22} />
          <div>
            <p>Hastane</p>
            <h3>{request.hospitalName || "Hastane bilgisi girilmedi"}</h3>
          </div>
        </div>

        <div className="detail-row">
          <MapPin size={22} />
          <div>
            <p>Konum</p>
            <h3>
              {request.city || request.district
                ? `${request.city || ""} ${request.district || ""}`.trim()
                : "Konum bilgisi yok"}
            </h3>
          </div>
        </div>

        <div className="detail-row">
          <Bell size={22} />
          <div>
            <p>Aciliyet</p>
            <h3>{request.urgency || "-"}</h3>
          </div>
        </div>

        <div className="detail-row">
          <Clock size={22} />
          <div>
            <p>Yanıt Süresi</p>
            <h3>{getResponseDurationLabel(request)}</h3>
          </div>
        </div>

        <div className="detail-row">
          <Clock size={22} />
          <div>
            <p>Kalan Süre</p>
            <h3>{getRemainingTimeText(request, currentTime)}</h3>
          </div>
        </div>

        <div className="detail-row">
          <CheckCircle size={22} />
          <div>
            <p>Durum</p>
            <h3>{effectiveStatus}</h3>
          </div>
        </div>

        <div className="detail-row">
          <Droplet size={22} />
          <div>
            <p>İhtiyaç Miktarı</p>
            <h3>{request.unitCount || 1} Ünite</h3>
          </div>
        </div>

        <div className="detail-row">
          <Phone size={22} />
          <div>
            <p>İletişim</p>
            <h3>Hastane kan merkezi</h3>
          </div>
        </div>
      </div>

      <div className="description-card">
        <h3>Açıklama</h3>
        <p>
          {request.description ||
            "Bu kan talebi için uygun bağışçıların hastane ile iletişime geçmesi beklenmektedir."}
        </p>
      </div>

      {isExpired && (
        <div className="expired-note">
          Bu talep için yanıt süresi dolmuştur. Durum otomatik olarak
          "Yanıt Vermedi" şeklinde değerlendirilir.
        </div>
      )}

      {!isExpired && isAnswered && (
        <div className="expired-note">
          Bu talep için yanıtınız kaydedildi: {effectiveStatus}.
        </div>
      )}

      {isApproved || isNotAvailable ? (
        <button className="secondary-button" onClick={onCancelApproval}>
          Yanıtı İptal Et
        </button>
      ) : (
        <button
          className="primary-button"
          onClick={onApprove}
          disabled={isExpired}
        >
          Talebi Onayla
        </button>
      )}

      <button
        className="secondary-button"
        onClick={onNotAvailable}
        disabled={isExpired || isApproved || isNotAvailable}
      >
        Şu An Uygun Değilim
      </button>
    </div>
  );
}

function ApproveSuccessScreen({
  request,
  currentTime,
  onBackHome,
}: {
  request: MobileBloodRequest;
  currentTime: Date;
  onBackHome: () => void;
}) {
  return (
    <div className="screen">
      <div className="success-box">
        <img
          src={SUCCESS_IMAGE}
          alt="Talep onaylandı"
          className="success-illustration"
        />

        <h1>Talep Onaylandı</h1>

        <p className="subtitle">
          Uygun bağışçı olarak dönüş yaptınız. Hastane kan merkezi sizinle
          iletişime geçebilir.
        </p>

        <div className="detail-card">
          <div className="detail-row">
            <Hospital size={22} />
            <div>
              <p>Hastane</p>
              <h3>{request.hospitalName || "Hastane bilgisi girilmedi"}</h3>
            </div>
          </div>

          <div className="detail-row">
            <MapPin size={22} />
            <div>
              <p>Konum</p>
              <h3>
                {request.city || request.district
                  ? `${request.city || ""} ${request.district || ""}`.trim()
                  : "Konum bilgisi yok"}
              </h3>
            </div>
          </div>

          <div className="detail-row">
            <Droplet size={22} />
            <div>
              <p>Kan Grubu</p>
              <h3>{request.bloodType || "-"}</h3>
            </div>
          </div>

          <div className="detail-row">
            <Clock size={22} />
            <div>
              <p>Kalan Süre</p>
              <h3>{getRemainingTimeText(request, currentTime)}</h3>
            </div>
          </div>

          <div className="detail-row">
            <Phone size={22} />
            <div>
              <p>İletişim</p>
              <h3>Hastane kan merkezi</h3>
            </div>
          </div>
        </div>

        <div className="description-card">
          <h3>Sonraki Adım</h3>
          <p>
            Lütfen hastane veya kan merkezi tarafından yapılacak yönlendirmeyi
            bekleyiniz. Gerekirse sizinle telefon üzerinden iletişim
            kurulacaktır.
          </p>
        </div>

        <button className="primary-button" onClick={onBackHome}>
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}

function NotAvailableScreen({
  request,
  onSubmit,
  onBack,
}: {
  request: MobileBloodRequest;
  onSubmit: (reason: string, note: string) => void;
  onBack: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function handleSubmit() {
    console.log("Uygun değilim bildirimi:", {
      requestId: request.id,
      reason,
      note,
    });

    onSubmit(reason, note);
  }

  return (
    <div className="screen">
      <div className="header-row">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
        </button>

        <h2>Uygun Değilim</h2>
      </div>

      <p className="screen-note">
        Şu anda bağış yapamama nedeninizi seçiniz. Bu bilgi, talep sürecinin
        daha doğru takip edilmesi için kullanılacaktır.
      </p>

      <div className="detail-card">
        <div className="detail-row">
          <Droplet size={22} />
          <div>
            <p>Kan Talebi</p>
            <h3>{request.bloodType || "-"}</h3>
          </div>
        </div>

        <div className="detail-row">
          <Hospital size={22} />
          <div>
            <p>Hastane</p>
            <h3>{request.hospitalName || "Hastane bilgisi girilmedi"}</h3>
          </div>
        </div>
      </div>

      <div className="form">
        <label>Neden</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Seçiniz</option>
          <option value="Sağlık durumum uygun değil">
            Sağlık durumum uygun değil
          </option>
          <option value="Şehir dışındayım">Şehir dışındayım</option>
          <option value="Yakın zamanda bağış yaptım">
            Yakın zamanda bağış yaptım
          </option>
          <option value="Şu an meşgulüm">Şu an meşgulüm</option>
          <option value="Diğer">Diğer</option>
        </select>

        <label>Açıklama</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="İsterseniz kısa bir açıklama yazabilirsiniz"
        />

        <button
          className="primary-button"
          onClick={handleSubmit}
          disabled={!reason}
        >
          Bildir
        </button>
      </div>
    </div>
  );
}

function NotAvailableSuccessScreen({
  onBackHome,
}: {
  onBackHome: () => void;
}) {
  return (
    <div className="screen">
      <div className="success-box">
        <img
          src={THANK_YOU_IMAGE}
          alt="Durum bildirildi"
          className="success-illustration"
        />

        <h1>Durum Bildirildi</h1>

        <p className="subtitle">
          Şu anda uygun olmadığınız bilgisi sisteme kaydedildi.
        </p>

        <div className="description-card">
          <h3>Bilgi</h3>
          <p>
            Daha sonra uygun olduğunuzda yeni kan taleplerini tekrar
            değerlendirebilirsiniz.
          </p>
        </div>

        <button className="primary-button" onClick={onBackHome}>
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}