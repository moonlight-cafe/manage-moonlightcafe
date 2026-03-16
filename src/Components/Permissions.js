
import React, { useEffect, useRef, useState } from "react";
import { Navbar, Method, API } from "../config/Init.js";

function Permissions() {
        const [permissions, setPermissions] = useState([]);
        const [userRoles, setUserRoles] = useState([]);
        const [employees, setEmployees] = useState([]);
        const [menus, setMenus] = useState([]);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const popupTimer = useRef(null);
        const [searchText, setSearchText] = useState("");
        const [selectedRoleId, setSelectedRoleId] = useState("");
        const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
        const filterRoleDropdownRef = useRef(null);
        const filterEmployeeDropdownRef = useRef(null);

        const [filterRoleDropdownOpen, setFilterRoleDropdownOpen] = useState(false);
        const [filterEmployeeDropdownOpen, setFilterEmployeeDropdownOpen] = useState(false);

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (filterRoleDropdownRef.current && !filterRoleDropdownRef.current.contains(e.target)) {
                                setFilterRoleDropdownOpen(false);
                        }
                        if (filterEmployeeDropdownRef.current && !filterEmployeeDropdownRef.current.contains(e.target)) {
                                setFilterEmployeeDropdownOpen(false);
                        }
                };

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        useEffect(() => {
                const fetchDropdowns = async () => {
                        try {
                                const [rolesRes, employeesRes] = await Promise.all([
                                        API.fetchUserRoles(1, 99999, { role: 1 }, { status: 1 }, {}, ""),
                                        API.fetchEmployees(1, 99999, { name: 1 }, {}, {}, ""),
                                ]);

                                if (rolesRes?.status === 200) {
                                        const data = Array.isArray(rolesRes.data)
                                                ? rolesRes.data
                                                : rolesRes.data?.data || [];
                                        setUserRoles(data);
                                }

                                if (employeesRes?.status === 200) {
                                        const data = Array.isArray(employeesRes.data)
                                                ? employeesRes.data
                                                : employeesRes.data?.data || [];
                                        setEmployees(data);
                                }
                        } catch (err) {
                                showPopup("Failed to load roles or employees");
                        }
                };

                fetchDropdowns();
        }, []);

        useEffect(() => {
                const loadPermissions = async () => {
                        if (!selectedRoleId) {
                                setPermissions([]);
                                return;
                        }

                        setLoading(true);
                        try {
                                const payload = selectedEmployeeId
                                        ? { roleid: selectedRoleId, employeeid: selectedEmployeeId }
                                        : { roleid: selectedRoleId };
                                const res = await API.ListPermissions(payload);

                                if (res?.status === 200) {
                                        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
                                        setPermissions(data);
                                } else {
                                        showPopup(res?.message || "Failed to load permissions");
                                }
                        } finally {
                                setLoading(false);
                        }
                };

                loadPermissions();
        }, [selectedRoleId, selectedEmployeeId]);

        const applyViewDependency = (item, field, nextValue) => {
                const updated = { ...item, [field]: nextValue };

                if (field === "view" && nextValue === 0) {
                        updated.insert = 0;
                        updated.update = 0;
                        updated.delete = 0;
                }

                if (field !== "view" && nextValue === 1) {
                        updated.view = 1;
                }

                return updated;
        };

        const togglePermission = (id, field) => {
                setPermissions((prev) =>
                        prev.map((p) => {
                                if (p._id !== id) return p;
                                const nextValue = p[field] === 1 ? 0 : 1;
                                return applyViewDependency(p, field, nextValue);
                        })
                );
        };

        const handleSavePermissions = async () => {
                if (!selectedRoleId) {
                        showPopup("Select a role first");
                        return;
                }

                setLoading(true);
                try {
                        const payload = {
                                roleid: selectedRoleId,
                                employeeid: selectedEmployeeId || undefined,
                                permissions: permissions.map((p) => ({
                                        roleid: selectedRoleId,
                                        employeeid: selectedEmployeeId || p.employeeid,
                                        menu_name: p.menu_name,
                                        menu_alias: p.menu_alias,
                                        menu_id: p.menu_id,
                                        view: p.view,
                                        insert: p.insert,
                                        update: p.update,
                                        delete: p.delete,
                                })),
                        };

                        const res = await API.AddUpdatePermissions(payload);
                        if (res?.status === 200) {
                                showPopup(res.message || "Permissions updated", "success");
                        } else {
                                showPopup(res?.message || "Failed to update permissions");
                        }
                } finally {
                        setLoading(false);
                }
        };

        const handleReset = () => {
                setSelectedRoleId("");
                setSelectedEmployeeId("");
                setSearchText("");
                setPermissions([]);
        };

        const filteredPermissions = permissions.filter((p) => {
                const q = searchText.trim().toLowerCase();
                if (!q) return true;
                return (
                        (p.menu_name || "").toLowerCase().includes(q) ||
                        (p.menu_alias || "").toLowerCase().includes(q)
                );
        });

        const filteredIds = new Set(filteredPermissions.map((p) => p._id));
        const isColumnChecked = (field) =>
                filteredPermissions.length > 0 && filteredPermissions.every((p) => p[field] === 1);

        const toggleColumn = (field) => {
                const next = isColumnChecked(field) ? 0 : 1;
                setPermissions((prev) =>
                        prev.map((p) => {
                                if (!filteredIds.has(p._id)) return p;
                                return applyViewDependency(p, field, next);
                        })
                );
        };

        const toggleRow = (id) => {
                setPermissions((prev) =>
                        prev.map((p) => {
                                if (p._id !== id) return p;
                                const allOn = p.view === 1 && p.insert === 1 && p.update === 1 && p.delete === 1;
                                const next = allOn ? 0 : 1;
                                return { ...p, view: next, insert: next, update: next, delete: next };
                        })
                );
        };

        const selectedRole = userRoles.find((r) => r._id === selectedRoleId);
        const filteredEmployees = selectedRole
                ? employees.filter((emp) => emp.role === selectedRole.role)
                : [];
        const roleDropdownOptions = [
                { value: "", label: "-- Select Role --" },
                ...userRoles.map((r) => ({ value: r._id, label: r.role }))
        ];
        const employeeDropdownOptions = [
                { value: "", label: "-- Select Employee --" },
                ...filteredEmployees.map((emp) => ({ value: emp._id, label: emp.name }))
        ];

        useEffect(() => {
                if (!selectedEmployeeId) return;
                const stillValid = filteredEmployees.some((emp) => emp._id === selectedEmployeeId);
                if (!stillValid) setSelectedEmployeeId("");
        }, [filteredEmployees, selectedEmployeeId]);

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Permissions</h2>
                                                <div className="common-tbl-right-section">
                                                        <div className="form-group" ref={filterRoleDropdownRef}>
                                                                <div className="custom-dropdown">
                                                                        <div
                                                                                className="custom-dropdown-selected"
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setFilterRoleDropdownOpen((p) => !p);
                                                                                        setFilterEmployeeDropdownOpen(false);
                                                                                }}
                                                                        >
                                                                                <span className="main-color">
                                                                                        {selectedRoleId
                                                                                                ? userRoles.find((r) => r._id === selectedRoleId)?.role
                                                                                                : "-- Select Role --"}
                                                                                </span>

                                                                                <span
                                                                                        className="material-symbols-outlined fs-20 arrow"
                                                                                        style={{
                                                                                                transform: filterRoleDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                                transition: "transform 0.3s ease",
                                                                                                color: "#47d9a8",
                                                                                        }}
                                                                                >
                                                                                        keyboard_arrow_right
                                                                                </span>
                                                                        </div>

                                                                        {filterRoleDropdownOpen && (
                                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                                        {Method.renderDropdownOptions({
                                                                                                options: roleDropdownOptions,
                                                                                                activeValue: selectedRoleId,
                                                                                                onSelect: (roleId) => {
                                                                                                        setSelectedRoleId(roleId);
                                                                                                        setSelectedEmployeeId("");
                                                                                                        setFilterRoleDropdownOpen(false);
                                                                                                }
                                                                                        })}
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        <div className="form-group" ref={filterEmployeeDropdownRef}>
                                                                <div className="custom-dropdown">
                                                                        <div
                                                                                className="custom-dropdown-selected"
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setFilterEmployeeDropdownOpen((p) => !p);
                                                                                        setFilterRoleDropdownOpen(false);
                                                                                }}
                                                                        >
                                                                                <span className="main-color">
                                                                                        {selectedEmployeeId
                                                                                                ? filteredEmployees.find((emp) => emp._id === selectedEmployeeId)?.name
                                                                                                : "-- Select Employee --"}
                                                                                </span>

                                                                                <span
                                                                                        className="material-symbols-outlined fs-20 arrow"
                                                                                        style={{
                                                                                                transform: filterEmployeeDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                                transition: "transform 0.3s ease",
                                                                                                color: "#47d9a8",
                                                                                        }}
                                                                                >
                                                                                        keyboard_arrow_right
                                                                                </span>
                                                                        </div>

                                                                        {filterEmployeeDropdownOpen && (
                                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                                        {Method.renderDropdownOptions({
                                                                                                options: employeeDropdownOptions,
                                                                                                activeValue: selectedEmployeeId,
                                                                                                onSelect: (employeeId) => {
                                                                                                        setSelectedEmployeeId(employeeId);
                                                                                                        setFilterEmployeeDropdownOpen(false);
                                                                                                }
                                                                                        })}
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>
                                                        <div className="global-search-container">
                                                                <span className="material-symbols-outlined search-icon">search</span>
                                                                <input
                                                                        type="text"
                                                                        placeholder="Search"
                                                                        className="search-input"
                                                                        maxLength={50}
                                                                        value={searchText}
                                                                        onChange={(e) => setSearchText(e.target.value)}
                                                                />
                                                        </div>
                                                        <button
                                                                className="main-btn"
                                                                onClick={handleReset}
                                                                disabled={loading}
                                                        >
                                                                Reset
                                                        </button>
                                                        <button
                                                                className="main-btn"
                                                                onClick={handleSavePermissions}
                                                                disabled={loading || (!selectedRoleId && !selectedEmployeeId)}
                                                        >
                                                                Save
                                                        </button>
                                                </div>
                                        </div>

                                        <div className="common-table-container">
                                                <div className="common-table-wrapper">
                                                        <table className="common-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th className="common-table-th">Menu</th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">View</span>
                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                        <input
                                                                                                                type="checkbox"
                                                                                                                className="common-input-text"
                                                                                                                checked={isColumnChecked("view")}
                                                                                                                onChange={() => toggleColumn("view")}
                                                                                                        />
                                                                                                </div>
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">Add</span>
                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                        <input
                                                                                                                type="checkbox"
                                                                                                                className="common-input-text"
                                                                                                                checked={isColumnChecked("insert")}
                                                                                                                onChange={() => toggleColumn("insert")}
                                                                                                        />
                                                                                                </div>
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">Update</span>
                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                        <input
                                                                                                                type="checkbox"
                                                                                                                className="common-input-text"
                                                                                                                checked={isColumnChecked("update")}
                                                                                                                onChange={() => toggleColumn("update")}
                                                                                                        />
                                                                                                </div>
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">Delete</span>
                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                        <input
                                                                                                                type="checkbox"
                                                                                                                className="common-input-text"
                                                                                                                checked={isColumnChecked("delete")}
                                                                                                                onChange={() => toggleColumn("delete")}
                                                                                                        />
                                                                                                </div>
                                                                                        </div>
                                                                                </th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {filteredPermissions.length > 0 ? (
                                                                                filteredPermissions.map((item) => (
                                                                                        <tr key={item._id}>
                                                                                                <td className="common-table-td">
                                                                                                        <div className="th-content">
                                                                                                                <span className="mr-5">{item.menu_name}</span>
                                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                className="common-input-text"
                                                                                                                                checked={item.view === 1 && item.insert === 1 && item.update === 1 && item.delete === 1}
                                                                                                                                onChange={() => toggleRow(item._id)}
                                                                                                                        />
                                                                                                                </div>
                                                                                                        </div>
                                                                                                </td>
                                                                                                <td className="common-table-td">
                                                                                                        {Method.tooltip(
                                                                                                                item.view === 1 ? "Allowed" : "Denied",
                                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                className="common-input-text"
                                                                                                                                checked={item.view}
                                                                                                                                onChange={() => togglePermission(item._id, "view")}
                                                                                                                        />
                                                                                                                </div>
                                                                                                        )}
                                                                                                </td>
                                                                                                <td className="common-table-td">
                                                                                                        {Method.tooltip(
                                                                                                                item.insert === 1 ? "Allowed" : "Denied",
                                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                checked={item.insert}
                                                                                                                                className="common-input-text"
                                                                                                                                onChange={() => togglePermission(item._id, "insert")}
                                                                                                                        />
                                                                                                                </div>
                                                                                                        )}
                                                                                                </td>
                                                                                                <td className="common-table-td">
                                                                                                        {Method.tooltip(
                                                                                                                item.update === 1 ? "Allowed" : "Denied",
                                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                checked={item.update}
                                                                                                                                className="common-input-text"
                                                                                                                                onChange={() => togglePermission(item._id, "update")}
                                                                                                                        />
                                                                                                                </div>
                                                                                                        )}
                                                                                                </td>
                                                                                                <td className="common-table-td">
                                                                                                        {Method.tooltip(
                                                                                                                item.delete === 1 ? "Allowed" : "Denied",
                                                                                                                <div className="custom-checkbox-wrapper">
                                                                                                                        <input
                                                                                                                                type="checkbox"
                                                                                                                                checked={item.delete}
                                                                                                                                className="common-input-text"
                                                                                                                                onChange={() => togglePermission(item._id, "delete")}
                                                                                                                        />
                                                                                                                </div>
                                                                                                        )}
                                                                                                </td>
                                                                                        </tr>
                                                                                ))
                                                                        ) : (
                                                                                <tr>
                                                                                        <td
                                                                                                className="common-table-td"
                                                                                                colSpan="5"
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
                                </div>
                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>
                </>
        );
}

export default Permissions;
