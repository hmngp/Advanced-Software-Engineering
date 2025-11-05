// src/components/ServiceList.tsx
import { useEffect, useState } from "react";
import { api, type Service } from "../Services/api"; // keep folder casing exactly as in your repo

export default function ServiceList() {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .services()
      .then((services) => setData(services))
      .catch((e: any) => setErr(e?.message ?? "Failed to load services"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading services…</p>;
  if (err) return <p style={{ color: "crimson" }}>Failed to load: {err}</p>;
  if (data.length === 0) return <p>No services yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
      {data.map((s) => (
        <li key={s.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: "0 0 6px" }}>{s.serviceName}</h3>
          {s.description && <div style={{ color: "#555" }}>{s.description}</div>}
          <div style={{ marginTop: 8 }}>
            <strong>${(s.pricePerHour / 100).toFixed(2)} AUD</strong> · {s.durationMin} min
          </div>
          {s.provider && (
            <div style={{ marginTop: 6, fontSize: 14, color: "#555" }}>
              by {s.provider.name}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
