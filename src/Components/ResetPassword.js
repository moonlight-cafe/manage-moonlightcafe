import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

import { Method, API, Config } from "../config/Init.js"

export default function ResetPassword() {
        const navigate = useNavigate();
        const hasVerified = useRef(false);

        const [newPassword, setNewPassword] = useState("");
        const [confirmPassword, setConfirmPassword] = useState("");

        const [loading, setLoading] = useState(false);
        const [verifyingToken, setVerifyingToken] = useState(true);
        const [isValidToken, setIsValidToken] = useState(false);

        const [showPassword, setShowPassword] = useState(false);
        const [showConfirmPassword, setShowConfirmPassword] = useState(false);
        const [showConfirmModal, setShowConfirmModal] = useState(false);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);

        const [popup, setPopup] = useState({
                message: "",
                type: "",
                visible: false,
        });
        const popupTimer = useRef(null);

        const showPopup = (message, type = "error") => {
                Method.showPopup(setPopup, popupTimer, message, type);
        };

        /* ---------------- Verify Reset Token ---------------- */
        useEffect(() => {
                document.body.classList.add("no-navbar-layout");

                if (hasVerified.current) return;
                hasVerified.current = true;

                const verifyToken = async () => {
                        const email = localStorage.getItem("verified_otp");
                        const token = localStorage.getItem("reset_token");

                        if (!email || !token) {
                                navigate("/login");
                                return;
                        }

                        try {
                                const response = await API.VerifyResetToken(token, email);

                                if (response.status === 200) {
                                        setIsValidToken(true);
                                } else {
                                        throw new Error("Invalid token");
                                }
                        } catch {
                                localStorage.removeItem("verified_otp");
                                localStorage.removeItem("reset_token");
                                navigate("/login");
                        } finally {
                                setVerifyingToken(false);
                        }
                };

                verifyToken();

                return () => {
                        document.body.classList.remove("no-navbar-layout");
                };
        }, [navigate]);

        /* ---------------- Submit ---------------- */
        const handleSubmit = (e) => {
                e.preventDefault();

                if (newPassword.length < 6) {
                        showPopup("Password must be at least 6 characters");
                        return;
                }

                if (!/(?=.*\d)(?=.*[a-zA-Z]).{6,}/.test(newPassword)) {
                        showPopup("Password must contain letters and numbers");
                        return;
                }

                if (newPassword !== confirmPassword) {
                        showPopup("Passwords do not match");
                        return;
                }

                setShowConfirmModal(true);
        };

        /* ---------------- Confirm Reset ---------------- */
        const confirmReset = async () => {
                setIsAnimatingAlertOut(true);

                setTimeout(() => {
                        setShowConfirmModal(false);
                        setIsAnimatingAlertOut(false);
                }, 300);

                setLoading(true);

                const email = localStorage.getItem("verified_otp");
                const token = localStorage.getItem("reset_token");

                try {
                        const response = await API.ChangeForgotPassword(
                                email,
                                newPassword,
                                confirmPassword,
                                token
                        );

                        if (response.status === 200) {
                                showPopup("Password reset successfully!", "success");

                                localStorage.removeItem("verified_otp");
                                localStorage.removeItem("reset_token");

                                setNewPassword("");
                                setConfirmPassword("");

                                setTimeout(() => navigate("/login"), 2000);
                        } else {
                                showPopup(response.message || "Reset failed");
                        }
                } catch {
                        showPopup("Server error. Try again later.");
                } finally {
                        setLoading(false);
                }
        };

        /* ---------------- Loader ---------------- */
        if (verifyingToken) {
                return (
                        <div className="admin-login-wrapper user-not-select">
                                <div className="admin-login-left user-not-select">
                                        <div className="admin-left-content">
                                                <img
                                                        src={Config.moonlightcafelogo}
                                                        alt="Moonlight Cafe"
                                                        className="admin-left-logo"
                                                />
                                                <h1 className="admin-left-title">Moonlight Admin Panel</h1>
                                                <p className="admin-left-subtitle">
                                                        Manage your café operations, users, and reports with ease.
                                                </p>
                                        </div>
                                </div>
                                <div className="admin-login-right">
                                        <div className="loading-service z-2-index">
                                                {Method.showLoader()}
                                        </div>
                                </div>
                        </div>
                );
        }

        if (!isValidToken) return null;

        /* ---------------- UI ---------------- */
        return (
                <div className="admin-login-wrapper user-not-select">
                        <div className="admin-login-left user-not-select">
                                <div className="admin-left-content">
                                        <img
                                                src={Config.moonlightcafelogo}
                                                alt="Moonlight Cafe"
                                                className="admin-left-logo"
                                        />
                                        <h1 className="admin-left-title">Moonlight Admin Panel</h1>
                                        <p className="admin-left-subtitle">
                                                Manage your café operations, users, and reports with ease.
                                        </p>
                                </div>
                        </div>

                        <div className="admin-login-right">
                                <div className="admin-form-card">
                                        <h2 className="admin-login-heading">Reset Your Password</h2>
                                        <p className="verify-subtitle fs-15 required">
                                                <strong>Note:</strong> Do not refresh or close the page.
                                        </p>

                                        <form onSubmit={handleSubmit}>
                                                <div className="admin-form-group password-group">
                                                        <div className="password-input-wrapper">
                                                                <input
                                                                        type={showPassword ? "text" : "password"}
                                                                        placeholder="New Password"
                                                                        value={newPassword}
                                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                                        required
                                                                />
                                                                <span
                                                                        className="material-symbols-outlined visibility-icon"
                                                                        onClick={() => setShowPassword((p) => !p)}
                                                                >
                                                                        {showPassword ? "visibility_off" : "visibility"}
                                                                </span>
                                                        </div>
                                                </div>

                                                <div className="admin-form-group password-group">
                                                        <div className="password-input-wrapper">
                                                                <input
                                                                        type={showConfirmPassword ? "text" : "password"}
                                                                        placeholder="Confirm Password"
                                                                        value={confirmPassword}
                                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                                        required
                                                                />
                                                                <span
                                                                        className="material-symbols-outlined visibility-icon"
                                                                        onClick={() => setShowConfirmPassword((p) => !p)}
                                                                >
                                                                        {showConfirmPassword ? "visibility_off" : "visibility"}
                                                                </span>
                                                        </div>
                                                </div>

                                                <button className="login-button" disabled={loading}>
                                                        {loading ? "Updating..." : "Reset Password"}
                                                </button>
                                        </form>
                                </div>
                        </div>

                        {showConfirmModal && (
                                <div className="modal-overlay">
                                        <div
                                                className={`modal-content-select width-40 ptb-50 alert-modal ${isAnimatingAlertOut ? "fade-out" : ""
                                                        }`}
                                        >
                                                <span className="material-symbols-outlined modal-icon required fs-50">
                                                        lock_reset
                                                </span>
                                                <p className="modal-title fs-18 required">Are you sure you want to change your password?</p>
                                                <div className="modal-buttons">
                                                        <button
                                                                onClick={confirmReset}
                                                                className="main-btn mr-20 plr-40"
                                                                disabled={loading}
                                                        >
                                                                Yes
                                                        </button>
                                                        <button
                                                                onClick={() => setShowConfirmModal(false)}
                                                                className="main-cancle-btn ml-20 plr-40"
                                                                disabled={loading}
                                                        >
                                                                No
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        )}
                        {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}

                </div>
        );
}
