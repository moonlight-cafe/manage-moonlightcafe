import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./Employee.css";
import { Navbar, Method, API, Config } from "../config/Init.js";

function Employees() {
        const location = useLocation();
        const pagePath = location?.pathname || "";
        const canView = Method.canAccess(pagePath, "view");
        const canAdd = Method.canAccess(pagePath, "insert");
        const canUpdate = Method.canAccess(pagePath, "update");
        const canAnyAction = canView || canUpdate;
        const [employees, setEmployees] = useState([]);
        const [formData, setFormData] = useState({});
        const [editingId, setEditingId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [searchText, setSearchText] = useState("");
        const popupTimer = useRef(null);

        const [isSidebarOpen, setIsSidebarOpen] = useState(false);

        // Infinite scroll
        const [page, setPage] = useState(1);
        const [hasNextPage, setHasNextPage] = useState(true);

        const [sortBy, setSortBy] = useState("_id");
        const [sortOrder, setSortOrder] = useState(1);

        // Track API call state
        const isFetchingRef = useRef(false);

        // Dropdown (Role)
        const [dropdownOpen, setDropdownOpen] = useState(false);
        const dropdownRef = useRef(null);
        const [userRoles, setUserRoles] = useState([]);

        const [actionMenu, setActionMenu] = useState({
                open: false,
                employee: null,
                position: "bottom", // bottom | top
        });

        const actionMenuRef = useRef(null);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                                setDropdownOpen(false);
                        }
                };
                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

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
                if (!isSidebarOpen) return;

                const fetchRoles = async () => {
                        try {
                                const response = await API.fetchUserRoles(1, 9999999999, { order: 1 }, {}, { role: 1 }, "");
                                if (response.status === 200) {
                                        setUserRoles(
                                                Array.isArray(response.data)
                                                        ? response.data
                                                        : response.data.data || []
                                        );
                                }
                        } catch (err) {
                                showPopup("Failed to fetch roles");
                        }
                };

                fetchRoles();
        }, [isSidebarOpen]);

        useEffect(() => {
                if (searchText.trim() === "") {
                        fetchEmployees(1, true, { [sortBy]: sortOrder }, {}, {}, "");
                }
        }, [searchText]);

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        const handleSearchKeyPress = (e) => {
                if (e.key === "Enter") {
                        fetchEmployees(1, true, { [sortBy]: sortOrder }, {}, {}, searchText.trim());
                }
        };

        const fetchEmployees = async (pageno = 1, reset = false, sort = { [sortBy]: sortOrder }, filter = {}, projection = {}, searchtext = "") => {
                if (loading || isFetchingRef.current) return;

                try {
                        setLoading(true);
                        isFetchingRef.current = true;

                        const response = await API.fetchEmployees(
                                pageno,
                                20,
                                sort,
                                filter,
                                projection,
                                searchtext
                        );

                        if (response.status === 200) {
                                const data = response.data;
                                const items = Array.isArray(data) ? data : data.data || [];

                                if (reset || pageno === 1) {
                                        setEmployees(items);
                                } else {
                                        setEmployees((prev) => {
                                                const existingIds = new Set(prev.map((item) => item._id));
                                                const newItems = items.filter(
                                                        (item) => !existingIds.has(item._id)
                                                );
                                                return [...prev, ...newItems];
                                        });
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
                                showPopup(response.message || "Failed to fetch employees");
                        }
                } catch (err) {
                        console.error("Fetch employees error:", err);
                        showPopup("Server error while fetching employees");
                } finally {
                        setLoading(false);
                        isFetchingRef.current = false;
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
                fetchEmployees(1, true, { [newSortBy]: newOrder }, {}, {}, searchText);
        };

        // Infinite scroll
        useEffect(() => {
                const tableWrapper = document.querySelector(".common-table-wrapper");
                let scrollTimeout;

                const handleScroll = () => {
                        if (!tableWrapper) return;

                        clearTimeout(scrollTimeout);

                        scrollTimeout = setTimeout(() => {
                                const { scrollTop, scrollHeight, clientHeight } = tableWrapper;

                                if (
                                        scrollTop + clientHeight >= scrollHeight - 10 &&
                                        hasNextPage &&
                                        !loading &&
                                        !isFetchingRef.current
                                ) {
                                        fetchEmployees(page + 1, false);
                                }
                        }, 100);
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
                        showPopup("You don't have permission to update employees");
                        return;
                }
                if (!editingId && !canAdd) {
                        showPopup("You don't have permission to add employees");
                        return;
                }

                try {
                        setLoading(true);

                        const payload = {
                                fname: formData.fname,
                                lname: formData.lname,
                                email: formData.email,
                                number: formData.number,
                                roleid: formData.roleid,
                                role: formData.role,
                        };

                        let response
                        // If update, send _id
                        if (editingId) {
                                payload._id = editingId;
                                response = await API.UpdateEmployees(payload);
                        } else {
                                response = await API.AddEmployees(payload);
                        }


                        if (response.status === 200) {
                                showPopup(response.message || "Employee saved successfully", "success");
                                setFormData({});
                                setEditingId(null);
                                setIsSidebarOpen(false);
                                fetchEmployees(1, true);
                        } else {
                                showPopup(response.message || "Failed to save employee");
                        }
                } catch (err) {
                        console.error("Save employee error:", err);
                        showPopup("Server error while saving employee");
                } finally {
                        setLoading(false);
                }
        };

        const handleEdit = (emp) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update employees");
                        return;
                }
                setFormData(emp);
                setEditingId(emp._id);
                setIsSidebarOpen(true);
        };

        const handleChange = (e) => {
                const { name, value, type, checked } = e.target;
                setFormData({
                        ...formData,
                        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
                });
                setDropdownOpen(false)
        };

        const handleToggleStatus = async (id, currentStatus) => {
                if (!canUpdate) {
                        showPopup("You don't have permission to update employee status");
                        return;
                }
                try {
                        setLoading(true);
                        const payload = {
                                _id: id,
                                status: currentStatus === 1 ? 0 : 1,
                        };

                        const response = await API.UpdateEmpStatus(payload);

                        if (response.status === 200) {
                                showPopup(response.message, "success");
                                setEmployees((prev) =>
                                        prev.map((emp) =>
                                                emp._id === id
                                                        ? {
                                                                ...emp,
                                                                status:
                                                                        currentStatus === 1 ? 0 : 1,
                                                        }
                                                        : emp
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

        const openActionMenu = (e, employee) => {
                e.stopPropagation();

                const buttonRect = e.currentTarget.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                const spaceBelow = viewportHeight - buttonRect.bottom;
                const position = spaceBelow < 120 ? "top" : "bottom";

                setActionMenu({
                        open: true,
                        employee,
                        position,
                });
        };


        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title ml-20">
                                                        Employee Details
                                                </h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">
                                                                        search
                                                                </span>
                                                                <input
                                                                        type="text"
                                                                        placeholder="Search"
                                                                        className="search-input"
                                                                        maxLength={50}
                                                                        value={searchText}
                                                                        onChange={(e) =>
                                                                                setSearchText(e.target.value)
                                                                        }
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
                                                                        Add Employee
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
                                                                                <th className="common-table-th">Name</th>
                                                                                <th className="common-table-th">Role</th>
                                                                                <th className="common-table-th">Employee ID</th>
                                                                                <th className="common-table-th">Email</th>
                                                                                <th className="common-table-th">Number</th>
                                                                                <th className="common-table-th">Status</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {loading &&
                                                                                employees.length === 0 ? (
                                                                                <tr>
                                                                                        <td colSpan="100" className="common-table-td" style={{ textAlign: "center", padding: "40px", }} >
                                                                                                {/* Loading Employees... */}
                                                                                                {Method.showLoader()}
                                                                                        </td>
                                                                                </tr>
                                                                        ) : employees.length > 0 ? (
                                                                                employees.map((employee) => (
                                                                                        <tr key={employee._id}>
                                                                                                <td className="common-table-td" style={{ position: "relative" }}>
                                                                                                        <button
                                                                                                                className="actionbtn"
                                                                                                                onClick={(e) => {
                                                                                                                        if (!canAnyAction) return;
                                                                                                                        openActionMenu(e, employee);
                                                                                                                }}
                                                                                                                disabled={!canAnyAction}
                                                                                                        >
                                                                                                                <span className="material-symbols-outlined white fs-20">
                                                                                                                        more_vert
                                                                                                                </span>
                                                                                                        </button>

                                                                                                        {actionMenu.open &&
                                                                                                                actionMenu.employee?._id === employee._id && (
                                                                                                                        <div ref={actionMenuRef} className={`action-menu ${actionMenu.position}`} >
                                                                                                                                {canUpdate && (
                                                                                                                                        <p className="action-menu-item" onClick={() => {
                                                                                                                                                handleEdit(employee);
                                                                                                                                                setActionMenu({ open: false, employee: null, position: "bottom" });
                                                                                                                                        }}>
                                                                                                                                                <span className="material-symbols-outlined fs-15 ml-10">edit</span> Edit
                                                                                                                                        </p>
                                                                                                                                )}

                                                                                                                                <p className="action-menu-item" onClick={() => {
                                                                                                                                        setActionMenu({ open: false, employee: null, position: "bottom" });
                                                                                                                                }}>
                                                                                                                                        <span className="material-symbols-outlined fs-15 ml-10">visibility</span> View Details
                                                                                                                                </p>
                                                                                                                        </div>
                                                                                                                )}
                                                                                                </td>
                                                                                                <td className="common-table-td">{employee.name}</td>
                                                                                                <td className="common-table-td">{employee.role}</td>
                                                                                                <td className="common-table-td">{employee.employeeid}</td>
                                                                                                <td className="common-table-td">{employee.email}</td>
                                                                                                <td className="common-table-td">{employee.number}</td>
                                                                                                <td className="common-table-td">
                                                                                                        {Method.tooltip(
                                                                                                                employee.status === 1 ? "Active" : "Inactive",
                                                                                                                <input
                                                                                                                        type="checkbox"
                                                                                                                        checked={employee.status === 1}
                                                                                                                        className={`chk-checkbox ${!canUpdate ? "chk-disabled" : ""}`}
                                                                                                                        onChange={() => handleToggleStatus(employee._id, employee.status)}
                                                                                                                />
                                                                                                        )}
                                                                                                </td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr>
                                                                                        <td
                                                                                                colSpan="100"
                                                                                                className="common-table-td"
                                                                                                style={{
                                                                                                        textAlign:
                                                                                                                "center",
                                                                                                        padding:
                                                                                                                "40px",
                                                                                                }}
                                                                                        >
                                                                                                {/* No employees found */}
                                                                                                {Method.noDataFound()}
                                                                                        </td>
                                                                                </tr>
                                                                        )}
                                                                </tbody>
                                                        </table>

                                                        {loading && employees.length > 0 && (
                                                                <div
                                                                        style={{
                                                                                textAlign: "center",
                                                                                padding: "20px",
                                                                        }}
                                                                >
                                                                        {/* Loading... */}
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
                                                <span className="material-symbols-outlined fs-20">
                                                        close
                                                </span>
                                        </button>

                                        <h3>{editingId ? "Update Employee" : "Add Employee"}</h3>

                                        <form
                                                onSubmit={handleSubmit}
                                                className="sidebar-form"
                                        >
                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                First Name
                                                                <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="fname"
                                                                className="common-input-text"
                                                                value={formData.fname || ""}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                        <label className="form-group-label">
                                                                Last Name{" "}
                                                                <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="lname"
                                                                className="common-input-text"
                                                                value={formData.lname || ""}
                                                                onChange={handleChange}
                                                                required
                                                        />

                                                        <label className="form-group-label">
                                                                Role
                                                                <span className="required">*</span>
                                                        </label>
                                                        <div className="custom-dropdown" ref={dropdownRef}>
                                                                <div
                                                                        className="custom-dropdown-selected main-color"
                                                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                                                >
                                                                        {formData.role || "-- Select Role --"}
                                                                        <span className="material-symbols-outlined fs-20 arrow" style={{
                                                                                transform: dropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                transition: "transform 0.3s ease",
                                                                        }}>keyboard_arrow_right</span>
                                                                </div>

                                                                {dropdownOpen && (
                                                                        Method.renderDropdownOptions({
                                                                                options: userRoles.map((r) => ({ value: r._id, label: r.role })),
                                                                                activeValue: formData.roleid || "",
                                                                                onSelect: (selectedRoleId) => {
                                                                                        const selectedRole = userRoles.find((r) => r._id === selectedRoleId);
                                                                                        setFormData((prev) => ({
                                                                                                ...prev,
                                                                                                roleid: selectedRoleId,
                                                                                                role: selectedRole?.role || prev.role,
                                                                                        }));
                                                                                        setDropdownOpen(false);
                                                                                },
                                                                        })
                                                                )}
                                                        </div>

                                                        <label className="form-group-label">
                                                                Number
                                                                <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="number"
                                                                name="number"
                                                                className="common-input-text"
                                                                value={formData.number || ""}
                                                                onChange={handleChange}
                                                                onWheel={(e) => e.target.blur()}
                                                                required
                                                                min="0"          // Only allows positive numbers
                                                                maxLength={10}
                                                                step="1"         // Only allows whole numbers
                                                        />
                                                        <label className="form-group-label">
                                                                Email
                                                                <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="email"
                                                                className="common-input-text"
                                                                value={formData.email || ""}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                </div>

                                                <div className="form-footer">
                                                        <button
                                                                type="submit"
                                                                disabled={loading}
                                                                className="main-btn"
                                                        >
                                                                {editingId ? "Update" : "Save"}
                                                        </button>
                                                </div>
                                        </form>
                                </div>

                                {Method.renderPopup(popup, () =>
                                        Method.hidePopup(setPopup, popupTimer)
                                )}
                        </div >
                </>
        );
}

export default Employees;
