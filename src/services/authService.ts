import { apiRequest, extractToken, saveToken } from "./api";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "../types/auth";

export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

  saveToken(extractToken(response));
  return response;
}

export async function registerUser(
  data: RegisterRequest
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

  saveToken(extractToken(response));
  return response;
}