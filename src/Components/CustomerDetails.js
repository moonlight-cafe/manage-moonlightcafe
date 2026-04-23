import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import "./CustomerDetails.css";
import { Navbar, Method, API, Config } from "../config/Init.js"

function CustomerDetails() {
        const navigate = useNavigate();
        const [details, setDetails] = useState([]);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [searchText, setSearchText] = useState("");
        const popupTimer = useRef(null);
        const [sort, setSort] = useState({ key: "_id", order: -1 });

        // Infinite scroll
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);
        // Add these with your other state declarations
        const [actionMenu, setActionMenu] = useState({
                open: false,
                customer: null,
                position: "bottom-right",
                isClosing: false
        });

        const closeActionMenu = () => {
                setActionMenu((prev) => {
                        if (!prev.open) return prev;
                        setTimeout(() => {
                                setActionMenu((current) => {
                                        if (current.isClosing) {
                                                return { open: false, customer: null, position: "bottom-right", isClosing: false };
                                        }
                                        return current;
                                });
                        }, 160);
                        return { ...prev, isClosing: true };
                });
        };

        const actionMenuRef = useRef(null);

        const showPopup = (message, type = "error") => Method.showPopup(setPopup, popupTimer, message, type);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchCustomerDetails(1, true, { [sort.key]: sort.order }, {}, {}, searchText.trim());
                }
        };

        const handleSort = (key) => {
                setSort((prev) => {
                        let newOrder = 1;
                        let newKey = key;
                        if (prev.key === key) {
                                if (prev.order === 1) newOrder = -1;
                                else if (prev.order === -1) {
                                        newOrder = 0;
                                        newKey = "";
                                }
                        }
                        return { key: newKey, order: newOrder };
                });
        };

        useEffect(() => {
                fetchCustomerDetails(1, true, { [sort.key]: sort.order }, {}, {}, "");
        }, [sort, searchText]);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                                closeActionMenu();
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const fetchCustomerDetails = async (pageno = 1, reset = false, sort = { [sort.key]: sort.order }, filter = {}, projection = {}, searchtext = "") => {
                if (loading) return;
                try {
                        setLoading(true);
                        const response = await API.fetchCustomerDetails(pageno, 20, sort, filter, projection, searchtext);

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setDetails(items);
                                } else {
                                        setDetails((prev) => [...prev, ...items]);
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
                                showPopup(response.message || "Failed to fetch Customer details");
                        }
                } catch (err) {
                        console.error("Fetch Customer details error:", err);
                        showPopup("Server error while fetching Customer details");
                } finally {
                        setLoading(false);
                }
        };

        useEffect(() => {
                const dataWrapper = document.querySelector(".common-table-wrapper");

                const handleScroll = () => {
                        if (!dataWrapper) return;
                        const { scrollTop, scrollHeight, clientHeight } = dataWrapper;
                        if (scrollTop + clientHeight >= scrollHeight - 10 && hasNextPage && !loading) {
                                fetchCustomerDetails(page + 1);
                        }
                };

                if (dataWrapper) {
                        dataWrapper.addEventListener("scroll", handleScroll);
                        return () => dataWrapper.removeEventListener("scroll", handleScroll);
                }
        }, [page, hasNextPage, loading]);

        const OrderHistory = (data) => {
                navigate('/orders', {
                        state: {
                                id: data._id,
                                customername: data.name
                        }
                });
        };

        const openActionMenu = (e, customer) => {
                e.stopPropagation();
                const position = Method.getActionMenuPosition(e.currentTarget);

                setActionMenu((prev) => {
                        const isSame = (prev.open || prev.isClosing) && prev.customer?._id === customer?._id;
                        if (isSame) {
                                if (!prev.isClosing) {
                                        setTimeout(() => {
                                                setActionMenu((current) => {
                                                        if (current.isClosing) {
                                                                return { open: false, customer: null, position: "bottom-right", isClosing: false };
                                                        }
                                                        return current;
                                                });
                                        }, 160);
                                        return { ...prev, isClosing: true };
                                }
                                return prev;
                        } else {
                                return { open: true, customer: customer, position, isClosing: false };
                        }
                });
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Customer Details</h2>
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
                                                </div>
                                        </div>

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th">Action</th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">ID <span className={Method.getSortIconClass("uniqueid", sort.key, sort.order)} onClick={() => handleSort("uniqueid")}>{Method.getSortIcon("uniqueid", sort.key, sort.order)}</span></div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Name <span className={Method.getSortIconClass("name", sort.key, sort.order)} onClick={() => handleSort("name")}>{Method.getSortIcon("name", sort.key, sort.order)}</span></div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Number <span className={Method.getSortIconClass("number", sort.key, sort.order)} onClick={() => handleSort("number")}>{Method.getSortIcon("number", sort.key, sort.order)}</span></div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Email <span className={Method.getSortIconClass("email", sort.key, sort.order)} onClick={() => handleSort("email")}>{Method.getSortIcon("email", sort.key, sort.order)}</span></div>
                                                                                </th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && details.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* Loading details... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : details.length > 0 ? (
                                                                                details.map((data) => (
                                                                                        <tr key={data._id}>
                                                                                                <td className="common-table-td" style={{ position: "relative" }}>
                                                                                                        <button className="actionbtn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => openActionMenu(e, data)} >
                                                                                                                <span className="material-symbols-outlined white fs-20">
                                                                                                                        more_vert
                                                                                                                </span>
                                                                                                        </button>

                                                                                                        {actionMenu.open &&
                                                                                                                actionMenu.customer?._id === data._id && (
                                                                                                                        <div ref={actionMenuRef} className={`action-menu ${actionMenu.position} ${actionMenu.isClosing ? 'closing' : ''}`} >
                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        OrderHistory(data);
                                                                                                                                        closeActionMenu();
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">open_in_new</span> View Orders
                                                                                                                                </p>

                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        console.log("View Details:", data);
                                                                                                                                        closeActionMenu();
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">visibility</span> View Details
                                                                                                                                </p>
                                                                                                                        </div>
                                                                                                                )}
                                                                                                </td>
                                                                                                <td className="common-table-td">{data.uniqueid}</td>
                                                                                                <td className="common-table-td">{data.name}</td>
                                                                                                <td className="common-table-td">{data.number ? (data.number) : ("-")}</td>
                                                                                                <td className="common-table-td">{data.email}</td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* No customers found */}
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                </div>

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>
                </>
        );
}

export default CustomerDetails;
