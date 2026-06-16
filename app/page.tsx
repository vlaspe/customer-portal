"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

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

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <>
      <div className="layout">
        {/* HEADER / SIDEBAR (desktop) */}
        <aside className="sidebar">
          <h2>Portal</h2>

          <button onClick={logout} className="logout">
            Logout
          </button>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="header">
            <h1>Customer Dashboard</h1>
            <p>{user.email}</p>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 15 }}>My Orders</h2>

            {orders.length === 0 ? (
              <p>No orders found</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Quote</th>
                      <th>Ordered</th>
                      <th>Delivered</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((o: any) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>

                        <td>
                          <span
                            className="status"
                            style={getStatusStyle(o.status)}
                          >
                            {o.status}
                          </span>
                        </td>

                        <td>{o.price}€</td>
                        <td>{formatDate(o.quote_sent_at)}</td>
                        <td>{formatDate(o.ordered_at)}</td>
                        <td>{formatDate(o.delivered_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 🎨 STYLES */}
      <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
          font-family: sans-serif;
        }

        /* DESKTOP SIDEBAR */
        .sidebar {
          width: 220px;
          background: #111;
          color: white;
          padding: 20px;
        }

        .sidebar h2 {
          margin-bottom: 20px;
        }

        .logout {
          width: 100%;
          padding: 10px;
          border: none;
          background: #333;
          color: white;
          border-radius: 6px;
          cursor: pointer;
        }

        .main {
          flex: 1;
          padding: 30px;
          background: #f5f5f5;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          text-align: left;
          padding: 10px;
          white-space: nowrap;
        }

        .status {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }

        .tableWrap {
          overflow-x: auto;
        }

        /* 📱 MOBILE FIX */
        @media (max-width: 768px) {
          .layout {
            flex-direction: column;
          }

          /* 🔥 sidebar sa zmení na top bar */
          .sidebar {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
          }

          .sidebar h2 {
            margin-bottom: 0;
            font-size: 16px;
          }

          .logout {
            width: auto;
            padding: 8px 12px;
            font-size: 12px;
          }

          .main {
            padding: 15px;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          th,
          td {
            font-size: 12px;
            padding: 6px;
          }

          .card {
            padding: 12px;
          }
        }
      `}</style>
    </>
  );
}