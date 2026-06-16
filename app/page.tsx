"use client";

import { useEffect, useState, Fragment } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type FileType =
  | "quotation"
  | "purchase_order"
  | "proforma_invoice"
  | "tax_invoice"
  | "delivery_note";

const FILE_TYPES: { key: FileType; label: string; icon: string }[] = [
  { key: "quotation", label: "Quotation", icon: "📄" },
  { key: "purchase_order", label: "Purchase Order", icon: "📦" },
  { key: "proforma_invoice", label: "Proforma Invoice", icon: "💰" },
  { key: "tax_invoice", label: "Tax Invoice", icon: "🧾" },
  { key: "delivery_note", label: "Delivery Note", icon: "🚚" },
];

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const [filesByOrder, setFilesByOrder] = useState<Record<number, any[]>>({});

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

  // 🔥 FIX: vždy fresh load + string fix
  const loadFiles = async (orderId: number | string) => {
    const { data, error } = await supabase
      .from("order_files")
      .select("*")
      .eq("order_id", orderId);

    if (error) {
      console.log("LOAD FILES ERROR:", error);
      return;
    }

    setFilesByOrder((prev) => ({
      ...prev,
      [Number(orderId)]: data || [],
    }));
  };

  const toggleRow = async (id: number) => {
    const next = openId === id ? null : id;
    setOpenId(next);

    if (next !== null) {
      await loadFiles(id);
      console.log("FILES RESPONSE:", data, error);
      
    }
  };
  

  const uploadFile = async (orderId: number, type: FileType, file: File) => {
    const filePath = `${orderId}/${type}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("order_files")
      .upload(filePath, file);

    if (uploadError) {
      console.log(uploadError);
      return alert(uploadError.message);
    }

    const { data } = supabase.storage
      .from("order_files")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("order_files").insert({
      order_id: String(orderId),   // 🔥 FIX STRING
      type,
      file_url: data.publicUrl,
      file_name: file.name,
    });

    if (dbError) {
      console.log("DB ERROR:", dbError);
      return;
      
    }

    // 🔥 force refresh
    await loadFiles(orderId);
  };

  const getFiles = (orderId: number) => filesByOrder[orderId] || [];

  const getFilesCount = (orderId: number, type: FileType) =>
    getFiles(orderId).filter((f) => f.type === type).length;

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

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "-";

  if (!user) return <p>Loading...</p>;

  return (
    <div className="layout">

      <aside className="sidebar">
        <h2>Portal</h2>
        <button onClick={logout} className="logout">Logout</button>
      </aside>

      <main className="main">
        <div className="header">
          <h1>Customer Dashboard</h1>
          <p>{user.email}</p>
        </div>

        <div className="card">
          <h2>My Orders</h2>

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
                {orders.map((o) => {
                  const open = openId === o.id;

                  return (
                    <Fragment key={o.id}>
                      <tr onClick={() => toggleRow(o.id)} className="row">
                        <td>
                          <span className={`arrow ${open ? "open" : ""}`}>▶</span>
                          {o.id}
                        </td>

                        <td>
                          <span style={getStatusStyle(o.status)}>
                            {o.status}
                          </span>
                        </td>

                        <td>{o.price}€</td>
                        <td>{formatDate(o.quote_sent_at)}</td>
                        <td>{formatDate(o.ordered_at)}</td>
                        <td>{formatDate(o.delivered_at)}</td>
                      </tr>

                      {open && (
                        <tr>
                          <td colSpan={6}>
                            <div className="actions">

                              {FILE_TYPES.map((t) => {
                                const count = getFilesCount(o.id, t.key);

                                return (
                                  <div key={t.key} className="docBox">
                                    <div className="docTop">
                                      <span>
                                        {t.icon} {t.label} ({count})
                                      </span>

                                      <label className="uploadBtn">
                                        Upload
                                        <input
                                          type="file"
                                          hidden
                                          onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              uploadFile(o.id, t.key, e.target.files[0]);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>

                                    {getFiles(o.id)
                                      .filter((f) => f.type === t.key)
                                      .map((f) => (
                                        <a key={f.id} href={f.file_url} target="_blank">
                                          Download
                                        </a>
                                      ))}
                                  </div>
                                );
                              })}

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        
      </main>

      <style jsx>{`

      .arrow {
  display: inline-block;
  transition: transform 0.2s ease;
  margin-right: 6px;
}
        .layout {
          display: flex;
          min-height: 100vh;
          font-family: sans-serif;
        }

        .sidebar {
          width: 220px;
          background: #111;
          color: white;
          padding: 20px;
        }

        .logout {
          width: 100%;
          padding: 10px;
          border: none;
          background: #333;
          color: white;
          border-radius: 6px;
        }

        .main {
          flex: 1;
          padding: 30px;
          background: #f5f5f5;
        }

        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 10px;
          white-space: nowrap;
          text-align: left;
        }

        .row {
          cursor: pointer;
        }

        .arrow.open {
          transform: rotate(90deg);
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .docBox {
          background: #f8fafc;
          padding: 10px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .docTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .uploadBtn {
          background: #111;
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }

        a {
          font-size: 12px;
          color: blue;
        }

        @media (max-width: 768px) {
          .layout {
            flex-direction: column;
          }

          .sidebar {
            display: none;
          }

          .main {
            padding: 12px;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          th, td {
            font-size: 12px;
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );

  
}