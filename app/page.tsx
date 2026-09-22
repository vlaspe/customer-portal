"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type FileType =
  | "quotation"
  | "purchase_order"
  | "proforma_invoice"
  | "tax_invoice"
  | "delivery_note";

type FilterKey = "all" | "quotes" | "active" | "delivered";
type QuickFilter = "active" | "week" | "overdue" | "delivered" | null;
type SortDirection = "asc" | "desc";
type SectionId = "overview" | "orders" | "documents";

type Order = {
  order_id: number;
  user_id?: string;
  status: string;
  customer_order_no: string | null;
  price: number | string | null;
  quote_sent_at: string | null;
  ordered_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
};

type OrderFile = {
  id?: number | string;
  order_id: number;
  type: FileType;
  file_url: string;
  file_name: string;
  created_at?: string;
};

type SortField = keyof Pick<
  Order,
  "order_id" | "status" | "customer_order_no" | "price" | "estimated_delivery_at"
>;

const ACTIVE_STATUSES = ["Ordered", "In production", "QC inspection"];
const ORDER_STEPS = ["Quote sent", "Ordered", "In production", "QC inspection", "Delivered"];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All orders" },
  { key: "quotes", label: "Quotes" },
  { key: "active", label: "In progress" },
  { key: "delivered", label: "Delivered" },
];

const FILE_TYPES: { key: FileType; label: string; short: string }[] = [
  { key: "quotation", label: "Quotation", short: "QT" },
  { key: "purchase_order", label: "Purchase order", short: "PO" },
  { key: "proforma_invoice", label: "Proforma invoice", short: "PI" },
  { key: "tax_invoice", label: "Tax invoice", short: "TI" },
  { key: "delivery_note", label: "Delivery note", short: "DN" },
];

const STATUS_META: Record<string, { label: string; tone: string }> = {
  "Quote sent": { label: "Quote sent", tone: "quote" },
  Ordered: { label: "Ordered", tone: "ordered" },
  "In production": { label: "In production", tone: "production" },
  "QC inspection": { label: "QC inspection", tone: "quality" },
  Delivered: { label: "Delivered", tone: "delivered" },
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    orders: <><path d="M6 3h12l2 4v14H4V7l2-4Z" /><path d="M4 8h16M9 12h6" /></>,
    files: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    overview: <><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    shield: <><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrowUp: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    refresh: <><path d="M20 7h-6V1" /><path d="M20 7a9 9 0 1 0 1 7" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`indevoLogo ${compact ? "compact" : ""}`}>
      <span className="logoMark" aria-hidden="true">
        <i className="logoBar one" />
        <i className="logoBar two" />
        <i className="logoBar three" />
      </span>
      <span className="logoType">
        <strong>INDEVO</strong>
        {!compact && <small>Engineering · Manufacturing · Integration</small>}
      </span>
    </span>
  );
}

function startOfThisWeek() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  start.setHours(0, 0, 0, 0);
  return start;
}

function isThisWeek(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = startOfThisWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function isOverdue(order: Order) {
  if (!order.estimated_delivery_at || order.status === "Delivered") return false;
  const date = new Date(order.estimated_delivery_at);
  return !Number.isNaN(date.getTime()) && date < startOfThisWeek();
}

function workDaysBetween(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "-").replaceAll('"', '""')}"`;
}

export default function Home() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filesByOrder, setFilesByOrder] = useState<Record<string, OrderFile[]>>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("order_id");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      router.replace("/login");
      return;
    }

    setUserEmail(auth.user.email ?? "Customer account");
    const { data, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("order_id", { ascending: false });

    if (ordersError) setError("Orders could not be loaded. Please try again.");
    else {
      const loadedOrders = (data ?? []) as Order[];
      setOrders(loadedOrders);

      const orderIds = loadedOrders.map((order) => order.order_id);
      if (orderIds.length) {
        const { data: allDocuments } = await supabase
          .from("order_files")
          .select("*")
          .in("order_id", orderIds);

        if (allDocuments) {
          const grouped = (allDocuments as OrderFile[]).reduce<Record<string, OrderFile[]>>((result, file) => {
            const key = String(file.order_id);
            result[key] = [...(result[key] ?? []), file];
            return result;
          }, {});
          setFilesByOrder(grouped);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const sections = (["overview", "orders", "documents"] as SectionId[])
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: "-18% 0px -65% 0px", threshold: [0, 0.1, 0.35] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [loading]);

  const loadFiles = async (orderId: number) => {
    const { data, error: filesError } = await supabase
      .from("order_files")
      .select("*")
      .eq("order_id", orderId);

    if (filesError) {
      setNotice("Documents could not be loaded.");
      return;
    }
    setFilesByOrder((current) => ({ ...current, [String(orderId)]: (data ?? []) as OrderFile[] }));
  };

  const toggleRow = async (orderId: number) => {
    if (openId === orderId) {
      setOpenId(null);
      return;
    }
    setOpenId(orderId);
    await loadFiles(orderId);
  };

  const uploadFile = async (orderId: number, type: FileType, file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setNotice("Please select a PDF file.");
    if (file.size > 20 * 1024 * 1024) return setNotice("The PDF must be smaller than 20 MB.");

    const key = `${orderId}-${type}`;
    setUploading(key);
    const existing = filesByOrder[String(orderId)]?.filter((item) => item.type === type) ?? [];
    const previousBase = existing[0]?.file_url.split("/").pop()?.split("_V")[0];
    const baseId = previousBase || crypto.randomUUID();
    const filePath = `${orderId}/${type}/${baseId}_V${existing.length + 1}.pdf`;

    const { error: uploadError } = await supabase.storage.from("order_files").upload(filePath, file);
    if (uploadError) {
      setUploading("");
      return setNotice(uploadError.message);
    }

    const { data: publicData } = supabase.storage.from("order_files").getPublicUrl(filePath);
    const { error: databaseError } = await supabase.from("order_files").insert({
      order_id: orderId,
      type,
      file_url: publicData.publicUrl,
      file_name: file.name,
    });

    if (databaseError) setNotice("The file was uploaded, but its record could not be saved.");
    else {
      await loadFiles(orderId);
      setNotice("New document version uploaded.");
    }
    setUploading("");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
      : "—";

  const formatPrice = (value: Order["price"]) => {
    if (value === null || value === "") return "—";
    return new Intl.NumberFormat("sk-SK", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  const stats = useMemo(() => {
    const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
    const delivered = orders.filter((order) => order.status === "Delivered");
    const thisWeek = orders.filter((order) => order.status !== "Delivered" && isThisWeek(order.estimated_delivery_at));
    const overdue = orders.filter(isOverdue);
    const leadTimes = delivered
      .filter((order) => order.ordered_at && order.delivered_at)
      .map((order) => workDaysBetween(order.ordered_at!, order.delivered_at!));
    const trackable = delivered.filter((order) => order.estimated_delivery_at && order.delivered_at);
    const onTime = trackable.filter((order) => new Date(order.delivered_at!) <= new Date(order.estimated_delivery_at!));
    const delayed = trackable
      .map((order) => {
        const estimate = new Date(order.estimated_delivery_at!);
        const deliveredAt = new Date(order.delivered_at!);
        return deliveredAt > estimate
          ? workDaysBetween(order.estimated_delivery_at!, order.delivered_at!) - 1
          : 0;
      })
      .filter((days) => days > 0);
    const totalValue = orders
      .filter((order) => [...ACTIVE_STATUSES, "Delivered"].includes(order.status))
      .reduce((sum, order) => sum + (Number(order.price) || 0), 0);

    return {
      active: active.length,
      thisWeek: thisWeek.length,
      overdue: overdue.length,
      delivered: delivered.length,
      avgLead: leadTimes.length ? leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length : null,
      avgDelay: delayed.length ? delayed.reduce((sum, days) => sum + days, 0) / delayed.length : 0,
      onTime: trackable.length ? (onTime.length / trackable.length) * 100 : null,
      totalValue,
    };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        if (filter === "quotes" && order.status !== "Quote sent") return false;
        if (filter === "active" && !ACTIVE_STATUSES.includes(order.status)) return false;
        if (filter === "delivered" && order.status !== "Delivered") return false;
        if (quickFilter === "active" && !ACTIVE_STATUSES.includes(order.status)) return false;
        if (quickFilter === "week" && !(order.status !== "Delivered" && isThisWeek(order.estimated_delivery_at))) return false;
        if (quickFilter === "overdue" && !isOverdue(order)) return false;
        if (quickFilter === "delivered" && order.status !== "Delivered") return false;
        if (!normalizedSearch) return true;
        return [order.order_id, order.customer_order_no, order.status]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        const result = sortField === "price"
          ? Number(aValue) - Number(bValue)
          : String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
        return sortDir === "asc" ? result : -result;
      });
  }, [filter, orders, quickFilter, search, sortDir, sortField]);

  const allFiles = useMemo(
    () => Object.values(filesByOrder).flat(),
    [filesByOrder]
  );

  const documentStats = useMemo(
    () => FILE_TYPES.map((type) => {
      const files = allFiles.filter((file) => file.type === type.key);
      const orderCount = new Set(files.map((file) => file.order_id)).size;
      return { ...type, files, orderCount };
    }),
    [allFiles]
  );

  const recentFiles = useMemo(
    () => [...allFiles]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : Number(a.id ?? 0);
        const bTime = b.created_at ? new Date(b.created_at).getTime() : Number(b.id ?? 0);
        return bTime - aTime;
      })
      .slice(0, 6),
    [allFiles]
  );

  const changeSort = (field: SortField) => {
    if (sortField === field) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const goToSection = (section: SectionId) => {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activateQuickFilter = (value: Exclude<QuickFilter, null>) => {
    setQuickFilter((current) => (current === value ? null : value));
    setFilter("all");
    window.setTimeout(() => goToSection("orders"), 0);
  };

  const openEmail = (order: Order) => {
    const subject = `Order ${order.order_id} — ${order.status}`;
    const body = `Hello INDEVO team,\n\nI am contacting you regarding order ${order.order_id}.\n\nCustomer order no.: ${order.customer_order_no ?? "-"}\nStatus: ${order.status}\nValue: ${formatPrice(order.price)}\n\nCould you please provide an update?\n\nThank you.`;
    window.location.href = `mailto:info@indevo.sk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const exportCSV = () => {
    const header = ["Order ID", "Status", "Customer order no.", "Price", "Quote sent", "Ordered", "Estimated delivery", "Delivered"];
    const rows = visibleOrders.map((order) => [
      order.order_id, order.status, order.customer_order_no, order.price,
      formatDate(order.quote_sent_at), formatDate(order.ordered_at),
      formatDate(order.estimated_delivery_at), formatDate(order.delivered_at),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `indevo-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => goToSection("overview")} aria-label="Go to overview">
          <BrandLogo />
          <span className="portalLabel">Customer portal</span>
        </button>

        <nav className="nav" aria-label="Portal navigation">
          <button className={`navItem ${activeSection === "overview" ? "active" : ""}`} onClick={() => goToSection("overview")}><Icon name="overview" />Overview<span>01</span></button>
          <button className={`navItem ${activeSection === "orders" ? "active" : ""}`} onClick={() => goToSection("orders")}><Icon name="orders" />Orders<span>{orders.length.toString().padStart(2, "0")}</span></button>
          <button className={`navItem ${activeSection === "documents" ? "active" : ""}`} onClick={() => goToSection("documents")}><Icon name="files" />Documents<span>{allFiles.length.toString().padStart(2, "0")}</span></button>
        </nav>

        <div className="sidebarFoot">
          <div className="supportBlock">
            <span className="eyebrow">INDEVO support</span>
            <strong>We are here to help.</strong>
            <a href="mailto:info@indevo.sk">info@indevo.sk <Icon name="external" size={14} /></a>
            <a href="https://indevo.sk" target="_blank" rel="noreferrer">Visit indevo.sk <Icon name="external" size={14} /></a>
          </div>
          <button className="logout" onClick={logout}><Icon name="logout" />Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobileBrand" onClick={() => goToSection("overview")} aria-label="INDEVO customer portal home"><BrandLogo compact /><span className="mobilePortal">Customer portal</span></button>
          <div className="topbarRight">
            <span className="secure"><i />Secure customer area</span>
            <div className="account"><span className="avatar">{initials}</span><span><small>Signed in as</small>{userEmail || "Loading…"}</span></div>
            <button className="iconButton mobileLogout" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button>
          </div>
        </header>

        <div className="content">
          <section className="hero" id="overview">
            <div className="heroCopy">
              <div className="heroKicker"><i /><span>Live production workspace</span><b>01 / CONTROL CENTER</b></div>
              <h1>Production, clearly<br /><span>under control.</span></h1>
              <p>Follow every order, delivery milestone and production document from one secure customer workspace.</p>
              <div className="heroTags"><span><Icon name="shield" size={13} />Secure data</span><span><Icon name="clock" size={13} />Live milestones</span><span><Icon name="files" size={13} />All documents</span></div>
            </div>
            <div className="heroMeta">
              <div className="syncIcon"><Icon name="refresh" size={17} /></div>
              <span>Last synchronized</span>
              <strong>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date())}</strong>
              <small>Production data is up to date</small>
              <button onClick={() => void loadOrders()} disabled={loading}><Icon name="refresh" size={15} />Refresh data</button>
            </div>
          </section>

          {error && <div className="errorBanner" role="alert"><span>{error}</span><button onClick={() => void loadOrders()}>Try again</button></div>}

          <section className="metrics" aria-label="Order overview">
            <button className={`metric signal ${quickFilter === "active" ? "selected" : ""}`} onClick={() => activateQuickFilter("active")}>
              <span className="metricTop"><i />Active orders <small>01</small></span><strong>{stats.active.toString().padStart(2, "0")}</strong><span className="metricLink">View production <Icon name="chevron" size={14} /></span>
            </button>
            <button className={`metric ${quickFilter === "week" ? "selected" : ""}`} onClick={() => activateQuickFilter("week")}>
              <span className="metricTop"><i className="blue" />Due this week <small>02</small></span><strong>{stats.thisWeek.toString().padStart(2, "0")}</strong><span className="metricLink">View schedule <Icon name="chevron" size={14} /></span>
            </button>
            <button className={`metric ${quickFilter === "overdue" ? "selected" : ""}`} onClick={() => activateQuickFilter("overdue")}>
              <span className="metricTop"><i className="red" />Needs attention <small>03</small></span><strong>{stats.overdue.toString().padStart(2, "0")}</strong><span className="metricLink">Review dates <Icon name="chevron" size={14} /></span>
            </button>
            <button className={`metric ${quickFilter === "delivered" ? "selected" : ""}`} onClick={() => activateQuickFilter("delivered")}>
              <span className="metricTop"><i className="green" />Completed <small>04</small></span><strong>{stats.delivered.toString().padStart(2, "0")}</strong><span className="metricLink">View history <Icon name="chevron" size={14} /></span>
            </button>
          </section>

          <section className="performance">
            <div className="performanceIntro"><span className="sectionIndex">02 / PERFORMANCE</span><h2>Delivery performance</h2></div>
            <div className="performanceStat"><span>Average lead time</span><strong>{stats.avgLead === null ? "—" : `${stats.avgLead.toFixed(stats.avgLead % 1 ? 1 : 0)} d`}</strong><small>Working days</small></div>
            <div className="performanceStat"><span>Average delay</span><strong>{`${stats.avgDelay.toFixed(stats.avgDelay % 1 ? 1 : 0)} d`}</strong><small>Late deliveries only</small></div>
            <div className="performanceStat"><span>On-time delivery</span><strong>{stats.onTime === null ? "—" : `${stats.onTime.toFixed(0)}%`}</strong><small>Delivered orders</small></div>
            <div className="performanceStat"><span>Order value</span><strong>{formatPrice(stats.totalValue)}</strong><small>Active + completed</small></div>
          </section>

          <section className="ordersSection" id="orders">
            <div className="sectionHead">
              <div><span className="sectionIndex">03 / ORDERS</span><h2>Order register</h2></div>
              <button className="exportButton" onClick={exportCSV} disabled={!visibleOrders.length}><Icon name="download" />Export CSV</button>
            </div>

            <div className="orderPanel">
              <div className="toolbar">
                <div className="filters" role="group" aria-label="Filter orders">
                  {FILTERS.map((item) => <button key={item.key} className={filter === item.key ? "active" : ""} onClick={() => { setFilter(item.key); setQuickFilter(null); }}>{item.label}</button>)}
                </div>
                <label className="search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order or status" aria-label="Search orders" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label>
              </div>

              {quickFilter && <div className="activeFilter">Quick filter: <strong>{quickFilter === "week" ? "Due this week" : quickFilter === "overdue" ? "Needs attention" : quickFilter === "active" ? "Active orders" : "Completed"}</strong><button onClick={() => setQuickFilter(null)}><Icon name="close" size={13} />Clear</button></div>}

              <div className="desktopTable">
                <table>
                  <thead><tr>
                    <th aria-label="Expand" />
                    <SortHeader label="Order" field="order_id" current={sortField} direction={sortDir} onSort={changeSort} />
                    <SortHeader label="Status" field="status" current={sortField} direction={sortDir} onSort={changeSort} />
                    <SortHeader label="Customer PO" field="customer_order_no" current={sortField} direction={sortDir} onSort={changeSort} />
                    <SortHeader label="Value" field="price" current={sortField} direction={sortDir} onSort={changeSort} />
                    <th>Quote sent</th><th>Ordered</th><SortHeader label="Est. delivery" field="estimated_delivery_at" current={sortField} direction={sortDir} onSort={changeSort} /><th>Delivered</th><th aria-label="Contact" />
                  </tr></thead>
                  <tbody>
                    {visibleOrders.map((order) => <OrderRows key={order.order_id} order={order} open={openId === order.order_id} files={filesByOrder[String(order.order_id)] ?? []} uploading={uploading} formatDate={formatDate} formatPrice={formatPrice} onToggle={toggleRow} onEmail={openEmail} onUpload={uploadFile} />)}
                  </tbody>
                </table>
              </div>

              <div className="mobileOrders">
                {visibleOrders.map((order) => <MobileOrder key={order.order_id} order={order} open={openId === order.order_id} files={filesByOrder[String(order.order_id)] ?? []} uploading={uploading} formatDate={formatDate} formatPrice={formatPrice} onToggle={toggleRow} onEmail={openEmail} onUpload={uploadFile} />)}
              </div>

              {!loading && visibleOrders.length === 0 && <div className="empty"><span>00</span><h3>No matching orders</h3><p>Adjust the filters or try a different search phrase.</p><button onClick={() => { setFilter("all"); setQuickFilter(null); setSearch(""); }}>Reset filters</button></div>}
              {loading && <div className="loading"><i /><span>Loading production data…</span></div>}
              {!loading && visibleOrders.length > 0 && <div className="panelFoot"><span>Showing {visibleOrders.length} of {orders.length} orders</span><span>INDEVO · CUSTOMER PORTAL</span></div>}
            </div>
          </section>

          <section className="documentsSection" id="documents">
            <div className="sectionHead documentsHead">
              <div><span className="sectionIndex">04 / DOCUMENTS</span><h2>Document center</h2><p>All commercial and production documents, organized by type and order.</p></div>
              <div className="documentTotal"><Icon name="shield" size={16} /><span><strong>{allFiles.length}</strong> secured files</span></div>
            </div>

            <div className="documentHub">
              <div className="documentCategories">
                {documentStats.map((category) => {
                  const latest = [...category.files].reverse()[0];
                  return (
                    <article className="categoryCard" key={category.key}>
                      <div className="categoryTop"><span className="categoryCode">{category.short}</span><span className="categoryCount">{category.files.length.toString().padStart(2, "0")}</span></div>
                      <h3>{category.label}</h3>
                      <p>{category.orderCount} linked order{category.orderCount === 1 ? "" : "s"}</p>
                      {latest ? <a href={latest.file_url} target="_blank" rel="noreferrer">Open latest <Icon name="external" size={13} /></a> : <button onClick={() => goToSection("orders")}>Add from an order <Icon name="chevron" size={13} /></button>}
                    </article>
                  );
                })}
              </div>

              <aside className="recentDocuments">
                <div className="recentHead"><div><span className="sectionIndex">RECENT FILES</span><h3>Latest documents</h3></div><span>{recentFiles.length}</span></div>
                <div className="recentList">
                  {recentFiles.map((file) => {
                    const type = FILE_TYPES.find((item) => item.key === file.type);
                    return <a key={file.id ?? file.file_url} href={file.file_url} target="_blank" rel="noreferrer" className="recentFile"><span className="recentIcon">{type?.short ?? "PDF"}</span><span><strong>{file.file_name || type?.label}</strong><small>Order #{file.order_id} · {type?.label}</small></span><Icon name="download" size={15} /></a>;
                  })}
                  {!recentFiles.length && <div className="recentEmpty"><Icon name="files" size={23} /><strong>No documents yet</strong><span>Open an order to upload the first PDF.</span></div>}
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>

      <nav className="mobileNav" aria-label="Mobile navigation">
        <button className={activeSection === "overview" ? "active" : ""} onClick={() => goToSection("overview")}><Icon name="overview" size={18} /><span>Overview</span></button>
        <button className={activeSection === "orders" ? "active" : ""} onClick={() => goToSection("orders")}><Icon name="orders" size={18} /><span>Orders</span></button>
        <button className={activeSection === "documents" ? "active" : ""} onClick={() => goToSection("documents")}><Icon name="files" size={18} /><span>Documents</span></button>
      </nav>

      {notice && <div className="toast" role="status"><i />{notice}<button onClick={() => setNotice("")}><Icon name="close" size={14} /></button></div>}

      <style jsx global>{`
        *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:linear-gradient(180deg,#f8fafc 0,#f2f5f9 46%,#eef2f7 100%);color:#111827;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input{font:inherit}
        :focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:2px}
        .shell{min-height:100vh;display:grid;grid-template-columns:236px minmax(0,1fr)}
        .sidebar{position:fixed;inset:0 auto 0 0;width:236px;background:linear-gradient(180deg,#08101f 0%,#0b1425 55%,#09111e 100%);color:#fff;padding:25px 18px 20px;display:flex;flex-direction:column;z-index:50;box-shadow:10px 0 35px rgba(12,23,42,.06)}
        .brand{width:100%;color:#fff;text-decoration:none;display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:3px 8px 23px;border:0;border-bottom:1px solid rgba(255,255,255,.09);background:transparent;text-align:left;cursor:pointer}.indevoLogo{display:flex;align-items:center;gap:11px;min-width:0}.logoMark{position:relative;width:34px;height:34px;flex:0 0 34px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:linear-gradient(145deg,#1f66e5,#153f91);box-shadow:0 8px 22px rgba(37,99,235,.28);overflow:hidden}.logoMark:after{content:"";position:absolute;inset:-10px -7px auto auto;width:27px;height:27px;border:1px solid rgba(255,255,255,.2);border-radius:50%}.logoBar{position:absolute;display:block;width:4px;border-radius:3px;background:#fff;transform:skew(-11deg);bottom:8px}.logoBar.one{height:13px;left:8px}.logoBar.two{height:20px;left:15px}.logoBar.three{height:16px;left:22px}.logoType{display:flex;flex-direction:column;min-width:0}.logoType strong{font-size:27px;line-height:.95;font-weight:920;letter-spacing:-1.7px;color:#fff}.logoType small{max-width:145px;margin-top:7px;color:#7f8da2;text-transform:uppercase;font:600 5.5px/1.45 ui-monospace,monospace;letter-spacing:.72px;white-space:normal}.portalLabel{margin-left:45px;padding:5px 8px;border:1px solid #2c3d58;border-radius:6px;background:#121e32;color:#9fc0ff;font:750 7px/1 ui-monospace,monospace;letter-spacing:.75px;text-transform:uppercase}
        .nav{display:flex;flex-direction:column;gap:6px;margin-top:26px}.navItem{position:relative;width:100%;border:0;background:transparent;text-align:left;cursor:pointer;display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:11px;color:#8d98aa;padding:12px 13px;border-radius:10px;font-size:12px;transition:.18s}.navItem span{font:700 8px/1 ui-monospace,monospace;color:#596477}.navItem:hover{color:#fff;background:rgba(255,255,255,.055)}.navItem.active{color:#fff;background:#172237;box-shadow:inset 3px 0 #3b82f6}.navItem.active span{color:#7da8f8}
        .sidebarFoot{margin-top:auto}.supportBlock{background:#111b2d;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:6px;margin-bottom:9px}.eyebrow,.sectionIndex{color:#7b8493;font:700 9px/1.2 ui-monospace,monospace;letter-spacing:1px;text-transform:uppercase}.supportBlock strong{font-size:14px}.supportBlock a{color:#8bb4ff;text-decoration:none;font-size:10px;display:flex;align-items:center;justify-content:space-between;margin-top:6px}.logout{width:100%;border:0;background:transparent;color:#7f8a9d;padding:11px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;font-size:11px}.logout:hover{color:#fff}
        .main{grid-column:2;min-width:0}.topbar{height:68px;border-bottom:1px solid rgba(217,224,233,.9);display:flex;align-items:center;justify-content:flex-end;padding:0 34px;background:rgba(255,255,255,.82);backdrop-filter:blur(18px);position:sticky;top:0;z-index:40}.mobileBrand{display:none;border:0;background:transparent;padding:0;align-items:center;gap:9px;cursor:pointer}.mobileBrand .logoMark{width:31px;height:31px;flex-basis:31px;border-color:#dbe5f4;box-shadow:0 5px 16px rgba(37,99,235,.2)}.mobileBrand .logoBar{bottom:7px}.mobileBrand .logoBar.one{left:7px}.mobileBrand .logoBar.two{left:13px}.mobileBrand .logoBar.three{left:20px}.mobileBrand .logoType strong{color:#0b1324;font-size:20px;letter-spacing:-1.2px}.mobilePortal{padding-left:9px;border-left:1px solid #dde3eb;color:#718096;font:700 6.5px/1.25 ui-monospace,monospace;letter-spacing:.65px;text-transform:uppercase;max-width:47px;text-align:left}.topbarRight,.account{display:flex;align-items:center}.topbarRight{gap:22px}.secure{font:700 8px/1 ui-monospace,monospace;letter-spacing:.9px;text-transform:uppercase;color:#667085;display:flex;align-items:center;gap:7px}.secure i{width:6px;height:6px;border-radius:50%;background:#22a06b;box-shadow:0 0 0 4px #e1f4eb}.account{gap:10px;padding-left:21px;border-left:1px solid #e1e5eb}.avatar{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#e8efff;color:#245bc4;font:800 10px/1 ui-monospace,monospace}.account>span:last-child{display:flex;flex-direction:column;font-size:11px;font-weight:650}.account small{font-size:8px;color:#98a2b3;text-transform:uppercase;letter-spacing:.65px;margin-bottom:3px}.mobileLogout{display:none}.content{padding:26px 34px 72px;max-width:1660px;margin:0 auto}
        .hero{position:relative;isolation:isolate;min-height:285px;padding:39px 42px;display:flex;justify-content:space-between;align-items:center;gap:30px;border-radius:22px;overflow:hidden;color:#fff;background:radial-gradient(circle at 72% 0%,rgba(73,132,245,.3),transparent 32%),radial-gradient(circle at 10% 110%,rgba(38,102,224,.22),transparent 36%),linear-gradient(120deg,#0a1425 0%,#0f1c31 55%,#101f39 100%);box-shadow:0 22px 55px rgba(15,28,49,.14)}.hero:before{content:"";position:absolute;z-index:-1;inset:0;opacity:.18;background-image:linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.12) 1px,transparent 1px);background-size:46px 46px;mask-image:linear-gradient(90deg,#000,transparent 78%)}.hero:after{content:"";position:absolute;z-index:-1;width:270px;height:270px;border:1px solid rgba(255,255,255,.11);border-radius:50%;right:18%;top:-151px;box-shadow:0 0 0 45px rgba(255,255,255,.025),0 0 0 90px rgba(255,255,255,.018)}.heroCopy{max-width:720px}.heroKicker{display:flex;align-items:center;gap:9px;color:#a9b8cc;font:700 8px/1 ui-monospace,monospace;letter-spacing:.9px;text-transform:uppercase}.heroKicker i{width:7px;height:7px;border-radius:50%;background:#48d597;box-shadow:0 0 0 5px rgba(72,213,151,.12)}.heroKicker b{font:inherit;color:#6f8199;margin-left:8px;padding-left:15px;border-left:1px solid rgba(255,255,255,.15)}.hero h1{font-size:48px;line-height:.98;letter-spacing:-2.4px;margin:22px 0 16px;font-weight:770}.hero h1 span{color:#86adfa}.hero p{margin:0;max-width:620px;color:#a8b5c8;font-size:12px;line-height:1.65}.heroTags{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.heroTags>span{height:29px;padding:0 10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.055);display:flex;align-items:center;gap:6px;color:#c6d0de;font-size:8px;font-weight:650}.heroTags svg{color:#79a6fa}.heroMeta{position:relative;flex:0 0 225px;min-height:188px;padding:23px;border:1px solid rgba(255,255,255,.11);border-radius:17px;background:rgba(255,255,255,.07);backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:flex-start;gap:7px}.syncIcon{width:38px;height:38px;border-radius:11px;background:#2b66cf;display:grid;place-items:center;color:#fff;margin-bottom:13px;box-shadow:0 9px 25px rgba(22,78,178,.34)}.heroMeta>span{font:700 7px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:1px;color:#8293aa}.heroMeta strong{font-size:15px;letter-spacing:-.2px}.heroMeta small{font-size:8px;color:#8595ab}.heroMeta button{border:0;background:none;color:#91b5fa;padding:12px 0 0;margin-top:auto;font-size:9px;font-weight:700;display:flex;gap:7px;align-items:center;cursor:pointer}.heroMeta button:hover{color:#fff}.heroMeta button:disabled{opacity:.45}
        .errorBanner{background:#fff1f0;color:#9b2c24;border:1px solid #ffd4cf;border-radius:11px;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;font-size:11px}.errorBanner button{border:0;background:transparent;color:#9b2c24;font-weight:750;cursor:pointer}
        .metrics{position:relative;z-index:2;margin:-22px 18px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.metric{appearance:none;text-align:left;border:1px solid #e0e6ef;border-radius:16px;background:rgba(255,255,255,.97);min-height:142px;padding:18px 19px;display:flex;flex-direction:column;cursor:pointer;position:relative;overflow:hidden;box-shadow:0 13px 32px rgba(16,24,40,.095);transition:transform .2s,box-shadow .2s,border-color .2s}.metric:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:#3b82f6;opacity:0;transition:.2s}.metric:hover{transform:translateY(-4px);border-color:#c4d1e2;box-shadow:0 18px 35px rgba(16,24,40,.13)}.metric:hover:before,.metric.selected:before{opacity:1}.metric.selected{border-color:#7aa2ee;box-shadow:0 0 0 3px rgba(59,130,246,.1),0 16px 35px rgba(16,24,40,.1)}.metric.selected:after{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:#3b82f6}.metric.signal{background:#fff}.metricTop{font-size:10px;font-weight:700;color:#475467;display:flex;align-items:center;gap:8px}.metricTop i{width:7px;height:7px;border-radius:50%;background:#3b82f6;box-shadow:0 0 0 4px #e9f1ff}.metricTop i.blue{background:#5377e7}.metricTop i.red{background:#e5484d;box-shadow:0 0 0 4px #fff0f0}.metricTop i.green{background:#2f9e6f;box-shadow:0 0 0 4px #e9f8f0}.metricTop small{font:600 8px/1 ui-monospace,monospace;color:#b1b8c3;margin-left:auto}.metric strong{font-size:40px;line-height:1;font-weight:700;letter-spacing:-1.9px;margin:auto 0 10px;color:#101828}.metricLink{font:700 8px/1 ui-monospace,monospace;letter-spacing:.45px;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;color:#98a2b3}.metric:hover .metricLink{color:#245bc4}
        .performance{margin:15px 18px 58px;display:grid;grid-template-columns:1.3fr repeat(4,1fr);background:#fff;border:1px solid #e0e6ee;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(16,24,40,.055)}.performanceIntro{position:relative;padding:22px;background:linear-gradient(135deg,#101c31,#132642);color:#fff;overflow:hidden}.performanceIntro:after{content:"";position:absolute;width:90px;height:90px;border:1px solid rgba(255,255,255,.09);border-radius:50%;right:-32px;bottom:-48px;box-shadow:0 0 0 23px rgba(255,255,255,.025)}.performanceIntro .sectionIndex{color:#788aa4}.performanceIntro h2{font-size:18px;line-height:1.2;letter-spacing:-.45px;margin:24px 0 0}.performanceStat{min-height:122px;border-left:1px solid #e7ebf1;padding:20px;display:flex;flex-direction:column;background:linear-gradient(180deg,#fff,#fbfcfe)}.performanceStat span{color:#667085;font-size:9px;text-transform:uppercase;letter-spacing:.55px}.performanceStat strong{font-size:26px;font-weight:700;margin:auto 0 5px;color:#101828}.performanceStat small{color:#98a2b3;font-size:8px}
        .ordersSection{scroll-margin-top:84px}.sectionHead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px}.sectionHead h2{font-size:25px;letter-spacing:-.8px;margin:7px 0 0}.exportButton{border:1px solid #d6dce5;border-radius:10px;background:#fff;height:38px;padding:0 14px;display:flex;align-items:center;gap:8px;font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.45px;cursor:pointer;color:#344054}.exportButton:hover{border-color:#aeb8c6;background:#f8fafc}.exportButton:disabled{opacity:.4;cursor:not-allowed}
        .orderPanel{border:1px solid #e0e5ed;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 18px rgba(16,24,40,.045)}.toolbar{min-height:64px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7ebf1;gap:18px}.filters{display:flex;gap:4px;background:#f1f3f7;padding:4px;border-radius:10px}.filters button{border:0;border-radius:7px;background:transparent;padding:8px 12px;font-size:9px;font-weight:700;color:#667085;cursor:pointer}.filters button:hover{color:#344054}.filters button.active{background:#fff;color:#245bc4;box-shadow:0 1px 4px rgba(16,24,40,.1)}.search{width:min(280px,34%);height:37px;border:1px solid #d9dfe8;border-radius:10px;padding:0 10px;display:flex;align-items:center;gap:8px;color:#98a2b3;background:#fff}.search:focus-within{border-color:#7aa2ee;box-shadow:0 0 0 3px rgba(59,130,246,.09)}.search input{border:0;outline:0;background:transparent;width:100%;font-size:10px;color:#344054}.search button{border:0;background:transparent;display:grid;place-items:center;cursor:pointer;color:#98a2b3}.activeFilter{font-size:9px;padding:9px 15px;background:#eff5ff;color:#245bc4;border-bottom:1px solid #d9e7ff}.activeFilter button{float:right;border:0;background:transparent;display:flex;align-items:center;gap:4px;color:#245bc4;font-size:9px;cursor:pointer}
        .desktopTable{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:1160px}th{background:#f8fafc;color:#8490a2;text-align:left;padding:11px 12px;border-bottom:1px solid #e4e8ef;font:700 8px/1 ui-monospace,monospace;letter-spacing:.55px;text-transform:uppercase;white-space:nowrap}th:first-child{width:39px}.sortButton{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;gap:5px;font:inherit;text-transform:inherit;letter-spacing:inherit;cursor:pointer}.sortButton span{opacity:0}.sortButton span.visible{opacity:1}td{padding:13px 12px;border-bottom:1px solid #edf0f4;font-size:10px;white-space:nowrap;color:#344054}.dataRow{cursor:pointer;transition:.15s}.dataRow:hover{background:#f8faff}.dataRow.attention{box-shadow:inset 3px 0 #e5484d}.orderId{font:750 11px/1 ui-monospace,monospace;color:#101828}.customerPo{font-family:ui-monospace,monospace;color:#667085}.price{text-align:right;font-weight:750}.contactCell{text-align:right}.chevron{display:grid;place-items:center;width:23px;height:23px;color:#98a2b3;transition:.2s}.chevron.open{transform:rotate(90deg);color:#245bc4}.status{display:inline-flex;align-items:center;gap:6px;border:1px solid;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:750;text-transform:uppercase;letter-spacing:.25px}.status:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.status.quote{color:#8a6500;background:#fff8df;border-color:#f0dfa3}.status.ordered{color:#2858bd;background:#eef3ff;border-color:#cedbfd}.status.production{color:#b0442d;background:#fff0eb;border-color:#f2cec3}.status.quality{color:#76509c;background:#f5effa;border-color:#dfcfea}.status.delivered{color:#24734a;background:#eaf7ef;border-color:#c9e8d4}.status.neutral{color:#667085;background:#f2f4f7;border-color:#e1e5ea}.mailButton,.iconButton{border:1px solid #d8dee7;border-radius:9px;background:#fff;width:32px;height:32px;display:inline-grid;place-items:center;cursor:pointer;color:#667085}.mailButton:hover{background:#245bc4;color:#fff;border-color:#245bc4}.detailRow td{padding:0;background:#101828;color:#fff}.documentArea{padding:23px 48px 27px}.documentHead{display:flex;justify-content:space-between;align-items:end;margin-bottom:15px}.documentHead h3{font-size:16px;margin:6px 0 0}.documentHead span:last-child{font:600 8px/1 ui-monospace,monospace;color:#7f8a9d}.documents{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.document{min-width:0;padding:13px;border:1px solid #28364d;border-radius:10px;background:#151f31}.documentTitle{display:flex;gap:9px;align-items:center;min-height:30px}.docCode{flex:0 0 29px;height:29px;border-radius:7px;display:grid;place-items:center;background:#1e3152;color:#8bb4ff;font:750 8px/1 ui-monospace,monospace}.documentTitle strong{font-size:9px;line-height:1.3}.documentTitle small{display:block;color:#8290a4;font-size:8px;margin-top:3px}.documentActions{display:flex;gap:6px;margin-top:12px}.uploadButton,.downloadButton{height:30px;border:1px solid #33445f;border-radius:7px;background:transparent;color:#d8e1ee;padding:0 8px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.35px;cursor:pointer;white-space:nowrap}.uploadButton:hover,.downloadButton:hover{border-color:#6f9cf2;color:#9abbfa}.uploadButton.busy{opacity:.5;pointer-events:none}.downloadMenu{position:relative}.downloadMenu summary{list-style:none}.downloadMenu summary::-webkit-details-marker{display:none}.downloadList{position:absolute;z-index:30;top:35px;right:0;width:190px;background:#fff;border:1px solid #dce2eb;border-radius:10px;box-shadow:0 16px 38px rgba(0,0,0,.22);padding:5px}.downloadList a{display:flex;flex-direction:column;color:#101828;text-decoration:none;padding:9px;border-radius:7px;font-size:8px}.downloadList a:hover{background:#f2f5fa}.downloadList strong{font-size:9px}.downloadList span{color:#8490a2;margin-top:3px;overflow:hidden;text-overflow:ellipsis}.mobileOrders{display:none}.empty,.loading{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.empty>span{font:500 40px/1 ui-monospace,monospace;color:#d6dce5}.empty h3{font-size:15px;margin:10px 0 4px}.empty p{color:#8490a2;font-size:10px}.empty button{border:0;background:transparent;color:#245bc4;padding:6px 0;font-size:9px;font-weight:700;cursor:pointer}.loading i{width:24px;height:24px;border:2px solid #e1e6ed;border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite}.loading span{font-size:9px;color:#8490a2;margin-top:11px}.panelFoot{padding:10px 15px;background:#f8fafc;display:flex;justify-content:space-between;color:#98a2b3;font:600 8px/1 ui-monospace,monospace;letter-spacing:.5px;text-transform:uppercase}
        .documentsSection{padding-top:58px;scroll-margin-top:82px}.documentsHead{align-items:center}.documentsHead p{margin:7px 0 0;color:#667085;font-size:10px}.documentTotal{display:flex;align-items:center;gap:8px;padding:10px 13px;background:#eef4ff;border:1px solid #d8e5ff;border-radius:10px;color:#245bc4}.documentTotal span{font-size:9px}.documentTotal strong{font-size:13px;margin-right:3px}.documentHub{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.65fr);gap:14px}.documentCategories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.categoryCard{min-height:152px;padding:16px;background:#fff;border:1px solid #e1e6ee;border-radius:14px;box-shadow:0 3px 12px rgba(16,24,40,.035);display:flex;flex-direction:column}.categoryTop{display:flex;align-items:center;justify-content:space-between}.categoryCode{width:33px;height:33px;border-radius:9px;background:#eaf1ff;color:#245bc4;display:grid;place-items:center;font:800 9px/1 ui-monospace,monospace}.categoryCount{font:700 20px/1 ui-monospace,monospace;color:#d0d6df}.categoryCard h3{font-size:12px;margin:17px 0 4px}.categoryCard p{font-size:9px;color:#98a2b3;margin:0}.categoryCard a,.categoryCard button{margin-top:auto;padding:10px 0 0;border:0;background:transparent;border-top:1px solid #eef1f5;color:#245bc4;text-decoration:none;font-size:8px;font-weight:750;text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}.recentDocuments{background:#101828;color:#fff;border-radius:15px;padding:17px;min-width:0}.recentHead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #27354b;padding-bottom:13px}.recentHead h3{font-size:14px;margin:6px 0 0}.recentHead>span{width:27px;height:27px;border-radius:8px;background:#1d2b43;color:#8bb4ff;display:grid;place-items:center;font:800 9px/1 ui-monospace,monospace}.recentList{display:flex;flex-direction:column;margin-top:5px}.recentFile{display:grid;grid-template-columns:32px minmax(0,1fr) 16px;align-items:center;gap:9px;padding:10px 2px;color:#fff;text-decoration:none;border-bottom:1px solid #243148}.recentFile:last-child{border-bottom:0}.recentFile:hover strong{color:#8bb4ff}.recentIcon{width:31px;height:31px;border-radius:8px;background:#1c2e4b;color:#8bb4ff;display:grid;place-items:center;font:750 7px/1 ui-monospace,monospace}.recentFile>span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:3px}.recentFile strong{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.recentFile small{font-size:7px;color:#7f8da2}.recentFile>svg{color:#63728a}.recentEmpty{min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#718097;text-align:center}.recentEmpty strong{color:#d9e1ed;font-size:10px;margin:10px 0 4px}.recentEmpty span{font-size:8px}.mobileNav{display:none}.toast{position:fixed;right:21px;bottom:21px;z-index:100;background:#101828;color:#fff;border-radius:11px;padding:13px 15px;display:flex;align-items:center;gap:9px;max-width:380px;font-size:10px;box-shadow:0 15px 45px rgba(16,24,40,.25)}.toast i{width:7px;height:7px;background:#55c28b;border-radius:50%}.toast button{border:0;background:transparent;color:#98a2b3;margin-left:7px;display:grid;place-items:center;cursor:pointer}
        .orderTimeline{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));margin:0 0 17px;padding:13px 15px;background:#0d1727;border:1px solid #26354c;border-radius:11px}.timelineStep{position:relative;display:flex;align-items:center;gap:8px;color:#607087;min-width:0}.timelineStep:not(:last-child):after{content:"";position:absolute;left:27px;right:6px;top:11px;height:1px;background:#2a3950}.timelineMarker{position:relative;z-index:2;flex:0 0 22px;height:22px;border:1px solid #35455d;border-radius:50%;background:#172337;display:grid;place-items:center;font:750 7px/1 ui-monospace,monospace}.timelineText{display:flex;flex-direction:column;gap:3px;min-width:0;position:relative;z-index:2;background:#0d1727;padding-right:7px}.timelineText strong{font-size:8px;white-space:nowrap}.timelineText small{font-size:7px;color:#64748b;white-space:nowrap}.timelineStep.complete,.timelineStep.current{color:#9fc0ff}.timelineStep.complete .timelineMarker{background:#245bc4;border-color:#4d7bd5;color:#fff}.timelineStep.complete:not(:last-child):after{background:#3c6dc9}.timelineStep.current .timelineMarker{border-color:#6d9cf5;box-shadow:0 0 0 4px rgba(59,130,246,.13)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:1260px){.metrics{grid-template-columns:repeat(2,1fr)}.performance{grid-template-columns:repeat(4,1fr)}.performanceIntro{grid-column:1/-1}.documents{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:850px){.shell{display:block}.sidebar{display:none}.main{grid-column:auto}.topbar{height:66px;padding:0 14px;justify-content:space-between;box-shadow:0 5px 18px rgba(16,24,40,.045)}.mobileBrand{display:flex}.secure{display:none}.account{border:0;padding:0}.account>span:last-child{display:none}.mobileLogout{display:grid}.content{padding:14px 14px 36px}.hero{min-height:278px;padding:28px 23px 55px;align-items:flex-start;border-radius:19px}.hero:before{background-size:36px 36px}.hero:after{right:-30%;top:-170px}.heroKicker b{display:none}.hero h1{font-size:34px;line-height:1.01;letter-spacing:-1.45px;margin:20px 0 13px}.hero p{font-size:10px;line-height:1.55;max-width:500px}.heroTags{margin-top:17px;gap:6px}.heroTags>span{height:27px;padding:0 8px;font-size:7px}.heroMeta{display:none}.metrics{grid-template-columns:repeat(2,1fr);gap:9px;margin:-32px 8px 0}.metric{min-height:124px;padding:14px;box-shadow:0 12px 27px rgba(16,24,40,.1)}.metric strong{font-size:32px}.performance{grid-template-columns:1fr 1fr;margin:12px 8px 40px}.performanceIntro{grid-column:1/-1;min-height:95px}.performanceIntro h2{margin-top:19px}.performanceStat{min-height:108px;padding:16px}.toolbar{align-items:stretch;flex-direction:column;gap:10px}.filters{overflow-x:auto}.filters button{flex:0 0 auto}.search{width:100%}.desktopTable{display:none}.mobileOrders{display:block}.mobileOrder{border-bottom:1px solid #e7ebf1}.mobileOrderButton{width:100%;border:0;background:#fff;padding:16px;text-align:left;display:grid;grid-template-columns:1fr auto;gap:13px;cursor:pointer}.mobileOrderTitle{display:flex;align-items:center;gap:8px;margin-bottom:14px}.mobileOrderTitle strong{font:750 12px/1 ui-monospace,monospace}.mobileGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px 17px}.mobileGrid span{display:flex;flex-direction:column;gap:4px;font-size:10px;font-weight:650;color:#344054}.mobileGrid small{color:#98a2b3;font:700 7px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.45px}.mobileSide{display:flex;flex-direction:column;align-items:end;justify-content:space-between}.mobileSide small{color:#c9383e;font:750 7px/1 ui-monospace,monospace}.mobileDetail{background:#101828;color:#fff;padding:15px}.mobileDetail .documents{grid-template-columns:1fr}.mobileContact{width:100%;height:37px;margin-top:12px;border:1px solid #33445f;border-radius:8px;color:#fff;background:transparent;display:flex;align-items:center;justify-content:center;gap:7px;font-size:8px;text-transform:uppercase;cursor:pointer}.documentArea{padding:19px}.sectionHead h2{font-size:22px}.orderPanel{border-radius:13px}}
        @media(max-width:520px){.mobilePortal{display:none}.hero{min-height:286px;padding:26px 18px 57px}.hero h1{font-size:31px;letter-spacing:-1.2px}.hero p{max-width:330px}.heroTags>span:last-child{display:none}.metrics{grid-template-columns:1fr 1fr;margin-left:5px;margin-right:5px}.metric{min-height:115px;padding:12px}.metricTop{font-size:8px}.metricTop small{display:none}.metric strong{font-size:29px}.metricLink{font-size:7px}.performance{margin-left:5px;margin-right:5px}.performanceStat strong{font-size:22px}.sectionHead{align-items:center}.exportButton{width:38px;padding:0;justify-content:center;font-size:0}.filters button{padding:8px 10px}.documentHead{align-items:start;flex-direction:column;gap:6px}.panelFoot span:last-child{display:none}.toast{left:15px;right:15px;bottom:15px;max-width:none}}
        @media(max-width:1100px){.documentHub{grid-template-columns:1fr}.documentCategories{grid-template-columns:repeat(5,1fr)}.categoryCard{min-height:145px}.recentDocuments{display:none}.orderTimeline{overflow-x:auto;grid-template-columns:repeat(5,minmax(145px,1fr))}}
        @media(max-width:850px){.mobileBrand{display:flex}.content{padding-bottom:105px}.documentsSection{padding-top:44px}.documentCategories{grid-template-columns:repeat(2,1fr)}.documentsHead{align-items:flex-start}.documentsHead p{max-width:260px}.documentTotal{padding:8px 10px}.orderTimeline{grid-template-columns:1fr;gap:0;padding:10px 12px;overflow:visible}.timelineStep{min-height:44px}.timelineStep:not(:last-child):after{left:11px;right:auto;top:27px;bottom:-5px;width:1px;height:auto}.timelineText{background:#101828}.mobileDetail .timelineText{background:#101828}.mobileNav{position:fixed;display:grid;grid-template-columns:repeat(3,1fr);left:12px;right:12px;bottom:10px;height:61px;z-index:80;background:rgba(16,24,40,.95);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:5px;box-shadow:0 14px 40px rgba(16,24,40,.3)}.mobileNav button{border:0;border-radius:11px;background:transparent;color:#7f8da2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:7px;cursor:pointer}.mobileNav button.active{background:#22304a;color:#fff}.mobileNav button.active svg{color:#8bb4ff}.toast{bottom:82px}}
        @media(max-width:520px){.documentCategories{grid-template-columns:1fr 1fr}.categoryCard{min-height:139px;padding:13px}.documentsHead{flex-direction:column;align-items:flex-start}.documentTotal{margin-top:4px}.documentHub{gap:10px}}
      `}</style>
    </div>
  );
}

function SortHeader({ label, field, current, direction, onSort }: { label: string; field: SortField; current: SortField; direction: SortDirection; onSort: (field: SortField) => void }) {
  return <th><button className="sortButton" onClick={() => onSort(field)}>{label}<span className={current === field ? "visible" : ""}>{direction === "asc" ? "↑" : "↓"}</span></button></th>;
}

type OrderViewProps = {
  order: Order; open: boolean; files: OrderFile[]; uploading: string;
  formatDate: (value: string | null) => string; formatPrice: (value: Order["price"]) => string;
  onToggle: (id: number) => void; onEmail: (order: Order) => void;
  onUpload: (id: number, type: FileType, file: File) => void;
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "neutral" };
  return <span className={`status ${meta.tone}`}>{meta.label}</span>;
}

function OrderTimeline({ order, formatDate }: { order: Order; formatDate: (value: string | null) => string }) {
  const currentIndex = Math.max(0, ORDER_STEPS.indexOf(order.status));
  const dates: Record<string, string | null> = {
    "Quote sent": order.quote_sent_at,
    Ordered: order.ordered_at,
    "In production": null,
    "QC inspection": null,
    Delivered: order.delivered_at,
  };

  return <div className="orderTimeline" aria-label={`Progress for order ${order.order_id}`}>{ORDER_STEPS.map((step, index) => {
    const complete = index < currentIndex || order.status === "Delivered";
    const current = index === currentIndex && order.status !== "Delivered";
    return <div className={`timelineStep ${complete ? "complete" : ""} ${current ? "current" : ""}`} key={step}><span className="timelineMarker">{complete ? <Icon name="check" size={11} /> : index + 1}</span><span className="timelineText"><strong>{step}</strong><small>{dates[step] ? formatDate(dates[step]) : current ? "Current stage" : complete ? "Completed" : "Upcoming"}</small></span></div>;
  })}</div>;
}

function Documents({ orderId, files, uploading, onUpload }: Pick<OrderViewProps, "files" | "uploading" | "onUpload"> & { orderId: number }) {
  return <div className="documents">{FILE_TYPES.map((type) => {
    const versions = files.filter((file) => file.type === type.key);
    const uploadKey = `${orderId}-${type.key}`;
    return <div className="document" key={type.key}><div className="documentTitle"><span className="docCode">{type.short}</span><span><strong>{type.label}</strong><small>{versions.length ? `${versions.length} version${versions.length === 1 ? "" : "s"}` : "No files yet"}</small></span></div><div className="documentActions"><label className={`uploadButton ${uploading === uploadKey ? "busy" : ""}`}><Icon name="upload" size={13} />{uploading === uploadKey ? "Uploading" : "Upload"}<input type="file" accept="application/pdf,.pdf" hidden disabled={uploading === uploadKey} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(orderId, type.key, file); event.currentTarget.value = ""; }} /></label>{versions.length > 0 && <details className="downloadMenu"><summary className="downloadButton"><Icon name="download" size={13} />Download</summary><div className="downloadList">{[...versions].reverse().map((file, index) => <a key={file.id ?? file.file_url} href={file.file_url} target="_blank" rel="noreferrer"><strong>Version {versions.length - index}</strong><span>{file.file_name}</span></a>)}</div></details>}</div></div>;
  })}</div>;
}

function OrderRows(props: OrderViewProps) {
  const { order, open, files, uploading, formatDate, formatPrice, onToggle, onEmail, onUpload } = props;
  return <Fragment><tr className={`dataRow ${isOverdue(order) ? "attention" : ""}`} onClick={() => void onToggle(order.order_id)} aria-expanded={open}><td><span className={`chevron ${open ? "open" : ""}`}><Icon name="chevron" size={15} /></span></td><td className="orderId">#{order.order_id}</td><td><StatusBadge status={order.status} /></td><td className="customerPo">{order.customer_order_no ?? "—"}</td><td className="price">{formatPrice(order.price)}</td><td>{formatDate(order.quote_sent_at)}</td><td>{formatDate(order.ordered_at)}</td><td>{formatDate(order.estimated_delivery_at)}</td><td>{formatDate(order.delivered_at)}</td><td className="contactCell"><button className="mailButton" onClick={(event) => { event.stopPropagation(); onEmail(order); }} aria-label={`Contact INDEVO about order ${order.order_id}`}><Icon name="mail" size={15} /></button></td></tr>{open && <tr className="detailRow"><td colSpan={10}><div className="documentArea"><div className="documentHead"><div><span className="eyebrow">Order #{order.order_id}</span><h3>Order workspace</h3></div><span>LIVE STATUS · PDF VERSION CONTROL</span></div><OrderTimeline order={order} formatDate={formatDate} /><Documents orderId={order.order_id} files={files} uploading={uploading} onUpload={onUpload} /></div></td></tr>}</Fragment>;
}

function MobileOrder(props: OrderViewProps) {
  const { order, open, files, uploading, formatDate, formatPrice, onToggle, onEmail, onUpload } = props;
  return <article className="mobileOrder"><button className="mobileOrderButton" onClick={() => void onToggle(order.order_id)} aria-expanded={open}><div><div className="mobileOrderTitle"><strong>#{order.order_id}</strong><StatusBadge status={order.status} /></div><div className="mobileGrid"><span><small>Customer PO</small>{order.customer_order_no ?? "—"}</span><span><small>Value</small>{formatPrice(order.price)}</span><span><small>Quote sent</small>{formatDate(order.quote_sent_at)}</span><span><small>Ordered</small>{formatDate(order.ordered_at)}</span><span><small>Est. delivery</small>{formatDate(order.estimated_delivery_at)}</span><span><small>Delivered</small>{formatDate(order.delivered_at)}</span></div></div><span className="mobileSide"><span className={`chevron ${open ? "open" : ""}`}><Icon name="chevron" size={16} /></span>{isOverdue(order) && <small>OVERDUE</small>}</span></button>{open && <div className="mobileDetail"><OrderTimeline order={order} formatDate={formatDate} /><Documents orderId={order.order_id} files={files} uploading={uploading} onUpload={onUpload} /><button className="mobileContact" onClick={() => onEmail(order)}><Icon name="mail" size={14} />Ask about this order</button></div>}</article>;
}
