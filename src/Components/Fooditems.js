import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "./Fooditems.css";
import { Navbar, Method, API, Config } from "../config/Init.js"

function Fooditems() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canView = Method.canAccess(pagePath, "view");
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canDelete = Method.canAccess(pagePath, "delete");
        const canAnyAction = canView || canUpdate || canDelete;
        // data states
        const [foodItems, setFoodItems] = useState([]);
        const [categories, setCategories] = useState([]);

        // dropdown states (separate for add/edit and filter)
        const [addCategoryDropdownOpen, setAddCategoryDropdownOpen] = useState(false);
        const [filterCategoryDropdownOpen, setFilterCategoryDropdownOpen] = useState(false);

        // form / UI states
        const [formData, setFormData] = useState({});
        const [editingId, setEditingId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const popupTimer = useRef(null);

        const [searchText, setSearchText] = useState("");

        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

        // pagination & sorting
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);
        const [sortBy, setSortBy] = useState("_id");
        const [sortOrder, setSortOrder] = useState(-1); // -1 desc, 1 asc

        // modals and other UI
        const [modalVisible, setModalVisible] = useState(false);
        const [deleteId, setDeleteId] = useState(null);
        const [showFoodModal, setShowFoodModal] = useState(false);
        const [selectedFood, setSelectedFood] = useState(null);
        const [isAnimatingFoodOut, setIsAnimatingFoodOut] = useState(false);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);

        // filters
        const [filters, setFilters] = useState({ categorycode: [] });
        const [tempFilters, setTempFilters] = useState({ categorycode: [] });
        // Add these with your other state declarations (after the other refs)
        const [actionMenu, setActionMenu] = useState({
                open: false,
                item: null,
                position: "bottom-right",
                isClosing: false
        });

        const closeActionMenu = () => {
                setActionMenu((prev) => {
                        if (!prev.open) return prev;
                        setTimeout(() => {
                                setActionMenu((current) => {
                                        if (current.isClosing) {
                                                return { open: false, item: null, position: "bottom-right", isClosing: false };
                                        }
                                        return current;
                                });
                        }, 160);
                        return { ...prev, isClosing: true };
                });
        };

        // refs
        const actionMenuRef = useRef(null);
        const addDropdownRef = useRef(null);
        const filterDropdownRef = useRef(null);
        const isFetchingRef = useRef(false);

        // helper to show popup (existing method)
        const showPopup = useCallback(
                (message, type = "error") => Method.showPopup(setPopup, popupTimer, message, type),
                []
        );

        // toggle for multi-select filter
        const toggleTempCategory = useCallback((code) => {
                setTempFilters((prev) => {
                        const exists = prev.categorycode.includes(code);
                        return {
                                ...prev,
                                categorycode: exists ? prev.categorycode.filter((c) => c !== code) : [...prev.categorycode, code],
                        };
                });
        }, []);

        // -------------------------
        // Outside-click handler (closes both dropdowns)
        // -------------------------
        useEffect(() => {
                const handleClickOutside = (event) => {
                        if (addDropdownRef.current && !addDropdownRef.current.contains(event.target)) {
                                setAddCategoryDropdownOpen(false);
                        }
                        if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                                setFilterCategoryDropdownOpen(false);
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        // Add this function before your return statement (after clearAllFilters)
        const openActionMenu = useCallback((e, item) => {
                e.stopPropagation();
                const position = Method.getActionMenuPosition(e.currentTarget);

                setActionMenu((prev) => {
                        const isSame = prev.open && prev.item?._id === item?._id;
                        return isSame
                                ? { open: false, item: null, position: "bottom-right" }
                                : { open: true, item, position };
                });
        }, []);

        // -------------------------
        // Fetch categories (when either sidebar opens)
        // -------------------------
        useEffect(() => {
                const fetchCategories = async () => {
                        try {
                                const response = await API.fetchCategory(1, 999999, { _id: -1 }, { isactive: 1 }, { name: 1, code: 1 }, "");
                                if (response.status === 200) {
                                        const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
                                        setCategories(data);
                                } else {
                                        showPopup(response.message || "Failed to fetch categories");
                                }
                        } catch (err) {
                                showPopup("Error loading categories");
                        }
                };

                if (isSidebarOpen || isFilterSidebarOpen) {
                        fetchCategories();
                }
        }, [isSidebarOpen, isFilterSidebarOpen, showPopup]);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                                closeActionMenu();
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);
        // -------------------------
        // Fetch Food Items - Fixed pagination logic
        // -------------------------
        const fetchFoodItems = async (pageno = 1, reset = false, sort = { [sortBy]: sortOrder }, appliedFilters = filters, searchtext = "") => {
                // Prevent duplicate calls
                if (loading || isFetchingRef.current) return;

                setLoading(true);
                isFetchingRef.current = true;

                try {
                        const response = await API.fetchFoodItems(pageno, 20, sort, appliedFilters, {}, searchtext);

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setFoodItems(items);
                                } else {
                                        setFoodItems((prev) => {
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
                                showPopup(response.message || "Failed to fetch food items");
                        }
                } catch (err) {
                        showPopup("Server error while fetching items");
                } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
                }
        };

        // -------------------------
        // Search handler - trigger on Enter key
        // -------------------------
        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchFoodItems(1, true, { [sortBy]: sortOrder }, filters, searchText.trim());
                }
        };

        // -------------------------
        // Clear search when empty
        // -------------------------
        useEffect(() => {
                if (searchText.trim() === "") {
                        fetchFoodItems(1, true, { [sortBy]: sortOrder }, filters, "");
                }
        }, [searchText]);

        // -------------------------
        // Initial Load - Only runs once
        // -------------------------
        useEffect(() => {
                fetchFoodItems(1, true);
        }, []);

        // -------------------------
        // Infinite Scroll Handler with debounce
        // -------------------------
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
                                        fetchFoodItems(page + 1, false, { [sortBy]: sortOrder }, filters, searchText);
                                }
                        }, 100); // 100ms debounce
                };

                if (tableWrapper) {
                        tableWrapper.addEventListener('scroll', handleScroll);
                        return () => {
                                tableWrapper.removeEventListener('scroll', handleScroll);
                                clearTimeout(scrollTimeout);
                        };
                }
        }, [page, hasNextPage, loading, sortBy, sortOrder, filters, searchText]);

        const handleSubmit = useCallback(
                async (e) => {
                        e.preventDefault();
                        if (editingId && !canUpdate) {
                                showPopup("You don't have permission to update food items");
                                return;
                        }
                        if (!editingId && !canAdd) {
                                showPopup("You don't have permission to add food items");
                                return;
                        }

                        try {
                                setLoading(true);

                                const endpoint = editingId ? "update" : "add";
                                const payload = editingId
                                        ? { ...formData, _id: editingId }
                                        : formData;

                                // ❌ DO NOT USE FormData
                                // ✅ Send base64 in file key
                                const response = await API.CreateUpdateFoodItems(endpoint, payload);

                                if (response.status === 200) {
                                        showPopup(response.message || "Saved successfully", "success");
                                        setFormData({});
                                        setEditingId(null);
                                        setIsSidebarOpen(false);
                                        fetchFoodItems(1, true, { [sortBy]: sortOrder }, filters, searchText);
                                } else {
                                        showPopup(response.data?.message || response.message || "Failed to save item");
                                }
                        } catch (err) {
                                showPopup("Server error while saving item");
                        } finally {
                                setLoading(false);
                        }
                },
                [editingId, formData, sortBy, sortOrder, filters, searchText, showPopup, canAdd, canUpdate]
        );

        const handleDelete = async (id) => {
                if (!canDelete) {
                        showPopup("You don't have permission to delete food items");
                        return;
                }
                try {
                        setLoading(true);
                        const response = await API.RemoveFoodItems(id);

                        if (response.status === 200) {
                                showPopup(response.message || "Food Item deleted successfully", "success");
                                fetchFoodItems(1, true);
                        } else {
                                showPopup(response.message || "Failed to delete");
                        }
                } catch (err) {
                        console.error("Delete error:", err);
                        showPopup("Server error while deleting");
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

        const handleEdit = useCallback((item) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update food items");
                        return;
                }
                setFormData(item || {});
                setEditingId(item?._id || null);
                setIsSidebarOpen(true);
                setAddCategoryDropdownOpen(false);
                setFilterCategoryDropdownOpen(false);
        }, [canUpdate, showPopup]);

        const handleChange = useCallback((e) => {
                const { name, value, type, checked, files } = e.target;

                if (type === "file") {
                        const file = files && files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onloadend = () => {
                                setFormData((prev) => ({
                                        ...prev,
                                        file: reader.result, // ✅ BASE64 STRING
                                }));
                        };
                        reader.readAsDataURL(file);
                        return;
                }

                setFormData((prev) => ({
                        ...prev,
                        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
                }));
        }, []);

        const handleToggleStatus = useCallback(
                async (id, currentStatus) => {
                        if (!canUpdate) {
                                showPopup("You don't have permission to update food item status");
                                return;
                        }
                        try {
                                setLoading(true);
                                const payload = { _id: id, isactive: currentStatus === 1 ? 0 : 1 };
                                const response = await API.CreateUpdateFoodItems("update", payload);

                                if (response.status === 200) {
                                        showPopup("Status updated successfully", "success");
                                        // Update the status in the local state instead of refetching
                                        setFoodItems((prevItems) =>
                                                prevItems.map((item) =>
                                                        item._id === id
                                                                ? { ...item, isactive: currentStatus === 1 ? 0 : 1 }
                                                                : item
                                                )
                                        );
                                } else {
                                        showPopup("Failed to update status");
                                }
                        } catch {
                                showPopup("Server error while updating status");
                        } finally {
                                setLoading(false);
                        }
                },
                [showPopup, canUpdate]
        );

        const openFoodModal = useCallback((food) => {
                setSelectedFood(food);
                setShowFoodModal(true);
        }, []);

        const closeFoodModal = useCallback(() => {
                setIsAnimatingFoodOut(true);
                setTimeout(() => {
                        setShowFoodModal(false);
                        setSelectedFood(null);
                        setIsAnimatingFoodOut(false);
                }, 300);
        }, []);

        const applyFilters = useCallback(() => {
                setFilters(tempFilters);
                fetchFoodItems(1, true, { [sortBy]: sortOrder }, tempFilters, searchText);
                setIsFilterSidebarOpen(false);
        }, [sortBy, sortOrder, searchText, tempFilters]);

        const removeFilterChip = useCallback(
                (code) => {
                        const updated = {
                                ...filters,
                                categorycode: filters.categorycode.filter((c) => c !== code),
                        };
                        setFilters(updated);
                        fetchFoodItems(1, true, { [sortBy]: sortOrder }, updated, searchText);
                        setTempFilters((prev) => ({
                                ...prev,
                                categorycode: prev.categorycode.filter((c) => c !== code),
                        }));
                },
                [filters, sortBy, sortOrder, searchText]
        );

        const clearAllFilters = useCallback(() => {
                const cleared = { categorycode: [] };
                setFilters(cleared);
                setTempFilters(cleared);
                fetchFoodItems(1, true, { [sortBy]: sortOrder }, cleared, searchText);
                setIsFilterSidebarOpen(false);
        }, [sortBy, sortOrder, searchText]);

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
                fetchFoodItems(1, true, sortPayload, filters, searchText);
        }

        const tableRows = useMemo(() => {
                return foodItems.map((item) => (
                        <tr key={item._id}>
                                <td className="common-table-td" style={{ position: "relative" }}>
                                        <button
                                                className="actionbtn" onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                        if (!canAnyAction) return;
                                                        openActionMenu(e, item);
                                                }}
                                                disabled={!canAnyAction}
                                        >
                                                <span className="material-symbols-outlined white fs-20">
                                                        more_vert
                                                </span>
                                        </button>

                                        {(actionMenu.open || actionMenu.isClosing) && actionMenu.item?._id === item._id && (
                                                <div ref={actionMenuRef} className={`action-menu ${actionMenu.position} ${actionMenu.isClosing ? 'closing' : ''}`}>
                                                        {canUpdate && (
                                                                <p className="action-menu-item" onClick={() => {
                                                                        handleEdit(item);
                                                                        closeActionMenu();
                                                                }}>
                                                                        <span className="material-symbols-outlined fs-15 ml-10">edit</span> Edit
                                                                </p>
                                                        )}

                                                        <p className="action-menu-item" onClick={() => {
                                                                openFoodModal(item);
                                                                closeActionMenu();
                                                        }}>
                                                                <span className="material-symbols-outlined fs-15 ml-10">visibility</span> View Details
                                                        </p>

                                                        {canDelete && (
                                                                <p className="action-menu-item" onClick={() => {
                                                                        setDeleteId(item._id);
                                                                        setModalVisible(true);
                                                                        closeActionMenu();
                                                                }}>
                                                                        <span className="material-symbols-outlined fs-15 ml-10">delete</span> Delete
                                                                </p>
                                                        )}
                                                </div>
                                        )}
                                </td>
                                <td className="common-table-td">{item.name}</td>
                                <td className="common-table-td">{item.category || "—"}</td>
                                {/* <td className="common-table-td">
                                        {Method.tooltip(
                                                item.description,
                                                <span className="material-symbols-outlined white info-icon">
                                                        info
                                                </span>
                                        )}
                                </td> */}
                                <td className="common-table-td">{item.price ? `₹${item.price}` : "—"}</td>
                                <td className="common-table-td">
                                        {Method.tooltip(
                                                <div className="tooltip-content fs-18">
                                                        {item.name} ({item.category})
                                                </div>,
                                                <img
                                                        src={item.url || "/no-image.png"}
                                                        alt={item.name}
                                                        className="food-img-preview"
                                                        onClick={() => openFoodModal(item)}
                                                        style={{ cursor: "pointer" }}
                                                        onError={(e) => (e.target.src = "/no-image.png")}
                                                />,
                                                "top"
                                        )}
                                </td>
                                <td className="common-table-td">
                                        {Method.tooltip(
                                                item.isactive === 1 ? "Active" : "Inactive",
                                                <input
                                                        type="checkbox"
                                                        checked={item.isactive === 1}
                                                        className={`chk-checkbox ${!canUpdate ? "chk-disabled" : ""}`}
                                                        onChange={() => handleToggleStatus(item._id, item.isactive)}
                                                />
                                        )}
                                </td>
                        </tr>
                ));
        }, [foodItems, handleEdit, handleToggleStatus, openFoodModal, openActionMenu, actionMenu, canAnyAction, canUpdate, canDelete]);

        const buttonLabel = loading
                ? editingId
                        ? "Updating..."
                        : "Saving..."
                : editingId
                        ? "Update"
                        : "Save";


        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">

                                {/* -----------------------HEADER + SEARCH + BUTTONS------------------------ */}
                                <div className="common-tbl-box user-not-select">

                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Food Items</h2>

                                                <div className="common-tbl-right-section">

                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">search</span>
                                                                <input
                                                                        type="text"
                                                                        placeholder="Search"
                                                                        className="search-input"
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
                                                                                setFormData({});
                                                                                setEditingId(null);
                                                                                setAddCategoryDropdownOpen(false);
                                                                        }}
                                                                >
                                                                        Add Food Item
                                                                </button>
                                                        )}

                                                        <button
                                                                className="filter-btn"
                                                                onClick={() => {
                                                                        setIsFilterSidebarOpen(true);
                                                                        setTempFilters(filters);
                                                                        setFilterCategoryDropdownOpen(false);
                                                                }}
                                                        >
                                                                <span className="material-symbols-outlined main-color fs-25 m-3">
                                                                        filter_alt
                                                                </span>
                                                        </button>
                                                </div>
                                        </div>

                                        {/* Filter Chips */}
                                        <div className="filter-chips">
                                                {filters.categorycode.map((code) => {
                                                        const catName = categories.find((c) => c.code === code)?.name;
                                                        return (
                                                                <div key={code} className="chip">
                                                                        {catName}
                                                                        <span
                                                                                className="material-symbols-outlined remove"
                                                                                onClick={() => removeFilterChip(code)}
                                                                        >
                                                                                close
                                                                        </span>
                                                                </div>
                                                        );
                                                })}
                                        </div>

                                        {/* -----------------------TABLE------------------------ */}
                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">

                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th">Action</th>
                                                                                <th className="common-table-th clickable" onClick={() => handleSort("name")}>
                                                                                        <div className="th-content">Food <span className={Method.getSortIconClass("name", sortBy, sortOrder)} onClick={() => handleSort("name")}>{Method.getSortIcon("name", sortBy, sortOrder)}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th clickable" onClick={() => handleSort("category")}>
                                                                                        <div className="th-content">Category <span className={Method.getSortIconClass("category", sortBy, sortOrder)} onClick={() => handleSort("category")}>{Method.getSortIcon("category", sortBy, sortOrder)}</span></div>
                                                                                </th>

                                                                                {/* <th className="common-table-th">
                                                                                        <div className="th-content">Description <span className={Method.getSortIconClass("description", sortBy, sortOrder)} onClick={() => handleSort("description")}>{Method.getSortIcon("description", sortBy, sortOrder)}</span></div>
                                                                                </th> */}

                                                                                <th className="common-table-th clickable" onClick={() => handleSort("price")}>
                                                                                        <div className="th-content">Price (₹) <span className={Method.getSortIconClass("price", sortBy, sortOrder)} onClick={() => handleSort("price")}>{Method.getSortIcon("price", sortBy, sortOrder)}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">Image</th>
                                                                                <th className="common-table-th" onClick={() => handleSort("isactive")}>
                                                                                        <div className="th-content">Status<span className={Method.getSortIconClass("isactive", sortBy, sortOrder)} onClick={() => handleSort("isactive")}>{Method.getSortIcon("isactive", sortBy, sortOrder)}</span></div>
                                                                                </th>
                                                                        </tr>
                                                                </thead>

                                                                <tbody>
                                                                        {loading && foodItems.length === 0 ? (
                                                                                <tr>
                                                                                        <td colSpan="100" className="common-table-td" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* Loading food items... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : foodItems.length > 0 ? (
                                                                                <>
                                                                                        {tableRows}
                                                                                </>
                                                                        ) : (
                                                                                <tr>
                                                                                        <td colSpan="100" className="common-table-td" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {/* No Food Items Found */}
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                        {loading && foodItems.length > 0 && (
                                                                <div style={{ textAlign: "center", padding: "20px" }}>
                                                                        {/* Loading more items... */}
                                                                        {Method.showLoader()}
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                </div>

                                {isSidebarOpen && (
                                        <div
                                                className="sidebar-overlay"
                                                onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        setAddCategoryDropdownOpen(false);
                                                        setFormData({});
                                                        setEditingId(null);
                                                }}
                                        />
                                )}

                                {isFilterSidebarOpen && (
                                        <div
                                                className="sidebar-overlay"
                                                onClick={() => {
                                                        setIsFilterSidebarOpen(false);
                                                        setFilterCategoryDropdownOpen(false);
                                                        setTempFilters(filters);
                                                }}
                                        />
                                )}

                                {/* -----------------------ADD / EDIT SIDEBAR------------------------ */}
                                <div className={`sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
                                        <div className="sidebar-content">
                                                <button
                                                        className="sidebar-close-btn"
                                                        onClick={() => {
                                                                setIsSidebarOpen(false);
                                                                setAddCategoryDropdownOpen(false);
                                                                setFormData({});
                                                                setEditingId(null);
                                                        }}
                                                >
                                                        <span className="material-symbols-outlined fs-20">close</span>
                                                </button>

                                                <h3>{editingId ? "Update Food Item" : "Add Food Item"}</h3>

                                                <form onSubmit={handleSubmit} className="sidebar-form">

                                                        {/* Name */}
                                                        <div className="form-group">
                                                                <label className="form-group-label">Food Name <span className="required">*</span></label>
                                                                <input
                                                                        type="text"
                                                                        name="name"
                                                                        value={formData.name || ""}
                                                                        className="common-input-text"
                                                                        onChange={handleChange}
                                                                // required
                                                                />
                                                        </div>

                                                        {/* Category */}
                                                        <div className="form-group" ref={addDropdownRef}>
                                                                <label className="form-group-label">Category <span className="required">*</span></label>

                                                                <div className="custom-dropdown">
                                                                        <div
                                                                                className="custom-dropdown-selected"
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setAddCategoryDropdownOpen((p) => !p);
                                                                                        setFilterCategoryDropdownOpen(false);
                                                                                }}
                                                                        >
                                                                                <span className="main-color">
                                                                                        {formData.categorycode
                                                                                                ? categories.find((cat) => cat.code === formData.categorycode)?.name
                                                                                                : "-- Select Category --"}
                                                                                </span>

                                                                                <span
                                                                                        className="material-symbols-outlined fs-20 arrow"
                                                                                        style={{
                                                                                                transform: addCategoryDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                                transition: "transform 0.3s ease",
                                                                                                color: "#47d9a8",
                                                                                        }}
                                                                                >
                                                                                        keyboard_arrow_right
                                                                                </span>
                                                                        </div>

                                                                        {addCategoryDropdownOpen && (
                                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                                        {Method.renderDropdownOptions({
                                                                                                options: categories.map((cat) => ({ value: cat.code, label: cat.name })),
                                                                                                activeValue: formData.categorycode || "",
                                                                                                onSelect: (categorycode) => {
                                                                                                        const selectedCategory = categories.find((cat) => cat.code === categorycode);
                                                                                                        setFormData({
                                                                                                                ...formData,
                                                                                                                category: selectedCategory?.name || "",
                                                                                                                categorycode,
                                                                                                        });
                                                                                                        setAddCategoryDropdownOpen(false);
                                                                                                },
                                                                                        })}
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        {/* Price */}
                                                        <div className="form-group">
                                                                <label className="form-group-label">Price (₹) <span className="required">*</span></label>
                                                                <input
                                                                        type="number"
                                                                        name="price"
                                                                        value={formData.price || ""}
                                                                        className="common-input-text"
                                                                        onChange={handleChange}
                                                                />
                                                        </div>

                                                        {/* Image */}
                                                        <div className="form-group">
                                                                <label className="form-group-label">Image <span className="required">*</span></label>
                                                                <div className="upload-box">
                                                                        <input
                                                                                type="file"
                                                                                id="imageUploadInput"
                                                                                accept="image/*"
                                                                                name="imageFile"
                                                                                onChange={handleChange}
                                                                        />
                                                                        <label htmlFor="imageUploadInput" className="upload-button">
                                                                                <span className="material-symbols-outlined fs-22">upload</span>
                                                                                <span>Choose Image</span>
                                                                        </label>

                                                                        {formData.file && (
                                                                                <div className="image-preview-container">
                                                                                        <img
                                                                                                src={formData.file}
                                                                                                alt="Preview"
                                                                                                className="food-img-preview sidebar-preview"
                                                                                                onError={(e) => (e.target.src = "/no-image.png")}
                                                                                        />
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        <div className="form-footer">
                                                                <button type="submit" disabled={loading} className="main-btn">
                                                                        {buttonLabel}
                                                                </button>
                                                        </div>
                                                </form>
                                        </div>
                                </div>

                                {/* -----------------------FILTER SIDEBAR------------------------ */}
                                <div className={`sidebar-panel ${isFilterSidebarOpen ? "open" : ""}`}>
                                        <div className="sidebar-content">

                                                <button
                                                        className="sidebar-close-btn"
                                                        onClick={() => {
                                                                setIsFilterSidebarOpen(false);
                                                                setFilterCategoryDropdownOpen(false);
                                                                setTempFilters(filters);
                                                        }}
                                                >
                                                        <span className="material-symbols-outlined fs-20">close</span>
                                                </button>

                                                <h3>Filters</h3>

                                                <form onSubmit={(e) => e.preventDefault()} className="sidebar-form">

                                                        {/* Filter Category */}
                                                        <div className="form-group" ref={filterDropdownRef}>
                                                                <label className="form-group-label">Category</label>

                                                                <div className="custom-dropdown">
                                                                        <div
                                                                                className="custom-dropdown-selected"
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setFilterCategoryDropdownOpen((p) => !p);
                                                                                        setAddCategoryDropdownOpen(false);
                                                                                }}
                                                                        >
                                                                                {tempFilters.categorycode.length > 0
                                                                                        ? tempFilters.categorycode
                                                                                                .map((code) => categories.find((c) => c.code === code)?.name)
                                                                                                .join(", ")
                                                                                        : "-- Select Category --"}

                                                                                <span
                                                                                        className="material-symbols-outlined fs-20 arrow"
                                                                                        style={{
                                                                                                transform: filterCategoryDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                                transition: "transform 0.3s ease",
                                                                                                color: "#47d9a8",
                                                                                        }}
                                                                                >
                                                                                        keyboard_arrow_right
                                                                                </span>
                                                                        </div>

                                                                        {filterCategoryDropdownOpen && (
                                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                                        {Method.renderDropdownOptions({
                                                                                                options: categories.map((cat) => ({ value: cat.code, label: cat.name })),
                                                                                                activeValue: tempFilters.categorycode || [],
                                                                                                onSelect: (categorycode) => {
                                                                                                        toggleTempCategory(categorycode);
                                                                                                },
                                                                                        })}
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        {/* Clear / Apply buttons */}
                                                        <div className="form-footer">
                                                                <button type="button" onClick={clearAllFilters} className="main-btn">
                                                                        Clear All
                                                                </button>

                                                                <button type="button" onClick={applyFilters} className="main-btn">
                                                                        Apply Filters
                                                                </button>
                                                        </div>
                                                </form>
                                        </div>
                                </div>

                                {/* Delete Modal */}
                                {modalVisible && (
                                        <div className={`modal-overlay ${isAnimatingAlertOut ? "fade-out" : ""}`}>
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

                                {/* Food Modal */}
                                {showFoodModal && selectedFood && (
                                        <div className={`modal-overlay user-not-select ${isAnimatingFoodOut ? "fade-out" : ""}`}>
                                                <div className={`modal-content-select width-40 order-modal ${isAnimatingFoodOut ? "fade-out" : ""}`}>
                                                        <button className="sidebar-close-btn user-not-select" onClick={closeFoodModal}>
                                                                <span className="material-symbols-outlined fs-20">close</span>
                                                        </button>

                                                        <img
                                                                src={selectedFood.url || "/no-image.png"}
                                                                alt={selectedFood.name}
                                                                className="food-img-full user-not-select mt-30"
                                                                onError={(e) => (e.target.src = "/no-image.png")}
                                                        />

                                                        <h3 className="modal-title">
                                                                {selectedFood.name}
                                                                <span className="modal-sub-text">
                                                                        ({selectedFood.category || "No Category"})
                                                                </span>
                                                        </h3>

                                                        {/* {selectedFood.description && (
                                                                <p className="modal-description">{selectedFood.description}</p>
                                                        )} */}

                                                        <h4 className="modal-price">Price: ₹{selectedFood.price}</h4>
                                                </div>
                                        </div>
                                )}

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>
                </>
        );
}

export default Fooditems;
