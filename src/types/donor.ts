export interface Donor {
  id: number;
  userId?: number;
  fullName?: string;
  bloodType?: string;
  phone?: string;

  city?: string;

  // Backend tarafında bağışçı ilçesi çoğunlukla Region olarak tutuluyor.
  region?: string;

  // Mobilde görünüm için district de bırakıldı.
  district?: string;

  isActive?: boolean;
  status?: boolean;
  isHealthSuitable?: boolean;

  lastDonationDate?: string;
}

export type DonorProfile = {
  fullName: string;
  bloodType: string;
  city: string;
  district: string;
  phone: string;
  isActive: boolean;
};