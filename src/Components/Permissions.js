import React, { useEffect, useRef, useState, useCallback } from "react";
import { Navbar, Method, API } from "../config/Init.js";
import "./Permissions.css";

function Permissions() {
        const [permissions, setPermissions] = useState([]);
        const [userRoles, setUserRoles] = useState([]);
        const [employees, setEmployees] = useState([]);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const popupTimer = useRef(null);
        const [searchText, setSearchText] = useState("");
        const [selectedRoleId, setSelectedRoleId] = useState("");
        const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
        const desktopRoleDropdownRef = useRef(null);
        const desktopEmployeeDropdownRef = useRef(null);
        const mobileRoleDropdownRef = useRef(null);
        const mobileEmployeeDropdownRef = useRef(null);

        const [desktopRoleDropdownOpen, setDesktopRoleDropdownOpen] = useState(false);
        const [desktopEmployeeDropdownOpen, setDesktopEmployeeDropdownOpen] = useState(false);
        const [mobileRoleDropdownOpen, setMobileRoleDropdownOpen] = useState(false);
        const [mobileEmployeeDropdownOpen, setMobileEmployeeDropdownOpen] = useState(false);

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        useEffect(() => {
                const handleClickOutside = (e) => {
                        if (desktopRoleDropdownRef.current && !desktopRoleDropdownRef.current.contains(e.target)) {
                                setDesktopRoleDropdownOpen(false);
                        }
                        if (desktopEmployeeDropdownRef.current && !desktopEmployeeDropdownRef.current.contains(e.target)) {
                                setDesktopEmployeeDropdownOpen(false);
                        }
                        if (mobileRoleDropdownRef.current && !mobileRoleDropdownRef.current.contains(e.target)) {
                                setMobileRoleDropdownOpen(false);
                        }
                        if (mobileEmployeeDropdownRef.current && !mobileEmployeeDropdownRef.current.contains(e.target)) {
                                setMobileEmployeeDropdownOpen(false);
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

        const loadPermissions = useCallback(async (roleId = selectedRoleId, employeeId = selectedEmployeeId) => {
                if (!roleId) {
                        setPermissions([]);
                        return;
                }

                setLoading(true);
                try {
                        const payload = employeeId
                                ? { roleid: roleId, employeeid: employeeId }
                                : { roleid: roleId };
                        const res = await API.ListPermissions(payload);

                        if (res?.status === 200) {
                                const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
                                setPermissions(data);
                        } else {
                                showPopup(res?.message || "Failed to load permissions");
                        }
                } catch (err) {
                        showPopup("Failed to load permissions");
                } finally {
                        setLoading(false);
                }
        }, [selectedRoleId, selectedEmployeeId]);

        useEffect(() => {
                loadPermissions(selectedRoleId, selectedEmployeeId);
        }, [selectedRoleId, selectedEmployeeId, loadPermissions]);

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
                                const key = p._id || p.menu_id;
                                if (key !== id && p._id !== id && p.menu_id !== id) return p;
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
                                        employeeid: selectedEmployeeId || undefined,
                                        menu_name: p.menu_name,
                                        menu_alias: p.menu_alias,
                                        menu_id: p.menu_id,
                                        view: p.view ? 1 : 0,
                                        insert: p.insert ? 1 : 0,
                                        update: p.update ? 1 : 0,
                                        delete: p.delete ? 1 : 0,
                                })),
                        };

                        const res = await API.AddUpdatePermissions(payload);
                        if (res?.status === 200) {
                                showPopup(res.message || "Permissions updated", "success");
                                try {
                                        await API.LoginData();
                                } catch (e) {}
                        } else {
                                showPopup(res?.message || "Failed to update permissions");
                        }
                } catch (err) {
                        showPopup("Failed to update permissions");
                } finally {
                        setLoading(false);
                }
        };

        const handleReset = () => {
                setSearchText("");
                setDesktopRoleDropdownOpen(false);
                setDesktopEmployeeDropdownOpen(false);
                setMobileRoleDropdownOpen(false);
                setMobileEmployeeDropdownOpen(false);

                if (selectedRoleId) {
                        loadPermissions(selectedRoleId, selectedEmployeeId);
                } else {
                        setPermissions([]);
                }
        };

        const filteredPermissions = permissions.filter((p) => {
                const q = searchText.trim().toLowerCase();
                if (!q) return true;
                return (
                        (p.menu_name || "").toLowerCase().includes(q) ||
                        (p.menu_alias || "").toLowerCase().includes(q)
                );
        });

        const isColumnChecked = (field) =>
                filteredPermissions.length > 0 && filteredPermissions.every((p) => p[field] === 1);

        const toggleColumn = (field) => {
                const next = isColumnChecked(field) ? 0 : 1;
                const visibleKeySet = new Set(filteredPermissions.map((p) => p._id || p.menu_id));
                setPermissions((prev) =>
                        prev.map((p) => {
                                const key = p._id || p.menu_id;
                                if (!visibleKeySet.has(key)) return p;
                                return applyViewDependency(p, field, next);
                        })
                );
        };

        const toggleRow = (id) => {
                setPermissions((prev) =>
                        prev.map((p) => {
                                const key = p._id || p.menu_id;
                                if (key !== id && p._id !== id && p.menu_id !== id) return p;
                                const allOn = p.view === 1 && p.insert === 1 && p.update === 1 && p.delete === 1;
                                const next = allOn ? 0 : 1;
                                return { ...p, view: next, insert: next, update: next, delete: next };
                        })
                );
        };

        const selectedRole = userRoles.find((r) => r._id === selectedRoleId);
        const filteredEmployees = selectedRole
                ? employees.filter((emp) => emp.role === selectedRole.role || (emp.roleid && emp.roleid.toString() === selectedRoleId.toString()))
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

        const renderCheckbox = (checked, onChange, disabled = false) => (
                <label className={`premium-checkbox-wrapper ${disabled ? "disabled" : ""}`} style={{ padding: 0, gap: 0, margin: 0 }}>
                        <input
                                type="checkbox"
                                className="premium-checkbox-input"
                                checked={!!checked}
                                onChange={onChange}
                                disabled={disabled}
                        />
                        <span className="premium-checkbox-tile">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="premium-check-svg">
                                        <polyline points="4 12 9 17 20 6"></polyline>
                                </svg>
                        </span>
                </label>
        );

        return (
                <>
                        <Navbar />
                        <div className="common-tbl-comtainer">
                                <div className="common-tbl-box user-not-select">
					<div className="common-tbl-header">
						<h2 className="common-tbl-title">Permissions</h2>
						<div className="common-tbl-right-section">
							<div className="permissions-desktop-dropdowns">
								<div className="permissions-desktop-filter-item" ref={desktopRoleDropdownRef}>
									<div className="custom-dropdown">
										<div
											className="custom-dropdown-selected"
											onClick={(e) => {
												e.stopPropagation();
												setDesktopRoleDropdownOpen((p) => !p);
												setDesktopEmployeeDropdownOpen(false);
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
													transform: desktopRoleDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
													transition: "transform 0.3s ease",
													color: "#47d9a8",
												}}
											>
												keyboard_arrow_right
											</span>
										</div>

										{desktopRoleDropdownOpen && (
											<div onClick={(e) => e.stopPropagation()}>
												{Method.renderDropdownOptions({
													options: roleDropdownOptions,
													activeValue: selectedRoleId,
													onSelect: (roleId) => {
														setSelectedRoleId(roleId);
														setSelectedEmployeeId("");
														setDesktopRoleDropdownOpen(false);
													}
												})}
											</div>
										)}
									</div>
								</div>

								<div className="permissions-desktop-filter-item" ref={desktopEmployeeDropdownRef}>
									<div className="custom-dropdown">
										<div
											className="custom-dropdown-selected"
											onClick={(e) => {
												e.stopPropagation();
												setDesktopEmployeeDropdownOpen((p) => !p);
												setDesktopRoleDropdownOpen(false);
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
													transform: desktopEmployeeDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
													transition: "transform 0.3s ease",
													color: "#47d9a8",
												}}
											>
												keyboard_arrow_right
											</span>
										</div>

										{desktopEmployeeDropdownOpen && (
											<div onClick={(e) => e.stopPropagation()}>
												{Method.renderDropdownOptions({
													options: employeeDropdownOptions,
													activeValue: selectedEmployeeId,
													onSelect: (employeeId) => {
														setSelectedEmployeeId(employeeId);
														setDesktopEmployeeDropdownOpen(false);
													}
												})}
											</div>
										)}
									</div>
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

					<div className="permissions-filter-bar permissions-mobile-filter-bar">
						<div className="permissions-filter-item" ref={mobileRoleDropdownRef}>
							<div className="custom-dropdown">
								<div
									className="custom-dropdown-selected"
									onClick={(e) => {
										e.stopPropagation();
										setMobileRoleDropdownOpen((p) => !p);
										setMobileEmployeeDropdownOpen(false);
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
											transform: mobileRoleDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
											transition: "transform 0.3s ease",
											color: "#47d9a8",
										}}
									>
										keyboard_arrow_right
									</span>
								</div>

								{mobileRoleDropdownOpen && (
									<div onClick={(e) => e.stopPropagation()}>
										{Method.renderDropdownOptions({
											options: roleDropdownOptions,
											activeValue: selectedRoleId,
											onSelect: (roleId) => {
												setSelectedRoleId(roleId);
												setSelectedEmployeeId("");
												setMobileRoleDropdownOpen(false);
											}
										})}
									</div>
								)}
							</div>
						</div>

						<div className="permissions-filter-item" ref={mobileEmployeeDropdownRef}>
							<div className="custom-dropdown">
								<div
									className="custom-dropdown-selected"
									onClick={(e) => {
										e.stopPropagation();
										setMobileEmployeeDropdownOpen((p) => !p);
										setMobileRoleDropdownOpen(false);
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
											transform: mobileEmployeeDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
											transition: "transform 0.3s ease",
											color: "#47d9a8",
										}}
									>
										keyboard_arrow_right
									</span>
								</div>

								{mobileEmployeeDropdownOpen && (
									<div onClick={(e) => e.stopPropagation()}>
										{Method.renderDropdownOptions({
											options: employeeDropdownOptions,
											activeValue: selectedEmployeeId,
											onSelect: (employeeId) => {
												setSelectedEmployeeId(employeeId);
												setMobileEmployeeDropdownOpen(false);
											}
										})}
									</div>
								)}
							</div>
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
                                                                                                {renderCheckbox(isColumnChecked("view"), () => toggleColumn("view"))}
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">Add</span>
                                                                                                {renderCheckbox(isColumnChecked("insert"), () => toggleColumn("insert"))}
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">Update</span>
                                                                                                {renderCheckbox(isColumnChecked("update"), () => toggleColumn("update"))}
                                                                                        </div>
                                                                                </th>
                                                                                <th className="common-table-th">
                                                                                        <div className="th-content">
                                                                                                <span className="mr-5">Delete</span>
                                                                                                {renderCheckbox(isColumnChecked("delete"), () => toggleColumn("delete"))}
                                                                                        </div>
                                                                                </th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {filteredPermissions.length > 0 ? (
                                                                                filteredPermissions.map((item) => {
                                                                                        const itemKey = item._id || item.menu_id;
                                                                                        return (
                                                                                                <tr key={itemKey}>
                                                                                                        <td className="common-table-td">
                                                                                                                <div className="th-content">
                                                                                                                        <span className="mr-5">{item.menu_name}</span>
                                                                                                                        {renderCheckbox(
                                                                                                                                item.view === 1 && item.insert === 1 && item.update === 1 && item.delete === 1,
                                                                                                                                () => toggleRow(itemKey)
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        </td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        item.view === 1 ? "Allowed" : "Denied",
                                                                                                                        renderCheckbox(item.view === 1, () => togglePermission(itemKey, "view"))
                                                                                                                )}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        item.insert === 1 ? "Allowed" : "Denied",
                                                                                                                        renderCheckbox(item.insert === 1, () => togglePermission(itemKey, "insert"))
                                                                                                                )}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        item.update === 1 ? "Allowed" : "Denied",
                                                                                                                        renderCheckbox(item.update === 1, () => togglePermission(itemKey, "update"))
                                                                                                                )}
                                                                                                        </td>
                                                                                                        <td className="common-table-td">
                                                                                                                {Method.tooltip(
                                                                                                                        item.delete === 1 ? "Allowed" : "Denied",
                                                                                                                        renderCheckbox(item.delete === 1, () => togglePermission(itemKey, "delete"))
                                                                                                                )}
                                                                                                        </td>
                                                                                                </tr>
                                                                                        );
                                                                                })
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
