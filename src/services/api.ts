const API_BASE_URL = "http://localhost:5245";

export function getToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

export function saveToken(token?: string | null) {
  if (!token) return;

  localStorage.setItem("token", token);
  localStorage.setItem("accessToken", token);
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

function getErrorMessage(data: any, status: number) {
  if (typeof data === "string" && data.trim() !== "") {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.Message) {
    return data.Message;
  }

  if (data?.errors) {
    return Object.values(data.errors).flat().join("\n");
  }

  if (data?.Errors) {
    return Object.values(data.Errors).flat().join("\n");
  }

  if (data?.title) {
    return data.title;
  }

  if (data?.Title) {
    return data.Title;
  }

  return `API isteği başarısız oldu. Status: ${status}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("API bağlantı hatası:", error);
    throw new Error(
      "Backend bağlantısı kurulamadı. Backend çalışıyor mu ve port 5245 doğru mu kontrol et."
    );
  }

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("API HATASI:", {
      status: response.status,
      endpoint,
      data,
    });

    if (response.status === 401) {
      clearToken();
    }

    throw new Error(getErrorMessage(data, response.status));
  }

  return data as T;
}

export function unwrapData<T>(response: any): T {
  if (response && "Data" in response) {
    return response.Data as T;
  }

  if (response && "data" in response) {
    return response.data as T;
  }

  return response as T;
}

export function extractToken(response: any): string | null {
  return (
    response?.Token ||
    response?.token ||
    response?.AccessToken ||
    response?.accessToken ||
    response?.Data?.Token ||
    response?.Data?.token ||
    response?.data?.Token ||
    response?.data?.token ||
    null
  );
}