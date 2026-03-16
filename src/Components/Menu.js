import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./Menu.css";
import { Navbar, Method, API, Config } from "../config/Init.js"

function MenuManager() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canDelete = Method.canAccess(pagePath, "delete");
        const canAnyAction = canUpdate || canDelete;
        const [menus, setMenus] = useState([]);
        const [formData, setFormData] = useState({});
        const [editingId, setEditingId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [dropdownOpen, setDropdownOpen] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [searchText, setSearchText] = useState("");
        const popupTimer = useRef(null);
        const [sort, setSort] = useState({ key: "_id", order: -1 });
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [parentMenus, setParentMenus] = useState([]);

        // Infinite scroll states
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);

        const [modalVisible, setModalVisible] = useState(false);
        const [deleteId, setDeleteId] = useState(null);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);

        // Add these with your other state declarations
        const [actionMenu, setActionMenu] = useState({
                open: false,
                employee: null,
                position: "bottom", // bottom | top
        });

        // Add ref to track if fetch is in progress
        const actionMenuRef = useRef(null);
        const isFetchingRef = useRef(false);

        const showPopup = useCallback((message, type = "error") => {
                Method.showPopup(setPopup, popupTimer, message, type);
        }, []);

        const fetchMenus = useCallback(async (pageno = 1, reset = false, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") => {
                // Prevent duplicate calls
                if (loading || isFetchingRef.current) return;

                try {
                        setLoading(true);
                        isFetchingRef.current = true;

                        const response = await API.fetchMenus(pageno, 20, sort, filter, projection, searchtext);

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setMenus(items);
                                } else {
                                        setMenus(prev => {
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
                                showPopup(response.message || "Failed to fetch menus");
                        }
                } catch (err) {
                        console.error("Fetch menus error:", err);
                        showPopup("Server error while fetching menus");
                } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
                }
        }, [showPopup]);

        // Add this useEffect with your other useEffects
        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                                setActionMenu({ open: false, employee: null, position: "bottom" });
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        useEffect(() => {
                if (isSidebarOpen) {
                        const fetchParentMenus = async () => {
                                try {
                                        const response = await API.fetchMenus(1, 100, { name: 1 }, { submenu: 0 });
                                        if (response.status === 200) {
                                                const data = Array.isArray(response.data) ? response.data : response.data.data || [];
                                                setParentMenus(data.filter(menu => menu.submenu === 0));
                                        } else {
                                                showPopup(response.message || "Failed to fetch parent menus");
                                        }
                                } catch (err) {
                                        console.error("Fetch parent menus error:", err);
                                        showPopup("Server error while fetching parent menus");
                                }
                        };
                        fetchParentMenus();
                }
        }, [isSidebarOpen, showPopup]);

        useEffect(() => {
                fetchMenus(1, true, { [sort.key]: sort.order });
        }, [sort]);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchMenus(1, true, { _id: -1 }, {}, {}, searchText.trim());
                }
        };

        const handleSort = (key) => {
                setSort((prev) => ({
                        key,
                        order: prev.key === key ? prev.order * -1 : 1
                }));
                fetchMenus(1, true, { [key]: sort.order });
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
                                        fetchMenus(page + 1, false);
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
        }, [page, hasNextPage, loading, fetchMenus]);

        // Submit Add / Update
        const handleSubmit = async (e) => {
                e.preventDefault();
                if (editingId && !canUpdate) {
                        showPopup("You don't have permission to update menu");
                        return;
                }
                if (!editingId && !canAdd) {
                        showPopup("You don't have permission to add menu");
                        return;
                }
                try {
                        setLoading(true);
                        const endpoint = editingId ? "update" : "add";
                        const payload = editingId ? { ...formData, _id: editingId } : formData;

                        const response = await API.CreateUpdateMenus(endpoint, payload);

                        if (response.status === 200) {
                                showPopup(response.message || "Success", "success");
                                setFormData({});
                                setEditingId(null);
                                setIsSidebarOpen(false);
                                fetchMenus(1, true);
                        } else {
                                showPopup(response.message || "Failed to save menu");
                        }
                } catch (err) {
                        if (err.response && err.response.data && err.response.data.message) {
                                showPopup(err.response.data.message);
                        } else {
                                showPopup("Server error while saving table");
                        }
                } finally {
                        setLoading(false);
                }
        };

        // Delete Menu
        const handleDelete = async (id) => {
                if (!canDelete) {
                        showPopup("You don't have permission to delete menu");
                        return;
                }
                try {
                        setLoading(true);
                        const response = await API.RemoveMenus(id);

                        if (response.status === 200) {
                                showPopup("Menu deleted successfully", "success");
                                fetchMenus(1, true);
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

        const handleEdit = (menu) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update menu");
                        return;
                }
                setFormData(menu);
                setEditingId(menu._id);
                setIsSidebarOpen(true);
        };

        const handleChange = (e) => {
                const { name, value, type, checked } = e.target;
                setFormData({
                        ...formData,
                        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
                });
                setDropdownOpen(false);
        };

        const handleToggleStatus = async (id, currentStatus) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update menu status");
                        return;
                } else {

                        try {
                                setLoading(true);
                                const payload = { _id: id, isactive: currentStatus === 1 ? 0 : 1 };
                                const response = await API.CreateUpdateMenus("update", payload);

                                if (response.status === 200) {
                                        showPopup("Status updated successfully", "success");
                                        // Update the status in the local state instead of refetching
                                        setMenus((prevMenus) =>
                                                prevMenus.map((menu) =>
                                                        menu._id === id
                                                                ? { ...menu, isactive: currentStatus === 1 ? 0 : 1 }
                                                                : menu
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
                }
        };

        // Add this function before your return statement
        const openActionMenu = (e, menu) => {
                e.stopPropagation();

                const buttonRect = e.currentTarget.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                const spaceBelow = viewportHeight - buttonRect.bottom;
                const position = spaceBelow < 120 ? "top" : "bottom";

                setActionMenu({
                        open: true,
                        employee: menu, // keeping the key name as 'employee' to match your existing logic
                        position,
                });
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Menu</h2>
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
                                                                        onClick={() => setIsSidebarOpen(true)}
                                                                        disabled={loading}
                                                                >
                                                                        Add Menu
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
                                                                                        <div className="th-content">Menu <span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("name")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Icon <span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("icon")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Display Order <span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("displayorder")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">Status <span className="material-symbols-outlined main-color fs-20 pointer rotate-90" onClick={() => handleSort("isactive")}>{Config.icons["sort"]}</span></div>
                                                                                </th>

                                                                        </tr>
                                                                </thead>

                                                                <tbody>
                                                                        {loading && menus.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : menus.length > 0 ? (
                                                                                <>
                                                                                        {menus.map((menu) => (
                                                                                                <tr key={menu._id}>
                                                                                                        <td className="common-table-td" style={{ position: "relative" }}>
                                                                                                                <button
                                                                                                                        className="actionbtn"
                                                                                                                        onClick={(e) => {
                                                                                                                                if (!canAnyAction) return;
                                                                                                                                openActionMenu(e, menu);
                                                                                                                        }}
                                                                                                                        disabled={!canAnyAction}
                                                                                                                >
                                                                                                                        <span className="material-symbols-outlined white fs-20">
                                                                                                                                more_vert
                                                                                                                        </span>
                                                                                                                </button>

                                                                                                                {actionMenu.open &&
                                                                                                                        actionMenu.employee?._id === menu._id && (
                                                                                                                                <div ref={actionMenuRef} className={`action-menu ${actionMenu.position}`} >
                                                                                                                                        {canUpdate && (
                                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                                        handleEdit(menu);
                                                                                                                                                        setActionMenu({ open: false, employee: null, position: "bottom" });
                                                                                                                                                }}>
                                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">edit</span> Edit
                                                                                                                                                </p>
                                                                                                                                        )}

                                                                                                                                        {canDelete && (
                                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                                        setDeleteId(menu._id);
                                                                                                                                                        setModalVisible(true);
                                                                                                                                                        setActionMenu({ open: false, employee: null, position: "bottom" });
                                                                                                                                                }}>
                                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">delete</span> Delete
                                                                                                                                                </p>
                                                                                                                                        )}
                                                                                                                                </div>
                                                                                                                        )}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">{menu.name}</td>
                                                                                                        <td className="common-table-td">
                                                                                                                {menu.name ? (
                                                                                                                        Method.tooltip(
                                                                                                                                menu.name,
                                                                                                                                <span className="material-symbols-outlined main-color fs-30">
                                                                                                                                        {menu.icon}
                                                                                                                                </span>,
                                                                                                                                "top"
                                                                                                                        )
                                                                                                                ) : (
                                                                                                                        "-"
                                                                                                                )}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">{menu.displayorder ? menu.displayorder : '-'}</td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        menu.isactive === 1 ? "Active" : "Inactive",
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                checked={menu.isactive === 1}
                                                                                                                                className={`chk-checkbox ${!canUpdate ? "chk-disabled" : ""}`}
                                                                                                                                onChange={() => handleToggleStatus(menu._id, menu.isactive)}
                                                                                                                        />,
                                                                                                                        "top"
                                                                                                                )}
                                                                                                        </td>
                                                                                                </tr>
                                                                                        ))}
                                                                                </>
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan="5" style={{ textAlign: "center", padding: "30px" }}>
                                                                                                {/* No menus found */}
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                        {loading && menus.length > 0 && (
                                                                // <div style={{ textAlign: "center", padding: "20px" }}>
                                                                //         Loading more...
                                                                // </div>
                                                                Method.showLoader()
                                                        )}
                                                </div>
                                        </div>
                                </div>

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

                                        <h3>{editingId ? "Update Menu" : "Add Menu"}</h3>

                                        <form onSubmit={handleSubmit} className="sidebar-form">
                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Name <span className="required">*</span>
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

                                                {/* Sub Menu Checkbox */}
                                                <div className="form-group checkbox-group custom-checkbox-wrapper">
                                                        <label className="form-group-label pointer gap-10 max-width">
                                                                <input
                                                                        type="checkbox"
                                                                        name="submenu"
                                                                        className="common-input-text"
                                                                        checked={formData.submenu === 1}
                                                                        onChange={handleChange}
                                                                />Sub Menu</label>
                                                </div>

                                                {formData.submenu === 1 && (
                                                        <div className="form-group">
                                                                <label className="form-group-label">
                                                                        Parent Menu <span className="required">*</span>
                                                                </label>
                                                                <div className="custom-dropdown">
                                                                        <div
                                                                                className="custom-dropdown-selected"
                                                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                                        >
                                                                                {formData.parentmenuid
                                                                                        ? menus.find((m) => m._id === formData.parentmenuid)?.name
                                                                                        : "-- Select Parent Menu --"}
                                                                                <span className="material-symbols-outlined fs-20 arrow" style={{
                                                                                        transform: dropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                        transition: "transform 0.3s ease",
                                                                                }}>keyboard_arrow_right</span>
                                                                        </div>

                                                                        {dropdownOpen && (
                                                                                Method.renderDropdownOptions({
                                                                                        options: parentMenus.map((m) => ({ value: m._id, label: m.name })),
                                                                                        activeValue: formData.parentmenuid || "",
                                                                                        onSelect: (parentmenuid) => {
                                                                                                setFormData({
                                                                                                        ...formData,
                                                                                                        parentmenuid,
                                                                                                });
                                                                                                setDropdownOpen(false);
                                                                                        },
                                                                                })
                                                                        )}
                                                                </div>
                                                        </div>
                                                )}

                                                {/* Display Order */}
                                                <div className="form-group">
                                                        <label className="form-group-label">Display Order</label>
                                                        <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="\d*"
                                                                name="displayorder"
                                                                className="common-input-text"
                                                                value={formData.displayorder || ""}
                                                                onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (/^\d*$/.test(value)) {
                                                                                handleChange(e);
                                                                        }
                                                                }}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                        />
                                                </div>

                                                {/* Icon */}
                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Icon Class <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                className="common-input-text"
                                                                name="icon"
                                                                value={formData.icon || ""}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                </div>

                                                {/* Redirect URL */}
                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Redirect URL <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="redirecturl"
                                                                className="common-input-text"
                                                                value={formData.redirecturl || ""}
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

                                                        <p className="note required fs-15">This action cannot be undone.</p>

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

export default MenuManager;
