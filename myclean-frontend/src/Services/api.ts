// src/services/api.ts

// In production, REACT_APP_API_URL must be set in Vercel environment variables
// For local dev, it defaults to localhost
const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

// Log a warning in production if API URL is not configured
if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_URL) {
  console.error('⚠️ REACT_APP_API_URL is not set! API calls will fail. Please set it in Vercel environment variables.');
}

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
  try {
    const res = await fetch(`${BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`GET ${BASE}${path} failed:`, res.status, errorText);
      throw new Error(`GET ${path} failed: ${res.status} - ${errorText}`);
    }
    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`Network error: Cannot reach ${BASE}${path}. Is the backend running?`);
      throw new Error(`Cannot connect to backend at ${BASE}. Please check your REACT_APP_API_URL configuration.`);
    }
    throw error;
  }
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
