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

  const [filesByOrder, setFilesByOrder] = useState<Record<string, any[]>>({});

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
  .eq("user_id", auth.user.id)
  .order("order_id", { ascending: false });

      setOrders(data || []);
    };

    load();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const loadFiles = async (orderId: number | string) => {
    const { data, error } = await supabase
      .from("order_files")
      .select("*")
      .eq("order_id", Number(orderId));

    if (error) {
      console.log("LOAD FILES ERROR:", error);
      return;
    }

    setFilesByOrder((prev) => ({
      ...prev,
      [String(orderId)]: data || [],
    }));
  };

  const toggleRow = async (orderId: number) => {
    const next = openId === orderId ? null : orderId;
    setOpenId(next);

    if (next !== null) {
      await loadFiles(orderId);
    }
  };

  const uploadFile = async (orderId: number, type: FileType, file: File) => {
    const random = Math.random().toString(36).substring(2, 10);
    const filePath = `${orderId}/${type}/${random}_${orderId}.pdf`;

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
      order_id: orderId,
      type,
      file_url: data.publicUrl,
      file_name: file.name,
    });

    if (dbError) {
      console.log("DB ERROR:", dbError);
      return;
    }

    await loadFiles(orderId);
    setOpenId((prev) => prev);
  };

  const getFiles = (orderId: number | string) =>
    filesByOrder[String(orderId)] || [];

  const getFilesCount = (orderId: number | string, type: FileType) =>
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

          <div className="headerRight">
            <p>{user.email}</p>

            <button onClick={logout} className="logoutMobile">
              Logout
            </button>
          </div>
        </div>

        <div className="card">
          <h2>My Orders</h2>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th></th>
<th>Order ID</th>
<th>Status</th>
<th>Order Cust. No.</th>
<th>Price</th>
<th>Quote sent</th>
<th>Ordered date</th>
<th>Est. delivery</th>
<th>Delivered date</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((o) => {
                  const open = openId === o.order_id;

                  return (
                    <Fragment key={o.order_id}>
                     <tr onClick={() => toggleRow(o.order_id)} className="row">
  <td className="arrowCell">
    <span className={`arrow ${open ? "open" : ""}`}>▶</span>
  </td>

  <td>{o.order_id}</td>

  <td>
    <span style={getStatusStyle(o.status)}>
      {o.status}
    </span>
  </td>

  <td>{o.customer_order_no ?? "-"}</td>
  <td>{o.price ? `${o.price}€` : "-"}</td>
  <td>{formatDate(o.quote_sent_at)}</td>
  <td>{formatDate(o.ordered_at)}</td>
  <td>{formatDate(o.estimated_delivery_at)}</td>
  <td>{formatDate(o.delivered_at)}</td>
</tr>

                      {open && (
                        <tr>
                          <td colSpan={6}>
                            <div className="actions">

                              {FILE_TYPES.map((t) => {
                                const count = getFilesCount(o.order_id, t.key);

                                return (
                                  <div key={t.key} className="docBox">
                                    <div className="docTop">
  <span>
    {t.icon} {t.label} {count === 0 ? "(No files yet)" : `(${count})`}
  </span>

  <div className="btnGroup">
    <label className="uploadBtn">
      Upload
      <input
        type="file"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) {
            uploadFile(o.order_id, t.key, e.target.files[0]);
          }
        }}
      />
    </label>

    {(() => {
      const file = getFiles(o.order_id)
        .filter((f) => f.type === t.key)
        .slice(-1)[0];

      if (!file) return null;

      return (
        <a
          className="uploadBtn"
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          download
        >
          Download
        </a>
      );
    })()}
  </div>
</div>

                                        
                                
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
       :global(html, body) {
  margin: 0;
  padding: 0;
  background: #f4f6f8;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
}

/* =========================
   LAYOUT
========================= */

.layout {
  display: flex;
  min-height: 100vh;
  overflow-x: hidden;
}

/* =========================
   SIDEBAR (MODERN PANEL)
========================= */

.sidebar {
  width: clamp(200px, 18vw, 260px);
  background: #0f172a;
  color: white;
  padding: 20px;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar h2 {
  font-size: 18px;
  margin-bottom: 20px;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

/* logout bottom style */
.logout {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s;
}

.logout:hover {
  background: rgba(255,255,255,0.12);
}

/* =========================
   MAIN AREA
========================= */

.main {
  flex: 1;
  min-width: 0;
  padding: clamp(16px, 2vw, 32px);
}

/* HEADER */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: clamp(18px, 1.2vw + 12px, 26px);
  font-weight: 700;
  color: #111827;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #4b5563;
}

/* mobile logout */
.logoutMobile {
  display: none;
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  background: #111827;
  color: white;
}

/* =========================
   CARD
========================= */

.card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 20px rgba(0,0,0,0.04);
}

/* =========================
   TABLE WRAP
========================= */

.tableWrap {
  width: 100%;
  overflow: auto;
  max-height: 70vh; /* 👈 toto je kľúčové */
  border-radius: 12px;
}

/* =========================
   TABLE CORE
========================= */

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

/* HEADER */
th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  padding: 12px 10px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

/* ROW */
td {
  padding: 12px 10px;
  font-size: 13px;
  color: #111827;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  border-bottom: 1px solid #f1f5f9;
}

.row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.row:hover {
  background: #f8fafc;
}

/* STRONG FIRST COLUMN (ORDER ID) */
td:nth-child(2) {
  font-weight: 600;
}

/* =========================
   STATUS BADGE
========================= */

td span {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

/* =========================
   ARROW
========================= */

.arrowCell {
  width: 36px;
  text-align: center;
}

.arrow {
  display: inline-block;
  transition: transform 0.2s ease;
  font-size: 14px;
  opacity: 0.7;
}

.arrow.open {
  transform: rotate(90deg);
}

/* =========================
   ACTIONS
========================= */

.actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 10px 0;
}

.docBox {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  padding: 10px;
  border-radius: 12px;
}

/* =========================
   BUTTONS
========================= */

.uploadBtn {
  background: #111827;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  cursor: pointer;
}
  .btnGroup {
  display: flex;
  gap: 8px;   /* 👈 MEDZERA medzi tlačidlami */
  align-items: center;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .logout {
    display: none;
  }

  .logoutMobile {
    display: block;
  }

  th, td {
    font-size: 11px;
    padding: 8px;
  }

  td {
    white-space: normal;
  }

  .actions {
    grid-template-columns: 1fr;
  }
}

thead th {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #f9fafb;
  backdrop-filter: blur(6px);
}



      `}</style>
    </div>
  );
}

