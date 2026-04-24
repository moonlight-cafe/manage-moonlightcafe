import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EChartPie from "../config/EChartPie";

import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { API, Config, Method, Navbar } from "../config/Init.js";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractCreatedAt = (order) => {
  const raw =
    order?.createdat ||
    order?.created_at ||
    order?.createdon ||
    order?.createdAt ||
    order?.date;
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const normalizeOrders = (payload) => {
  const source = Array.isArray(payload) ? payload : payload?.data || [];
  return source.map((order) => {
    const createdAt = extractCreatedAt(order);
    const totalAmount = toNumber(order?.totalamount || order?.amount);

    let status = "Pending";
    if (Number(order?.adminstatus) === 2) status = "Completed";
    if (Number(order?.adminstatus) === 3) status = "Cancelled";

    const paymentMethod = Number(order?.paymentmethod);
    const serviceType = Number(order?.servicetype);

    return {
      id: order?._id || order?.orderid || order?.id || "",
      orderNo: order?.orderno || order?.orderid || order?._id || "-",
      customer:
        order?.customername || order?.name || order?.customer?.name || "Guest",
      customerId: order?.customerid || order?.customer?._id || "",
      createdAt,
      amount: totalAmount,
      paymentMethod,
      serviceType,
      status,
      lineItems: Array.isArray(order?.data) ? order.data : [],
    };
  });
};

const getDateRangeFromPreset = (value) => {
  const now = new Date();
  let from;
  let to;

  switch (value) {
    case "today":
      from = new Date();
      to = new Date();
      break;
    case "yesterday":
      from = new Date();
      from.setDate(from.getDate() - 1);
      to = new Date(from);
      break;
    case "this_week":
      from = new Date();
      from.setDate(from.getDate() - from.getDay());
      to = new Date();
      break;
    case "last_week":
      to = new Date();
      to.setDate(to.getDate() - to.getDay() - 1);
      from = new Date(to);
      from.setDate(to.getDate() - 6);
      break;
    case "last_7_days":
      to = new Date();
      from = new Date();
      from.setDate(from.getDate() - 6);
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
      break;
    case "last_month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "last_28_days":
      to = new Date();
      from = new Date();
      from.setDate(from.getDate() - 27);
      break;
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date();
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
      break;
  }

  return { from, to };
};

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#11211c"
        strokeWidth={3}
        style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.8))" }}
      />
    </g>
  );
};

const renderPieLabel = (props) => {
  const { x, y, cx, name } = props;
  return (
    <text x={x} y={y} fill="#bdeedd" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12}>
      {name}
    </text>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const rangeRef = useRef(null);
  const [timeRange, setTimeRange] = useState("this_month");
  const [timeRangeDropdownOpen, setTimeRangeDropdownOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => getDateRangeFromPreset("this_month"));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [totalDocs, setTotalDocs] = useState(0);
  const [activeOrderStatusIdx, setActiveOrderStatusIdx] = useState(-1);
  const [activePaymentIdx, setActivePaymentIdx] = useState(-1);

  const fetchAllOrders = useCallback(async () => {
    const pageLimit = 200;
    let page = 1;
    let hasNext = true;
    let aggregated = [];
    let totalFromApi = 0;

    while (hasNext) {
      const response = await API.ListPendingPayments(page, pageLimit, { _id: -1 }, {}, {}, "");
      if (response?.status !== 200) {
        return { status: response?.status || 500, message: response?.message || "Unable to load orders." };
      }

      const rows = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
      aggregated = [...aggregated, ...rows];
      totalFromApi = toNumber(response?.totaldocs);

      const nextPageFlag = toNumber(response?.nextpage) === 1;
      const reachedTotal = totalFromApi > 0 && aggregated.length >= totalFromApi;
      hasNext = nextPageFlag && !reachedTotal;
      page += 1;

      if (page > 100) break;
    }

    return { status: 200, data: aggregated, totaldocs: totalFromApi };
  }, []);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetchAllOrders();
      if (response?.status === 200) {
        setOrders(normalizeOrders(response?.data || []));
        setTotalDocs(toNumber(response?.totaldocs));
        setError("");
      } else {
        setOrders([]);
        setTotalDocs(0);
        setError(response?.message || "Unable to load dashboard data.");
      }
    } catch (fetchError) {
      setOrders([]);
      setTotalDocs(0);
      setError("Unable to load dashboard data.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [fetchAllOrders]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target)) {
        setTimeRangeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeRangeSelect = (value) => {
    setTimeRange(value);
    setDateRange(getDateRangeFromPreset(value));
    setTimeRangeDropdownOpen(false);
  };

  const filteredOrders = useMemo(() => {
    const hasRange = dateRange?.from && dateRange?.to;
    if (!hasRange) return orders;

    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      if (!order.createdAt) return false;
      return order.createdAt >= start && order.createdAt <= end;
    });
  }, [orders, dateRange]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completed = filteredOrders.filter((o) => o.status === "Completed").length;
    const pending = filteredOrders.filter((o) => o.status === "Pending").length;
    const cancelled = filteredOrders.filter((o) => o.status === "Cancelled").length;
    const revenue = filteredOrders.reduce((sum, o) => sum + o.amount, 0);

    const uniqueCustomerKeys = new Set(
      filteredOrders.map((o) => o.customerId || o.customer).filter(Boolean)
    );

    return {
      totalOrders,
      completed,
      pending,
      cancelled,
      revenue,
      avgOrderValue: totalOrders ? revenue / totalOrders : 0,
      activeCustomers: uniqueCustomerKeys.size,
      completionRate: totalOrders ? (completed / totalOrders) * 100 : 0,
    };
  }, [filteredOrders]);

  const revenueTrend = useMemo(() => {
    const map = new Map();
    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;
    const hasFullRange = Boolean(from && to);
    const diffDays = hasFullRange
      ? Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 30;

    const addPoint = (key, label, amount) => {
      const prev = map.get(key) || { key, label, revenue: 0, orders: 0 };
      prev.revenue += amount;
      prev.orders += 1;
      map.set(key, prev);
    };

    filteredOrders.forEach((order) => {
      if (!order.createdAt) return;
      const dt = order.createdAt;

      if (diffDays <= 1) {
        const hour = dt.getHours();
        const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${hour}`;
        addPoint(key, `${String(hour).padStart(2, "0")}:00`, order.amount);
        return;
      }

      if (diffDays >= 300) {
        const month = dt.getMonth();
        const key = `${dt.getFullYear()}-${month}`;
        const label = dt.toLocaleString("en-US", { month: "short", year: "2-digit" });
        addPoint(key, label, order.amount);
        return;
      }

      const dayKey = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      addPoint(dayKey, label, order.amount);
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredOrders, dateRange]);

  const orderStatusData = useMemo(
    () => [
      { name: "Completed", value: metrics.completed },
      { name: "Pending", value: metrics.pending },
      { name: "Cancelled", value: metrics.cancelled },
    ],
    [metrics]
  );

  const paymentData = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let other = 0;

    filteredOrders.forEach((order) => {
      if (order.paymentMethod === 1) cash += 1;
      else if (order.paymentMethod === 2) upi += 1;
      else other += 1;
    });

    return [
      { name: "Cash", value: cash },
      { name: "UPI", value: upi },
      { name: "Other", value: other },
    ];
  }, [filteredOrders]);

  const serviceTypeData = useMemo(() => {
    let dineIn = 0;
    let takeAway = 0;
    let other = 0;

    filteredOrders.forEach((order) => {
      if (order.serviceType === 1) dineIn += 1;
      else if (order.serviceType === 2) takeAway += 1;
      else other += 1;
    });

    return [
      { name: "Dine In", value: dineIn },
      { name: "Take Away", value: takeAway },
      { name: "Other", value: other },
    ];
  }, [filteredOrders]);

  const topItems = useMemo(() => {
    const itemMap = new Map();

    filteredOrders.forEach((order) => {
      order.lineItems.forEach((item) => {
        const key = item?.foodname || item?.name || "Unnamed Item";
        const qty = toNumber(item?.quantity || 1);
        const price = toNumber(item?.price);
        const revenue = qty * price;

        const existing = itemMap.get(key) || { name: key, orders: 0, revenue: 0 };
        existing.orders += qty;
        existing.revenue += revenue;
        itemMap.set(key, existing);
      });
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 6);
  }, [filteredOrders]);

  const recentOrders = useMemo(() => {
    return [...filteredOrders]
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 6);
  }, [filteredOrders]);

  return (
    <div className="dashboard user-not-select">
      <Navbar />
      <div className="dashboard-content mc-dashboard-shell">
        <div className="mc-dashboard-hero">
          <div>
            <h1 className="mc-dashboard-title">Moonlight Cafe</h1>
            <p className="mc-dashboard-subtitle">
              Live operational view for orders, revenue, payment mix, and item trends.
            </p>
          </div>

          <div className="mc-dashboard-actions">
            <div className="mc-range-filter" ref={rangeRef}>
              <div
                className="custom-date-container"
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeRangeDropdownOpen((p) => !p);
                }}
              >
                <span className="date-text">
                  {Config.Time_Ranges.find((o) => o.value === timeRange)?.label || "Select Time Range"}
                </span>
                <span
                  className="material-symbols-outlined fs-20 arrow"
                  style={{
                    transform: timeRangeDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                    transition: "transform 0.3s ease",
                    color: "#47d9a8",
                  }}
                >
                  keyboard_arrow_right
                </span>
              </div>
              <div className="mc-range-dropdown">
                {timeRangeDropdownOpen &&
                  Method.renderDropdownOptions({
                    options: Config.Time_Ranges,
                    activeValue: timeRange,
                    onSelect: handleTimeRangeSelect,
                  })}
              </div>
            </div>

            <button className="filter-btn" onClick={() => fetchDashboardData(true)}>
              <span
                className="material-symbols-outlined main-color fs-25 m-3 rotate-45"
                style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
              >
                cached
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mc-dashboard-loading">{Method.showLoader()}</div>
        ) : (
          <>
            {error ? <div className="mc-dashboard-error">{error}</div> : null}

            <div className="mc-kpi-grid">
              <div className="mc-kpi-card">
                <span>Total Orders</span>
                <strong>{totalDocs || orders.length}</strong>
              </div>
              <div className="mc-kpi-card">
                <span>Revenue</span>
                <strong>Rs {metrics.revenue.toFixed(2)}</strong>
              </div>
              <div className="mc-kpi-card">
                <span>Avg Order Value</span>
                <strong>Rs {metrics.avgOrderValue.toFixed(2)}</strong>
              </div>
              <div className="mc-kpi-card">
                <span>Active Customers</span>
                <strong>{metrics.activeCustomers}</strong>
              </div>
              <div className="mc-kpi-card">
                <span>Completion Rate</span>
                <strong>{metrics.completionRate.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="mc-chart-panel">
              <div className="mc-panel-title">Revenue Trend</div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="mcRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#47d9a8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#47d9a8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 217, 168, 0.14)" />
                  <XAxis dataKey="label" stroke="#bdeedd" />
                  <YAxis stroke="#bdeedd" />
                  <Tooltip
                    contentStyle={{
                      background: "#11211c",
                      border: "1px solid #47d9a8",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#47d9a8"
                    fill="url(#mcRevenueGradient)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mc-grid-2">
              <div className="mc-chart-panel">
                <div className="mc-panel-title">Order Status</div>
                <EChartPie data={orderStatusData} />
              </div>

              <div className="mc-chart-panel">
                <div className="mc-panel-title">Service Type Split</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={serviceTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 217, 168, 0.14)" />
                    <XAxis dataKey="name" stroke="#bdeedd" />
                    <YAxis stroke="#bdeedd" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#47d9a8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mc-grid-2">
              <div className="mc-chart-panel">
                <div className="mc-panel-title">Payment Method Mix</div>
                <EChartPie data={paymentData} />
              </div>

              <div className="mc-chart-panel">
                <div className="mc-panel-title">Quick Actions</div>
                <div className="mc-quick-actions">
                  <button className="mc-action-btn" onClick={() => navigate("/orders")}>Manage Orders</button>
                  <button className="mc-action-btn" onClick={() => navigate("/menu")}>Manage Menu</button>
                  <button className="mc-action-btn" onClick={() => navigate("/fooditems")}>Food Items</button>
                  <button className="mc-action-btn" onClick={() => navigate("/notifications")}>Notifications</button>
                </div>
              </div>
            </div>

            <div className="mc-grid-2">
              <div className="mc-chart-panel">
                <div className="mc-panel-title">Top Selling Items</div>
                <div className="mc-table-wrap">
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.length ? (
                        topItems.map((item) => (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.orders}</td>
                            <td>Rs {item.revenue.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="mc-empty-cell">No item data for this range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mc-chart-panel">
                <div className="mc-panel-title">Recent Orders</div>
                <div className="mc-table-wrap">
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length ? (
                        recentOrders.map((order) => (
                          <tr key={order.id || order.orderNo}>
                            <td>{order.orderNo}</td>
                            <td>{order.customer}</td>
                            <td>Rs {order.amount.toFixed(2)}</td>
                            <td>
                              <span className={`mc-status mc-status-${order.status.toLowerCase()}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="mc-empty-cell">No orders in this range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
