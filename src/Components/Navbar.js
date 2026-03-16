import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import { Method, API, Config } from "../config/Init.js"
import { User } from 'lucide-react';

function TopNavbar() {
        const navigate = useNavigate();

        const [isProfileOpen, setIsProfileOpen] = useState(false);
        const [isNotifOpen, setIsNotifOpen] = useState(false);
        const [notifications, setNotifications] = useState([]);
        const [notifLoading, setNotifLoading] = useState(false);
        const [currentTime, setCurrentTime] = useState(new Date());
        const [darkMode, setDarkMode] = useState(false);
        const [isShopOpen, setIsShopOpen] = useState(true);
        const [showLogoutModal, setShowLogoutModal] = useState(false);
        const [isClosing, setIsClosing] = useState(false);

        const profileRef = useRef(null);
        const notifRef = useRef(null);

        const admindata = Method.checkLoginStatus();

        useEffect(() => {
                if (admindata.status !== 200) {
                        localStorage.removeItem("menus");
                        navigate("/login");
                        return;
                }
                setDarkMode(admindata.data.darkmodeaccess);
                Method.setCookie(
                        "theme",
                        admindata.data.darkmodeaccess ? "dark" : "light"
                );
                window.dispatchEvent(new Event("themeChanged"));
        }, [navigate]);

        useEffect(() => {
                const intervalId = setInterval(() => setCurrentTime(new Date()), 1000);
                return () => clearInterval(intervalId);
        }, []);

        useEffect(() => {
                function handleClickOutside(e) {
                        if (profileRef.current && !profileRef.current.contains(e.target)) {
                                setIsProfileOpen(false);
                        }
                        if (notifRef.current && !notifRef.current.contains(e.target)) {
                                setIsNotifOpen(false);
                        }
                }

                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const toggleDark = async () => {
                const empid = admindata.data._id;
                const current = Number(admindata.data.darkmodeaccess);
                const next = current === 0 ? 1 : 0;

                const res = await API.ChangeTheme(empid, next);

                if (res?.status === 200) {
                        setDarkMode(next)
                        window.dispatchEvent(new Event("themeChanged"));
                }
        };

        const closeModal = () => {
                setIsClosing(true);
                setTimeout(() => {
                        setShowLogoutModal(false);
                        setIsClosing(false);
                }, 250);
        };

        const handleConfirmAction = async () => {
                const response = await API.Logout();
                if (response.status === 200) {
                        window.location.href = "/login";
                }
                closeModal();
        };

        const fetchNotifications = async () => {
                setNotifLoading(true);
                const res = await API.ListNotification(1, 10, { _id: -1 }, {}, {}, "");
                if (res?.status === 200) {
                        setNotifications(res.data || []);
                } else {
                        setNotifications([]);
                }
                setNotifLoading(false);
        };

        const markSingleNotificationRead = async (notificationId) => {
                if (!notificationId) return;

                const res = await API.ReadNotification({ _id: notificationId, allread: 0 });
                if (res?.status === 200) {
                        setNotifications((prev) =>
                                prev.map((item) =>
                                        item._id === notificationId ? { ...item, read: 1 } : item
                                )
                        );
                }
        };

        const markAllNotificationsRead = async () => {
                const res = await API.ReadNotification({ allread: 1 });
                if (res?.status === 200) {
                        setNotifications((prev) => prev.map((item) => ({ ...item, read: 1 })));
                }
        };

        const handleNotifToggle = async () => {
                const nextOpen = !isNotifOpen;
                setIsNotifOpen(nextOpen);
                if (nextOpen) {
                        await fetchNotifications();
                }
        };

        const getNotificationText = (n) => {
                return n?.message || n?.title || n?.description || n?.body || "Notification";
        };

        const getNotificationTime = (n) => {
                const raw = n?.createdat || n?.created_at || n?.date || n?.createdon;
                if (!raw) return "";
                const dt = new Date(raw);
                if (Number.isNaN(dt.getTime())) return "";
                return Method.formatDateTime(dt);
        };

        return (
                <>
                        <header className="top-navbar">
                                <div className="top-navbar-inner">
                                        <div className="clock-box user-not-select">
                                                {Method.formatDateTime(currentTime)}
                                        </div>

                                        <div className="shop-status-box user-not-select">
                                                <span className={`status-dot ${isShopOpen ? "open" : "closed"}`}></span>
                                                <span className="status-text">{isShopOpen ? "Open" : "Closed"}</span>
                                                {Method.tooltip(
                                                        isShopOpen ? "Open" : "Closed",
                                                        <input
                                                                type="checkbox"
                                                                checked={isShopOpen}
                                                                className="chk-checkbox"
                                                                onChange={() => setIsShopOpen(o => !o)}
                                                        />,
                                                        "bottom"
                                                )}
                                        </div>

                                        <div className="notif-wrapper" ref={notifRef}>
                                                {Method.tooltip(
                                                        "Notifications",
                                                        <button
                                                                className="top-icon-btn user-not-select"
                                                                onClick={handleNotifToggle}
                                                        >
                                                                <span className="material-symbols-outlined">notifications</span>
                                                        </button>,
                                                        "bottom"
                                                )}

                                                {isNotifOpen && (
                                                        <div className="notifications-dropdown">
                                                                <div className="notif-header user-not-select">
                                                                        <span className="material-symbols-outlined drop-item-icon main-color">notifications</span>
                                                                        <div className="fs-20 main-color">Notifications</div>
                                                                        {Method.tooltip(
                                                                                "Mark as all Read",
                                                                                <span className="material-symbols-outlined main-color realall-notif" onClick={markAllNotificationsRead}>checklist</span>,
                                                                                'left'
                                                                        )}
                                                                </div>
                                                                <div className="drop-separator"></div>
                                                                {notifLoading ? (
                                                                        // <div className="notif-empty">Loading...</div>
                                                                        <div className="small-loader">
                                                                                {Method.showLoader()}
                                                                        </div>
                                                                ) : notifications.length > 0 ? (
                                                                        <div className="notif-list user-not-select">
                                                                                {notifications.map((n, idx) => {
                                                                                        const time = getNotificationTime(n);
                                                                                        return (
                                                                                                <div key={n._id || idx} className={`notif-item ${n.read === 0 ? "unread" : ""}`}>
                                                                                                        {n.read === 0 ?
                                                                                                                (<span className="material-symbols-outlined drop-item-icon main-color">notifications_unread</span>) :
                                                                                                                (<span className="material-symbols-outlined drop-item-icon">notifications</span>)
                                                                                                        }
                                                                                                        <div className="notif-content">
                                                                                                                <div className="notif-text">{getNotificationText(n)}</div>
                                                                                                                {time ? <div className="notif-time">{time}</div> : null}
                                                                                                        </div>
                                                                                                        {n.read === 0 ?
                                                                                                                (<span className="material-symbols-outlined drop-item-icon" onClick={() => markSingleNotificationRead(n._id)}>check</span>) :
                                                                                                                (<span className="material-symbols-outlined drop-item-icon main-color">done_all</span>)
                                                                                                        }
                                                                                                </div>
                                                                                        );
                                                                                })}
                                                                        </div>
                                                                ) : (
                                                                        <div className="notif-empty">No notifications</div>
                                                                )}
                                                                <div className="drop-separator"></div>
                                                                <a className="notif-more user-not-select" href="/notifications">View All Notifications</a>
                                                        </div>
                                                )}
                                        </div>

                                        <div className="top-profile-wrapper user-not-select" ref={profileRef}>
                                                <div className="top-profile" onClick={() => setIsProfileOpen(o => !o)}>
                                                        <span className="main-color">
                                                                {Method.getInitials(admindata?.data?.name)}
                                                        </span>
                                                </div>

                                                {isProfileOpen && (
                                                        <div className="profile-dropdown">
                                                                <div className="profile-drop-header mb-5">
                                                                        <h3 className="profile-name">{admindata.data.name}</h3>
                                                                        <h4 className="profile-role">{admindata.data.role}</h4>
                                                                </div>
                                                                <button className="drop-item" onClick={() => navigate("/profile")}>
                                                                        <User className="drop-item-icon" />
                                                                        My Profile
                                                                </button>

                                                                <button className="drop-item" onClick={() => navigate("/settings")}>
                                                                        <span className="material-symbols-outlined drop-item-icon">settings</span>
                                                                        Settings
                                                                </button>

                                                                <button className="drop-item dark-mode-item" onClick={toggleDark} type="button">
                                                                        <span className="dark-mode-label">
                                                                                <span className="material-symbols-outlined drop-item-icon">
                                                                                        {darkMode ? "light_mode" : "dark_mode"}
                                                                                </span>
                                                                                {darkMode ? "Transparent Mode" : "Dark Mode"}
                                                                        </span>
                                                                        <span className={`dark-mode-switch ${darkMode ? "on" : ""}`}>
                                                                                <span className="dark-mode-thumb"></span>
                                                                        </span>
                                                                </button>

                                                                <div className="drop-separator"></div>

                                                                <button className="drop-item logout-btn" onClick={() => setShowLogoutModal(true)}>
                                                                        <span className="material-symbols-outlined drop-item-icon">logout</span>
                                                                        Logout
                                                                </button>
                                                        </div>
                                                )}
                                        </div>
                                </div>
                        </header>

                        {showLogoutModal && (
                                <div className="modal-overlay">
                                        <div className={`modal-content-select width-40 alert-modal ${isClosing ? "fade-out" : ""}`}>
                                                <span className="material-symbols-outlined modal-icon required fs-50">
                                                        logout
                                                </span>

                                                <h3 className="modal-title fs-25 required">Confirm Logout</h3>

                                                <p className="modal-description fs-20 required">
                                                        Are you sure you want to log out?
                                                </p>
                                                <p className="note required fs-15">This action cannot be undone.</p>

                                                <div>
                                                        <button className="main-cancle-btn mr-20" onClick={handleConfirmAction}>
                                                                Yes, Logout
                                                        </button>

                                                        <button className="main-btn ml-20" onClick={closeModal}>
                                                                Cancel
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        )}
                </>
        );
}

export default function Navbar() {
        const navigate = useNavigate();
        const location = useLocation();
        const [isPinned, setIsPinned] = useState(false);
        const [isHovered, setIsHovered] = useState(false);
        const [menus, setMenus] = useState([]);
        const [loading, setLoading] = useState(false);
        const [openSubmenus, setOpenSubmenus] = useState(new Set());

        useEffect(() => {
                const savedPinned = Method.getCookie("navbarPinned");
                if (savedPinned === "true") setIsPinned(true);
        }, []);

        useEffect(() => {
                const path = location.pathname || "/";
                const isDefaultRoute = Method.isPermissionBypassPath(path);

                const menuPaths = new Set();
                menus.forEach((m) => {
                        if (m.redirecturl) menuPaths.add(m.redirecturl);
                        (m.children || []).forEach((c) => {
                                if (c.redirecturl) menuPaths.add(c.redirecturl);
                        });
                });

                const isKnownMenuRoute = Array.from(menuPaths).some((p) => {
                        return path === p || path.startsWith(`${p}/`);
                });

                // Only enforce redirects for known routes; allow unknown URLs to show NotFound.
                if (!isDefaultRoute && !isKnownMenuRoute) return;

                const canView = Method.canAccess(path, "view");
                if (!canView && !Method.isPermissionBypassPath(path)) {
                        navigate("/dashboard");
                }
        }, [location.pathname, navigate, menus]);

        useEffect(() => {
                Method.setCookie("navbarPinned", isPinned, 360)
                if (isPinned || isHovered) {
                        document.body.classList.add("navbar-pinned");
                } else {
                        document.body.classList.remove("navbar-pinned");
                }
        }, [isPinned, isHovered]);

        useEffect(() => {
                const cachedMenus = localStorage.getItem("menus");

                if (cachedMenus) {
                        const rawMenus = JSON.parse(cachedMenus);
                        const organized = organizeMenus(rawMenus);
                        setMenus(organized);
                        return;
                }

                const fetchMenus = async () => {
                        setLoading(true);
                        const res = await API.fetchMenus(1, 99999, { displayorder: 1 }, { isactive: 1 }, {});
                        if (res.status === 200) {
                                const rawMenus = res.data || [];
                                localStorage.setItem("menus", JSON.stringify(rawMenus));
                                setMenus(organizeMenus(rawMenus));
                        }
                        setLoading(false);
                };

                fetchMenus();
        }, []);

        // Auto-expand submenu if child page is active - React to route changes
        useEffect(() => {
                // If navbar is collapsed → close all submenus
                if (!isPinned && !isHovered) {
                        setOpenSubmenus(new Set());
                        return;
                }

                // Navbar is expanded → auto open active submenu
                const currentPath = location.pathname;
                const newOpenSubmenus = new Set();

                menus.forEach(menu => {
                        const hasActiveChild = menu.children?.some(child =>
                                isPathMatch(currentPath, child.redirecturl)
                        );

                        if (hasActiveChild) {
                                newOpenSubmenus.add(menu._id);
                        }
                });

                setOpenSubmenus(newOpenSubmenus);
        }, [location.pathname, menus, isPinned, isHovered]);

        const organizeMenus = (menuData) => {
                const parents = menuData.filter(m => m.submenu === 0);
                const children = menuData.filter(m => m.submenu === 1);

                return parents
                        .map(parent => ({
                                ...parent,
                                children: children
                                        .filter(c => c.parentmenuid === parent._id)
                                        .sort((a, b) => (parseInt(a.displayorder) || 0) - (parseInt(b.displayorder) || 0))
                        }))
                        .sort((a, b) => (parseInt(a.displayorder) || 0) - (parseInt(b.displayorder) || 0));
        };

        const isPathMatch = (currentPath, targetPath) => {
                if (!targetPath || targetPath === "#") return false;

                if (currentPath === targetPath) return true;

                if (currentPath.startsWith(targetPath + "/")) return true;

                return false;
        };

        const toggleSubmenu = (id, hasChildren) => {
                if (!hasChildren) return;
                setOpenSubmenus(prev => {
                        const newSet = new Set(prev);
                        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
                        return newSet;
                });
        };

        const isMenuActive = (menu) => {
                const currentPath = location.pathname;

                if (isPathMatch(currentPath, menu.redirecturl)) return true;

                return menu.children?.some(child => isPathMatch(currentPath, child.redirecturl)) || false;
        };

        const isChildMenuActive = (childUrl) => {
                return isPathMatch(location.pathname, childUrl);
        };

        const handleMenuClick = (menu, e) => {
                const hasChildren = menu.children?.length > 0;
                if (hasChildren) {
                        e.preventDefault();
                        if (!isPinned && !isHovered) return;
                        toggleSubmenu(menu._id, true);
                }
        };


        const isExpanded = isPinned || isHovered;
        const logoSrc = isExpanded
                ? Config.moonlightcafelogo
                : Config.moonlightcafelogosquare;

        const permissions = Method.getPermissions();
        const canViewMenu = (path) => Method.canAccess(path, "view");
        const filterMenusByPermission = (menuList) => {
                if (!permissions.length) {
                        return menuList.filter((m) => isPathMatch("/dashboard", m.redirecturl) || m.name?.toLowerCase() === "dashboard");
                }
                const menudata = menuList.map((m) => {
                        const children = (m.children || []).filter((c) => canViewMenu(c.redirecturl));
                        const canSeeParent = canViewMenu(m.redirecturl) || children.length > 0;
                        return canSeeParent ? { ...m, children } : null;
                })
                        .filter(Boolean)
                return menudata;
        };

        return (
                <>
                        <TopNavbar menus={menus} />

                        <aside
                                className={`navbar ${isPinned ? "pinned" : ""}`}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                        >
                                <div className="navbar-top">
                                        <img
                                                src={logoSrc}
                                                alt="DineCraft"
                                                className={`logo ${isExpanded ? "logo-landscape" : "logo-square"}`}
                                        />

                                        <div
                                                className={`toggle-btn ${isPinned ? "active" : ""}`}
                                                onClick={() => setIsPinned(!isPinned)}
                                        >
                                                <span className="material-symbols-outlined">
                                                        {isPinned ? "adjust" : "circle"}
                                                </span>
                                        </div>
                                </div>

                                <nav className="navbar-center">
                                        {!loading && menus.length > 0 ? (
                                                filterMenusByPermission(menus).map(menu => {
                                                        const hasChildren = menu.children?.length > 0;
                                                        const isSubmenuOpen = openSubmenus.has(menu._id);
                                                        const isActive = isMenuActive(menu);

                                                        return (
                                                                <div key={menu._id} className="menu-item-container">
                                                                        <a
                                                                                href={hasChildren ? "#" : menu.redirecturl || "#"}
                                                                                className={`menu-item ${isActive ? "active" : ""} ${hasChildren ? "has-children" : ""}`}
                                                                                onClick={(e) => handleMenuClick(menu, e)}
                                                                        >
                                                                                <span className="menu-icon material-symbols-outlined">
                                                                                        {menu.icon || "menu"}
                                                                                </span>
                                                                                <span className="menu-text">{menu.name}</span>
                                                                                {hasChildren && (
                                                                                        <span className={`submenu-arrow material-symbols-outlined ${isSubmenuOpen ? "open" : ""}`}>
                                                                                                keyboard_arrow_right
                                                                                        </span>
                                                                                )}
                                                                        </a>

                                                                        {hasChildren && (
                                                                                <div className={`submenu ${isSubmenuOpen ? "open" : ""}`}>
                                                                                        {menu.children.map(child => (
                                                                                                <a
                                                                                                        key={child._id}
                                                                                                        href={child.redirecturl || "#"}
                                                                                                        className={`submenu-item ${isChildMenuActive(child.redirecturl) ? "active" : ""}`}
                                                                                                >
                                                                                                        <span className="submenu-icon material-symbols-outlined">
                                                                                                                {child.icon || "fiber_manual_record"}
                                                                                                        </span>
                                                                                                        <span className="submenu-text">{child.name}</span>
                                                                                                </a>
                                                                                        ))}
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        );
                                                })
                                        ) : (
                                                <div className="menu-item-container">
                                                        <a
                                                                href="/dashboard"
                                                                className={`menu-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                                                        >
                                                                <span className="menu-icon material-symbols-outlined">home</span>
                                                                <span className="menu-text">Dashboard</span>
                                                        </a>
                                                </div>
                                        )}
                                </nav>
                        </aside>
                </>
        );
}
