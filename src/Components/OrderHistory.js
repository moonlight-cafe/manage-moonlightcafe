import React, { useEffect, useRef, useState } from 'react';
import './OrderHistory.css';
import { useLocation, useNavigate } from "react-router-dom";
import "react-day-picker/dist/style.css";
import { Method, Navbar, API, Config } from "../config/Init.js"

const OrderHistory = () => {
        const location = useLocation();
        const navigate = useNavigate();
        const [orders, setOrders] = useState([]);
        const [selectedOrder, setSelectedOrder] = useState(null);
        const [showModal, setShowModal] = useState(false);
        const [isAnimatingOut, setIsAnimatingOut] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const popupTimer = useRef(null);
        const [loading, setLoading] = useState(false);
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [searchText, setSearchText] = useState("");
        const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
        const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
        const [isInitialLoad, setIsInitialLoad] = useState(true); // NEW: Track initial load

        const serviceDropdownRef = useRef(null);
        const paymentDropdownRef = useRef(null);
        const calendarRef = useRef(null);

        const [tempFilters, setTempFilters] = useState({
                servicetype: "",
                paymentmode: ""
        });

        const [filters, setFilters] = useState({});
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);

        const [showCalendar, setShowCalendar] = useState(false);
        const [dateRange, setDateRange] = useState({
                from: undefined,
                to: undefined
        });
        const [currentMonth, setCurrentMonth] = useState(new Date());

        const renderDateCard = (date) => {
                return date.toLocaleDateString("en-CA"); // YYYY-MM-DD
        };

        // Close dropdowns on outside click
        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (
                                serviceDropdownRef.current &&
                                !serviceDropdownRef.current.contains(e.target)
                        ) {
                                setServiceDropdownOpen(false);
                        }

                        if (
                                paymentDropdownRef.current &&
                                !paymentDropdownRef.current.contains(e.target)
                        ) {
                                setPaymentDropdownOpen(false);
                        }

                        // Close calendar on outside click with specific logic
                        if (
                                calendarRef.current &&
                                !calendarRef.current.contains(e.target) &&
                                showCalendar
                        ) {
                                // If only start date is selected (not complete range), reset the date
                                if (dateRange.from && !dateRange.to) {
                                        setDateRange({ from: undefined, to: undefined });
                                }
                                setShowCalendar(false);
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [showCalendar, dateRange]);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        setPage(1);
                        fetchOrders(1, true, { _id: -1 }, filters, {}, searchText.trim());
                }
        };

        // Clear search effect - MODIFIED to prevent initial load trigger
        useEffect(() => {
                if (!isInitialLoad && searchText.trim() === "") {
                        setPage(1);
                        fetchOrders(1, true, { _id: -1 }, filters, {}, "");
                }
        }, [searchText, isInitialLoad]);

        const showPopup = (message, type = "error") => {
                Method.showPopup(setPopup, popupTimer, message, type);
        };

        const fetchOrders = async (pageno = page, reset = false, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") => {
                if (loading) return;
                try {
                        setLoading(true);
                        console.log("🚀 ~ OrderHistory.js:108 ~ fetchOrders ~ filter>>", filter);
                        const response = await API.ListPendingPayments(pageno, 20, sort, filter, projection, searchtext);

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setOrders(items);
                                } else {
                                        setOrders((prev) => [...prev, ...items]);
                                }

                                setPage(pageno);

                                if (data.nextpage !== undefined) {
                                        setHasNextPage(data.nextpage === 1);
                                } else if (data.totalPages !== undefined) {
                                        setHasNextPage(pageno < data.totalPages);
                                } else {
                                        setHasNextPage(items.length === 20);
                                }
                        } else {
                                showPopup(response.message || "Failed to fetch orders");
                        }
                } catch (error) {
                        console.error("Error fetching orders", error);
                        showPopup("Server error while fetching orders");
                } finally {
                        setLoading(false);
                }
        };

        // MODIFIED: Initial load with location state - single API call
        useEffect(() => {
                const initialFilters = {};

                // Check if there's location state
                if (location.state) {
                        const { id, customername, orderid } = location.state;

                        if (id) {
                                initialFilters.customerid = id;
                                initialFilters.customername = customername;
                        }
                        if (orderid) {
                                initialFilters._id = orderid;
                        }

                        // Clear location state
                        navigate(location.pathname, { replace: true, state: null });
                }

                // Set filters first
                setFilters(initialFilters);

                // Make single API call with proper filters
                fetchOrders(1, true, { _id: -1 }, initialFilters, {}, "");

                // Mark initial load as complete
                setIsInitialLoad(false);
        }, []); // Empty dependency array - only run once on mount

        const applyFilters = () => {
                const filter = {};

                if (tempFilters.paymentmode) {
                        filter.paymentmethod = Number(tempFilters.paymentmode);
                }

                if (tempFilters.servicetype) {
                        filter.servicetype = Number(tempFilters.servicetype);
                }

                if (dateRange.from && dateRange.to) {
                        filter.fromdate = Method.formatDatetoYYYYMMDD(dateRange.from);
                        filter.todate = Method.formatDatetoYYYYMMDD(dateRange.to);
                } else if (dateRange.from || dateRange.to) {
                        showPopup("Please select complete date range", "error");
                        return;
                }

                // Preserve customer filter if it exists
                if (filters.customerid) {
                        filter.customerid = filters.customerid;
                        filter.customername = filters.customername;
                }

                setIsSidebarOpen(false);
                setFilters(filter);
                setPage(1);
                fetchOrders(1, true, { _id: -1 }, filter, {}, searchText.trim());
        };

        const removeFilterChip = (type) => {
                const updatedFilters = { ...filters };

                if (type === "paymentmethod") {
                        delete updatedFilters.paymentmethod;
                        setTempFilters((prev) => ({ ...prev, paymentmode: "" }));
                }

                if (type === "servicetype") {
                        delete updatedFilters.servicetype;
                        setTempFilters((prev) => ({ ...prev, servicetype: "" }));
                }

                if (type === "date") {
                        delete updatedFilters.fromdate;
                        delete updatedFilters.todate;
                        setDateRange({ from: undefined, to: undefined });
                }

                if (type === "customer") {
                        delete updatedFilters.customerid;
                        delete updatedFilters.customername;
                }

                setFilters(updatedFilters);
                setPage(1);
                fetchOrders(1, true, { _id: -1 }, updatedFilters, {}, searchText.trim());
        };

        const clearAllFilters = () => {
                setTempFilters({ servicetype: "", paymentmode: "" });
                setDateRange({ from: undefined, to: undefined });
                setFilters({});
                setSearchText("");
                setIsSidebarOpen(false);
                setPage(1);
                fetchOrders(1, true);
        };

        // MODIFIED: Scroll handler with better dependency management
        useEffect(() => {
                // Don't attach scroll listener until after initial load
                if (isInitialLoad) return;

                const tableWrapper = document.querySelector('.common-table-wrapper');

                const handleScroll = () => {
                        if (!tableWrapper) return;

                        const { scrollTop, scrollHeight, clientHeight } = tableWrapper;
                        if (scrollTop + clientHeight >= scrollHeight - 10 && hasNextPage && !loading) {
                                fetchOrders(page + 1, false, { _id: -1 }, filters, {}, searchText.trim());
                        }
                };

                if (tableWrapper) {
                        tableWrapper.addEventListener('scroll', handleScroll);
                        return () => tableWrapper.removeEventListener('scroll', handleScroll);
                }
        }, [page, hasNextPage, loading, filters, searchText, isInitialLoad]);

        const handleCloseModal = () => {
                setIsAnimatingOut(true);
                setTimeout(() => {
                        setShowModal(false);
                        setSelectedOrder(null);
                        setIsAnimatingOut(false);
                }, 500);
        };

        const handleViewBill = () => {
                if (selectedOrder?.bill) {
                        window.open(selectedOrder.bill, "_blank");
                } else {
                        showPopup("Bill Not Found!", "error");
                }
        };

        const normalizeDate = (date) =>
                new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const handleGoToToday = () => {
                const today = normalizeDate(new Date());

                setDateRange({
                        from: undefined,
                        to: undefined,
                });

                setCurrentMonth(today);
        };

        const handleResetRange = () => {
                setDateRange({
                        from: undefined,
                        to: undefined,
                });
        };

        const handleDateSelect = (range) => {
                if (!range?.from) {
                        setDateRange({ from: undefined, to: undefined });
                        return;
                }

                const from = normalizeDate(range.from);
                const to = range.to ? normalizeDate(range.to) : undefined;

                // If both start and end dates are already selected, start a new selection
                if (dateRange.from && dateRange.to) {
                        setDateRange({ from, to: undefined });
                        return;
                }

                // If from and to are the same day, reset the end
                if (from && to && from.getTime() === to.getTime()) {
                        setDateRange({ from, to: undefined });
                        return;
                }

                setDateRange({ from, to });

                setTimeout(() => setShowCalendar(false), 300);
        };

        const handleRefresh = () => {
                setSearchText("");
                setPage(1);
                fetchOrders(1, true, { _id: -1 }, filters, {}, "");
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">
                                                        <p className="common-tbl-title">Order History</p>
                                                </h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">search</span>
                                                                <input
                                                                        type="text"
                                                                        placeholder="Search"
                                                                        className="search-input"
                                                                        maxLength={50}
                                                                        value={searchText}
                                                                        onChange={(e) => setSearchText(e.target.value)}
                                                                        onKeyDown={handleSearchKeyPress}
                                                                />
                                                        </div>
                                                      {Method.tooltip(
                                                                "Refresh",
                                                                <button className="filter-btn" onClick={handleRefresh}>
                                                                        <span
                                                                                className="material-symbols-outlined main-color fs-25 m-3 rotate-45"
                                                                                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
                                                                        >
                                                                                cached
                                                                        </span>
                                                                </button>
                                                        )}
                                                        <button className="filter-btn" onClick={() => setIsSidebarOpen(true)} disabled={loading}>
                                                                <span className="material-symbols-outlined main-color fs-25 m-3">filter_alt</span>
                                                        </button>
                                                </div>
                                        </div>

                                        {/* ==== FILTER CHIPS ==== */}
                                        {(filters.paymentmethod || filters.servicetype || filters.fromdate || filters.customerid) && (
                                                <div className="filter-chips">
                                                        {filters.paymentmethod && (
                                                                <div className="chip">
                                                                        {filters.paymentmethod === 1 ? "Cash" : "UPI"}
                                                                        <span
                                                                                className="material-symbols-outlined remove"
                                                                                onClick={() => removeFilterChip("paymentmethod")}
                                                                        >
                                                                                close
                                                                        </span>
                                                                </div>
                                                        )}

                                                        {filters.servicetype && (
                                                                <div className="chip">
                                                                        {Method.getServiceType(filters.servicetype)}
                                                                        <span
                                                                                className="material-symbols-outlined remove"
                                                                                onClick={() => removeFilterChip("servicetype")}
                                                                        >
                                                                                close
                                                                        </span>
                                                                </div>
                                                        )}

                                                        {filters.customerid && (
                                                                <div className="chip">
                                                                        Customer: {filters.customername || "Selected"}
                                                                        <span
                                                                                className="material-symbols-outlined remove"
                                                                                onClick={() => removeFilterChip("customer")}
                                                                        >
                                                                                close
                                                                        </span>
                                                                </div>
                                                        )}

                                                        {filters.fromdate && (
                                                                <div className="chip">
                                                                        {filters.fromdate} → {filters.todate}
                                                                        <span
                                                                                className="material-symbols-outlined remove"
                                                                                onClick={() => removeFilterChip("date")}
                                                                        >
                                                                                close
                                                                        </span>
                                                                </div>
                                                        )}
                                                </div>
                                        )}

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th">Order No</th>
                                                                                <th className="common-table-th">Service</th>
                                                                                <th className="common-table-th">Customer Name</th>
                                                                                <th className="common-table-th">Amount</th>
                                                                                <th className="common-table-th">Payment Method</th>
                                                                                <th className="common-table-th">Status</th>
                                                                                <th className="common-table-th">Date</th>
                                                                                <th className="common-table-th">Details</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && orders.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* Loading orders... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : orders.length > 0 ? (
                                                                                <>
                                                                                        {orders.map((order) => (
                                                                                                <tr key={order._id}>
                                                                                                        <td className="common-table-td">{order.orderno}</td>
                                                                                                        <td className="common-table-td">{Method.getServiceType(order.servicetype)}</td>
                                                                                                        <td className="common-table-td">{order.customername}</td>
                                                                                                        <td className="common-table-td">₹{order.totalamount}</td>
                                                                                                        {order.paymentmethod === 0 ? (
                                                                                                                <td className="common-table-td"><span className="pendingbatch">{order.paymentmode}</span></td>
                                                                                                        ) : (
                                                                                                                <td className="common-table-td">{order.paymentmode}</td>
                                                                                                        )}
                                                                                                        <td className="common-table-td">
                                                                                                                <span className={order.adminstatus === 2 ? "status-active" : order.adminstatus === 1 ? "status-pending" : "status-inactive"}>
                                                                                                                        {Method.getAdminStatus(order.adminstatus)}
                                                                                                                </span>
                                                                                                        </td>
                                                                                                        <td className="common-table-td">{Method.renderDateCard(order.createdAt)}</td>
                                                                                                        <td className="common-table-td">
                                                                                                                <button
                                                                                                                        className="actionbtn"
                                                                                                                        onClick={() => {
                                                                                                                                setSelectedOrder(order);
                                                                                                                                setShowModal(true);
                                                                                                                        }}
                                                                                                                >
                                                                                                                        {Method.tooltip(
                                                                                                                                "View Details",
                                                                                                                                <span className="material-symbols-outlined white fs-20">visibility</span>
                                                                                                                        )}
                                                                                                                </button>
                                                                                                        </td>
                                                                                                </tr>
                                                                                        ))}

                                                                                        {loading && (
                                                                                                <tr>
                                                                                                        <td className="common-table-td" colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                                                                                                                {/* Loading more orders... */}
                                                                                                                {Method.showLoader()}
                                                                                                        </td>
                                                                                                </tr>
                                                                                        )}
                                                                                </>
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* No orders found */}
                                                                                                {Method.noDataFound(Config.ordernotfoundimg)}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                </div>

                                {/* Modal */}
                                {showModal && selectedOrder && (
                                        <div className="modal-overlay user-not-select">
                                                <div className={`modal-content-select width-60 order-modal ${isAnimatingOut ? "fade-out" : ""}`}>
                                                        <button className="sidebar-close-btn" onClick={handleCloseModal}>
                                                                <span className="material-symbols-outlined fs-20">close</span>
                                                        </button>

                                                        <h3 className="modal-title mt-30">Order Details: {selectedOrder.orderno}</h3>

                                                        <div className="order-info">
                                                                <div className="order-info-item fs-18">
                                                                        <strong>Customer:</strong> {selectedOrder.customername}
                                                                </div>

                                                                <div className="order-info-item fs-18">
                                                                        <strong>Date:</strong> {Method.formatDate(selectedOrder.createdAt)}
                                                                </div>

                                                                <div className="order-info-item fs-18">
                                                                        <strong>Payment Mode:</strong> {selectedOrder.paymentmethod === 0 ? (
                                                                                <span className="pendingbatch fs-15">{selectedOrder.paymentmode}</span>
                                                                        ) : (
                                                                                selectedOrder.paymentmode
                                                                        )}
                                                                </div>
                                                        </div>

                                                        <div className="modal-table-container">
                                                                <div className="modal-table-wrapper">
                                                                        <table className="modal-table">
                                                                                <thead>
                                                                                        <tr>
                                                                                                <th>#</th>
                                                                                                <th>Item</th>
                                                                                                <th>Image</th>
                                                                                                <th>Qty</th>
                                                                                                <th>Price</th>
                                                                                        </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                        {selectedOrder.data.map((item, index) => (
                                                                                                <tr key={index}>
                                                                                                        <td>{index + 1}</td>
                                                                                                        <td>{item.foodname}</td>
                                                                                                        <td>
                                                                                                                <img src={item.imageurl} alt={item.foodname} className="food-img" />
                                                                                                        </td>
                                                                                                        <td>{item.quantity}</td>
                                                                                                        <td>₹{item.price}</td>
                                                                                                </tr>
                                                                                        ))}
                                                                                </tbody>
                                                                        </table>
                                                                </div>
                                                        </div>

                                                        <div className="modal-footer">
                                                                <div className="total-info">
                                                                        <h3 className="total-amount">
                                                                                Total: ₹{(selectedOrder.totalamount).toFixed(2)}
                                                                        </h3>
                                                                        {Method.tooltip(
                                                                                <div className="tooltip-content">
                                                                                        {selectedOrder.amount !== selectedOrder.totalamount && (
                                                                                                <p>
                                                                                                        Subtotal: ₹{parseFloat(selectedOrder.amount).toFixed(2)}
                                                                                                </p>
                                                                                        )}
                                                                                        {selectedOrder.allowtax !== 0 && (
                                                                                                <p>
                                                                                                        Tax Amount ({selectedOrder?.taxpercent || 0}%): ₹
                                                                                                        {parseFloat(selectedOrder?.taxamount || 0).toFixed(2)}
                                                                                                </p>
                                                                                        )}
                                                                                        {selectedOrder.includetip === 1 && (
                                                                                                <p>
                                                                                                        Tip Amount: ₹{parseFloat(selectedOrder.tipamount || 0).toFixed(2)}
                                                                                                </p>
                                                                                        )}
                                                                                        <p>Total Amount: ₹{parseFloat(selectedOrder.totalamount).toFixed(2)}</p>
                                                                                </div>,
                                                                                <span className="material-symbols-outlined white info-icon">
                                                                                        info
                                                                                </span>
                                                                        )}
                                                                </div>

                                                                {selectedOrder.adminstatus === 2 && (
                                                                        <button className='main-btn' onClick={handleViewBill}>
                                                                                View Bill
                                                                        </button>
                                                                )}

                                                                <div className="payment-info">
                                                                        <h4>Payment Status:</h4>
                                                                        {selectedOrder.adminstatus === 2 ? (
                                                                                <span className="successbatch">Received</span>
                                                                        ) : (
                                                                                <span className="pendingbatch">Pending</span>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>
                                        </div>
                                )}

                                {/* Sidebar Overlay */}
                                {isSidebarOpen && (
                                        <div
                                                className="sidebar-overlay"
                                                onClick={() => setIsSidebarOpen(false)}
                                        ></div>
                                )}

                                {/* Sidebar Panel */}
                                <div className={`sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
                                        <button
                                                className="sidebar-close-btn"
                                                onClick={() => setIsSidebarOpen(false)}
                                        >
                                                <span className="material-symbols-outlined fs-20">close</span>
                                        </button>

                                        <h3>Filter Orders</h3>

                                        <form
                                                onSubmit={(e) => {
                                                        e.preventDefault();
                                                        applyFilters();
                                                }}
                                                className="sidebar-form"
                                        >
                                                {/* ==== DATE RANGE PICKER ==== */}
                                                {Method.renderDateRangePicker({
                                                        calendarRef,
                                                        showCalendar,
                                                        setShowCalendar,
                                                        dateRange,
                                                        setDateRange,
                                                        currentMonth,
                                                        setCurrentMonth,
                                                        renderDateCard,
                                                        handleGoToToday,
                                                        handleResetRange,
                                                        showTimeRange: true,
                                                        setPopup,
                                                        popupTimerRef: popupTimer
                                                })}

                                                <div className="form-group" ref={serviceDropdownRef}>
                                                        <label className="form-group-label">Service Type</label>
                                                        <div
                                                                className="custom-dropdown-selected"
                                                                onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setPaymentDropdownOpen(false);
                                                                        setServiceDropdownOpen((p) => !p);
                                                                }}
                                                        >
                                                                {tempFilters.servicetype
                                                                        ? Method.getServiceType(Number(tempFilters.servicetype))
                                                                        : "-- Select Service --"}

                                                                <span
                                                                        className="material-symbols-outlined fs-20 arrow"
                                                                        style={{
                                                                                transform: serviceDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                transition: "transform 0.3s ease",
                                                                                color: "#47d9a8",
                                                                        }}
                                                                >
                                                                        keyboard_arrow_right
                                                                </span>
                                                        </div>
                                                        <div className="custom-dropdown">
                                                                {serviceDropdownOpen &&
                                                                        Method.renderDropdownOptions({
                                                                                options: Config.Sevice_type,
                                                                                activeValue: tempFilters.servicetype,
                                                                                onSelect: (value) => {
                                                                                        setTempFilters({ ...tempFilters, servicetype: value });
                                                                                        setServiceDropdownOpen(false);
                                                                                }
                                                                        })
                                                                }
                                                        </div>
                                                </div>

                                                <div className="form-group" ref={paymentDropdownRef}>
                                                        <label className="form-group-label">Payment Method</label>

                                                        <div className="custom-dropdown">
                                                                <div
                                                                        className="custom-dropdown-selected"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setServiceDropdownOpen(false);
                                                                                setPaymentDropdownOpen((p) => !p);
                                                                        }}
                                                                >
                                                                        {tempFilters.paymentmode === ""
                                                                                ? "-- Select Payment --"
                                                                                : tempFilters.paymentmode === 1
                                                                                        ? "Cash"
                                                                                        : tempFilters.paymentmode === 2
                                                                                                ? "UPI"
                                                                                                : "-- Select Payment --"}

                                                                        <span
                                                                                className="material-symbols-outlined fs-20 arrow"
                                                                                style={{
                                                                                        transform: paymentDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                        transition: "transform 0.3s ease",
                                                                                        color: "#47d9a8",
                                                                                }}
                                                                        >
                                                                                keyboard_arrow_right
                                                                        </span>
                                                                </div>

                                                                {paymentDropdownOpen &&
                                                                        Method.renderDropdownOptions({
                                                                                options: Config.Payment_type,
                                                                                activeValue: tempFilters.paymentmode,
                                                                                onSelect: (value) => {
                                                                                        setTempFilters({ ...tempFilters, paymentmode: value });
                                                                                        setPaymentDropdownOpen(false);
                                                                                }
                                                                        })
                                                                }
                                                        </div>
                                                </div>

                                                <div className="form-footer">
                                                        <button
                                                                type="button"
                                                                className="main-btn"
                                                                onClick={clearAllFilters}
                                                        >
                                                                Clear All
                                                        </button>
                                                        <button
                                                                type="button"
                                                                className="main-btn"
                                                                onClick={applyFilters}
                                                        >
                                                                Apply Filters
                                                        </button>
                                                </div>
                                        </form>
                                </div>

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>
                </>
        );
};

export default OrderHistory;
