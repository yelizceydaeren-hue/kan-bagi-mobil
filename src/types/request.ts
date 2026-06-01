export interface BloodRequest {
  id: number;
  requesterId?: number;

  userNotificationId?: number;

  bloodType?: string;
  urgency?: string;
  status?: string;

  createdDate?: string;
  createdAt?: string;

  hospitalName?: string;
  requesterName?: string;
  patientName?: string;
  city?: string;
  district?: string;
  description?: string;
  unitCount?: number;

  responseTimeMinutes?: number;
}