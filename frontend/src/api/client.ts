import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "qc_auth_token";

export async function getToken(): Promise<string | null> {
  return storage.secureGet<string>(TOKEN_KEY, "");
}

export async function setToken(token: string): Promise<void> {
  await storage.secureSet(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await storage.secureRemove(TOKEN_KEY);
}

type Options = {
  method?: string;
  body?: any;
  auth?: boolean;
};

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = (data && data.detail) || "Terjadi kesalahan";
    throw new Error(typeof message === "string" ? message : "Terjadi kesalahan");
  }
  return data as T;
}

// Upload a local image uri as multipart. Returns { path }.
export async function uploadPhoto(uri: string): Promise<{ path: string }> {
  const token = await getToken();
  const form = new FormData();
  const name = `photo_${Date.now()}.jpg`;
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type: "image/jpeg" } as any);
  }
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Gagal unggah foto");
  }
  return res.json();
}

export async function uploadBase64(dataUri: string): Promise<{ path: string }> {
  return api<{ path: string }>("/upload-base64", { method: "POST", body: { image: dataUri } });
}

export async function fileUrl(path: string): Promise<string> {
  const token = await getToken();
  return `${BASE}/api/files/${path}?token=${token}`;
}

export async function exportUrl(id: string, fmt: "pdf" | "excel"): Promise<string> {
  const token = await getToken();
  return `${BASE}/api/inspections/${id}/export?fmt=${fmt}&token=${token}`;
}
