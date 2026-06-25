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
  { key: "proforma_invoice", label: "Proforma Invoice", icon: "💳" },
  { key: "tax_invoice", label: "Tax Invoice", icon: "🧾" },
  { key: "delivery_note", label: "Delivery Note", icon: "🚚" },
];

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const [filesByOrder, setFilesByOrder] = useState<Record<string, any[]>>({});
  const [sortField, setSortField] = useState<string>("order_id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
 const [enabledStatuses, setEnabledStatuses] = useState<string[]>([
  "Quote sent",
  "Delivered",
  "Active orders",
]);
const [highlightMode, setHighlightMode] = useState<string | null>(null);

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


const openEmail = (o: any) => {
  const to = "info@indevo.sk";

  const subject = `Order ${o.order_id} - ${o.status}`;

const body = `Hi Vladimir,

I am contacting you regarding the following order:

Order ID: ${o.order_id}
Customer order no.: ${o.customer_order_no ?? "-"}
Status: ${o.status}
Price: ${o.price ?? "-"} €

I would appreciate it if you could provide me with an update regarding this order.

Thank you in advance.

`;

  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = mailto;
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
    const existingFiles = getFiles(orderId).filter((f) => f.type === type);

const baseId =
  existingFiles[0]?.file_url?.split("/").pop()?.split("_")[0] ||
  crypto.randomUUID();

const version = existingFiles.length + 1;

const filePath = `${orderId}/${type}/${baseId}_V${version}.pdf`;



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
        return { color: "#eadf05", background: "#fef3c7" };
      case "Ordered":
        return { color: "#1a07eb", background: "#dbeafe" };
      case "In production":
        return { color: "#e9160b", background: "#ffedd5" };
      case "Delivered":
        return { color: "#0ce22c", background: "#d1fae5" };
      case "QC inspection":
        return { color: "#10ac80", background: "#d1fae5" };
      default: 
        return { color: "#374151", background: "#e5e7eb" };
    }
  };

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "-";

  const isThisWeek = (date: string | null | undefined) => {
  if (!date) return false;

  const d = new Date(date);
  if (isNaN(d.getTime())) return false;

  const now = new Date();

  const start = new Date(now);
  const day = start.getDay();

  const diffToMonday = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return d >= start && d <= end;
};

const isOverdue = (date: string | null | undefined, status: string) => {
  
  if (!date) return false;
  if (status === "Delivered") return false;

  const d = new Date(date);
  if (isNaN(d.getTime())) return false;

  const now = new Date();

  // hranice tohto týždňa
  const start = new Date(now);
  const day = start.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // ❗ OVERDUE až mimo tohto týždňa
  const isBeforeThisWeek = d < start;

  return isBeforeThisWeek;
};

  const toggleStatus = (status: string) => {
  setEnabledStatuses((prev) => {
    // ACTIVE ORDERS LOGIKA
    if (status === "Active orders") {
      const isActiveSelected = prev.includes("Active orders");

      if (isActiveSelected) {
        // vypne všetky 3
        return prev.filter(
          (s) =>
            ![
              "Ordered",
              "In production",
              "QC inspection",
              "Active orders",
            ].includes(s)
        );
      } else {
        // zapne všetky 3 + Active orders label
        return [
          ...prev.filter(
            (s) =>
              ![
                "Ordered",
                "In production",
                "QC inspection",
              ].includes(s)
          ),
          "Ordered",
          "In production",
          "QC inspection",
          "Active orders",
        ];
      }
    }

    // ostatné statusy normálne
    return prev.includes(status)
      ? prev.filter((s) => s !== status)
      : [...prev, status];
  });
};

const exportCSV = () => {
  const headers = [
    "Order ID",
    "Status",
    "Customer Order No.",
    "Price",
    "Quote sent",
    "Ordered",
    "Estimated delivery",
    "Delivered",
  ];


  
  const rows = sortedOrders.map((o) => [
    o.order_id,
    o.status,
    o.customer_order_no ?? "-",
    o.price ?? "-",
    formatDate(o.quote_sent_at),
    formatDate(o.ordered_at),
    formatDate(o.estimated_delivery_at),
    formatDate(o.delivered_at),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "orders_export.csv";
  link.click();

  URL.revokeObjectURL(url);
};
const getHighlightColor = (o: any) => {
  if (!highlightMode) return null;

  switch (highlightMode) {
    case "active":
      return ["Ordered", "In production", "QC inspection"].includes(o.status)
        ? "rgba(59, 130, 246, 0.12)"
        : null;

    case "week":
      return o.status !== "Delivered" &&
        isThisWeek(o.estimated_delivery_at)
        ? "rgba(59, 130, 246, 0.12)"
        : null;

    case "overdue":
      return isOverdue(o.estimated_delivery_at, o.status)
        ? "rgba(239, 68, 68, 0.14)"
        : null;

    case "delivered":
      return o.status === "Delivered"
        ? "rgba(16, 185, 129, 0.12)"
        : null;

    default:
      return null;
  }
};
const sortedOrders = [...orders]
  .filter((o) => {
    const isActiveOrder =
  ["Ordered", "In production", "QC inspection"].includes(o.status);

return (
  enabledStatuses.includes(o.status) ||
  (enabledStatuses.includes("Active orders") && isActiveOrder)
);
  })
  .sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA == null) return 1;
    if (valB == null) return -1;

    if (typeof valA === "number" && typeof valB === "number") {
      return sortDir === "asc" ? valA - valB : valB - valA;
    }

    return sortDir === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  


  
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
<button onClick={exportCSV} className="exportBtn">

  
  Export CSV
</button>
            <button onClick={logout} className="logoutMobile">
              Logout
            </button>
          </div>
        </div>

        <div className="card">
          <div className="statusFilter">
  {["Quote sent", "Active orders", "Delivered"].map((status) => (
    <button
      key={status}
      onClick={() => toggleStatus(status)}
      className={`statusChip ${
        enabledStatuses.includes(status) ? "active" : ""
      }`}
      aria-pressed={enabledStatuses.includes(status)}
    >
      {status}
    </button>
  ))}
</div>

<div className="dashboard">

{/* ACTIVE ORDERS */}
<div
  className={`dashCard highlightActive ${
    highlightMode === "active" ? "activeDash" : ""
  }`}
  onClick={() =>
    setHighlightMode((prev) =>
      prev === "active" ? null : "active"
    )
  }
>
  <div className="dashPulseDot" />
  <div className="dashLabel">Active orders</div>
  <div className="dashValue">
    {sortedOrders.filter(o =>
      ["Ordered", "In production", "QC inspection"].includes(o.status)
    ).length}
  </div>
</div>

{/* THIS WEEK */}
<div
  className={`dashCard highlightBlue ${
    highlightMode === "week" ? "activeDash" : ""
  }`}
  onClick={() =>
    setHighlightMode((prev) =>
      prev === "week" ? null : "week"
    )
  }
>
  <div className="dashPulseDot" />
  <div className="dashLabel">Due This Week</div>
  <div className="dashValue">
    {sortedOrders.filter(o =>
      o.status !== "Delivered" &&
      isThisWeek(o.estimated_delivery_at)
    ).length}
  </div>
</div>

{/* OVERDUE */}
<div
  className={`dashCard highlightRed ${
    highlightMode === "overdue" ? "activeDash" : ""
  }`}
  onClick={() =>
    setHighlightMode((prev) =>
      prev === "overdue" ? null : "overdue"
    )
  }
>
  <div className="dashPulseDot" />
  <div className="dashLabel">Overdue (active orders)</div>
  <div className="dashValue">
    {sortedOrders.filter(o =>
      isOverdue(o.estimated_delivery_at, o.status)
    ).length}
  </div>
</div>

{/* DELIVERED */}
<div
  className={`dashCard highlightGreen ${
    highlightMode === "delivered" ? "activeDash" : ""
  }`}
  onClick={() =>
    setHighlightMode((prev) =>
      prev === "delivered" ? null : "delivered"
    )
  }
>
  <div className="dashPulseDot" />
  <div className="dashLabel">Completed Orders</div>
  <div className="dashValue">
    {sortedOrders.filter(o =>
      o.status === "Delivered"
    ).length}
  </div>
</div>



  
{/* AVERAGE LEAD TIME (WORKING DAYS) */}
<div className="dashCard highlightBlue">
  <div className="dashLabel">Avg LT (work days)</div>
  <div className="dashValue">
    {(() => {
      const delivered = sortedOrders.filter(
        (o) =>
          o.status === "Delivered" &&
          o.ordered_at &&
          o.delivered_at
      );

      if (delivered.length === 0) return "-";

      const isWorkDay = (d: Date) => {
        const day = d.getDay();
        return day !== 0 && day !== 6; // nedeľa + sobota
      };

      const countWorkDays = (start: Date, end: Date) => {
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
          if (isWorkDay(current)) count++;
          current.setDate(current.getDate() + 1);
        }

        return count;
      };

      const totalDays = delivered.reduce((sum, o) => {
        const start = new Date(o.ordered_at);
        const end = new Date(o.delivered_at);

        return sum + countWorkDays(start, end);
      }, 0);

      const avg = totalDays / delivered.length;

      return `${avg % 1 === 0 ? avg.toFixed(0) : avg.toFixed(1)} days`;
    })()}
  </div>
</div>




<div className="dashCard highlightRed">
  <div className="dashLabel">Avg delay (days)</div>
  <div className="dashValue">
    {(() => {
      const delivered = sortedOrders.filter(
        (o) =>
          o.status === "Delivered" &&
          o.estimated_delivery_at &&
          o.delivered_at
      );

      if (delivered.length === 0) return "-";

      const late = delivered.filter((o) => {
        const est = new Date(o.estimated_delivery_at);
        const del = new Date(o.delivered_at);
        return del.getTime() > est.getTime();
      });

      const avgDelay =
        late.length === 0
          ? 0
          : late.reduce((sum, o) => {
              const est = new Date(o.estimated_delivery_at).getTime();
              const del = new Date(o.delivered_at).getTime();

              const diffDays =
                (del - est) / (1000 * 60 * 60 * 24);

              return sum + diffDays;
            }, 0) / late.length;

      return `${avgDelay % 1 === 0 ? avgDelay.toFixed(0) : avgDelay.toFixed(1)} days`;
    })()}
  </div>
</div>





<div className="dashCard highlightGreen">
  <div className="dashLabel">On-time delivery</div>
  <div className="dashValue">
    {(() => {
      const delivered = sortedOrders.filter(
        (o) =>
          o.status === "Delivered" &&
          o.estimated_delivery_at &&
          o.delivered_at
      );

      if (delivered.length === 0) return "-";

      const onTime = delivered.filter((o) => {
        const est = new Date(o.estimated_delivery_at);
        const del = new Date(o.delivered_at);
        return del <= est;
      }).length;

      const rate = (onTime / delivered.length) * 100;

      return `${rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1)}%`;
    })()}
  </div>
</div>






  {/* TOTAL VALUE */}
  <div className="dashCard highlightGold">
    <div className="dashLabel">Total Value</div>
    <div className="dashValue">
      €{sortedOrders
        .filter(o =>
          ["Ordered", "In production", "QC inspection", "Delivered"].includes(o.status)
        )
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0)
        .toLocaleString()}
    </div>
  </div>




</div>
  


          <h2>My Orders</h2>
          
  <img
      src="https://indevo.sk/logo.jpg"
      alt="Indevo logo"
      className="tableLogo"
    />
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th></th>
 <th
      style={{ cursor: "pointer" }}
      onClick={() => {
        setSortField("order_id");
        setSortDir(
          sortField === "order_id" && sortDir === "asc" ? "desc" : "asc"
        );
      }}
    >
      Order ID {sortField === "order_id" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
    </th>

    <th
      style={{ cursor: "pointer" }}
      onClick={() => {
        setSortField("status");
        setSortDir(
          sortField === "status" && sortDir === "asc" ? "desc" : "asc"
        );
      }}
    >
      Status {sortField === "status" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
    </th>

    <th
      style={{ cursor: "pointer" }}
      onClick={() => {
        setSortField("customer_order_no");
        setSortDir(
          sortField === "customer_order_no" && sortDir === "asc"
            ? "desc"
            : "asc"
        );
      }}
    >
      Order Cust. No.{" "}
      {sortField === "customer_order_no"
        ? sortDir === "asc"
          ? "▲"
          : "▼"
        : "▼"}
    </th>

    <th
      style={{ cursor: "pointer" }}
      onClick={() => {
        setSortField("price");
        setSortDir(
          sortField === "price" && sortDir === "asc" ? "desc" : "asc"
        );
      }}
    >
      Price {sortField === "price" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
    </th>
<th>Quote sent</th>
<th>Ordered date</th>
<th>Est. delivery</th>
<th>Delivered date</th>
<th>Request</th>
                </tr>
              </thead>

              <tbody>
                {sortedOrders.map((o) => {
                  const open = openId === o.order_id;

                  return (
                    <Fragment key={o.order_id}>
                     <tr
  onClick={() => toggleRow(o.order_id)}
  className="row"
  style={{
    backgroundColor: getHighlightColor(o) || undefined,
    transition: "background 0.2s ease"
  }}
>
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
  <td>
  <button
    onClick={(e) => {
      e.stopPropagation();
      openEmail(o);
    }}
    className="emailBtn"
  >
    ✉️
  </button>
</td>
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
  const files = getFiles(o.order_id).filter(
    (f) => f.type === t.key
  );

  if (files.length === 0) return null;

  return (
    <details className="downloadMenu">
      <summary className="uploadBtn">
        Download ▼
      </summary>

      <div className="downloadList">
        {[...files].reverse().map((file, index) => (
          <a
            key={file.id ?? index}
            href={file.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="downloadItem"
          >
            Version {files.length - index}
          </a>
        ))}
      </div>
    </details>
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

.card {
  position: relative; /* 👈 dôležité */
}

.tableLogo {
  position: absolute;
  top: 14px;
  right: 14px;

  height: 26px;
  width: auto;
  object-fit: contain;

  opacity: 0.85;
}

.exportBtn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 12px;
  cursor: pointer;
  transition: 0.2s;
}

.exportBtn:hover {
  background: #f3f4f6;
}



.emailBtn {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 12px;
  cursor: pointer;
}

.emailBtn:hover {
  background: #f3f4f6;
}

.dashboard {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 10px 0 18px;
}

.dashCard {
  min-height: 70px;   /* minimálna výška */
}

.dashCard {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 6px 14px rgba(0,0,0,0.04);
  transition: 0.2s;
}

.dashCard:hover {
  transform: translateY(-2px);
}

.dashLabel {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.dashValue {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

/* ACCENTS */
.highlightBlue {
  border-left: 4px solid #3b82f6;
}

.highlightGreen {
  border-left: 4px solid #10b981;
}

.highlightGold {
  border-left: 4px solid #f59e0b;
}



  .dashCard {
    padding: 6px 6px;
    border-radius: 10px;
  }

  .dashLabel {
    font-size: 11px;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashValue {
    font-size: 13px;
    font-weight: 700;
  }
}



.statusChip {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  cursor: pointer;

  transition: all 0.2s ease;
  user-select: none;

  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.statusChip:hover {
  background: #f9fafb;
  transform: translateY(-1px);
  border-color: #d1d5db;
}

.statusChip.active {
  background: #111827;
  color: white;
  border-color: #111827;
  box-shadow: 0 6px 14px rgba(0,0,0,0.12);
}


.highlightRed {
  border-left: 4px solid #ef4444;
}

.dashCard {
  position: relative;
  cursor: pointer;
}

/* pulzujúci klik indikátor */
.dashPulseDot {
  position: absolute;
  bottom: 10px;   /* 👈 Z TOP → BOTTOM */
  right: 10px;

  width: 8px;
  height: 8px;
  border-radius: 50%;

  background: #33e1ee;

  box-shadow: 0 0 0 rgba(59,130,246,0.6);
  animation: pulse 1.6s infinite;
  opacity: 0.9;
}

/* rôzne farby podľa typu karty */
.highlightRed .dashPulseDot {
  background: #ef4444;
}

.highlightGreen .dashPulseDot {
  background: #10b981;
}

.highlightBlue .dashPulseDot {
  background: #3b82f6;
}

.highlightGold .dashPulseDot {
  background: #f59e0b;
}

/* animácia */
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59,130,246,0.5);
  }
  70% {
    transform: scale(1.3);
    box-shadow: 0 0 0 8px rgba(59,130,246,0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59,130,246,0);
  }
}


.highlightActive {
  border-left: 4px solid #33e1ee; /* žltá */
}
.downloadMenu {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* odstráni default šípku details (ak ju ešte používaš) */
.downloadMenu summary {
  list-style: none;
  cursor: pointer;
}

.downloadMenu summary::-webkit-details-marker {
  display: none;
}

/* DROPDOWN */
.downloadList {
  position: absolute;

  /* 👉 desktop: otvára sa vpravo */
  top: 0;
  left: 100%;
  margin-left: 8px;

  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;

  min-width: 160px;

  box-shadow: 0 8px 24px rgba(0,0,0,0.12);

  overflow: hidden;

  z-index: 99999;

  animation: fadeIn 0.12s ease-out;
}

/* ITEMY */
.downloadItem {
  display: block;
  padding: 10px 12px;
  color: #111827;
  text-decoration: none;
  font-size: 13px;
}

.downloadItem:hover {
  background: #f3f4f6;
}

/* jemná animácia */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 📱 MOBILE fallback */
@media (max-width: 768px) {
  .downloadList {
    left: auto;
    right: 0;
    top: 100%;
    margin-left: 0;
    margin-top: 8px;
  }
}



.statusFilter {
  display: inline-flex;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  gap: 4px;
  margin-bottom: 12px;
}

/* button základ */
.statusChip {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  transition: 0.2s;
  color: #374151;
}

/* hover efekt */
.statusChip:hover {
  background: rgba(0,0,0,0.05);
}

/* aktívny stav */
.statusChip.active {
  background: white;
  color: #111827;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}

      `}</style>
    </div>
  );
}

