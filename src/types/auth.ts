export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  Email: string;
  Password: string;
  FirstName: string;
  LastName: string;
  Gender: string;
  Phone: string;
  BloodType: string;
  Age: number;
  City: string;

  // Backend register DTO tarafında District var.
  // Backend donor filtresinde ise Donor.Region ile Request.District karşılaştırılıyor.
  // Bu yüzden mobilde ilçe bilgisi District olarak gönderilecek.
  District: string;

  // Mobil taraf tip uyumluluğu için opsiyonel tutuldu.
  Region?: string;

  HasChronicDisease: boolean;
  UsesRegularMedication: boolean;
  HadRecentSurgery: boolean;
  HasInfectiousDisease: boolean;
  IsPregnantOrBreastfeeding: boolean;
  DonatedRecently: boolean;
  IsHealthSuitable: boolean;
  HealthDescription: string;

  Status?: boolean;
  IsActive?: boolean;
}

export interface LoginResponse {
  token?: string;
  Token?: string;
  expiration?: string;
  Expiration?: string;
}