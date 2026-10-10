import React, { useEffect, useState, useRef, useCallback } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import EChartPie from "../config/EChartPie";
import "./dashboard.css";
import { API, Config, Method, Navbar } from "../config/Init.js";
import "react-day-picker/dist/style.css";
import { CustomDateRangePicker } from "../config/Methods";

const useIntersectionObserver = (options) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
      }
    }, options);

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [options]);

  return [targetRef, isIntersecting];
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

  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);

  return { from, to };
};

const RevenueTrendChart = ({ data }) => {
  const [hoveredDataKey, setHoveredDataKey] = useState(null);
  const [hiddenDataKeys, setHiddenDataKeys] = useState({ revenue: false, orders: false });

  const handleLegendMouseEnter = (o) => setHoveredDataKey(o.dataKey);
  const handleLegendMouseLeave = () => setHoveredDataKey(null);
  const handleLegendClick = (o) => setHiddenDataKeys(prev => ({ ...prev, [o.dataKey]: !prev[o.dataKey] }));

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <ul style={{ listStyle: "none", display: "flex", justifyContent: "center", padding: 0, margin: 0, marginTop: 15 }}>
        {payload.map((entry, index) => {
          const isHidden = hiddenDataKeys[entry.dataKey];
          const isHovered = hoveredDataKey === entry.dataKey;
          return (
            <li
              key={`item-${index}`}
              style={{
                display: "flex", alignItems: "center", marginRight: 20, cursor: "pointer",
                opacity: isHidden ? 0.4 : 1,
                color: "#bdeedd", fontWeight: 600, fontSize: 13,
                transition: "opacity 0.2s"
              }}
              onMouseEnter={() => handleLegendMouseEnter(entry)}
              onMouseLeave={handleLegendMouseLeave}
              onClick={() => handleLegendClick(entry)}
            >
              <span style={{
                display: "inline-block", width: 12, height: 12, borderRadius: "50%", marginRight: 8,
                backgroundColor: isHidden ? "#666" : entry.color,
                boxShadow: isHovered && !isHidden ? `0 0 8px ${entry.color}` : "none",
                transition: "background-color 0.3s, box-shadow 0.3s"
              }}></span>
              {entry.value}
            </li>
          );
        })}
      </ul>
    );
  };

  const revenueOpacity = hoveredDataKey === "orders" ? 0.1 : 1;
  const ordersOpacity = hoveredDataKey === "revenue" ? 0.1 : 1;

  const chartData = React.useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      ...item,
      revenue: hiddenDataKeys.revenue ? 0 : item.revenue,
      orders: hiddenDataKeys.orders ? 0 : item.orders
    }));
  }, [data, hiddenDataKeys]);

  const shouldRotate = chartData.length > 7;

  return (
    <ResponsiveContainer width="100%" height={shouldRotate ? 350 : 320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: shouldRotate ? 10 : 0 }}>
        <defs>
          <linearGradient id="mcRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={Config.themeColors[0]} stopOpacity={0.45} />
            <stop offset="95%" stopColor={Config.themeColors[0]} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="mcOrdersGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={Config.themeColors[1]} stopOpacity={0.45} />
            <stop offset="95%" stopColor={Config.themeColors[1]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 217, 168, 0.14)" />
        <XAxis
          dataKey="label"
          stroke="#bdeedd"
          interval={0}
          angle={shouldRotate ? -45 : 0}
          textAnchor={shouldRotate ? "end" : "middle"}
          height={shouldRotate ? 65 : 30}
          tick={{ fill: "#bdeedd", fontSize: shouldRotate ? (chartData.length > 20 ? 10 : 11) : 12 }}
          dx={shouldRotate ? -4 : 0}
          dy={shouldRotate ? 4 : 0}
        />
        <YAxis yAxisId="left" stroke="#bdeedd" />
        <YAxis yAxisId="right" orientation="right" stroke={Config.themeColors[1]} />
        <Tooltip
          contentStyle={{ background: "#11211c", border: "1px solid #47d9a8", borderRadius: 8 }}
        />
        <Legend content={renderLegend} verticalAlign="bottom" />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={Config.themeColors[0]}
          fill="url(#mcRevenueGradient)"
          strokeWidth={2.5}
          activeDot={hiddenDataKeys.revenue ? false : { r: 6 }}
          style={{ opacity: revenueOpacity, transition: 'opacity 2s ease' }}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          name="Orders"
          stroke={Config.themeColors[1]}
          fill="url(#mcOrdersGradient)"
          strokeWidth={2.5}
          activeDot={hiddenDataKeys.orders ? false : { r: 6 }}
          style={{ opacity: ordersOpacity, transition: 'opacity 2s ease' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const RevenueTrendTable = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const totalOrders = data.reduce((acc, curr) => acc + (Number(curr.orders) || 0), 0);
  const totalRevenue = data.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);

  return (
    <div className="mc-table-wrap">
      <table className="mc-table">
        <thead>
          <tr>
            <th>Date / Period</th>
            <th style={{ textAlign: "right" }}>Orders</th>
            <th style={{ textAlign: "right" }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td style={{ color: "#edf9f5", fontWeight: 500 }}>{row.date || row.label || row.name}</td>
              <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 600 }}>
                {Number(row.orders || 0).toLocaleString('en-IN')}
              </td>
              <td style={{ textAlign: "right", color: "#d6f6ed", fontWeight: 600 }}>
                ₹{Number(row.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="mc-table-total-row">
            <td style={{ color: "#47d9a8", fontWeight: 700 }}>Total</td>
            <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>
              {totalOrders.toLocaleString('en-IN')}
            </td>
            <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const PaymentMethodTable = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const filteredData = data.filter(item => item.value > 0 && item.name?.toLowerCase() !== "other");
  const totalCount = filteredData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  return (
    <div className="mc-table-wrap">
      <table className="mc-table">
        <thead>
          <tr>
            <th>Payment Method</th>
            <th style={{ textAlign: "right" }}>Orders</th>
            <th style={{ textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, idx) => {
            const percentage = totalCount > 0 ? ((row.value / totalCount) * 100).toFixed(1) : "0.0";
            return (
              <tr key={idx}>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: Config.themeColors[idx % Config.themeColors.length]
                      }}
                    />
                    <span style={{ color: "#edf9f5", fontWeight: 500 }}>{row.name}</span>
                  </span>
                </td>
                <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 600 }}>
                  {Number(row.value || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ textAlign: "right", color: "#d6f6ed" }}>
                  {percentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="mc-table-total-row">
            <td style={{ color: "#47d9a8", fontWeight: 700 }}>Total</td>
            <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>
              {totalCount.toLocaleString('en-IN')}
            </td>
            <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>100.0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const ServiceTypeTable = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const totalCount = data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  return (
    <div className="mc-table-wrap">
      <table className="mc-table">
        <thead>
          <tr>
            <th>Service Type</th>
            <th style={{ textAlign: "right" }}>Orders</th>
            <th style={{ textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const percentage = totalCount > 0 ? ((row.value / totalCount) * 100).toFixed(1) : "0.0";
            return (
              <tr key={idx}>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: Config.themeColors[idx % Config.themeColors.length]
                      }}
                    />
                    <span style={{ color: "#edf9f5", fontWeight: 500 }}>{row.name}</span>
                  </span>
                </td>
                <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 600 }}>
                  {Number(row.value || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ textAlign: "right", color: "#d6f6ed" }}>
                  {percentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="mc-table-total-row">
            <td style={{ color: "#47d9a8", fontWeight: 700 }}>Total</td>
            <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>
              {totalCount.toLocaleString('en-IN')}
            </td>
            <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>100.0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const TopSellingItemsTable = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="mc-table-wrap">
      <table className="mc-table">
        <thead>
          <tr>
            <th style={{ width: "50px" }}>Rank</th>
            <th>Item Name</th>
            <th style={{ textAlign: "right" }}>Orders Sold</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: idx < 3 ? "rgba(71, 217, 168, 0.25)" : "rgba(255, 255, 255, 0.06)",
                    color: idx < 3 ? "#47d9a8" : "#aaa",
                    fontWeight: 700,
                    fontSize: "12px",
                    border: idx < 3 ? "1px solid rgba(71, 217, 168, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                >
                  {idx + 1}
                </span>
              </td>
              <td style={{ fontWeight: 600, color: "#edf9f5" }}>{row.name}</td>
              <td style={{ textAlign: "right", color: "#47d9a8", fontWeight: 700 }}>
                {Number(row.orders || row.value || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ChartCard = ({ title, globalTimeRangeKey, globalDateRange, apiMethod, renderContent, renderTable, globalRefreshTrigger }) => {
  const [ref, isIntersecting] = useIntersectionObserver({ rootMargin: "200px", threshold: 0.1 });
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Default to table on mobile (width <= 768), chart on desktop
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth <= 768 ? "table" : "chart";
  });

  const [localTimeRange, setLocalTimeRange] = useState(globalTimeRangeKey);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [customRange, setCustomRange] = useState({ from: undefined, to: undefined });
  const [appliedRange, setAppliedRange] = useState(null);

  const fetchChartData = useCallback(async (rangeKey, customDateRange = null) => {
    setLoading(true);
    try {
      let range;
      if (rangeKey === "custom" && customDateRange?.from && customDateRange?.to) {
        range = { from: new Date(customDateRange.from), to: new Date(customDateRange.to) };
        range.from.setHours(0, 0, 0, 0);
        range.to.setHours(23, 59, 59, 999);
      } else {
        range = getDateRangeFromPreset(rangeKey);
      }

      setAppliedRange(range);

      const res = await API[apiMethod](range.from, range.to);
      if (res?.status === 200) {
        setData(res.data || res);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [apiMethod]);

  useEffect(() => {
    setLocalTimeRange(globalTimeRangeKey);
    if (globalTimeRangeKey === "custom" && globalDateRange) {
      setCustomRange(globalDateRange);
    }
  }, [globalTimeRangeKey, globalDateRange]);

  useEffect(() => {
    if (isIntersecting) {
      if (localTimeRange === "custom" && (!customRange.from || !customRange.to)) {
        return;
      }
      fetchChartData(localTimeRange, customRange);
    }
  }, [isIntersecting, localTimeRange, customRange, fetchChartData, globalRefreshTrigger]);

  const handleLocalRangeSelect = (val) => {
    setDropdownOpen(false);
    if (val === "custom") {
      setShowCalendar(true);
    } else {
      setLocalTimeRange(val);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mc-chart-panel" ref={ref}>
      <div className="mc-panel-title mc-chart-header">
        <div className="mc-chart-title-wrap">
          <span className="mc-chart-title-text">{title}</span>
          {appliedRange && appliedRange.from && appliedRange.to && (
            <div className="filter-chips mc-applied-chips">
              <div className="chip user-not-select mc-applied-chip">
                {Method.formatDatetoYYYYMMDD(appliedRange.from)} to {Method.formatDatetoYYYYMMDD(appliedRange.to)}
              </div>
            </div>
          )}
        </div>
        <div className="mc-chart-controls">
          {renderTable && (
            Method.tooltip(
              viewMode === "chart" ? "Switch to Table View" : "Switch to Chart View",
              <button
                className={`filter-btn mc-view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode(prev => prev === "chart" ? "table" : "chart")}
              >
                <span className="material-symbols-outlined main-color fs-22">
                  {viewMode === "chart" ? "table_chart" : "bar_chart"}
                </span>
              </button>
            )
          )}
          {Method.tooltip(
            "Refresh",
            <button className="filter-btn mc-refresh-btn" onClick={() => fetchChartData(localTimeRange, customRange)}>
              <span
                className="material-symbols-outlined main-color fs-25 m-3 rotate-45" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              >
                cached
              </span>
            </button>
          )}
          <div className="mc-range-filter" ref={dropdownRef}>
            <div
              className="custom-date-container"
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            >
              <span className="date-text">
                {Config.Time_Ranges.find(o => o.value === localTimeRange)?.label || "Select Time Range"}
              </span>
              <span
                className="material-symbols-outlined fs-20 arrow"
                style={{
                  transform: dropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                  transition: "transform 0.3s ease",
                  color: "#47d9a8",
                }}
              >
                keyboard_arrow_right
              </span>
            </div>
            <div className="mc-range-dropdown">
              {dropdownOpen &&
                Method.renderDropdownOptions({
                  options: Config.Time_Ranges,
                  activeValue: localTimeRange,
                  onSelect: handleLocalRangeSelect,
                })}
            </div>
            {showCalendar && (
              <CustomDateRangePicker
                customRange={customRange}
                setCustomRange={setCustomRange}
                calendarMonth={calendarMonth}
                setCalendarMonth={setCalendarMonth}
                onRangeComplete={(newRange) => {
                  setLocalTimeRange("custom");
                  setShowCalendar(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="mc-chart-content" style={{ minHeight: "260px", position: "relative" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px", width: "100%" }}>
            {Method.showLoader()}
          </div>
        ) : data && (!Array.isArray(data) || data.length > 0) ? (
          viewMode === "table" && renderTable ? (
            renderTable(data)
          ) : (
            renderContent(data)
          )
        ) : hasFetched ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px", width: "100%" }}>
            {Method.noDataFound(Config.nodatafoundimg, "")}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px", width: "100%" }}>
            <span style={{ color: "#777" }}>Scroll to load...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const rangeRef = useRef(null);
  const [timeRange, setTimeRange] = useState("this_week");
  const [timeRangeDropdownOpen, setTimeRangeDropdownOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => getDateRangeFromPreset("this_week"));
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [customRange, setCustomRange] = useState({ from: undefined, to: undefined });

  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalorders: 0, revenue: 0, penddingorders: 0, completedorders: 0, cancelledorders: 0, totalcustomer: 0
  });

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await API.DashboardCount(dateRange.from, dateRange.to);
      if (res?.status === 200) {
        setMetrics(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMetricsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target)) {
        setTimeRangeDropdownOpen(false);
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeRangeSelect = (value) => {
    setTimeRangeDropdownOpen(false);
    if (value === "custom") {
      setShowCalendar(true);
    } else {
      setTimeRange(value);
      setDateRange(getDateRangeFromPreset(value));
    }
  };

  const avgOrderValue = metrics.totalorders ? metrics.revenue / metrics.totalorders : 0;
  const completionRate = metrics.totalorders ? (metrics.completedorders / metrics.totalorders) * 100 : 0;

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
            {Method.tooltip(
              "Refresh All",
              <button className="filter-btn" onClick={() => { fetchMetrics(); setGlobalRefreshTrigger(prev => prev + 1); }}>
                <span
                  className="material-symbols-outlined main-color fs-25 m-3 rotate-45" style={{ animation: metricsLoading ? "spin 1s linear infinite" : "none" }}

                >
                  cached
                </span>
              </button>
            )}
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
              {showCalendar && (
                <CustomDateRangePicker
                  customRange={customRange}
                  setCustomRange={setCustomRange}
                  calendarMonth={calendarMonth}
                  setCalendarMonth={setCalendarMonth}
                  onRangeComplete={(newRange) => {
                    setTimeRange("custom");
                    setDateRange(newRange);
                    setShowCalendar(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {metricsLoading && metrics.totalorders === 0 ? (
          <div className="mc-dashboard-loading">{Method.showLoader()}</div>
        ) : (
          <>
            <div className="mc-kpi-grid">
              <div className="mc-kpi-card">
                <div className="mc-kpi-icon-wrap"><span className="material-symbols-outlined fs-24">receipt_long</span></div>
                <div className="mc-kpi-info">
                  <span>Total Orders</span>
                  <strong>{parseFloat(metrics.totalorders).toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <div className="mc-kpi-card">
                <div className="mc-kpi-icon-wrap"><span className="material-symbols-outlined fs-24">attach_money</span></div>
                <div className="mc-kpi-info">
                  <span>Revenue</span>
                  <strong>₹{parseFloat(metrics.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>
              <div className="mc-kpi-card">
                <div className="mc-kpi-icon-wrap"><span className="material-symbols-outlined fs-24">trending_up</span></div>
                <div className="mc-kpi-info">
                  <span>Avg Order Value</span>
                  <strong>₹{parseFloat(avgOrderValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>
              <div className="mc-kpi-card">
                <div className="mc-kpi-icon-wrap"><span className="material-symbols-outlined fs-24">group</span></div>
                <div className="mc-kpi-info">
                  <span>Active Customers</span>
                  <strong>{parseFloat(metrics.totalcustomer).toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <div className="mc-kpi-card">
                <div className="mc-kpi-icon-wrap"><span className="material-symbols-outlined fs-24">task_alt</span></div>
                <div className="mc-kpi-info">
                  <span>Completion Rate</span>
                  <strong>{completionRate.toFixed(1)}%</strong>
                </div>
              </div>
            </div>

            <div className="mc-grid-1">
              <ChartCard
                title="Revenue Trend"
                globalTimeRangeKey={timeRange}
                globalDateRange={dateRange}
                globalRefreshTrigger={globalRefreshTrigger}
                apiMethod="DashboardRevenueTrend"
                renderContent={(data) => <RevenueTrendChart data={data} />}
                renderTable={(data) => <RevenueTrendTable data={data} />}
              />
            </div>

            <div className="mc-grid-2">
              <ChartCard
                title="Payment Method"
                globalTimeRangeKey={timeRange}
                globalDateRange={dateRange}
                globalRefreshTrigger={globalRefreshTrigger}
                apiMethod="DashboardPaymentMethod"
                renderContent={(data) => (
                  <div style={{ height: "260px", width: "100%" }}>
                    <EChartPie data={data} />
                  </div>
                )}
                renderTable={(data) => <PaymentMethodTable data={data} />}
              />

              <ChartCard
                title="Service Type Split"
                globalTimeRangeKey={timeRange}
                globalDateRange={dateRange}
                globalRefreshTrigger={globalRefreshTrigger}
                apiMethod="DashboardServiceType"
                renderTable={(data) => <ServiceTypeTable data={data} />}
                renderContent={(data) => (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 217, 168, 0.14)" />
                      <XAxis dataKey="name" stroke="#bdeedd" />
                      <YAxis stroke="#bdeedd" />
                      <Tooltip
                        cursor={{ fill: "rgba(71, 217, 168, 0.07)" }}
                        contentStyle={{
                          background: "rgba(17, 33, 28, 0.95)",
                          border: "1px solid rgba(71, 217, 168, 0.3)",
                          borderRadius: 12,
                          padding: "10px 15px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                          backdropFilter: "blur(8px)",
                        }}
                        labelStyle={{ color: "#47d9a8", fontWeight: 700, marginBottom: 4 }}
                        itemStyle={{ color: "#bdeedd", fontWeight: 600 }}
                        formatter={(value, name) => [value, "Count"]}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {data.map((entry, index) => {
                          const hex = Config.themeColors[index % Config.themeColors.length];
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={`rgba(${r}, ${g}, ${b}, 0.3)`}
                              stroke={hex}
                              strokeWidth={2}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              />
            </div>

            <div className="mc-grid-2">
              <ChartCard
                title="Top Selling Items"
                globalTimeRangeKey={timeRange}
                globalDateRange={dateRange}
                globalRefreshTrigger={globalRefreshTrigger}
                apiMethod="DashboardTopItems"
                renderTable={(data) => <TopSellingItemsTable data={data} />}
                renderContent={(data) => (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 217, 168, 0.14)" />
                      <XAxis type="number" stroke="#bdeedd" />
                      <YAxis dataKey="name" type="category" stroke="#bdeedd" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip
                        cursor={{ fill: "rgba(71, 217, 168, 0.07)" }}
                        contentStyle={{
                          background: "rgba(17, 33, 28, 0.95)",
                          border: "1px solid rgba(71, 217, 168, 0.3)",
                          borderRadius: 12,
                          padding: "10px 15px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                          backdropFilter: "blur(8px)",
                        }}
                        labelStyle={{ color: "#47d9a8", fontWeight: 700, marginBottom: 4 }}
                        itemStyle={{ color: "#bdeedd", fontWeight: 600 }}
                        formatter={(value) => [value, "Orders Sold"]}
                      />
                      <Bar dataKey="orders" radius={[0, 8, 8, 0]}>
                        {data.map((entry, index) => {
                          const hex = Config.themeColors[index % Config.themeColors.length];
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return (
                            <Cell
                              key={`cell-top-${index}`}
                              fill={`rgba(${r}, ${g}, ${b}, 0.35)`}
                              stroke={hex}
                              strokeWidth={2}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              />

              <ChartCard
                title="Recent Orders"
                globalTimeRangeKey={timeRange}
                globalDateRange={dateRange}
                globalRefreshTrigger={globalRefreshTrigger}
                apiMethod="DashboardRecentOrders"
                renderContent={(data) => (
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
                        {data.map((order) => (
                          <tr key={order.id || order.orderNo}>
                            <td>{order.orderNo}</td>
                            <td>{order.customer}</td>
                            <td>Rs {(order.amount || 0).toFixed(2)}</td>
                            <td>
                              <span className={`mc-status mc-status-${(order.status || "").toLowerCase()}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
