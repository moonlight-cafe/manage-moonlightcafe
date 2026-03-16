import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./Background.css";
import { Navbar, Method, API, Config } from "../config/Init.js";

function BackgroundManager() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canDelete = Method.canAccess(pagePath, "delete");
        const [items, setItems] = useState([]);
        const [formData, setFormData] = useState({});
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const popupTimer = useRef(null);
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [modalVisible, setModalVisible] = useState(false);
        const [deleteId, setDeleteId] = useState(null);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);
        const [viewMode, setViewMode] = useState("table");
        const [isDragging, setIsDragging] = useState(false);

        // Action menu state
        const [actionMenu, setActionMenu] = useState({
                open: false,
                item: null,
                position: "bottom",
        });
        const actionMenuRef = useRef(null);

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        // Handle click outside action menu
        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                                setActionMenu({ open: false, item: null, position: "bottom" });
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const fetchBackgrounds = async () => {
                try {
                        setLoading(true);
                        const res = await API.fetchBackground();
                        if (res.status === 200) {
                                setItems(res.data || []);
                                // Update cookie with active background images
                                updateBackgroundImagesCookie(res.data || []);
                        } else {
                                showPopup(res.message || "Failed to load background images");
                        }
                } catch (err) {
                        console.error("Fetch backgrounds error:", err);
                        showPopup("Failed to load background images");
                } finally {
                        setLoading(false);
                }
        };

        // Update background images cookie with only active images
        const updateBackgroundImagesCookie = (images) => {
                try {
                        // Filter only active images (status === 1) and extract URLs
                        const activeImages = images
                                .filter((img) => img.status === 1)
                                .map((img) => img.url);

                        // Update the cookie
                        Method.setCookie("backgroundimgs", activeImages);

                        // Dispatch event to notify BackgroundManager
                        window.dispatchEvent(new Event("themeChanged"));
                } catch (err) {
                        console.error("Failed to update background images cookie:", err);
                }
        };

        useEffect(() => {
                fetchBackgrounds();
        }, [fetchBackgrounds]);

        const handleSubmit = async (e) => {
                e.preventDefault();
                if (!canAdd) {
                        showPopup("You don't have permission to add background images");
                        return;
                }
                if (!formData.file) {
                        showPopup("Please select an image");
                        return;
                }

                try {
                        setLoading(true);
                        const payload = { file: formData.file };
                        const res = await API.CreateUpdateBackground("add", payload);

                        if (res.status === 200) {
                                showPopup("Background added successfully", "success");
                                setFormData({});
                                setIsSidebarOpen(false);
                                await fetchBackgrounds();
                        } else {
                                showPopup(res.message || "Failed to add background");
                        }
                } catch (err) {
                        console.error("Add background error:", err);
                        showPopup("Failed to add background");
                } finally {
                        setLoading(false);
                }
        };

        const handleChange = (e) => {
                const { name, value, type, files } = e.target;

                if (type === "file") {
                        const file = files && files[0];
                        if (!file) return;

                        // Validate file type
                        if (!file.type.startsWith("image/")) {
                                showPopup("Please select a valid image file");
                                return;
                        }

                        // Validate file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                                showPopup("Image size should be less than 5MB");
                                return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                                setFormData((prev) => ({
                                        ...prev,
                                        file: reader.result, // Base64 string
                                }));
                        };
                        reader.readAsDataURL(file);
                        return;
                }

                setFormData((prev) => ({
                        ...prev,
                        [name]: value,
                }));
        };

        const handleToggleStatus = async (id, currentStatus) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update background status");
                        return;
                }
                try {
                        setLoading(true);
                        const payload = { _id: id, status: currentStatus === 1 ? 0 : 1 };
                        const response = await API.CreateUpdateBackground("update", payload);

                        if (response.status === 200) {
                                showPopup("Status updated successfully", "success");
                                const updatedItems = items.map((item) =>
                                        item._id === id
                                                ? { ...item, status: currentStatus === 1 ? 0 : 1 }
                                                : item
                                );
                                setItems(updatedItems);
                                // Update cookie with new status
                                updateBackgroundImagesCookie(updatedItems);
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

        const handleDelete = async (id) => {
                if (!canDelete) {
                        showPopup("You don't have permission to delete background images");
                        return;
                }
                try {
                        setLoading(true);
                        const response = await API.RemoveBackground(id);

                        if (response.status === 200) {
                                showPopup("Background deleted successfully", "success");
                                await fetchBackgrounds();
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
                        setIsAnimatingAlertOut(false);
                }, 300);
        };

        const openActionMenu = (e, item) => {
                e.stopPropagation();

                const buttonRect = e.currentTarget.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                const spaceBelow = viewportHeight - buttonRect.bottom;
                const position = spaceBelow < 120 ? "top" : "bottom";

                setActionMenu({
                        open: true,
                        item,
                        position,
                });
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Background Images</h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="view-toggle-container">
                                                                {Method.tooltip(
                                                                        "Table View",
                                                                        <button
                                                                                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                                                                                onClick={() => setViewMode("table")}
                                                                        >
                                                                                <span className="material-symbols-outlined">table_rows</span>
                                                                        </button>,
                                                                        "bottom"
                                                                )}
                                                                {Method.tooltip(
                                                                        "Gallery View",
                                                                        <button
                                                                                className={`view-toggle-btn ${viewMode === "gallery" ? "active" : ""}`}
                                                                                onClick={() => setViewMode("gallery")}
                                                                        >
                                                                                <span className="material-symbols-outlined">grid_view</span>
                                                                        </button>,
                                                                        "bottom"

                                                                )}
                                                        </div>
                                                        {canAdd && (
                                                                <button
                                                                        className="main-btn"
                                                                        onClick={() => {
                                                                                setIsSidebarOpen(true);
                                                                        }}
                                                                        disabled={loading}
                                                                >
                                                                        Add Background
                                                                </button>
                                                        )}
                                                </div>
                                        </div>

                                        {viewMode === "table" ? (
                                                <div className="common-table-container">
                                                        <div className="common-table-wrapper">
                                                                <table className="common-table">
                                                                        <thead>
                                                                                <tr>
                                                                                        <th className="common-table-th">Actions</th>
                                                                                        <th className="common-table-th">Image</th>
                                                                                        <th className="common-table-th">Status</th>
                                                                                </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                                {loading && items.length === 0 ? (
                                                                                        <tr>
                                                                                                <td
                                                                                                        className="common-table-td"
                                                                                                        colSpan="3"
                                                                                                        style={{ textAlign: "center", padding: "40px" }}
                                                                                                >
                                                                                                        {Method.showLoader()}
                                                                                                </td>
                                                                                        </tr>
                                                                                ) : items.length > 0 ? (
                                                                                        items.map((item) => (
                                                                                                <tr key={item._id}>
                                                                                                        <td className="common-table-td" style={{ position: "relative" }}>
                                                                                                                <button
                                                                                                                        className="actionbtn"
                                                                                                                        onClick={(e) => {
                                                                                                                                if (!canDelete) return;
                                                                                                                                openActionMenu(e, item);
                                                                                                                        }}
                                                                                                                        disabled={!canDelete}
                                                                                                                >
                                                                                                                        <span className="material-symbols-outlined white fs-20">
                                                                                                                                more_vert
                                                                                                                        </span>
                                                                                                                </button>

                                                                                                                {actionMenu.open &&
                                                                                                                        actionMenu.item?._id === item._id && (
                                                                                                                                <div
                                                                                                                                        ref={actionMenuRef}
                                                                                                                                        className={`action-menu ${actionMenu.position}`}
                                                                                                                                >
                                                                                                                                        {canDelete && (
                                                                                                                                                <p
                                                                                                                                                        className="action-menu-item"
                                                                                                                                                        onClick={() => {
                                                                                                                                                                setDeleteId(item._id);
                                                                                                                                                                setModalVisible(true);
                                                                                                                                                                setActionMenu({
                                                                                                                                                                        open: false,
                                                                                                                                                                        item: null,
                                                                                                                                                                        position: "bottom",
                                                                                                                                                                });
                                                                                                                                                        }}
                                                                                                                                                >
                                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">
                                                                                                                                                                delete
                                                                                                                                                        </span>{" "}
                                                                                                                                                        Delete
                                                                                                                                                </p>
                                                                                                                                        )}
                                                                                                                                </div>
                                                                                                                        )}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">
                                                                                                                <img
                                                                                                                        src={item.url}
                                                                                                                        alt="Background"
                                                                                                                        className="bg-thumb"
                                                                                                                        onError={(e) => {
                                                                                                                                e.target.src = Config.nodatafoundimg;
                                                                                                                        }}
                                                                                                                />
                                                                                                        </td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        item.status === 1 ? "Active" : "Inactive",
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                checked={item.status === 1}
                                                                                                                                className={`chk-checkbox ${!canUpdate ? "chk-disabled" : ""}`}
                                                                                                                                onChange={() =>
                                                                                                                                        handleToggleStatus(item._id, item.status)
                                                                                                                                }
                                                                                                                        />,
                                                                                                                        "top"
                                                                                                                )}
                                                                                                        </td>
                                                                                                </tr>
                                                                                        ))
                                                                                ) : (
                                                                                        <tr>
                                                                                                <td
                                                                                                        className="common-table-td"
                                                                                                        colSpan="3"
                                                                                                        style={{ textAlign: "center", padding: "40px" }}
                                                                                                >
                                                                                                        {Method.noDataFound()}
                                                                                                </td>
                                                                                        </tr>
                                                                                )}
                                                                        </tbody>
                                                                </table>
                                                        </div>
                                                </div>
                                        ) : (
                                                <div className="gallery-container">
                                                        {loading && items.length === 0 ? (
                                                                <div className="gallery-loading">
                                                                        {Method.showLoader()}
                                                                </div>
                                                        ) : items.length > 0 ? (
                                                                <div className="gallery-grid">
                                                                        {items.map((item) => (
                                                                                <div key={item._id} className="gallery-card">
                                                                                        <div className="gallery-card-image-wrapper">
                                                                                                <img
                                                                                                        src={item.url}
                                                                                                        alt="Background"
                                                                                                        className="gallery-card-image"
                                                                                                        onError={(e) => {
                                                                                                                e.target.src = Config.nodatafoundimg;
                                                                                                        }}
                                                                                                />
                                                                                        </div>
                                                                                        <div className="gallery-card-footer">
                                                                                                <div className="gallery-card-status">
                                                                                                        <label className="gallery-status-label">
                                                                                                                {item.status === 1 ? "Active" : "Inactive"}
                                                                                                        </label>
                                                                                                        {Method.tooltip(
                                                                                                                item.status === 1 ? "Active" : "Inactive",
                                                                                                                <input
                                                                                                                        type="checkbox"
                                                                                                                        checked={item.status === 1}
                                                                                                                        className={`chk-checkbox ${!canUpdate ? "chk-disabled" : ""}`}
                                                                                                                        onChange={() =>
                                                                                                                                handleToggleStatus(item._id, item.status)
                                                                                                                        }
                                                                                                                />,
                                                                                                                "top"
                                                                                                        )}
                                                                                                </div>
                                                                                                <button
                                                                                                        className={`gallery-delete-btn ${!canDelete ? "btn-disabled" : ""}`}
                                                                                                        onClick={() => {
                                                                                                                console.log("🚀 ~ Background.js:429 ~ BackgroundManager ~ canDelete>>", canDelete);

                                                                                                                if (!canDelete) {
                                                                                                                        showPopup("You don't have permission to delete background images");
                                                                                                                        return;
                                                                                                                }
                                                                                                                setDeleteId(item._id);
                                                                                                                setModalVisible(true);
                                                                                                        }}
                                                                                                        title="Delete"
                                                                                                >
                                                                                                        <span className="material-symbols-outlined">
                                                                                                                delete
                                                                                                        </span>
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                        ))}
                                                                </div>
                                                        ) : (
                                                                <div className="gallery-empty">
                                                                        {Method.noDataFound()}
                                                                </div>
                                                        )}
                                                </div>
                                        )}
                                </div>

                                {/* Sidebar for Add Background */}
                                {isSidebarOpen && (
                                        <div
                                                className="sidebar-overlay"
                                                onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        setFormData({});
                                                }}
                                        ></div>
                                )}

                                <div className={`sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
                                        <button
                                                className="sidebar-close-btn"
                                                onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        setFormData({});
                                                }}
                                        >
                                                <span className="material-symbols-outlined fs-20">close</span>
                                        </button>

                                        <h3>Add Background</h3>

                                        <form onSubmit={handleSubmit} className="sidebar-form">
                                                <div className="form-group image-upload-group">
                                                        <label className="form-group-label">
                                                                Background Image <span className="required">*</span>
                                                        </label>

                                                        {/* Drag and Drop Zone */}
                                                        <div
                                                                className={`bg-upload-zone ${isDragging ? "dragging" : ""}`}
                                                                onDragOver={(e) => {
                                                                        e.preventDefault();
                                                                        setIsDragging(true);
                                                                }}
                                                                onDragLeave={() => setIsDragging(false)}
                                                                onDrop={(e) => {
                                                                        e.preventDefault();
                                                                        setIsDragging(false);
                                                                        const file = e.dataTransfer.files[0];
                                                                        if (file && file.type.startsWith("image/")) {
                                                                                if (file.size > 5 * 1024 * 1024) {
                                                                                        showPopup("Image size should be less than 5MB");
                                                                                        return;
                                                                                }
                                                                                const reader = new FileReader();
                                                                                reader.onloadend = () => {
                                                                                        setFormData((prev) => ({
                                                                                                ...prev,
                                                                                                file: reader.result,
                                                                                        }));
                                                                                };
                                                                                reader.readAsDataURL(file);
                                                                        } else {
                                                                                showPopup("Please select a valid image file");
                                                                        }
                                                                }}
                                                        >
                                                                <input
                                                                        type="file"
                                                                        id="background-file-input"
                                                                        name="file"
                                                                        accept="image/*"
                                                                        onChange={handleChange}
                                                                        required
                                                                        className="bg-file-input"
                                                                />
                                                                <div className="bg-upload-content">
                                                                        {formData.file ? (
                                                                                <div className="bg-upload-preview">
                                                                                        <img
                                                                                                src={formData.file}
                                                                                                alt="Preview"
                                                                                                className="bg-preview-image"
                                                                                        />
                                                                                        <button
                                                                                                type="button"
                                                                                                className="bg-remove-preview"
                                                                                                onClick={(e) => {
                                                                                                        e.preventDefault();
                                                                                                        setFormData((prev) => ({ ...prev, file: null }));
                                                                                                }}
                                                                                        >
                                                                                                <span className="material-symbols-outlined">close</span>
                                                                                        </button>
                                                                                </div>
                                                                        ) : (
                                                                                <>
                                                                                        <div className="bg-upload-icon">
                                                                                                <span className="material-symbols-outlined">cloud_upload</span>
                                                                                        </div>
                                                                                        <p className="bg-upload-text">
                                                                                                <span className="bg-upload-link">Click to upload</span> or drag and drop
                                                                                        </p>
                                                                                        <p className="bg-upload-hint">PNG, JPG, GIF up to 5MB</p>
                                                                                </>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>

                                                <div className="form-footer">
                                                        <button type="submit" disabled={loading || !formData.file} className="main-btn">
                                                                {loading ? (
                                                                        <>
                                                                                <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>
                                                                                        cached
                                                                                </span>
                                                                                Uploading...
                                                                        </>
                                                                ) : (
                                                                        <>
                                                                                <span className="material-symbols-outlined">upload</span>
                                                                                Upload Image
                                                                        </>
                                                                )}
                                                        </button>
                                                </div>
                                        </form>
                                </div>

                                {/* Delete Confirmation Modal */}
                                {modalVisible && (
                                        <div className="modal-overlay">
                                                <div
                                                        className={`modal-content-select width-40 alert-modal ${isAnimatingAlertOut ? "fade-out" : ""
                                                                }`}
                                                >
                                                        <span className="material-symbols-outlined modal-icon required fs-50">
                                                                delete
                                                        </span>

                                                        <h3 className="modal-title fs-25 required">Are you sure?</h3>

                                                        <p className="modal-description fs-20 required">
                                                                Do you really want to delete this background image?
                                                        </p>

                                                        <p className="note required fs-15">This action cannot be undone.</p>

                                                        <div>
                                                                <button
                                                                        className="main-cancle-btn mr-20"
                                                                        onClick={() => {
                                                                                if (deleteId) handleDelete(deleteId);
                                                                                closeAlertModal();
                                                                        }}
                                                                >
                                                                        Yes, Delete
                                                                </button>

                                                                <button className="main-btn ml-20" onClick={closeAlertModal}>
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

export default BackgroundManager;
