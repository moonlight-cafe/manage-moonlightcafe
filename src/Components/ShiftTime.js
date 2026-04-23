import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Navbar, Method, API } from "../config/Init.js";

function ShiftTimeMaster() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canDelete = Method.canAccess(pagePath, "delete");
        const canAnyAction = canUpdate || canDelete;

        const [shiftTimes, setShiftTimes] = useState([]);
        const [formData, setFormData] = useState({});
        const [editingId, setEditingId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [searchText, setSearchText] = useState("");
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [activeTimePicker, setActiveTimePicker] = useState(null);
        const [modalVisible, setModalVisible] = useState(false);
        const [deleteId, setDeleteId] = useState(null);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);
        const [actionMenu, setActionMenu] = useState({ open: false, shiftTime: null, position: "bottom-right", style: {} });

        const popupTimer = useRef(null);
        const startTimePickerRef = useRef(null);
        const endTimePickerRef = useRef(null);
        const actionMenuRef = useRef(null);

        const showPopup = React.useCallback((message, type = "error") => Method.showPopup(setPopup, popupTimer, message, type), []);
        const totalColumns = canAnyAction ? 4 : 3;

        const resetForm = () => {
                setFormData({});
                setEditingId(null);
                setActiveTimePicker(null);
        };

        const closeSidebar = () => {
                setIsSidebarOpen(false);
                resetForm();
        };

        const closeActionMenu = () => {
                setActionMenu({ open: false, shiftTime: null, position: "bottom-right", style: {} });
        };

        const closeAlertModal = () => {
                setIsAnimatingAlertOut(true);
                setTimeout(() => {
                        setModalVisible(false);
                        setDeleteId(null);
                        setIsAnimatingAlertOut(false);
                }, 300);
        };

        const openActionMenu = (event, shiftTime) => {
                event.stopPropagation();
                const { position, style } = Method.getActionMenuPosition(event.currentTarget);

                setActionMenu((prev) => {
                        const isSameItem = prev.open && prev.shiftTime?._id === shiftTime?._id;
                        if (isSameItem) {
                                return { open: false, shiftTime: null, position: "bottom-right", style: {} };
                        }

                        return { open: true, shiftTime, position, style };
                });
        };

        const fetchShiftTimes = React.useCallback(async (searchtext = "") => {
                try {
                        setLoading(true);
                        const response = await API.fetchShiftTimes(1, 20, { _id: -1 }, {}, {}, searchtext);

                        if (response.status === 200) {
                                setShiftTimes(response.data || []);
                        } else {
                                showPopup(response.message || "Failed to fetch shift times");
                        }
                } catch (err) {
                        showPopup("Server error while fetching");
                } finally {
                        setLoading(false);
                }
        }, [showPopup]);

        useEffect(() => {
                fetchShiftTimes(searchText);
        }, [fetchShiftTimes, searchText]);

        useEffect(() => {
                const handleClickOutside = (event) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                                closeActionMenu();
                        }
                };

                if (actionMenu.open) {
                        document.addEventListener("mousedown", handleClickOutside);
                }

                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [actionMenu.open]);

        useEffect(() => {
                if (!activeTimePicker) return;

                const handleOutsideClick = (event) => {
                        const activeRef = activeTimePicker === "startTime" ? startTimePickerRef : endTimePickerRef;
                        if (activeRef.current && !activeRef.current.contains(event.target)) {
                                setActiveTimePicker(null);
                        }
                };

                const handleEscape = (event) => {
                        if (event.key === "Escape") {
                                setActiveTimePicker(null);
                        }
                };

                document.addEventListener("mousedown", handleOutsideClick);
                document.addEventListener("keydown", handleEscape);

                return () => {
                        document.removeEventListener("mousedown", handleOutsideClick);
                        document.removeEventListener("keydown", handleEscape);
                };
        }, [activeTimePicker]);

        useEffect(() => {
                if (!isSidebarOpen) {
                        setActiveTimePicker(null);
                }
        }, [isSidebarOpen]);

        const handleSubmit = async (event) => {
                event.preventDefault();

                if (editingId && !canUpdate) {
                        showPopup("You don't have permission to update shift time");
                        return;
                }

                if (!editingId && !canAdd) {
                        showPopup("You don't have permission to add shift time");
                        return;
                }

                const trimmedSlotName = String(formData.timeSlotName || "").trim();
                if (!trimmedSlotName || !formData.startTime || !formData.endTime) {
                        showPopup("Please fill all required fields");
                        return;
                }

                try {
                        setLoading(true);
                        const payload = {
                                timeSlotName: trimmedSlotName,
                                startTime: formData.startTime,
                                endTime: formData.endTime,
                        };

                        const response = editingId
                                ? await API.UpdateShiftTime({ _id: editingId, ...payload })
                                : await API.CreateShiftTime(payload);

                        if (response.status === 200) {
                                let successMessage = response.message || (editingId ? "Shift Time updated successfully" : "Shift Time created successfully");

                                if (editingId && Number(response.updatedAssignments || 0) > 0) {
                                        successMessage += ` (${response.updatedAssignments} assignments synced)`;
                                }

                                showPopup(successMessage, "success");
                                closeSidebar();
                                await fetchShiftTimes(searchText);
                        } else {
                                showPopup(response.message || "Failed to save");
                        }
                } catch (err) {
                        showPopup(err.response?.data?.message || "Server error while saving");
                } finally {
                        setLoading(false);
                }
        };

        const handleDelete = async () => {
                if (!deleteId) return;

                try {
                        setLoading(true);
                        const response = await API.RemoveShiftTime(deleteId);

                        if (response.status === 200) {
                                let successMessage = response.message || "Shift Time deleted successfully";

                                if (Number(response.deletedAssignments || 0) > 0) {
                                        successMessage += ` (${response.deletedAssignments} assignments removed)`;
                                }

                                showPopup(successMessage, "success");

                                if (editingId === deleteId) {
                                        closeSidebar();
                                }

                                closeActionMenu();
                                await fetchShiftTimes(searchText);
                        } else {
                                showPopup(response.message || "Failed to delete");
                        }
                } catch (err) {
                        showPopup("Error deleting shift time");
                } finally {
                        setLoading(false);
                }
        };

        const handleEdit = (item) => {
                setFormData({
                        timeSlotName: item.timeSlotName || "",
                        startTime: item.startTime || "",
                        endTime: item.endTime || "",
                });
                setEditingId(item._id);
                setIsSidebarOpen(true);
                setActiveTimePicker(null);
        };

        const handleChange = (event) => {
                const { name, value } = event.target;
                setFormData((prev) => ({ ...prev, [name]: value }));
        };

        const updateTimePart = (fieldName, partName, partValue) => {
                const currentParts = Method.getTimeParts(formData[fieldName]);
                const nextParts = {
                        ...currentParts,
                        [partName]: partValue,
                        hasValue: true,
                };

                setFormData((prev) => ({
                        ...prev,
                        [fieldName]: Method.toTwentyFourHourValue(nextParts),
                }));
        };

        const resetTimeField = (fieldName) => {
                setFormData((prev) => ({
                        ...prev,
                        [fieldName]: "",
                }));
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Shift Times</h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">search</span>
                                                                <input
                                                                        type="text"
                                                                        placeholder="Search"
                                                                        className="search-input"
                                                                        value={searchText}
                                                                        onChange={(event) => setSearchText(event.target.value)}
                                                                />
                                                        </div>
                                                        {canAdd && (
                                                                <button
                                                                        className="main-btn"
                                                                        onClick={() => {
                                                                                closeActionMenu();
                                                                                resetForm();
                                                                                setIsSidebarOpen(true);
                                                                        }}
                                                                        disabled={loading}
                                                                >
                                                                        Add Shift Time
                                                                </button>
                                                        )}
                                                </div>
                                        </div>

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                {canAnyAction && <th className="common-table-th">Action</th>}
                                                                                <th className="common-table-th">Slot Name</th>
                                                                                <th className="common-table-th">Start Time</th>
                                                                                <th className="common-table-th">End Time</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && shiftTimes.length === 0 ? (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan={totalColumns} style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : shiftTimes.length > 0 ? (
                                                                                shiftTimes.map((item) => (
                                                                                        <tr key={item._id}>
                                                                                                {canAnyAction && (
                                                                                                        <td className="common-table-td" style={{ position: "relative" }}>
                                                                                                                <button
                                                                                                                        className="actionbtn"
                                                                                                                        onMouseDown={(event) => event.stopPropagation()}
                                                                                                                        onClick={(event) => openActionMenu(event, item)}
                                                                                                                >
                                                                                                                        <span className="material-symbols-outlined white fs-20">more_vert</span>
                                                                                                                </button>

                                                                                                                {actionMenu.open && actionMenu.shiftTime?._id === item._id && (
                                                                                                                        <div ref={actionMenuRef} className={`action-menu ${actionMenu.position}`} style={actionMenu.style}>
                                                                                                                                {canUpdate && (
                                                                                                                                        <p
                                                                                                                                                className="action-menu-item"
                                                                                                                                                onClick={() => {
                                                                                                                                                        handleEdit(item);
                                                                                                                                                        closeActionMenu();
                                                                                                                                                }}
                                                                                                                                        >
                                                                                                                                                <span className="material-symbols-outlined fs-15 ml-10">edit</span>
                                                                                                                                                Edit
                                                                                                                                        </p>
                                                                                                                                )}

                                                                                                                                {canDelete && (
                                                                                                                                        <p
                                                                                                                                                className="action-menu-item"
                                                                                                                                                onClick={() => {
                                                                                                                                                        setDeleteId(item._id);
                                                                                                                                                        setIsAnimatingAlertOut(false);
                                                                                                                                                        setModalVisible(true);
                                                                                                                                                        closeActionMenu();
                                                                                                                                                }}
                                                                                                                                        >
                                                                                                                                                <span className="material-symbols-outlined fs-15 ml-10">delete</span>
                                                                                                                                                Delete
                                                                                                                                        </p>
                                                                                                                                )}
                                                                                                                        </div>
                                                                                                                )}
                                                                                                        </td>
                                                                                                )}
                                                                                                <td className="common-table-td">{item.timeSlotName}</td>
                                                                                                <td className="common-table-td">{Method.formatTimeLabel(item.startTime, item.startTime || "--")}</td>
                                                                                                <td className="common-table-td">{Method.formatTimeLabel(item.endTime, item.endTime || "--")}</td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr>
                                                                                        <td className="common-table-td" colSpan={totalColumns} style={{ textAlign: "center", padding: "40px" }}>
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                </div>

                                {isSidebarOpen && (
                                        <div className="sidebar-overlay" onClick={closeSidebar}></div>
                                )}

                                <div className={`sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
                                        <button className="sidebar-close-btn" onClick={closeSidebar}>
                                                <span className="material-symbols-outlined fs-20">close</span>
                                        </button>

                                        <h3>{editingId ? "Update Shift Time" : "Add Shift Time"}</h3>

                                        <form onSubmit={handleSubmit} className="sidebar-form">
                                                <div className="form-group">
                                                        <label className="form-group-label">Slot Name (e.g., 9 AM - 5 PM) <span className="required">*</span></label>
                                                        <input
                                                                type="text"
                                                                name="timeSlotName"
                                                                className="common-input-text"
                                                                value={formData.timeSlotName || ""}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                </div>
                                                {Method.renderTimePickerField({
                                                        fieldName: "startTime",
                                                        label: "Start Time",
                                                        pickerRef: startTimePickerRef,
                                                        placeholder: "Select Start Time",
                                                        formData,
                                                        activeTimePicker,
                                                        setActiveTimePicker,
                                                        updateTimePart,
                                                        resetTimeField,
                                                })}
                                                {Method.renderTimePickerField({
                                                        fieldName: "endTime",
                                                        label: "End Time",
                                                        pickerRef: endTimePickerRef,
                                                        placeholder: "Select End Time",
                                                        formData,
                                                        activeTimePicker,
                                                        setActiveTimePicker,
                                                        updateTimePart,
                                                        resetTimeField,
                                                })}
                                                <div className="form-footer">
                                                        <button type="submit" disabled={loading} className="main-btn">
                                                                {editingId ? "Update" : "Save"}
                                                        </button>
                                                </div>
                                        </form>
                                </div>

                                {modalVisible && (
                                        <div className="modal-overlay">
                                                <div className={`modal-content-select alert-modal width-40 ${isAnimatingAlertOut ? "fade-out" : ""}`}>
                                                        <span className="material-symbols-outlined modal-icon required fs-50">delete</span>
                                                        <h3 className="modal-title fs-25 required">Are you sure?</h3>
                                                        <p className="modal-description fs-20 required">
                                                                Do you really want to delete this shift time?
                                                        </p>
                                                        <p className="note required fs-20">
                                                                Linked shift assignments will also be removed.
                                                        </p>
                                                        <div>
                                                                <button
                                                                        className="main-cancle-btn mr-20"
                                                                        onClick={() => {
                                                                                if (deleteId) handleDelete();
                                                                                closeAlertModal();
                                                                        }}
                                                                        disabled={loading}
                                                                >
                                                                        Yes, Delete
                                                                </button>
                                                                <button className="main-btn" onClick={closeAlertModal} disabled={loading}>
                                                                        No, Keep
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

export default ShiftTimeMaster;
