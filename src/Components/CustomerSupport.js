import React, { useEffect, useState, useRef } from 'react';
import './CustomerSupport.css';
import { Navbar, Method, Config, API } from "../config/Init.js";

export default function CustomerSupport() {
        const [details, setDetails] = useState([]);
        const [searchText, setSearchText] = useState("");
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [loading, setLoading] = useState(false);
        const popupTimer = useRef(null);

        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);

        const [modalVisible, setModalVisible] = useState(false);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);

        const [sortBy, setSortBy] = useState("_id");
        const [sortOrder, setSortOrder] = useState(-1);

        const [selectedTicketId, setSelectedTicketId] = useState(null);
        const [remark, setRemark] = useState("");
        const [selectedDetail, setSelectedDetail] = useState({});

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchdetails(1, true, { [sortBy]: sortOrder }, {}, {}, searchText.trim());
                }
        };

        useEffect(() => {
                const timer = setTimeout(() => {
                        fetchdetails(1, true, { [sortBy]: sortOrder }, {}, {}, searchText.trim());
                }, 500);
                return () => clearTimeout(timer);
        }, [searchText]);

        const fetchdetails = async (
                pageno = 1,
                reset = false,
                sort = { [sortBy]: sortOrder },
                filter = {},
                projection = {},
                searchtext = ""
        ) => {
                if (loading) return;
                try {
                        setLoading(true);
                        const response = await API.fetchCustomerSupport(
                                pageno, 20, sort, filter, projection, searchtext
                        );

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setDetails(items);
                                } else {
                                        setDetails(prev => [...prev, ...items]);
                                }

                                setPage(pageno);

                                if (response.nextpage !== undefined) {
                                        setHasNextPage(response.nextpage === 1);
                                } else if (response.totalPages !== undefined) {
                                        setHasNextPage(pageno < response.totalPages);
                                } else {
                                        setHasNextPage(items.length === 20);
                                }
                        } else {
                                showPopup(response.message || "Failed to fetch details");
                        }
                } catch (err) {
                        console.error(err);
                        showPopup("Server error while fetching details");
                } finally {
                        setLoading(false);
                }
        };

        const handleSort = (field) => {
                let newOrder = 1;
                let newSortBy = field;

                if (sortBy === field) {
                        if (sortOrder === 1) {
                                newOrder = -1;
                        } else if (sortOrder === -1) {
                                newOrder = 0;
                                newSortBy = "";
                        }
                }

                setSortBy(newSortBy);
                setSortOrder(newOrder);

                const sortPayload = newOrder === 0 ? {} : { [newSortBy]: newOrder };
                fetchdetails(1, true, sortPayload, {}, {}, searchText.trim());
        };

        const handleRefresh = () => {
                setSearchText("");
                setSortBy("_id");
                setSortOrder(-1);
                fetchdetails(1, true, { _id: -1 }, {}, {}, "");
        };

        useEffect(() => {
                const tableWrapper = document.querySelector(".common-table-wrapper");

                const handleScroll = () => {
                        if (!tableWrapper) return;
                        const { scrollTop, scrollHeight, clientHeight } = tableWrapper;

                        if (scrollTop + clientHeight >= scrollHeight - 10 && hasNextPage && !loading) {
                                fetchdetails(page + 1, false, { [sortBy]: sortOrder }, {}, {}, searchText.trim());
                        }
                };

                tableWrapper?.addEventListener("scroll", handleScroll);
                return () => tableWrapper?.removeEventListener("scroll", handleScroll);
        }, [page, hasNextPage, loading, sortBy, sortOrder, searchText]);

        const ResolveSupport = async () => {
                if (!remark.trim()) {
                        showPopup("Resolve remark is required");
                        return;
                }

                try {
                        setLoading(true);
                        const response = await API.ResolveCustomerSupport(
                                selectedTicketId,
                                remark
                        );

                        if (response.status === 200) {
                                showPopup(response.message || "Resolved", "success");
                                fetchdetails(1, true);
                                closeModal();
                                setRemark("");
                                setSelectedTicketId(null);
                                setSelectedDetail({});
                        } else {
                                showPopup(response.data?.message || "Failed to resolve ticket");
                        }
                } catch (err) {
                        showPopup("Server error while resolving ticket");
                } finally {
                        setLoading(false);
                }
        };

        const closeModal = () => {
                setIsAnimatingAlertOut(true);
                setTimeout(() => {
                        setModalVisible(false);
                        setIsAnimatingAlertOut(false);
                }, 500);
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Customer Support</h2>
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
                                                </div>
                                        </div>

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th" onClick={() => handleSort("tickitid")}>
                                                                                        <div className="th-content">
                                                                                                Tickit Id
                                                                                                <span className={Method.getSortIconClass("tickitid", sortBy, sortOrder)} onClick={() => handleSort("tickitid")}>
                                                                                                        {Method.getSortIcon("tickitid", sortBy, sortOrder)}
                                                                                                </span>
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th" onClick={() => handleSort("name")}>
                                                                                        <div className="th-content">
                                                                                                Customer Name
                                                                                                <span className={Method.getSortIconClass("name", sortBy, sortOrder)} onClick={() => handleSort("name")}>
                                                                                                        {Method.getSortIcon("name", sortBy, sortOrder)}
                                                                                                </span>
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">Message</th>
                                                                                <th className="common-table-th">Action</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && details.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="4" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : details.length > 0 ? (
                                                                                details.map((detail) => (
                                                                                        <tr key={detail._id}>
                                                                                                <td className="common-table-td">{detail.tickitid}</td>
                                                                                                <td className="common-table-td">{detail.name}</td>
                                                                                                <td className="common-table-td">{detail.message}</td>
                                                                                                <td className="common-table-td">
                                                                                                        {detail.iscompleted === 0 ? Method.tooltip(
                                                                                                                "Resolve",
                                                                                                                <button
                                                                                                                        className="actionbtn"
                                                                                                                        onClick={() => {
                                                                                                                                setSelectedTicketId(detail._id);
                                                                                                                                setSelectedDetail(detail);
                                                                                                                                setModalVisible(true);
                                                                                                                        }}
                                                                                                                >
                                                                                                                        <span className="material-symbols-outlined white fs-20">check</span>
                                                                                                                </button>
                                                                                                        ) : (
                                                                                                                <div className="action-container">
                                                                                                                        <span className='status-active'>Resolved</span>
                                                                                                                        {Method.tooltip(
                                                                                                                                detail.remark,
                                                                                                                                <span className="material-symbols-outlined white fs-20">info</span>
                                                                                                                        )}
                                                                                                                </div>
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

                                {modalVisible && (
                                        <div className="modal-overlay">
                                                <div className={`modal-content-select width-40 alert-modal ${isAnimatingAlertOut ? "fade-out" : ""}`}>
                                                        <div className="modal-ticket-id main-color fs-25"><strong>{selectedDetail.tickitid}</strong></div>
                                                        <div className="modal-customer-row">
                                                                <div className="modal-customer-name main-color fs-18">{selectedDetail.name}</div>
                                                                <div className="modal-created-at main-color fs-18">{Method.formatDateToCustom(selectedDetail.createdAt)}</div>
                                                        </div>
                                                        <div className="main-color fs-18">Message:- {selectedDetail.message}</div>
                                                        <form className="sidebar-form modal-remark-form">
                                                                <div className="form-group">
                                                                        <input
                                                                                type="text"
                                                                                className="common-input-text"
                                                                                value={remark}
                                                                                onChange={(e) => setRemark(e.target.value)}
                                                                                required
                                                                                placeholder='Resolve Remark'
                                                                        />
                                                                </div>
                                                        </form>
                                                        <div className="modal-button-container">
                                                                <button className="main-cancle-btn mr-20" onClick={closeModal}>
                                                                        Cancel
                                                                </button>
                                                                <button className="main-btn" onClick={ResolveSupport}>
                                                                        Resolve
                                                                </button>
                                                        </div>
                                                </div>
                                        </div>
                                )}

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>
                </>
        );
}
