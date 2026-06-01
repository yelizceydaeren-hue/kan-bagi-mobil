import { apiRequest, unwrapData } from "./api";

export type DonorProfileUpdatePayload = {
  FullName: string;
  Phone: string;
  City: string;
  District: string;
  Region: string;
  Status: boolean;
  IsActive: boolean;
  IsHealthSuitable: boolean;
  LastDonationDate?: string | null;
};

export async function getMyDonorProfile() {
  const response = await apiRequest<any>("/api/DonorProfiles/getmy");
  return unwrapData<any>(response);
}

export async function updateMyDonorProfile(payload: DonorProfileUpdatePayload) {
  const response = await apiRequest<any>("/api/DonorProfiles/updatemy", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return unwrapData<any>(response);
}