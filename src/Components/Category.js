import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./Table.css";
import { Navbar, Method, API, Config, } from "../config/Init.js"

function CategoryMaster() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canDelete = Method.canAccess(pagePath, "delete");
        const canAnyAction = canUpdate || canDelete;
        const [categories, setCategories] = useState([]);
        const [formData, setFormData] = useState({});
        const [editingId, setEditingId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [searchText, setSearchText] = useState("");
        const popupTimer = useRef(null);

        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);
        const [modalVisible, setModalVisible] = useState(false);
        const [deleteId, setDeleteId] = useState(null);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);
        const [sortBy, setSortBy] = useState("_id");
        const [sortOrder, setSortOrder] = useState(-1);
        // Add these with your other state declarations (after sortOrder)
        const [actionMenu, setActionMenu] = useState({
                open: false,
                category: null,
                position: "bottom", // bottom | top
        });

        // Add ref to track if fetch is in progress
        const actionMenuRef = useRef(null);
        const isFetchingRef = useRef(false);

        const showPopup = (message, type = "error") => Method.showPopup(setPopup, popupTimer, message, type);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchCategories(1, true, { [sortBy]: sortOrder }, {}, {}, searchText.trim());
                }
        };

        useEffect(() => {
                if (searchText.trim() === "") {
                        fetchCategories(1, true, { [sortBy]: sortOrder }, {}, {}, "");
                }
        }, [searchText]);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                                setActionMenu({ open: false, category: null, position: "bottom" });
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const fetchCategories = async (pageno = 1, reset = false, sort = { [sortBy]: sortOrder }, filter = {}, projection = {}, searchtext = "") => {
                // Prevent duplicate calls
                if (loading || isFetchingRef.current) return;

                try {
                        setLoading(true);
                        isFetchingRef.current = true;

                        const response = await API.fetchCategory(pageno, 20, sort, filter, projection, searchtext);

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setCategories(items);
                                } else {
                                        setCategories((prev) => {
                                                // Filter out duplicates based on _id
                                                const existingIds = new Set(prev.map(item => item._id));
                                                const newItems = items.filter(item => !existingIds.has(item._id));
                                                return [...prev, ...newItems];
                                        });
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
                                showPopup(response.message || "Failed to fetch categories");
                        }
                } catch (err) {
                        console.error("Fetch categories error:", err);
                        showPopup("Server error while fetching categories");
                } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
                }
        };

        // Infinite scroll with debounce
        useEffect(() => {
                const tableWrapper = document.querySelector(".common-table-wrapper");
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
                                        fetchCategories(page + 1, false);
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
        }, [page, hasNextPage, loading]);

        const handleSubmit = async (e) => {
                e.preventDefault();
                if (editingId && !canUpdate) {
                        showPopup("You don't have permission to update category");
                        return;
                }
                if (!editingId && !canAdd) {
                        showPopup("You don't have permission to add category");
                        return;
                }
                try {
                        setLoading(true);
                        const endpoint = editingId ? "update" : "add";
                        const payload = editingId ? { ...formData, _id: editingId } : formData;

                        const response = await API.CreateUpdateCategory(endpoint, payload);
                        if (response.status === 200) {
                                showPopup(response.message || "Success", "success");
                                setFormData({});
                                setEditingId(null);
                                setIsSidebarOpen(false);
                                fetchCategories(1, true);
                        } else {
                                showPopup(response.data?.message || "Failed to save category");
                        }
                } catch (err) {
                        if (err.response?.data?.message) {
                                showPopup(err.response.data.message);
                        } else {
                                showPopup("Server error while saving category");
                        }
                } finally {
                        setLoading(false);
                }
        };

        const handleDelete = async (id) => {
                if (!canDelete) {
                        showPopup("You don't have permission to delete category");
                        return;
                }
                try {
                        setLoading(true);
                        const response = await API.RemoveCategory(id);
                        if (response.status === 200) {
                                showPopup("Category deleted successfully", "success");
                                fetchCategories(1, true);
                        } else {
                                showPopup(response.message || "Failed to delete category");
                        }
                } catch (err) {
                        console.error("Delete error:", err);
                        showPopup("Server error while deleting category");
                } finally {
                        setLoading(false);
                }
        };

        const closeAlertModal = () => {
                setIsAnimatingAlertOut(true);
                setTimeout(() => {
                        setModalVisible(false);
                        setDeleteId(null);
                        setIsAnimatingAlertOut(false)
                }, 300);
        }

        const handleEdit = (category) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update category");
                        return;
                }
                setFormData(category);
                setEditingId(category._id);
                setIsSidebarOpen(true);
        };

        const handleChange = (e) => {
                const { name, value, type, checked } = e.target;
                setFormData({
                        ...formData,
                        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
                });
        };

        const handleToggleStatus = async (id, currentStatus) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update category status");
                        return;
                }
                try {
                        setLoading(true);
                        const payload = { _id: id, isactive: currentStatus === 1 ? 0 : 1 };
                        const response = await API.CreateUpdateCategory("update", payload);

                        if (response.status === 200) {
                                showPopup("Status updated successfully", "success");
                                // Update the status in the local state instead of refetching
                                setCategories((prevCategories) =>
                                        prevCategories.map((cat) =>
                                                cat._id === id
                                                        ? { ...cat, isactive: currentStatus === 1 ? 0 : 1 }
                                                        : cat
                                        )
                                );
                        } else {
                                showPopup(response.message || "Failed to update status");
                        }
                } catch (err) {
                        console.error("Toggle status error:", err);
                        showPopup("Server error while updating status");
                } finally {
                        setLoading(false);
                }
        };

        const handleSort = (field) => {
                let newOrder = -1;
                let newSortBy = field;

                if (sortBy === field) {
                        newOrder = sortOrder === 1 ? -1 : 1;
                }

                setSortBy(newSortBy);
                setSortOrder(newOrder);
                fetchCategories(1, true, { [newSortBy]: newOrder }, {}, {}, searchText);
        }

        const openActionMenu = (e, category) => {
                e.stopPropagation();

                const buttonRect = e.currentTarget.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                const spaceBelow = viewportHeight - buttonRect.bottom;
                const position = spaceBelow < 120 ? "top" : "bottom";

                setActionMenu({
                        open: true,
                        category,
                        position,
                });
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Category</h2>
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
                                                        {canAdd && (
                                                                <button
                                                                        className="main-btn"
                                                                        onClick={() => {
                                                                                setIsSidebarOpen(true);
                                                                        }}
                                                                        disabled={loading}
                                                                >
                                                                        Add Category
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
                                                                                <th className="common-table-th" onClick={() => handleSort("name")}>
                                                                                        <div className="th-content">Category <span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("name")}>{Config.icons["sort"]}</span></div>
                                                                                </th>
                                                                                <th className="common-table-th" onClick={() => handleSort("isactive")}>
                                                                                        <div className="th-content">Status <span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("isactive")}>{Config.icons["sort"]}</span></div>
                                                                                </th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && categories.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="3" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* Loading categories... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : categories.length > 0 ? (
                                                                                categories.map((cat) => (
                                                                                        <tr key={cat._id}>
                                                                                                <td className="common-table-td" style={{ position: "relative" }}>
                                                                                                        <button
                                                                                                                className="actionbtn"
                                                                                                                onClick={(e) => {
                                                                                                                        if (!canAnyAction) return;
                                                                                                                        openActionMenu(e, cat);
                                                                                                                }}
                                                                                                                disabled={!canAnyAction}
                                                                                                        >
                                                                                                                <span className="material-symbols-outlined white fs-20">
                                                                                                                        more_vert
                                                                                                                </span>
                                                                                                        </button>

                                                                                                        {actionMenu.open && actionMenu.category?._id === cat._id && (
                                                                                                                <div ref={actionMenuRef} className={`action-menu ${actionMenu.position}`}>
                                                                                                                        {canUpdate && (
                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        handleEdit(cat);
                                                                                                                                        setActionMenu({ open: false, category: null, position: "bottom" });
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">edit</span> Edit
                                                                                                                                </p>
                                                                                                                        )}

                                                                                                                        {canDelete && (
                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        setDeleteId(cat._id);
                                                                                                                                        setModalVisible(true);
                                                                                                                                        setActionMenu({ open: false, category: null, position: "bottom" });
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">delete</span> Delete
                                                                                                                                </p>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </td>
                                                                                                <td className="common-table-td">{cat.name}</td>
                                                                                                <td className="common-table-td">
                                                                                                        {Method.tooltip(
                                                                                                                cat.isactive === 1 ? "Active" : "Inactive",
                                                                                                                <input
                                                                                                                        type="checkbox"
                                                                                                                        checked={cat.isactive === 1}
                                                                                                                        className={`chk-checkbox ${!canUpdate ? "chk-disabled" : ""}`}
                                                                                                                        onChange={() => handleToggleStatus(cat._id, cat.isactive)}
                                                                                                                />
                                                                                                        )}
                                                                                                </td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="3" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* No categories found */}
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                        {loading && categories.length > 0 && (
                                                                <div style={{ textAlign: "center", padding: "20px" }}>
                                                                        {/* Loading more... */}
                                                                        {Method.showLoader()}
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                </div>

                                {/* Sidebar for Add/Edit */}
                                {isSidebarOpen && (
                                        <div
                                                className="sidebar-overlay"
                                                onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        setFormData({});
                                                        setEditingId(null);
                                                }}
                                        ></div>
                                )}

                                <div className={`sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
                                        <button
                                                className="sidebar-close-btn"
                                                onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        setFormData({});
                                                        setEditingId(null);
                                                }}
                                        >
                                                <span className="material-symbols-outlined fs-20">close</span>
                                        </button>

                                        <h3>{editingId ? "Update Category" : "Add Category"}</h3>

                                        <form onSubmit={handleSubmit} className="sidebar-form">
                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Category <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="name"
                                                                className="common-input-text"
                                                                value={formData.name || ""}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                </div>

                                                <div className="form-footer">
                                                        <button type="submit" disabled={loading} className="main-btn">
                                                                {editingId ? "Update" : "Save"}
                                                        </button>
                                                </div>
                                        </form>
                                </div>

                                {/* Delete Modal */}
                                {modalVisible && (
                                        <div className="modal-overlay">
                                                <div
                                                        className={`modal-content-select width-40 alert-modal ${isAnimatingAlertOut ? "fade-out" : ""
                                                                }`}
                                                >
                                                        {/* Icon */}
                                                        <span className="material-symbols-outlined modal-icon required fs-50">
                                                                delete
                                                        </span>

                                                        {/* Title */}
                                                        <h3 className="modal-title fs-25 required">Are you sure?</h3>

                                                        {/* Message */}
                                                        <p className="modal-description fs-20 required">
                                                                Do you really want to delete this item?
                                                        </p>

                                                        <p className="note required fs-20">This action cannot be undone.</p>

                                                        {/* Buttons */}
                                                        <div>
                                                                <button
                                                                        className="main-cancle-btn mr-20"
                                                                        onClick={() => {
                                                                                if (deleteId) handleDelete(deleteId);
                                                                                closeAlertModal()
                                                                        }}
                                                                >
                                                                        Yes, Delete
                                                                </button>

                                                                <button
                                                                        className="main-btn ml-20"
                                                                        onClick={closeAlertModal}
                                                                >
                                                                        Cancel
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

export default CategoryMaster;
