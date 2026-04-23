import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./Table.css";
import { Navbar, Method, API } from "../config/Init.js"

function ShiftAssignMaster() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canDelete = Method.canAccess(pagePath, "delete");
        const canAnyAction = canUpdate || canDelete;
        const [shiftAssigns, setShiftAssigns] = useState([]);

        const [shiftTimes, setShiftTimes] = useState([]);
        const [employees, setEmployees] = useState([]);

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

        const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
        const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);

        const [actionMenu, setActionMenu] = useState({ open: false, table: null, position: "bottom-right", isClosing: false });
        const actionMenuRef = useRef(null);

        const openActionMenu = (e, table) => {
                const position = Method.getActionMenuPosition(e.target);
                setActionMenu({ open: true, table, position, isClosing: false });
        };

        const closeActionMenu = () => {
                setActionMenu((prev) => ({ ...prev, isClosing: true }));
                setTimeout(() => setActionMenu({ open: false, table: null, position: "bottom-right", isClosing: false }), 300);
        };

        const closeAlertModal = () => {
                setIsAnimatingAlertOut(true);
                setTimeout(() => {
                        setModalVisible(false);
                        setDeleteId(null);
                        setIsAnimatingAlertOut(false);
                }, 300);
        };

        useEffect(() => {
                const handleClickOutside = (event) => {
                        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                                closeActionMenu();
                        }
                };
                if (actionMenu.open && !actionMenu.isClosing) {
                        document.addEventListener("mousedown", handleClickOutside);
                }
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [actionMenu.open, actionMenu.isClosing]);

        useEffect(() => {
                const handleGlobalClick = () => {
                        setEmpDropdownOpen(false);
                        setShiftDropdownOpen(false);
                };
                document.addEventListener('click', handleGlobalClick);
                return () => document.removeEventListener('click', handleGlobalClick);
        }, []);

        const showPopup = (message, type = "error") => Method.showPopup(setPopup, popupTimer, message, type);

        const fetchDropdownData = async () => {
                try {
                        const shiftResponse = await API.fetchShiftTimes(1, 1000);
                        if (shiftResponse.status === 200) setShiftTimes(shiftResponse.data || []);
                        const empResponse = await API.fetchEmployees(1, 1000);
                        if (empResponse.status === 200) setEmployees(empResponse.data || []);
                } catch (e) { }
        }

        const fetchShiftAssigns = async (pageno = 1, reset = false, searchtext = "") => {
                if (loading) return;
                try {
                        setLoading(true);
                        const response = await API.fetchShiftAssigns(pageno, 20, { _id: -1 }, {}, {}, searchtext);
                        if (response.status === 200) {
                                const data = response.data || [];
                                if (reset || pageno === 1) {
                                        setShiftAssigns(data);
                                } else {
                                        setShiftAssigns((prev) => [...prev, ...data]);
                                }
                                setPage(pageno);
                                setHasNextPage(data.length === 20);
                        } else {
                                showPopup(response.message || "Failed to fetch shift assignments");
                        }
                } catch (err) {
                        showPopup("Server error while fetching");
                } finally {
                        setLoading(false);
                }
        };

        useEffect(() => {
                fetchDropdownData();
                fetchShiftAssigns(1, true, searchText);
        }, [searchText]);

        const handleSubmit = async (e) => {
                e.preventDefault();
                try {
                        setLoading(true);
                        // find full details for payload
                        const emp = employees.find(x => x._id === formData.employeeid);
                        const shf = shiftTimes.find(x => x._id === formData.shiftid);

                        let payload = {
                                ...formData,
                                employeedetails: emp,
                                shiftTimedetails: shf
                        };

                        let response;
                        if (editingId) {
                                payload._id = editingId;
                                response = await API.UpdateShiftAssign(payload);
                        } else {
                                response = await API.CreateShiftAssign(payload);
                        }

                        if (response.status === 200) {
                                showPopup(response.message || "Success", "success");
                                setFormData({});
                                setEditingId(null);
                                setIsSidebarOpen(false);
                                fetchShiftAssigns(1, true);
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
                try {
                        setLoading(true);
                        const response = await API.RemoveShiftAssign(deleteId);
                        if (response.status === 200) {
                                showPopup("Assignment deleted", "success");
                                fetchShiftAssigns(1, true);
                        } else {
                                showPopup(response.message || "Failed to delete");
                        }
                } catch (e) {
                        showPopup("Error deleting");
                } finally {
                        setLoading(false);
                }
        }

        const handleChange = (e) => {
                const { name, value, type, checked } = e.target;
                setFormData({ ...formData, [name]: type === "checkbox" ? (checked ? 1 : 0) : value });
        };

        const handleEdit = (item) => {
                setFormData({
                        employeeid: item.employeeid,
                        shiftid: item.shiftid,
                        assigndate: item.assigndate,
                        status: item.status
                });
                setEditingId(item._id);
                setIsSidebarOpen(true);
        };

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Shift Assignments</h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">search</span>
                                                                <input type="text" placeholder="Search" className="search-input" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                                                        </div>
                                                        {canAdd && (
                                                                <button className="main-btn" onClick={() => { setIsSidebarOpen(true); setFormData({}); setEditingId(null); }}>
                                                                        Assign Shift
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
                                                                                <th className="common-table-th">Employee Name</th>
                                                                                <th className="common-table-th">Role</th>
                                                                                <th className="common-table-th">Shift Name</th>
                                                                                <th className="common-table-th">Assigned Date</th>
                                                                                <th className="common-table-th">Status</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading && shiftAssigns.length === 0 ? (
                                                                                <tr><td className="common-table-td" colSpan="6" style={{ textAlign: "center", padding: "40px" }}>{Method.showLoader()}</td></tr>
                                                                        ) : shiftAssigns.length > 0 ? (
                                                                                shiftAssigns.map((item) => (
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

                                                                                                        {(actionMenu.open || actionMenu.isClosing) && actionMenu.table?._id === item._id && (
                                                                                                                <div ref={actionMenuRef} className={`action-menu ${actionMenu.position} ${actionMenu.isClosing ? 'closing' : ''}`}>
                                                                                                                        {canUpdate && (
                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        handleEdit(item);
                                                                                                                                        closeActionMenu();
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">edit</span> Edit
                                                                                                                                </p>
                                                                                                                        )}

                                                                                                                        {canDelete && (
                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        setDeleteId(item._id);
                                                                                                                                        setIsAnimatingAlertOut(false);
                                                                                                                                        setModalVisible(true);
                                                                                                                                        closeActionMenu();
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">delete</span> Delete
                                                                                                                                </p>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </td>
                                                                                                <td className="common-table-td">{item.employeedetails?.name || item.employeedetails?.fname}</td>
                                                                                                <td className="common-table-td">{item.employeedetails?.role}</td>
                                                                                                <td className="common-table-td">{item.shiftTimedetails?.timeSlotName}</td>
                                                                                                <td className="common-table-td">{Method.renderDateCard(item.assigndate)}</td>
                                                                                                <td className="common-table-td">{item.status === 1 ? 'Active' : 'Inactive'}</td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr><td className="common-table-td" colSpan="6" style={{ textAlign: "center", padding: "40px" }}>{Method.noDataFound()}</td></tr>
                                                                        )}
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                </div>

                                {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

                                <div className={`sidebar-panel ${isSidebarOpen ? "open" : ""}`}>
                                        <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>
                                                <span className="material-symbols-outlined fs-20">close</span>
                                        </button>

                                        <h3>{editingId ? "Update Assignment" : "Assign Shift"}</h3>

                                        <form onSubmit={handleSubmit} className="sidebar-form">
                                                <div className="form-group">
                                                        <label className="form-group-label">Employee <span className="required">*</span></label>
                                                        <div className="custom-dropdown" onClick={(e) => { e.stopPropagation(); setEmpDropdownOpen(!empDropdownOpen); setShiftDropdownOpen(false); }}>
                                                                <div className="custom-dropdown-selected">
                                                                        {formData.employeeid ? employees.find(e => e._id === formData.employeeid)?.name || employees.find(e => e._id === formData.employeeid)?.fname || 'Select Employee' : 'Select Employee'}
                                                                        <span className="material-symbols-outlined dropdown-arrow" style={{ transform: empDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                                                                                keyboard_arrow_down
                                                                        </span>
                                                                </div>
                                                                {empDropdownOpen && Method.renderDropdownOptions({
                                                                        options: employees.map((e) => ({ value: e._id, label: e.name || e.fname })),
                                                                        activeValue: formData.employeeid || "",
                                                                        onSelect: (employeeid) => {
                                                                                setFormData({ ...formData, employeeid });
                                                                                setEmpDropdownOpen(false);
                                                                        },
                                                                })}
                                                        </div>
                                                </div>
                                                <div className="form-group">
                                                        <label className="form-group-label">Shift Time <span className="required">*</span></label>
                                                        <div className="custom-dropdown" onClick={(e) => { e.stopPropagation(); setShiftDropdownOpen(!shiftDropdownOpen); setEmpDropdownOpen(false); }}>
                                                                <div className="custom-dropdown-selected">
                                                                        {formData.shiftid ? shiftTimes.find(s => s._id === formData.shiftid)?.timeSlotName || 'Select Shift' : 'Select Shift'}
                                                                        <span className="material-symbols-outlined dropdown-arrow" style={{ transform: shiftDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                                                                                keyboard_arrow_down
                                                                        </span>
                                                                </div>
                                                                {shiftDropdownOpen && Method.renderDropdownOptions({
                                                                        options: shiftTimes.map((s) => ({ value: s._id, label: s.timeSlotName })),
                                                                        activeValue: formData.shiftid || "",
                                                                        onSelect: (shiftid) => {
                                                                                setFormData({ ...formData, shiftid });
                                                                                setShiftDropdownOpen(false);
                                                                        },
                                                                })}
                                                        </div>
                                                </div>
                                                {/*  <div className="form-group">
                                                        <label className="form-group-label">Date (YYYY-MM-DD) <span className="required">*</span></label>
                                                        <input type="date" name="assigndate" className="common-input-text" value={formData.assigndate || ""} onChange={handleChange} required />
                                                </div>
                                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <label className="form-group-label">Active Status</label>
                                                        <input type="checkbox" name="status" checked={formData.status === undefined ? true : formData.status === 1} onChange={handleChange} className="chk-checkbox" />
                                                </div>*/}
                                                <div className="form-footer">
                                                        <button type="submit" disabled={loading} className="main-btn">Save</button>
                                                </div>
                                        </form>
                                </div >

                                {modalVisible && (
                                        <div className="modal-overlay">
                                                <div className={`modal-content-select alert-modal width-40 ${isAnimatingAlertOut ? "fade-out" : ""}`}>
                                                        <span className="material-symbols-outlined modal-icon required fs-50">delete</span>
                                                        <h3 className="modal-title fs-25 required">Are you sure?</h3>
                                                        <p className="modal-description fs-20 required">
                                                                Do you really want to delete this assignment?
                                                        </p>
                                                        <p className="note required fs-20">This action cannot be undone.</p>
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
                                )
                                }

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div >
                </>
        );
}

export default ShiftAssignMaster;
