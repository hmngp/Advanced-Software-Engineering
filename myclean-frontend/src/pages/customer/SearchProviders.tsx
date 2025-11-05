// src/pages/customer/SearchProviders.tsx
import React, { useEffect, useState } from "react";
import { FaSearch, FaStar, FaMapMarkerAlt, FaDollarSign, FaFilter } from "react-icons/fa";
import Card from "../../components/Card";
import { useNavigate } from "react-router-dom";
import { fetchProviders, type ProviderProfile } from "../../Services/providers"; // ← adjust casing if needed

// UI types for card rendering
interface ServiceUI {
  id?: number;
  name: string;
  pricePerHour: number; // cents
  durationMin: number;
}

interface ProviderUI {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  profileImage: string | null;
  isVerified?: boolean;
  profile: {
    bio?: string;
    yearsExperience?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    averageRating?: number;
    totalReviews?: number;
    totalBookings?: number;
    hasInsurance?: boolean;
    hasVehicle?: boolean;
    hasEquipment?: boolean;
  };
  services: ServiceUI[];
}

const SearchProviders: React.FC = () => {
  const navigate = useNavigate();

  const [providers, setProviders] = useState<ProviderUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]); // dollars
  const [selectedService, setSelectedService] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Load providers (and poll every 10s)
  useEffect(() => {
    let timer: number | null = null;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchProviders(); // GET /api/providers
       const mapped: ProviderUI[] = data.map((p: ProviderProfile) => ({
        id: p.id,
  name: p.user?.name ?? "Cleaner",
  email: undefined,
  phone: undefined,
  profileImage: p.user?.profileImage ?? null,
  isVerified: p.isVerified ?? false,
  profile: {
    bio: p.bio ?? "",
    yearsExperience: p.yearsExperience ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    zipCode: p.zipCode ?? "",
    averageRating: p.averageRating ?? undefined,
    totalReviews: p.totalReviews ?? undefined,
    totalBookings: p.totalBookings ?? undefined,
    hasInsurance: p.hasInsurance ?? undefined,
    hasVehicle: p.hasVehicle ?? undefined,
    hasEquipment: p.hasEquipment ?? undefined,
  },
  services: (p.services ?? []).map((s) => ({
    id: (s as any).id,              // if included by Prisma
    name: s.serviceName,            // backend field
    pricePerHour: s.pricePerHour ?? 0, // cents
    durationMin: s.durationMin,
  })),
}));

        setProviders(mapped);
        setError("");
      } catch (e) {
        console.error(e);
        setError("Failed to load providers. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load(); // initial
    timer = window.setInterval(load, 10_000); // poll every 10s

    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Static filter options (client-side)
  const serviceTypes = [
    "Regular Cleaning",
    "Deep Cleaning",
    "Move-out Cleaning",
    "Office Cleaning",
    "Carpet Cleaning",
    "Window Cleaning",
  ];
  const australianStates = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

  // Client-side filtering until you add /api/providers/search
  const filteredProviders = providers.filter((provider) => {
    const matchesSearch =
      !searchTerm || provider.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesState =
      !state || (provider.profile.state ?? "").toLowerCase() === state.toLowerCase();

    const matchesCity =
      !city || (provider.profile.city ?? "").toLowerCase().includes(city.toLowerCase());

    const matchesService =
      !selectedService ||
      provider.services.some((s) =>
        s.name.toLowerCase().includes(selectedService.toLowerCase())
      );

    const minPriceCents =
      provider.services.length > 0
        ? Math.min(...provider.services.map((s) => s.pricePerHour ?? 0))
        : 0;

    const matchesPrice = minPriceCents / 100 <= priceRange[1];

    const rating = provider.profile.averageRating ?? 0;
    const matchesRating = rating >= minRating;

    return (
      matchesSearch &&
      matchesState &&
      matchesCity &&
      matchesService &&
      matchesPrice &&
      matchesRating
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Perfect Cleaner</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <input
              type="text"
              placeholder="City..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All States</option>
              {australianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaFilter className="mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}/hour
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([Number(e.target.value), priceRange[1]])
                      }
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value)])
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rating
                  </label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`px-4 py-2 rounded-lg border ${
                          minRating === rating
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                        }`}
                      >
                        {rating === 0 ? "Any" : `${rating}+`}{" "}
                        <FaStar className="inline text-yellow-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Service Types */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {serviceTypes.map((service) => (
                      <button
                        key={service}
                        onClick={() =>
                          setSelectedService(
                            selectedService === service ? "" : service
                          )
                        }
                        className={`px-4 py-2 rounded-full border ${
                          selectedService === service
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading providers...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                Found <span className="font-semibold">{filteredProviders.length}</span> cleaners
              </p>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => {
                const minPriceCents =
                  provider.services.length > 0
                    ? Math.min(...provider.services.map((s) => s.pricePerHour ?? 0))
                    : 0;
                const minPriceDollars = (minPriceCents / 100).toFixed(2);

                return (
                  <Card key={provider.id} onClick={() => navigate(`/provider/${provider.id}`)}>
                    <div className="flex items-start space-x-4 cursor-pointer">
                      <img
                        src={provider.profileImage || "/api/placeholder/100/100"}
                        alt={provider.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            ✓ Verified
                          </span>
                        </div>

                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <FaMapMarkerAlt className="mr-1" />
                          {provider.profile.city || "—"}, {provider.profile.state || "—"}
                        </div>

                        <div className="flex items-center mt-2">
                          <FaStar className="text-yellow-400 mr-1" />
                          <span className="font-semibold">
                            {provider.profile.averageRating?.toFixed(1) || "New"}
                          </span>
                          {provider.profile.totalReviews && provider.profile.totalReviews > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({provider.profile.totalReviews} reviews)
                            </span>
                          )}
                        </div>

                        {minPriceCents > 0 && (
                          <div className="flex items-center mt-2 text-lg font-bold text-blue-600">
                            From <FaDollarSign className="ml-1" />
                            {minPriceDollars}/hour
                          </div>
                        )}

                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {provider.services.slice(0, 2).map((service, i) => (
                              <span
                                key={service.id ?? i}
                                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                              >
                                {service.name}
                              </span>
                            ))}
                            {provider.services.length > 2 && (
                              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                +{provider.services.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {provider.profile.totalBookings && provider.profile.totalBookings > 0 && (
                          <div className="mt-3 text-sm text-green-600 font-medium">
                            {provider.profile.totalBookings} bookings completed
                          </div>
                        )}

                        <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                          View Profile & Book
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {filteredProviders.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No cleaners found matching your criteria.</p>
                <p className="text-gray-400 mt-2">Try adjusting your filters or search in a different area.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchProviders;
