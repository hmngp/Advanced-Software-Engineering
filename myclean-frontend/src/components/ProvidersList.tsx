import { useEffect, useState } from "react";
import { fetchProviders, type ProviderProfile } from "../Services/providers";

export default function ProvidersList() {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchProviders();
      setProviders(data);
      setError(null);
    } catch (e: any) {
      setError("Failed to load cleaners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    load();

    // poll every 10s
    const id = setInterval(load, 10_000);

    // optional: refresh when tab becomes visible again
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (loading) return <p>Loading cleaners…</p>;
  if (error) return <p>{error}</p>;
  if (!providers.length) return <p>No cleaners yet. Be the first to sign up!</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {providers.map((p) => (
        <article key={p.id} className="rounded-xl border p-4 shadow-sm">
          <header className="mb-2">
            <h3 className="text-lg font-semibold">{p.user.name}</h3>
            {p.isVerified && <span className="text-xs text-green-600 ml-2">Verified</span>}
          </header>

          <p className="text-sm text-gray-700">{p.bio || "No bio provided."}</p>

          <div className="mt-3 text-sm">
            <div>Experience: {p.yearsExperience || "—"} years</div>
            <div>Rating: {p.averageRating ?? "—"} ({p.totalReviews ?? 0} reviews)</div>
          </div>

          {p.services?.length ? (
            <ul className="mt-3 text-sm list-disc pl-5">
              {p.services.map((s, i) => (
                <li key={i}>
                  {s.serviceName} · {s.durationMin} min
                  {typeof s.pricePerHour === "number" && <> · ${(s.pricePerHour / 100).toFixed(2)}/hr</>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 text-sm text-gray-500">No listed services yet.</div>
          )}
        </article>
      ))}
    </div>
  );
}
