import { useEffect, useState } from "react";
import { api } from "../Services/api";

export default function Header() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    api.health().then(h => setOk(!!h.ok)).catch(() => setOk(false));
  }, []);

  return (
    <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                     padding:"14px 20px", borderBottom:"1px solid #eee", marginBottom:16 }}>
      <h1 style={{ margin:0, fontSize:20 }}>MyClean</h1>
      <span style={{
        fontSize:12, padding:"4px 8px", borderRadius:999,
        background: ok === null ? "#eee" : ok ? "#e6ffed" : "#ffe6e6",
        color: ok === null ? "#555" : ok ? "#006d32" : "#a40000",
        border: "1px solid #ddd"
      }}>
        API: {ok === null ? "…" : ok ? "Connected" : "Offline"}
      </span>
    </header>
  );
}
