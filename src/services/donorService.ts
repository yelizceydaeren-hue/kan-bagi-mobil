import { apiRequest, unwrapData } from "./api";
import type { Donor } from "../types/donor";

export async function getDonors(): Promise<Donor[]> {
  const response = await apiRequest<any>("/api/donors/getlist");
  return unwrapData<Donor[]>(response);
}

export async function getSuitableDonors(bloodType: string): Promise<Donor[]> {
  const response = await apiRequest<any>(
    `/api/donors/getsuitabledonors/${encodeURIComponent(bloodType)}`
  );

  return unwrapData<Donor[]>(response);
}