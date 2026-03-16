import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Menu.css";
import { Navbar, Method, API, Config } from "../config/Init.js"
import { useNavigate } from "react-router-dom";

function ReviewManager() {
        const navigate = useNavigate();
        const [reviews, setReviews] = useState([]);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [searchText, setSearchText] = useState("");
        const popupTimer = useRef(null);
        const [sort, setSort] = useState({ key: "_id", order: -1 });
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
        const [tempFilters, setTempFilters] = useState({
                servicetype: "",
                paymentmode: ""
        });
        const [showCalendar, setShowCalendar] = useState(false);
        // Infinite scroll states
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);
        const calendarRef = useRef(null);
        const [dateRange, setDateRange] = useState({
                from: undefined,
                to: undefined
        });
        const [currentMonth, setCurrentMonth] = useState(new Date());
        const renderDateCard = (date) => {
                return date.toLocaleDateString("en-CA"); // YYYY-MM-DD
        };
        // Add ref to track if fetch is in progress
        const serviceDropdownRef = useRef(null);
        const paymentDropdownRef = useRef(null);
        const isFetchingRef = useRef(false);

        const showPopup = useCallback((message, type = "error") => {
                Method.showPopup(setPopup, popupTimer, message, type);
        }, []);

        const listRating = useCallback(async (pageno = 1, reset = false, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") => {
                // Prevent duplicate calls
                if (loading || isFetchingRef.current) return;

                try {
                        setLoading(true);
                        isFetchingRef.current = true;

                        const response = await API.ListRating(pageno, 20, sort, filter, projection, searchtext);

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setReviews(items);
                                } else {
                                        setReviews(prev => {
                                                // Filter out duplicates based on _id
                                                const existingIds = new Set(prev.map(item => item._id));
                                                const newItems = items.filter(item => !existingIds.has(item._id));
                                                return [...prev, ...newItems];
                                        });
                                }

                                setPage(pageno);

                                if (data.nextpage !== undefined)
                                        setHasNextPage(data.nextpage === 1);
                                else if (data.totalPages !== undefined)
                                        setHasNextPage(pageno < data.totalPages);
                                else
                                        setHasNextPage(items.length === 20);
                        } else {
                                showPopup(response.message || "Failed to fetch reviews");
                        }
                } catch (err) {
                        console.error("Fetch reviews error:", err);
                        showPopup("Server error while fetching reviews");
                } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
                }
        }, [showPopup]);

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

        useEffect(() => {
                listRating(1, true, { [sort.key]: sort.order });
        }, [sort]);

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

        const handleResetRange = () => {
                setDateRange({
                        from: undefined,
                        to: undefined,
                });
        };

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        listRating(1, true, { _id: -1 }, {}, {}, searchText.trim());
                }
        };

        const handleSort = (key) => {
                setSort((prev) => ({
                        key,
                        order: prev.key === key ? prev.order * -1 : 1
                }));
                listRating(1, true, { [key]: sort.order });
        };

        // Infinite scroll with debounce
        useEffect(() => {
                const tableWrapper = document.querySelector('.common-table-wrapper');
                let scrollTimeout;

                const handleScroll = () => {
                        if (!tableWrapper) return;

                        // Clear existing timeout
                        clearTimeout(scrollTimeout);

                        // Debounce scroll event
                        scrollTimeout = setTimeout(() => {
                                const { scrollTop, scrollHeight, clientHeight } = tableWrapper;

                                // Check if scrolled to bottom and not already loading
                                if (scrollTop + clientHeight >= scrollHeight - 10 &&
                                        hasNextPage &&
                                        !loading &&
                                        !isFetchingRef.current) {
                                        listRating(page + 1, false);
                                }
                        }, 100); // 100ms debounce
                };

                if (tableWrapper) {
                        tableWrapper.addEventListener("scroll", handleScroll);
                        return () => {
                                tableWrapper.removeEventListener("scroll", handleScroll);
                                clearTimeout(scrollTimeout);
                        };
                }
        }, [page, hasNextPage, loading, listRating]);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (
                                serviceDropdownRef.current &&
                                !serviceDropdownRef.current.contains(e.target)
                        ) {
                                setServiceDropdownOpen(false);
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

        const handleOrderRedirect = (review) => {
                if (!review.orderid) {
                        showPopup("Order not linked with this review");
                        return;
                }

                navigate("/orders", {
                        state: {
                                orderid: review.orderid
                        }
                });
        };

        const handleRefresh = () => {
                setSearchText("");
                listRating(page, true, "");
        };



        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Customer Reviews</h2>
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

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Customer<span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("customername")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Rating<span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("rating")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Review<span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("review")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Service<span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("service")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Date<span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("createdAt")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        View Order
                                                                                </th>
                                                                        </tr>
                                                                </thead>

                                                                <tbody>
                                                                        {loading && reviews.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td main-color" colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* Loading reviews... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : reviews.length > 0 ? (
                                                                                <>
                                                                                        {reviews.map((review) => (
                                                                                                <tr key={review._id}>
                                                                                                        <td className="common-table-td">{review.customername}</td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.renderStars(review.rating)}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">{review.review ? review.review : '-'}</td>
                                                                                                        <td className="common-table-td">{Method.getServiceType(review.service)}</td>
                                                                                                        <td className="common-table-td">{Method.renderDateCard(review.createdAt)}</td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        "View Order",
                                                                                                                        <span
                                                                                                                                className="material-symbols-outlined fs-18 white pointer"
                                                                                                                                onClick={() => handleOrderRedirect(review)}
                                                                                                                        >
                                                                                                                                open_in_new
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </td>
                                                                                                </tr>
                                                                                        ))}
                                                                                </>
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td main-color" colSpan="100" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* No reviews found */}
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                        {loading && reviews.length > 0 && (
                                                                <div className="main-color" style={{ textAlign: "center", padding: "20px" }}>
                                                                        {/* Loading more... */}
                                                                        {Method.showLoader()}
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                </div>

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
                                                }}
                                                className="sidebar-form"
                                        >
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
                                                        setPopup,
                                                        popupTimerRef: popupTimer
                                                })}

                                                <div className="form-group" ref={serviceDropdownRef}>
                                                        <label className="form-group-label">Service Type</label>
                                                        <div
                                                                className="custom-dropdown-selected"
                                                                onClick={(e) => {
                                                                        e.stopPropagation();
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


                                                <div className="form-footer">
                                                        <button
                                                                type="button"
                                                                className="main-btn"
                                                        // onClick={clearAllFilters}
                                                        >
                                                                Clear All
                                                        </button>
                                                        <button
                                                                type="button"
                                                                className="main-btn"
                                                        // onClick={applyFilters}
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
}

export default ReviewManager;
