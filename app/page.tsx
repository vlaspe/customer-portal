"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type User = any;
type Order = any;

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      setUser(auth.user);

      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", auth.user.id);

      setOrders(data || []);
    };

    load();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ✅ FIX: explicit type
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Quote sent":
        return { color: "#b45309", background: "#fef3c7" };

      case "Ordered":
        return { color: "#1d4ed8", background: "#dbeafe" };

      case "In production":
        return { color: "#9a3412", background: "#ffedd5" };

      case "Delivered":
        return { color: "#065f46", background: "#d1fae5" };

      default:
        return { color: "#374151", background: "#e5e7eb" };
    }
  };

  // ✅ FIX: explicit type
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>
      
      {/* SIDEBAR */}
      <aside
        style={{
          width: 220,
          background: "#111",
          color: "white",
          padding: 20,
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Portal</h2>

        <p style={{ opacity: 0.7, cursor: "pointer" }}>Dashboard</p>
        <p style={{ opacity: 0.7, cursor: "pointer" }}>Orders</p>
        <p style={{ opacity: 0.7, cursor: "pointer" }}>Profile</p>

        <button
          onClick={logout}
          style={{
            marginTop: 20,
            width: "100%",
            padding: 10,
            border: "none",
            background: "#333",
            color: "white",
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: 30, background: "#f5f5f5" }}>

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <h1>Customer Dashboard</h1>
          <p>{user.email}</p>
        </div>

        {/* ORDERS */}
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ marginBottom: 15 }}>My Orders</h2>

          {orders.length === 0 ? (
            <p>No orders found</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>ID</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Status</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Price</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Quote</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Ordered</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Delivered</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id}>
                    <td style={{ padding: 10 }}>#{o.id}</td>

                    <td style={{ padding: 10 }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          ...getStatusStyle(o.status),
                        }}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td style={{ padding: 10 }}>{o.price}€</td>
                    <td style={{ padding: 10 }}>{formatDate(o.quote_sent_at)}</td>
                    <td style={{ padding: 10 }}>{formatDate(o.ordered_at)}</td>
                    <td style={{ padding: 10 }}>{formatDate(o.delivered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}