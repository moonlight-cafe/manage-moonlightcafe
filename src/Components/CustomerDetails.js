import React, { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import { Method, API, Config } from "../config/Init.js";
import "./CustomerDetails.css";
import { useNavigate } from "react-router-dom";

function CustomerDetails() {
	const navigate = useNavigate();
	const [details, setDetails] = useState([]);
	const [loading, setLoading] = useState(false);
	const [popup, setPopup] = useState({ show: false, message: "", type: "error" });
	const [searchText, setSearchText] = useState("");
	const popupTimer = useRef(null);

	const [page, setPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(true);
	const [sort, setSort] = useState({ key: "_id", order: -1 });

	const [actionMenu, setActionMenu] = useState({
		open: false,
		customer: null,
		position: "bottom-right",
		style: {},
		isClosing: false
	});

	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [isDetailsModalClosing, setIsDetailsModalClosing] = useState(false);
	const [modalDetailsLoading, setModalDetailsLoading] = useState(false);
	const [customerSummary, setCustomerSummary] = useState(null);

	const closeActionMenu = () => {
		setActionMenu((prev) => {
			if (!prev.open) return prev;
			setTimeout(() => {
				setActionMenu((current) => {
					if (current.isClosing) {
						return { open: false, customer: null, position: "bottom-right", style: {}, isClosing: false };
					}
					return current;
				});
			}, 160);
			return { ...prev, isClosing: true };
		});
	};

	const actionMenuRef = useRef(null);
	const isFetchingRef = useRef(false);

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

	// 0.5 sec auto-search debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			fetchCustomerDetails(1, true, { [sort.key]: sort.order }, {}, {}, searchText.trim());
		}, 500);
		return () => clearTimeout(timer);
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

	const handleRefresh = () => {
		setSearchText("");
		fetchCustomerDetails(1, true, { [sort.key]: sort.order }, {}, {}, "");
	};

	const fetchCustomerDetails = async (pageno = 1, reset = false, sortPayload = { [sort.key]: sort.order }, filter = {}, projection = {}, searchtext = "") => {
		if (loading || isFetchingRef.current) return;
		try {
			setLoading(true);
			isFetchingRef.current = true;
			const response = await API.fetchCustomerDetails(pageno, 20, sortPayload, filter, projection, searchtext);

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
			isFetchingRef.current = false;
		}
	};

	useEffect(() => {
		const dataWrapper = document.querySelector(".common-table-wrapper");
		const handleScroll = () => {
			if (!dataWrapper) return;
			const { scrollTop, scrollHeight, clientHeight } = dataWrapper;
			if (scrollTop + clientHeight >= scrollHeight - 10 && hasNextPage && !loading) {
				fetchCustomerDetails(page + 1, false, { [sort.key]: sort.order }, {}, {}, searchText.trim());
			}
		};

		if (dataWrapper) {
			dataWrapper.addEventListener("scroll", handleScroll);
			return () => dataWrapper.removeEventListener("scroll", handleScroll);
		}
	}, [page, hasNextPage, loading, sort, searchText]);

	const handleOpenDetails = async (customer) => {
		closeActionMenu();
		setShowDetailsModal(true);
		setIsDetailsModalClosing(false);
		setModalDetailsLoading(true);
		setCustomerSummary(null);

		try {
			const response = await API.fetchCustomerSummary(customer._id);
			if (response.status === 200 && response.data) {
				setCustomerSummary(response.data);
			} else {
				showPopup(response.message || "Failed to load customer summary");
			}
		} catch (error) {
			console.error("Error fetching customer summary:", error);
			showPopup("Server error while loading customer summary");
		} finally {
			setModalDetailsLoading(false);
		}
	};

	const handleCloseDetailsModal = () => {
		setIsDetailsModalClosing(true);
		setTimeout(() => {
			setShowDetailsModal(false);
			setIsDetailsModalClosing(false);
			setCustomerSummary(null);
		}, 300);
	};

	const openActionMenu = (e, customer) => {
		e.stopPropagation();
		const { position, style } = Method.getActionMenuPosition(e.currentTarget);

		setActionMenu((prev) => {
			const isSame = (prev.open || prev.isClosing) && prev.customer?._id === customer?._id;
			if (isSame) {
				if (!prev.isClosing) {
					setTimeout(() => {
						setActionMenu((current) => {
							if (current.isClosing) {
								return { open: false, customer: null, position: "bottom-right", style: {}, isClosing: false };
							}
							return current;
						});
					}, 160);
					return { ...prev, isClosing: true };
				}
				return prev;
			} else {
				return { open: true, customer, position, style, isClosing: false };
			}
		});
	};

	const OrderHistory = (customer) => {
		navigate("/orders", {
			state: {
				id: customer._id,
				customername: customer.name,
			},
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
												{Method.showLoader()}
											</td>
										</tr>
									) : details.length > 0 ? (
										details.map((data) => (
											<tr key={data._id}>
												<td className="common-table-td" style={{ position: "relative" }}>
													<button className="actionbtn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => openActionMenu(e, data)}>
														<span className="material-symbols-outlined white fs-20">
															more_vert
														</span>
													</button>

													{(actionMenu.open || actionMenu.isClosing) &&
														actionMenu.customer?._id === data._id && (
															<div ref={actionMenuRef} className={`action-menu ${actionMenu.position} ${actionMenu.isClosing ? 'closing' : ''}`} style={actionMenu.style}>
																<p className="action-menu-item" onClick={() => {
																	OrderHistory(data);
																	closeActionMenu();
																}}>
																	<span className="material-symbols-outlined fs-15 ml-10">open_in_new</span> View Orders
																</p>

																<p className="action-menu-item" onClick={() => {
																	handleOpenDetails(data);
																}}>
																	<span className="material-symbols-outlined fs-15 ml-10">visibility</span> View Details
																</p>
															</div>
														)}
												</td>
												<td className="common-table-td">{data.uniqueid}</td>
												<td className="common-table-td">{data.name}</td>
												<td className="common-table-td">{data.number ? data.number : "-"}</td>
												<td className="common-table-td">{data.email}</td>
											</tr>
										))
									) : (
										<tr>
											<td className="common-table-td" colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
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

				{/* Customer Details Summary Modal */}
				{showDetailsModal && (
					<div className={`modal-overlay user-not-select ${isDetailsModalClosing ? "fade-out" : ""}`} onClick={handleCloseDetailsModal}>
						<div
							className={`modal-content-select customer-summary-modal ${isDetailsModalClosing ? "fade-out" : ""}`}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="cust-modal-header-fixed">
								<h3 className="modal-title">Customer Details</h3>
								<button className="sidebar-close-btn user-not-select" onClick={handleCloseDetailsModal}>
									<span className="material-symbols-outlined fs-20">close</span>
								</button>
							</div>

							<div className="cust-modal-scroll-body">

							{modalDetailsLoading ? (
								<div className="cust-modal-loader">
									{Method.showLoader()}
								</div>
							) : customerSummary ? (
								<>
									{/* Customer Profile Header */}
									<div className="cust-profile-card">
										<div className="cust-profile-avatar">
											{customerSummary.customer?.name ? customerSummary.customer.name.charAt(0).toUpperCase() : "C"}
										</div>
										<div className="cust-profile-info ml-10">
											<div className="cust-profile-name-row">
												<h4 className="cust-profile-name">{customerSummary.customer?.name || "Customer"}</h4>
												<span className="cust-id-badge">ID: {customerSummary.customer?.uniqueid || "-"}</span>
											</div>
											<div className="cust-profile-meta-grid mt-10">
												<div className="cust-meta-item">
													<span className="material-symbols-outlined">call</span>
													<span>{customerSummary.customer?.number || "No phone"}</span>
												</div>
												<div className="cust-meta-item">
													<span className="material-symbols-outlined">mail</span>
													<span>{customerSummary.customer?.email || "No email"}</span>
												</div>
												{customerSummary.customer?.create_at && (
													<div className="cust-meta-item">
														<span className="material-symbols-outlined">calendar_today</span>
														<span>Joined: {Method.formatDate(customerSummary.customer.create_at)}</span>
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Stats KPI Cards */}
									<div className="cust-stats-grid">
										<div className="cust-stat-card">
											<div className="cust-stat-icon-box">
												<span className="material-symbols-outlined fs-24">receipt_long</span>
											</div>
											<div className="cust-stat-content">
												<span className="cust-stat-label">Total Orders</span>
												<span className="cust-stat-value">{customerSummary.stats?.totalOrders ?? 0}</span>
											</div>
										</div>

										<div className="cust-stat-card">
											<div className="cust-stat-icon-box">
												<span className="material-symbols-outlined fs-24">currency_rupee</span>
											</div>
											<div className="cust-stat-content">
												<span className="cust-stat-label">Total Revenue</span>
												<span className="cust-stat-value">₹{Number(customerSummary.stats?.totalRevenue || 0).toLocaleString('en-IN')}</span>
											</div>
										</div>

										<div className="cust-stat-card">
											<div className="cust-stat-icon-box">
												<span className="material-symbols-outlined fs-24">event_available</span>
											</div>
											<div className="cust-stat-content">
												<span className="cust-stat-label">Last Order Date</span>
												<span className="cust-stat-value-date">
													{customerSummary.stats?.lastOrderDate ? Method.formatDate(customerSummary.stats.lastOrderDate) : "No orders"}
												</span>
											</div>
										</div>
									</div>

									{/* Top 3 Common Food Items */}
									<div className="cust-section-container">
										<div className="cust-section-title">
											<span className="material-symbols-outlined section-icon">local_fire_department</span>
											<span>Top 3 Most Ordered Items</span>
										</div>
										{customerSummary.topItems && customerSummary.topItems.length > 0 ? (
											<div className="cust-top-food-grid">
												{customerSummary.topItems.map((item, index) => {
													const rankColors = ["gold", "silver", "bronze"];
													const rankClass = rankColors[index] || "bronze";
													return (
														<div key={item.foodid || index} className={`cust-top-food-card rank-${rankClass}`}>
															<div className="cust-card-top-row">
																<div className={`cust-rank-pill pill-${rankClass}`}>
																	<span className="material-symbols-outlined rank-icon">
																		{index === 0 ? "workspace_premium" : index === 1 ? "military_tech" : "emoji_events"}
																	</span>
																	<span>#{index + 1}</span>
																</div>
																{item.price && (
																	<span className="cust-top-price">₹{Number(item.price).toLocaleString('en-IN')}</span>
																)}
															</div>

															<div className="cust-top-food-body">
																<div className="cust-food-img-wrapper">
																	<img
																		src={item.imageurl || "/no-image.png"}
																		alt={item.foodname}
																		className="cust-food-img"
																		onError={(e) => (e.target.src = "/no-image.png")}
																	/>
																</div>
																<div className="cust-food-main-info">
																	<h5 className="cust-food-name" title={item.foodname}>{item.foodname}</h5>
																	<div className="cust-order-metrics">
																		<span className="metric-chip">
																			<span className="material-symbols-outlined fs-13">shopping_bag</span>
																			<strong>{item.totalQuantity}</strong> items
																		</span>
																		{item.orderCount ? (
																			<span className="metric-chip-sub">
																				({item.orderCount} orders)
																			</span>
																		) : null}
																	</div>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										) : (
											<div className="cust-empty-box">
												<span className="material-symbols-outlined">shopping_basket</span>
												No orders found for this customer.
											</div>
										)}
									</div>

									{/* Favorite Food Items */}
									<div className="cust-section-container">
										<div className="cust-section-title">
											<span className="material-symbols-outlined section-icon text-heart">favorite</span>
											<span>Favorite Food Items</span>
										</div>
										{customerSummary.favoriteItems && customerSummary.favoriteItems.length > 0 ? (
											<div className="cust-fav-food-grid">
												{customerSummary.favoriteItems.map((fav, index) => (
													<div key={fav._id || index} className="cust-fav-food-card">
														<div className="fav-heart-badge">
															<span className="material-symbols-outlined fav-heart-icon">favorite</span>
														</div>
														<div className="cust-fav-food-body">
															<div className="cust-fav-img-wrapper">
																<img
																	src={fav.url || "/no-image.png"}
																	alt={fav.name}
																	className="cust-fav-food-img"
																	onError={(e) => (e.target.src = "/no-image.png")}
																/>
															</div>
															<div className="cust-fav-food-details">
																<h5 className="cust-fav-food-name" title={fav.name}>{fav.name}</h5>
																<div className="cust-fav-meta-row">
																	{fav.category ? (
																		<span className="cust-category-tag">{fav.category}</span>
																	) : <span></span>}
																	{fav.price && (
																		<span className="cust-fav-food-price">₹{Number(fav.price).toLocaleString('en-IN')}</span>
																	)}
																</div>
															</div>
														</div>
													</div>
												))}
											</div>
										) : (
											<div className="cust-empty-box">
												<span className="material-symbols-outlined">heart_broken</span>
												No favorite food items marked yet.
											</div>
										)}
									</div>
								</>
							) : null}
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}

export default CustomerDetails;
