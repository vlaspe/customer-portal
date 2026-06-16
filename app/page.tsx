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
  const [files, setFiles] = useState<any[]>([]);

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

  const loadFiles = async (orderId: number) => {
    const { data } = await supabase
      .from("order_files")
      .select("*")
      .eq("order_id", orderId);

    setFiles(data || []);
  };

  const toggleRow = async (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }

    setOpenId(id);
    await loadFiles(id);
  };

  const uploadFile = async (orderId: number, type: FileType, file: File) => {
    const filePath = `${orderId}/${type}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(filePath, file);

    if (uploadError) return alert(uploadError.message);

    const { data: publicUrl } = supabase.storage
      .from("order-files")
      .getPublicUrl(filePath);

    await supabase.from("order_files").insert({
      order_id: orderId,
      type,
      file_url: publicUrl.publicUrl,
      file_name: file.name,
    });

    await loadFiles(orderId);
  };

  const getFilesCount = (orderId: number, type: FileType) => {
    return files.filter((f) => f.order_id === orderId && f.type === type)
      .length;
  };

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
        <aside className="sidebar">
          <h2>Portal</h2>

          <button onClick={logout} className="logout">
            Logout
          </button>
        </aside>

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
                      <Fragment key={o.id}>
                        <tr
                          onClick={() => toggleRow(o.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <span style={{ marginRight: 8 }}>▶</span>
                            #{o.id}
                          </td>

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

                        {openId === o.id && (
                          <tr>
                            <td colSpan={6}>
                              <div className="actions">
                                {FILE_TYPES.map((t) => {
                                  const count = getFilesCount(o.id, t.key);

                                  return (
                                    <div key={t.key} className="docBox">
                                      <label>
                                        {t.icon} {t.label} ({count})
                                      </label>

                                      <input
                                        type="file"
                                        onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                            uploadFile(
                                              o.id,
                                              t.key,
                                              e.target.files[0]
                                            );
                                          }
                                        }}
                                      />

                                      {count > 0 &&
                                        files
                                          .filter(
                                            (f) =>
                                              f.order_id === o.id &&
                                              f.type === t.key
                                          )
                                          .map((f) => (
                                            <a
                                              key={f.id}
                                              href={f.file_url}
                                              target="_blank"
                                            >
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
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
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .docBox {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .docBox a {
          font-size: 12px;
          color: blue;
        }

        @media (max-width: 768px) {
          .layout {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            display: flex;
            justify-content: space-between;
            padding: 12px;
          }

          .main {
            padding: 15px;
          }

          .actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}