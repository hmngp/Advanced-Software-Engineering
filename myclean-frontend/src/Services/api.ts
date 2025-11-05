// src/services/api.ts

const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

export type Service = {
  id: number;
  serviceName: string;
  description?: string | null;
  pricePerHour: number; // cents
  durationMin: number;
  provider: {
    profileId: number;
    userId: number;
    name: string;
    profileImage?: string | null;
  };
};

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<{ ok: boolean }>("/api/health"),

  // ✅ now matches your new backend route/shape
  services: async () => {
    const data = await get<{ success: boolean; services: Service[] }>("/api/services");
    return data.services ?? [];
  },

  providers: async () => {
    const data = await get<{ success: boolean; providers: any[] }>("/api/providers");
    return data.providers ?? [];
  },

  provider: async (id: number) => {
    const data = await get<{ success: boolean; profile: any }>(`/api/providers/${id}`);
    return data.profile;
  },

  bookings: () => get<any[]>("/api/bookings"),
  createBooking: (payload: {
    userId: number;
    serviceId: number;
    startTime: string;
    endTime: string;
    address: string;
  }) => post("/api/bookings", payload),

  users: () => get<any[]>("/api/users"),
};
