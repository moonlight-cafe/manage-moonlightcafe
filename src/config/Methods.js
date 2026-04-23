import "./Methods.css";
import ReactDOM from "react-dom";
import _Config from "./Config.js";
import { DayPicker } from "react-day-picker";
import React from "react";

const Config = new _Config();
const cafeurl = Config.moonlightcafelogo;
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const PERIOD_OPTIONS = ["AM", "PM"];
class Methods {
        isPermissionBypassPath(pathname = "") {
                const bypassPaths = new Set([
                        "/",
                        "/dashboard",
                        "/home",
                        "/profile",
                        "/settings",
                        "/notifications",
                        "/verify/otp",
                        "/verify/2fa",
                        "/reset/password"
                ]);

                return bypassPaths.has(pathname);
        }

        getInitials(name) {
                if (!name) return "";
                const parts = name.trim().split(" ");
                if (parts.length === 1) {
                        return parts[0][0].toUpperCase();
                } else {
                        return (parts[0][0] + parts[1][0]).toUpperCase();
                }
        }

        generateRandomString(length) {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?/~`';
                let result = '';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                        result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
        }

        generateRandomNumber(length) {
                const characters = '0123456789`';
                let result = '';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                        result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
        }

        getServiceType(type = 1) {
                if (type === 1) {
                        return "Dine in"
                } else if (type === 2) {
                        return "Take Away"
                } else if (type === 3) {
                        return "Reservation"
                } else {
                        return "Invalid Service"
                }
        }

        getAdminStatus(type = 1) {
                if (type === 0) {
                        return "Customer Pending for approval"
                } else if (type === 1) {
                        return "Pending"
                } else if (type === 2) {
                        return "Paid"
                } else {
                        return "Invalid Service"
                }
        }

        generateuuid() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                });
        }

        secureHash(mainKey, unqkey, unqid, id) {
                const combined = mainKey + unqkey + unqid;
                let hash = id;
                for (let i = 0; i < combined.length; i++) {
                        hash = ((hash << 5) + hash) + combined.charCodeAt(i);
                }
                return (hash >>> 0).toString(16) + unqkey.slice(0, 10);
        }

        // Cookie Get/Set
        getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) {
                        try {
                                return decodeURIComponent(parts.pop().split(';').shift());
                        } catch (e) {
                                console.error("Cookie parsing failed", e);
                                return null;
                        }
                }
                return null;
        }

        setCookie(name, value, durationInMinutes = 120) {
                const expires = new Date();
                expires.setTime(expires.getTime() + durationInMinutes * 60 * 1000);
                document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/`;
        }

        setPermissions(perms) {
                localStorage.setItem("permissions", JSON.stringify(perms || []));
        }

        getPermissions() {
                try {
                        const local = localStorage.getItem("permissions");
                        if (local) {
                                const parsedLocal = JSON.parse(local);
                                if (Array.isArray(parsedLocal)) return parsedLocal;
                        }
                        const raw = this.getCookie("permissions");
                        if (!raw) return [];
                        const parsed = JSON.parse(raw);
                        return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                        return [];
                }
        }

        getPermissionForPath(pathname) {
                if (!pathname) return null;
                const perms = this.getPermissions();

                if (!perms.length) return null;

                const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

                const direct = perms.find((p) => p.menu_alias === path);
                if (direct) return direct;

                return perms.find((p) => path.startsWith(p.menu_alias + "/")) || null;
        }

        canAccess(pathname, action = "view") {
                if (this.isPermissionBypassPath(pathname)) {
                        return true;
                }
                const perm = this.getPermissionForPath(pathname);
                if (!perm) { return false };
                const map = {
                        view: "view",
                        add: "insert",
                        insert: "insert",
                        update: "update",
                        delete: "delete",
                };
                const key = map[action] || "view";
                return perm[key] === 1;
        }

        // Login & Table Check
        checkLoginStatus() {
                const userData = this.getCookie("admindata");
                if (!userData || !JSON.parse(userData).email) {
                        return { status: 400, data: {} };
                }
                return { status: 200, data: JSON.parse(userData) };
        }

        tooltip(text, element, position = "top") {     //   Can be "top", "bottom", "left", "right"
                return (
                        <div className={`tooltip-wrapper ${position}`}>
                                {element}
                                <span className="tooltip-box">{text}</span>
                        </div>
                );
        }

        renderDate(date) {
                // Convert the date to a JavaScript Date object
                const parsedDate = new Date(date);

                // Extract the formatted date components
                const formattedMonth = parsedDate.toLocaleDateString("en-US", { month: 'short' });
                const formattedDay = parsedDate.getDate();
                const formattedYear = parsedDate.getFullYear();

                return (
                        <div className="date-card">
                                <div className="date-month">{formattedMonth}</div>
                                <div className="date-day">{formattedDay}</div>
                                <div className="date-year">{formattedYear}</div>
                        </div>
                );
        };

        getActionMenuPosition(target, options = {}) {
                const rect = target?.getBoundingClientRect ? target.getBoundingClientRect() : target;
                if (!rect) return { position: "bottom-right", style: {} };

                const {
                        menuWidth = 180,
                        menuHeight = 100,
                } = options;

                const viewportWidth = window.innerWidth || 0;
                const viewportHeight = window.innerHeight || 0;

                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;
                const spaceRight = viewportWidth - rect.right;
                const spaceLeft = rect.left;

                const vertical = spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "bottom" : "top";
                const horizontal = spaceRight >= menuWidth || spaceRight >= spaceLeft ? "right" : "left";

                const style = {};
                if (vertical === "bottom") {
                        style.top = `${rect.bottom}px`;
                } else {
                        style.bottom = `${viewportHeight - rect.top}px`;
                }
                if (horizontal === "right") {
                        style.right = `${viewportWidth - rect.right}px`;
                } else {
                        style.left = `${rect.left}px`;
                }

                return { position: `${vertical}-${horizontal}`, style };
        }


        // Loader
        showLoader() {
                return (
                        <nav className="loader-container">
                                <img
                                        src={cafeurl}
                                        alt="Loading Animation"
                                        className="loading-image"
                                />
                        </nav>
                );
        }

        noDataFound(image = Config.nodatafoundimg) {
                return (
                        <nav className="loader-container">
                                <img
                                        src={image}
                                        alt="No data Found"
                                        className="notfound-image m-0"
                                />
                        </nav>
                );
        }

        // Popup
        showPopup(setPopup, popupTimerRef, message, type = "error", duration = 5000) {
                const uniqueKey = Date.now();
                setPopup({ message, type, visible: true, key: uniqueKey });
                if (popupTimerRef?.current) clearTimeout(popupTimerRef.current);
                popupTimerRef.current = setTimeout(() => {
                        setPopup((prev) => ({ ...prev, visible: false }));
                }, duration);
        }

        hidePopup(setPopup, popupTimerRef) {
                if (popupTimerRef?.current) clearTimeout(popupTimerRef.current);

                setPopup((prev) => ({ ...prev, visible: false }));
        }

        renderPopup(popup, onClose) {
                const getIcon = () => {
                        switch (popup.type) {
                                case "success": return "check_circle";
                                case "error": return "error";
                                case "info": return "info";
                                default: return "notifications";
                        }
                };

                return (
                        popup.visible && (
                                <div className={`user-not-select popup ${popup.type}`} key={popup.key}>
                                        <span className="material-symbols-outlined popup-icon">
                                                {getIcon()}
                                        </span>
                                        <div style={{ flex: 1 }}>{popup.message}</div>
                                        <span
                                                className="material-symbols-outlined close-icon"
                                                onClick={onClose}
                                        >close</span>
                                        <div className="popup-progress"></div>
                                </div>
                        )
                );
        }

        formatDatetoYYYYMMDD(date) {                            // DD-MM-YYYY
                const y = date.getFullYear();
                const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                const m = monthNames[date.getMonth()];
                // const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                return `${d}-${m}-${y}`;
        };


        renderDateCard(dateString) {
                const date = new Date(dateString);

                const day = date.getDate();
                const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                const month = monthNames[date.getMonth()];
                const year = date.getFullYear();

                return (
                        <div className="common-date-card">
                                <div className="day">{day}</div>
                                <div className="month">{month}</div>
                                <div className="divider"></div>
                                <div className="year">{year}</div>
                        </div>
                );
        }

        formatDate(dateString) {                       // 01-Jan-2025
                const date = new Date(dateString);
                const day = String(date.getDate()).padStart(2, '0');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const month = monthNames[date.getMonth()];
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
        }

        formatDateToCustom(dateInput) {
                const date = new Date(dateInput);

                if (isNaN(date)) return ""; // invalid date

                // Get parts
                let year = date.getFullYear().toString().slice(-2); // last 2 digits
                let month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
                let day = String(date.getDate()).padStart(2, '0');

                let hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');

                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12; // convert 0 to 12 for 12 AM
                hours = String(hours).padStart(2, '0');

                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
        }

        LogoutModal({ visible, onConfirm, onCancel, isClosing }) {
                if (!visible) return null;

                return ReactDOM.createPortal(
                        <div className="modal-overlay">
                                <div className={`modal-box ${isClosing ? "fade-out" : ""}`}>
                                        <span className="material-symbols-outlined modal-icon required">
                                                logout
                                        </span>

                                        <h3 className="modal-title">Confirm Logout</h3>

                                        <p className="modal-description">
                                                Are you sure you want to log out?
                                        </p>

                                        <div className="modal-actions">
                                                <button className="danger-btn" onClick={onConfirm}>
                                                        Yes, Logout
                                                </button>

                                                <button className="primary-btn" onClick={onCancel}>
                                                        Cancel
                                                </button>
                                        </div>
                                </div>
                        </div>,
                        document.getElementById("modal-root")
                );
        }

        formatDateTime = (date) => {
                const day = String(date.getDate()).padStart(2, "0");
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const month = monthNames[date.getMonth()];
                const year = date.getFullYear();
                let hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");
                const ampm = hours >= 12 ? "PM" : "AM";
                hours = hours % 12 || 12;
                return `${day}-${month}-${year} ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
        }

        renderStars = (rating = 0) => {
                const totalStars = 5;

                return (
                        <div className="star-rating">
                                {Array.from({ length: totalStars }).map((_, index) => {
                                        const starValue = index + 1;

                                        let starClass = "empty";
                                        if (rating >= starValue) {
                                                starClass = "full";
                                        } else if (rating >= starValue - 0.5) {
                                                starClass = "half";
                                        }

                                        return (
                                                <span key={index} className={`material-symbols-outlined ms-icon-fill star ${starClass}`}>
                                                        kid_star
                                                </span>
                                        );
                                })}
                        </div>
                );
        };

        renderDropdownOptions = ({ options, activeValue, onSelect }) => {
                const DropdownWithSearch = () => {
                        const [searchText, setSearchText] = React.useState("");

                        const filteredOptions = (options || []).filter((opt) =>
                                String(opt?.label || "")
                                        .toLowerCase()
                                        .includes(searchText.trim().toLowerCase())
                        );

                        return (
                                <div className="custom-dropdown-list fade-in">
                                        <div className="dropdown-search-wrap">
                                                {/* <span className="material-symbols-outlined dropdown-search-icon">search</span> */}
                                                <input
                                                        type="text"
                                                        className="dropdown-search-input"
                                                        placeholder="Search..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                />
                                        </div>

                                        {filteredOptions.length > 0 ? (
                                                filteredOptions.map(opt => (
                                                        (() => {
                                                                const isActive = Array.isArray(activeValue)
                                                                        ? activeValue.includes(opt.value)
                                                                        : activeValue === opt.value;

                                                                return (
                                                                        <div
                                                                                key={opt.value}
                                                                                className={`custom-dropdown-option ${isActive ? "active-category" : ""
                                                                                        }`}
                                                                                onClick={() => onSelect(opt.value)}
                                                                        >
                                                                                {opt.label}
                                                                        </div>
                                                                );
                                                        })()
                                                ))
                                        ) : (
                                                <div className="custom-dropdown-option dropdown-empty-option">
                                                        No matches found
                                                </div>
                                        )}
                                </div>
                        );
                };

                return (
                        <DropdownWithSearch />
                );
        };

        renderDateRangePicker = ({
                calendarRef,
                showCalendar,
                setShowCalendar,
                dateRange,
                setDateRange,
                currentMonth,
                setCurrentMonth,
                renderDateCard,
                handleGoToToday,
                handleResetRange,
                showTimeRange = false,
                disableFuture = false,
                disablePast = false,
                setPopup = null,
                popupTimerRef = null
        }) => {
                const [timeRange, setTimeRange] = React.useState("");
                const [timeRangeDropdownOpen, setTimeRangeDropdownOpen] = React.useState(false);
                const [isPresetSelected, setIsPresetSelected] = React.useState(false); // 👈 Track preset selection

                const today = new Date();

                const disabled = {
                        ...(disableFuture && { after: today }),
                        ...(disablePast && { before: today })
                };

                // 📅 Manual date selection
                const handleDateSelect = (range) => {
                        if (!range?.from) {
                                setDateRange({ from: undefined, to: undefined });
                                setTimeRange("");
                                setIsPresetSelected(false);
                                return;
                        }

                        // Only start date selected → keep calendar open
                        if (range.from && !range.to) {
                                setDateRange({ from: range.from, to: undefined });
                                setTimeRange("");
                                setIsPresetSelected(false);
                                return;
                        }

                        // Complete range selected → update and close only if manual
                        if (range.from && range.to) {
                                // If from === to, it might be the first click, so keep open
                                if (range.from.getTime() === range.to.getTime() && !isPresetSelected) {
                                        setDateRange({ from: range.from, to: undefined });
                                        setTimeRange("");
                                        return;
                                }

                                setDateRange(range);
                                setTimeRange("");
                                setIsPresetSelected(false);

                                // auto-close calendar only if manual range is complete
                                setShowCalendar(false);
                        }
                };

                const applyTimeRange = (value) => {
                        let from, to;
                        const now = new Date();

                        switch (value) {
                                case "today": from = to = new Date(); break;
                                case "yesterday": from = to = new Date(now.setDate(now.getDate() - 1)); break;
                                case "this_week": from = new Date(); from.setDate(from.getDate() - from.getDay()); to = new Date(); break;
                                case "last_week": to = new Date(); to.setDate(to.getDate() - to.getDay() - 1); from = new Date(to); from.setDate(to.getDate() - 6); break;
                                case "last_7_days": to = new Date(); from = new Date(); from.setDate(from.getDate() - 6); break;
                                case "this_month": from = new Date(now.getFullYear(), now.getMonth(), 1); to = new Date(); break;
                                case "last_month": from = new Date(now.getFullYear(), now.getMonth() - 1, 1); to = new Date(now.getFullYear(), now.getMonth(), 0); break;
                                case "last_28_days": to = new Date(); from = new Date(); from.setDate(from.getDate() - 27); break;
                                case "this_year": from = new Date(now.getFullYear(), 0, 1); to = new Date(); break;
                                default: return;
                        }

                        setDateRange({ from, to });
                        setCurrentMonth(from);
                        setTimeRange(value);
                        setTimeRangeDropdownOpen(false);
                        setIsPresetSelected(true);
                };

                return (
                        <div className="date-range-wrapper" ref={calendarRef}>
                                {/* DATE INPUT */}
                                <div
                                        className="custom-date-container"
                                        onClick={(e) => {
                                                e.stopPropagation();
                                                setShowCalendar(p => !p);
                                        }}
                                >
                                        <span className="date-text">
                                                {dateRange.from && dateRange.to
                                                        ? `${renderDateCard(dateRange.from)} to ${renderDateCard(dateRange.to)}`
                                                        : "Select Date Range"}
                                        </span>
                                        <span className="material-symbols-outlined calendar-icon">
                                                calendar_month
                                        </span>
                                </div>

                                {showCalendar && (
                                        <div className="calendar-popover dark-calendar">

                                                {/* TIME RANGE DROPDOWN */}
                                                {showTimeRange && (
                                                        <div className="form-group mb-10">
                                                                <label className="form-group-label">Time Range</label>
                                                                <div className="custom-dropdown">
                                                                        <div
                                                                                className="custom-dropdown-selected"
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setTimeRangeDropdownOpen(p => !p);
                                                                                }}
                                                                        >
                                                                                {timeRange
                                                                                        ? Config.Time_Ranges.find(o => o.value === timeRange)?.label
                                                                                        : "-- Select Time Range --"}
                                                                                <span
                                                                                        className="material-symbols-outlined fs-20 arrow"
                                                                                        style={{
                                                                                                transform: timeRangeDropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                                                                                                transition: "transform 0.3s ease",
                                                                                                color: "#47d9a8",
                                                                                        }}
                                                                                >
                                                                                        keyboard_arrow_right
                                                                                </span>
                                                                        </div>

                                                                        {timeRangeDropdownOpen &&
                                                                                this.renderDropdownOptions({
                                                                                        options: Config.Time_Ranges,
                                                                                        activeValue: timeRange,
                                                                                        onSelect: applyTimeRange
                                                                                })}
                                                                </div>
                                                        </div>
                                                )}

                                                {/* CALENDAR */}
                                                <DayPicker
                                                        mode="range"
                                                        selected={dateRange}
                                                        onSelect={(range) => {
                                                                handleDateSelect(range);
                                                                // If last action was preset, keep calendar open
                                                                if (isPresetSelected) setShowCalendar(true);
                                                        }}
                                                        month={currentMonth}
                                                        onMonthChange={setCurrentMonth}
                                                        numberOfMonths={1}
                                                        disabled={disabled}
                                                        captionLayout="dropdown"
                                                />

                                                {/* BUTTONS */}
                                                {/* {showTimeRange ? ( */}
                                                <div className="common-btn-div mt-10">
                                                        <button type="button" className="main-btn" onClick={() => setShowCalendar(false)}>
                                                                Cancel
                                                        </button>
                                                        <button type="button" className="main-btn" onClick={handleResetRange}>
                                                                Reset
                                                        </button>
                                                        <button type="button" className="main-btn" onClick={() => {
                                                                if (dateRange.from && dateRange.to) setShowCalendar(false);
                                                                else if (setPopup) this.showPopup(setPopup, popupTimerRef, "Please select a complete date range", "error");
                                                        }}>
                                                                Ok
                                                        </button>
                                                </div>
                                                {/* ) : (
                                                                <div className="common-btn-div mt-10">
                                                                        <button type="button" className="main-btn" onClick={handleGoToToday}>
                                                                                Today
                                                                        </button>
                                                                        <button type="button" className="main-btn" onClick={handleResetRange}>
                                                                                Reset
                                                                        </button>
                                                                </div>
                                                        )} */}
                                        </div>
                                )}
                        </div>
                );
        };

        getTimeParts(value = "") {
                const normalizedValue = String(value || "").trim();

                if (!normalizedValue) {
                        return { hour: "09", minute: "00", period: "AM", hasValue: false };
                }

                const twelveHourMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (twelveHourMatch) {
                        const hourNumber = Number(twelveHourMatch[1]) % 12 || 12;
                        return {
                                hour: String(hourNumber).padStart(2, "0"),
                                minute: twelveHourMatch[2],
                                period: twelveHourMatch[3].toUpperCase(),
                                hasValue: true,
                        };
                }

                const twentyFourHourMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})$/);
                if (twentyFourHourMatch) {
                        const rawHour = Number(twentyFourHourMatch[1]);
                        const minute = twentyFourHourMatch[2];
                        const period = rawHour >= 12 ? "PM" : "AM";
                        const hourNumber = rawHour % 12 || 12;
                        return {
                                hour: String(hourNumber).padStart(2, "0"),
                                minute,
                                period,
                                hasValue: true,
                        };
                }

                return { hour: "09", minute: "00", period: "AM", hasValue: false };
        }

        formatTimeLabel(value = "", placeholder = "Select Time") {
                const { hour, minute, period, hasValue } = this.getTimeParts(value);
                return hasValue ? `${hour}:${minute} ${period}` : placeholder;
        }

        toTwentyFourHourValue({ hour, minute, period }) {
                let hourNumber = Number(hour) % 12;
                if (period === "PM") {
                        hourNumber += 12;
                }
                return `${String(hourNumber).padStart(2, "0")}:${minute}`;
        }

        renderTimePickerField = ({
                fieldName,
                label,
                pickerRef,
                placeholder,
                formData,
                activeTimePicker,
                setActiveTimePicker,
                updateTimePart,
                resetTimeField,
        }) => {
                const isOpen = activeTimePicker === fieldName;
                const selectedParts = this.getTimeParts(formData?.[fieldName]);

                return (
                        <div className="form-group">
                                <label className="form-group-label">{label} <span className="required">*</span></label>
                                <div className="time-picker-field" ref={pickerRef}>
                                        <div
                                                className="custom-date-container time-picker-trigger"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setActiveTimePicker((prev) => (prev === fieldName ? null : fieldName))}
                                                onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault();
                                                                setActiveTimePicker((prev) => (prev === fieldName ? null : fieldName));
                                                        }
                                                }}
                                        >
                                                <span className={`date-text time-picker-text ${formData?.[fieldName] ? "" : "time-picker-placeholder"}`}>
                                                        {this.formatTimeLabel(formData?.[fieldName], placeholder)}
                                                </span>
                                                <span className="material-symbols-outlined calendar-icon">
                                                        schedule
                                                </span>
                                        </div>

                                        {isOpen && (
                                                <div className="calendar-popover time-picker-popover">
                                                        <div className="time-picker-panel">
                                                                <div className="time-picker-preview time-picker-preview-compact">
                                                                        <div>
                                                                                <div className="time-picker-preview-label">{label}</div>
                                                                                <div className="time-picker-preview-value">
                                                                                        {this.formatTimeLabel(formData?.[fieldName], placeholder)}
                                                                                </div>
                                                                        </div>
                                                                        <span className="material-symbols-outlined main-color fs-20">schedule</span>
                                                                </div>

                                                                <div className="time-picker-grid">
                                                                        <div className="time-picker-column">
                                                                                <div className="time-picker-column-title">Hour</div>
                                                                                <div className="time-picker-options">
                                                                                        {HOUR_OPTIONS.map((hour) => (
                                                                                                <button
                                                                                                        key={`${fieldName}-hour-${hour}`}
                                                                                                        type="button"
                                                                                                        className={`time-picker-option ${selectedParts.hour === hour ? "active" : ""}`}
                                                                                                        onClick={() => updateTimePart(fieldName, "hour", hour)}
                                                                                                >
                                                                                                        {hour}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>

                                                                        <div className="time-picker-column">
                                                                                <div className="time-picker-column-title">Minute</div>
                                                                                <div className="time-picker-options">
                                                                                        {MINUTE_OPTIONS.map((minute) => (
                                                                                                <button
                                                                                                        key={`${fieldName}-minute-${minute}`}
                                                                                                        type="button"
                                                                                                        className={`time-picker-option ${selectedParts.minute === minute ? "active" : ""}`}
                                                                                                        onClick={() => updateTimePart(fieldName, "minute", minute)}
                                                                                                >
                                                                                                        {minute}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>

                                                                        <div className="time-picker-column time-picker-period-column">
                                                                                <div className="time-picker-column-title">Period</div>
                                                                                <div className="time-picker-options time-picker-period-options">
                                                                                        {PERIOD_OPTIONS.map((period) => (
                                                                                                <button
                                                                                                        key={`${fieldName}-period-${period}`}
                                                                                                        type="button"
                                                                                                        className={`time-picker-option ${selectedParts.period === period ? "active" : ""}`}
                                                                                                        onClick={() => updateTimePart(fieldName, "period", period)}
                                                                                                >
                                                                                                        {period}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                </div>

                                                                <div className="time-picker-footer">
                                                                        <button
                                                                                type="button"
                                                                                className="main-cancle-btn time-picker-action-btn"
                                                                                onClick={() => resetTimeField(fieldName)}
                                                                        >
                                                                                Reset
                                                                        </button>
                                                                        <button
                                                                                type="button"
                                                                                className="main-btn time-picker-action-btn"
                                                                                onClick={() => setActiveTimePicker(null)}
                                                                        >
                                                                                Done
                                                                        </button>
                                                                </div>
                                                        </div>
                                                </div>
                                        )}
                                </div>
                        </div>
                );
        };

        getSortIcon(field, currentSortBy, currentSortOrder) {
                if (currentSortBy === field) {
                        if (currentSortOrder === 1) return Config.icons.sort_asc || "arrow_upward";
                        if (currentSortOrder === -1) return Config.icons.sort_desc || "arrow_downward";
                }
                return Config.icons.sort || "sync_alt";
        }

        getSortIconClass(field, currentSortBy, currentSortOrder, baseClass = "material-symbols-outlined main-color fs-20 pointer") {
                if (currentSortBy === field && (currentSortOrder === 1 || currentSortOrder === -1)) {
                        return baseClass;
                }
                return `${baseClass} rotate-90`;
        }

}

export default Methods;
