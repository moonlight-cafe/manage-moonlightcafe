import React, { useEffect, useRef, useState } from 'react';
import './OrderHistory.css';
import { Navbar, Method, API, Config } from "../config/Init.js"

const PaymentVerify = () => {
        const [payments, setPayments] = useState([]);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const popupTimer = useRef(null);
        const [searchText, setSearchText] = useState("");
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);
        const [selectedOrder, setSelectedOrder] = useState(null);
        const [showModal, setShowModal] = useState(false);
        const [isAnimatingOut, setIsAnimatingOut] = useState(false);
        const [confirmingOrderId, setConfirmingOrderId] = useState(null);
        const [isInitialLoad, setIsInitialLoad] = useState(true); // NEW: Track initial load

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        const fetchVerifyPayment = async (pageno = 1, reset = false, search = "") => {
                if (loading) return;
                try {
                        setLoading(true);

                        const res = await API.ListPendingPayments(pageno, 20, { _id: -1 }, { adminstatus: [0, 1] }, {}, search);

                        if (res.status === 200) {
                                const data = Array.isArray(res.data) ? res.data : res.data.data || [];

                                if (reset || pageno === 1) {
                                        setPayments(data);
                                } else {
                                        setPayments((prev) => [...prev, ...data]);
                                }
                                if (res.data?.nextpage !== undefined) {
                                        setHasNextPage(res.data.nextpage === 1);
                                } else {
                                        setHasNextPage(data.length === 20);
                                }

                                setPage(pageno);
                        } else {
                                showPopup(res.message || "Failed to fetch payments");
                        }

                } catch (err) {
                        showPopup("Server Error", "error");
                } finally {
                        setLoading(false);
                }
        };

        // MODIFIED: Initial load - single API call
        useEffect(() => {
                fetchVerifyPayment(1, true, "");
                setIsInitialLoad(false);
        }, []); // Empty dependency array - only run once

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        setPage(1);
                        fetchVerifyPayment(1, true, searchText.trim());
                }
        };

        // MODIFIED: Clear search effect - prevent initial load trigger
        useEffect(() => {
                if (!isInitialLoad && searchText.trim() === "") {
                        setPage(1);
                        fetchVerifyPayment(1, true, "");
                }
        }, [searchText, isInitialLoad]);

        // MODIFIED: Scroll handler - don't attach during initial load
        useEffect(() => {
                // Don't attach scroll listener until after initial load
                if (isInitialLoad) return;

                const wrapper = document.querySelector(".common-table-wrapper");

                const onScroll = () => {
                        if (!wrapper) return;
                        const { scrollTop, scrollHeight, clientHeight } = wrapper;

                        if (scrollTop + clientHeight >= scrollHeight - 10 && hasNextPage && !loading) {
                                fetchVerifyPayment(page + 1, false, searchText);
                        }
                };

                if (wrapper) {
                        wrapper.addEventListener("scroll", onScroll);
                }

                return () => wrapper?.removeEventListener("scroll", onScroll);

        }, [page, hasNextPage, loading, searchText, isInitialLoad]);

        const handleCloseModal = () => {
                setIsAnimatingOut(true);
                setTimeout(() => {
                        setShowModal(false);
                        setSelectedOrder(null);
                        setIsAnimatingOut(false);
                }, 300);
        };

        const handleRefresh = () => {
                setSearchText("");
                setPage(1);
                fetchVerifyPayment(1, true, "");
        };

        const handleViewBill = () => {
                if (selectedOrder?.bill) {
                        window.open(selectedOrder.bill, "_blank");
                } else {
                        showPopup("Bill Not Found!", "error")
                }
        };

        const handleConfirmPayment = async (orderId, customerid, orderid) => {
                // ⛔ Block multi-click for same order
                if (confirmingOrderId === orderId) return;

                setConfirmingOrderId(orderId);
                setLoading(true);

                try {
                        const response = await API.AdminPaymentVerify(
                                orderId,
                                customerid,
                                orderid
                        );

                        if (response.status === 200) {
                                setPayments(prev =>
                                        prev.map(o =>
                                                o._id === orderId
                                                        ? { ...o, adminstatus: 2, bill: response.bill }
                                                        : o
                                        )
                                );

                                setSelectedOrder(prev =>
                                        prev ? { ...prev, adminstatus: 2, bill: response.bill } : prev
                                );

                                showPopup("Payment Confirmed!", "success");
                        } else {
                                showPopup("Failed to confirm payment", "error");
                                setConfirmingOrderId(null); // allow retry
                        }
                } catch (err) {
                        console.error(err);
                        showPopup("Error confirming payment", "error");
                        setConfirmingOrderId(null); // allow retry
                } finally {
                        setLoading(false);
                }
        };

        return (
                <>
                        <Navbar />

                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Verify Payment</h2>

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
                                                                        {loading && payments.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* Loading payments... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : payments.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* No orders found */}
                                                                                                {Method.noDataFound(Config.ordernotfoundimg)}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : (
                                                                                <>
                                                                                        {payments.map((order) => (
                                                                                                <tr key={order._id}>
                                                                                                        <td className="common-table-td">{order.orderno}</td>
                                                                                                        <td className="common-table-td">{Method.getServiceType(order.servicetype)}</td>
                                                                                                        <td className="common-table-td">{order.customername}</td>
                                                                                                        <td className="common-table-td">₹{order.totalamount}</td>
                                                                                                        {order.paymentMethod === 0 ? (
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
                                                                                                                <button className="actionbtn"
                                                                                                                        onClick={() => {
                                                                                                                                setSelectedOrder(order);
                                                                                                                                setShowModal(true);
                                                                                                                        }}>
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
                                                                                                                {/* Loading more payments... */}
                                                                                                                {Method.showLoader()}
                                                                                                        </td>
                                                                                                </tr>
                                                                                        )}
                                                                                </>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                </div>

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>


                        {/* DETAILS MODAL */}
                        {showModal && selectedOrder && (
                                <div className="modal-overlay user-not-select">
                                        <div className={`modal-content-select width-60 order-modal ${isAnimatingOut ? "fade-out" : ""}`}>

                                                <button className="sidebar-close-btn" onClick={handleCloseModal}>
                                                        <span className="material-symbols-outlined">close</span>
                                                </button>

                                                <h3 className="modal-title">Order Details: {selectedOrder.orderno}</h3>

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
                                                                                        <th className="common-table-th">#</th>
                                                                                        <th className="common-table-th">Item</th>
                                                                                        <th className="common-table-th">Image</th>
                                                                                        <th className="common-table-th">Qty</th>
                                                                                        <th className="common-table-th">Price</th>
                                                                                </tr>
                                                                        </thead>

                                                                        <tbody>
                                                                                {selectedOrder.data.map((item, i) => (
                                                                                        <tr key={i}>
                                                                                                <td className="common-table-td">{i + 1}</td>
                                                                                                <td className="common-table-td">{item.foodname}</td>
                                                                                                <td className="common-table-td"><img src={item.imageurl} alt={item.foodname} className="food-img" /></td>
                                                                                                <td className="common-table-td">{item.quantity}</td>
                                                                                                <td className="common-table-td">₹{item.price}</td>
                                                                                        </tr>
                                                                                ))}
                                                                        </tbody>
                                                                </table>
                                                        </div>
                                                </div>

                                                <div className="modal-footer user-not-select">
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
                                                                <h4>Status:</h4>

                                                                {selectedOrder.adminstatus === 2 ? (
                                                                        <span className="successbatch">Received</span>
                                                                ) : selectedOrder.adminstatus === 1 ? (
                                                                        <button
                                                                                className="main-btn"
                                                                                disabled={confirmingOrderId === selectedOrder._id}
                                                                                onClick={() =>
                                                                                        handleConfirmPayment(
                                                                                                selectedOrder._id,
                                                                                                selectedOrder.customerid,
                                                                                                selectedOrder.orderid
                                                                                        )
                                                                                }
                                                                        >
                                                                                {confirmingOrderId === selectedOrder._id
                                                                                        ? "Confirming..."
                                                                                        : "Confirm Payment"}
                                                                        </button>
                                                                ) : (<span className='pendingbatch'>{Method.getAdminStatus(selectedOrder.adminstatus)}</span>)}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}
                </>
        );
};

export default PaymentVerify;
