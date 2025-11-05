// src/Services/providers.ts  ← keep folder casing consistent with your project

import { get } from "./api";

export type ProviderService = {
  id?: number;
  serviceName: string;
  description?: string;
  pricePerHour?: number;  // cents
  durationMin: number;
  isActive?: boolean;
};

export interface ProviderProfile {
  id: number;
  bio?: string | null;
  yearsExperience?: string | null;
  isVerified: boolean;
  isActive: boolean;
  hasInsurance?: boolean;
  hasVehicle?: boolean;
  hasEquipment?: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  totalBookings?: number | null;
  services: ProviderService[];
  user?: {
    id: number;
    name: string;
    profileImage: string | null;
  };
}

export async function fetchProviders(): Promise<ProviderProfile[]> {
  const res = await get<{ success: boolean; providers: ProviderProfile[] }>("/api/providers");
  return res.providers ?? [];
}

export async function fetchProvider(id: number): Promise<ProviderProfile> {
  const res = await get<{ success: boolean; profile: ProviderProfile }>(`/api/providers/${id}`);
  return res.profile;
}
