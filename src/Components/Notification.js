import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navbar, Method, API } from "../config/Init.js";

export default function Notification() {
        const [notifications, setNotifications] = useState([]);
        const [searchText, setSearchText] = useState("");
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [loading, setLoading] = useState(false);
        const popupTimer = useRef(null);
        const isFetchingRef = useRef(false);

        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);

        const showPopup = useCallback((message, type = "error") => {
                Method.showPopup(setPopup, popupTimer, message, type);
        }, []);

        const getNotificationText = (item) =>
                item?.message || item?.title || item?.description || item?.body || "Notification";

        const getNotificationTime = (item) => {
                const raw = item?.createdat || item?.created_at || item?.date || item?.createdon || item?.createdAt;
                if (!raw) return "-";
                const dt = new Date(raw);
                if (Number.isNaN(dt.getTime())) return "-";
                return Method.formatDatetoYYYYMMDD(dt);
        };

        const fetchNotifications = useCallback(async (
                pageno = 1,
                reset = false,
                sort = { _id: -1 },
                filter = {},
                projection = {},
                searchtext = ""
        ) => {
                if (isFetchingRef.current) return;
                try {
                        isFetchingRef.current = true;
                        setLoading(true);
                        const response = await API.ListNotification(
                                pageno,
                                20,
                                sort,
                                filter,
                                projection,
                                searchtext
                        );

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data?.data || [];

                                if (reset || pageno === 1) {
                                        setNotifications(items);
                                } else {
                                        setNotifications((prev) => [...prev, ...items]);
                                }

                                setPage(pageno);

                                if (data?.nextpage !== undefined) {
                                        setHasNextPage(data.nextpage === 1);
                                } else if (data?.totalPages !== undefined) {
                                        setHasNextPage(pageno < data.totalPages);
                                } else {
                                        setHasNextPage(items.length === 20);
                                }
                        } else {
                                showPopup(response.message || "Failed to fetch notifications");
                        }
                } catch (err) {
                        console.error("Notification fetch error:", err);
                        showPopup("Server error while fetching notifications");
                } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
                }
        }, [showPopup]);

        useEffect(() => {
                fetchNotifications(1, true);
        }, [fetchNotifications]);

        useEffect(() => {
                if (searchText.trim() === "") {
                        fetchNotifications(1, true, { _id: -1 }, {}, {}, "");
                }
        }, [searchText, fetchNotifications]);

        useEffect(() => {
                const tableWrapper = document.querySelector(".common-table-wrapper");
                const handleScroll = () => {
                        if (!tableWrapper) return;
                        const { scrollTop, scrollHeight, clientHeight } = tableWrapper;
                        if (scrollTop + clientHeight >= scrollHeight - 10 && hasNextPage && !isFetchingRef.current) {
                                fetchNotifications(page + 1, false, { _id: -1 }, {}, {}, searchText.trim());
                        }
                };

                tableWrapper?.addEventListener("scroll", handleScroll);
                return () => tableWrapper?.removeEventListener("scroll", handleScroll);
        }, [page, hasNextPage, searchText, fetchNotifications]);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchNotifications(1, true, { _id: -1 }, {}, {}, searchText.trim());
                }
        };

        const markSingleNotificationRead = async (notificationId) => {
                if (!notificationId) return;
                try {
                        const res = await API.ReadNotification({ _id: notificationId, allread: 0 });
                        if (res?.status === 200) {
                                setNotifications((prev) =>
                                        prev.map((item) =>
                                                item._id === notificationId ? { ...item, read: 1 } : item
                                        )
                                );
                                showPopup("Notification marked as read", "success");
                        } else {
                                showPopup(res?.message || "Failed to update notification");
                        }
                } catch (err) {
                        console.error("Mark notification read error:", err);
                        showPopup("Server error while updating notification");
                }
        };

        const markAllNotificationsRead = async () => {
                try {
                        const res = await API.ReadNotification({ allread: 1 });
                        if (res?.status === 200) {
                                setNotifications((prev) => prev.map((item) => ({ ...item, read: 1 })));
                                showPopup("All notifications marked as read", "success");
                        } else {
                                showPopup(res?.message || "Failed to update notifications");
                        }
                } catch (err) {
                        console.error("Mark all notifications read error:", err);
                        showPopup("Server error while updating notifications");
                }
        };

        const handleRefresh = () => {
                setSearchText("");
                fetchNotifications(1, true, { _id: -1 }, {}, {}, "");
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Notifications</h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">search</span>
                                                                <input
                                                                        type="text"
                                                                        placeholder="Search"
                                                                        className="search-input"
                                                                        maxLength={100}
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
                                                        <button className="main-btn" onClick={markAllNotificationsRead}>
                                                                Mark all as read
                                                        </button>
                                                </div>
                                        </div>

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th">Notification</th>
                                                                                <th className="common-table-th">Status</th>
                                                                                <th className="common-table-th">Date</th>
                                                                                <th className="common-table-th">Action</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && notifications.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="4" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : notifications.length > 0 ? (
                                                                                notifications.map((item) => (
                                                                                        <tr key={item._id}>
                                                                                                <td className="common-table-td">{getNotificationText(item)}</td>
                                                                                                <td className="common-table-td">
                                                                                                        {item.read === 1 ? (
                                                                                                                <span className="status-active">Read</span>
                                                                                                        ) : (
                                                                                                                <span className="status-pending">Unread</span>
                                                                                                        )}
                                                                                                </td>
                                                                                                <td className="common-table-td">{getNotificationTime(item)}</td>
                                                                                                <td className="common-table-td">
                                                                                                        {item.read === 0 ? (
                                                                                                                <button
                                                                                                                        className="actionbtn"
                                                                                                                        onClick={() => markSingleNotificationRead(item._id)}
                                                                                                                >
                                                                                                                        <span className="material-symbols-outlined white fs-20">check</span>
                                                                                                                </button>
                                                                                                        ) : (
                                                                                                                Method.tooltip(
                                                                                                                        "Read",
                                                                                                                        <span className="material-symbols-outlined main-color fs-20">done_all</span>
                                                                                                                )
                                                                                                        )}
                                                                                                </td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="4" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                </>
        );
}
