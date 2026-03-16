import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VerifyOTP.css";
import { API, Config, Method } from "../config/Init.js";

export default function Verify2FA() {
        const navigate = useNavigate();
        const location = useLocation();

        const emailFromUrl = new URLSearchParams(location.search).get("email") || "";
        const storedEmail = localStorage.getItem("twofa_email") || "";
        const tempToken = localStorage.getItem("twofa_temp_token") || "";
        const email = emailFromUrl || storedEmail;

        const [code, setCode] = useState(["", "", "", "", "", ""]);
        const [loading, setLoading] = useState(false);
        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const inputRefs = useRef([]);
        const popupTimer = useRef(null);
        const hasVerified = useRef(false);

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        useEffect(() => {
                if (!email || !tempToken || (storedEmail && email !== storedEmail)) {
                        navigate("/login");
                        return;
                }

                inputRefs.current[0]?.focus();
                document.body.classList.add("no-navbar-layout");

                return () => {
                        document.body.classList.remove("no-navbar-layout");
                };
        }, [email, tempToken, storedEmail, navigate]);

        const clear2FAState = () => {
                localStorage.removeItem("twofa_email");
                localStorage.removeItem("twofa_temp_token");
        };

        const verifyCode = async (value = null) => {
                const finalCode = value || code.join("");
                if (!/^\d{6}$/.test(finalCode)) {
                        hasVerified.current = false;
                        showPopup("Enter a valid 6-digit code");
                        return;
                }

                setLoading(true);
                try {
                        const response = await API.VerifyAdmin2FA(email, tempToken, finalCode);
                        if (response.status === 200) {
                                clear2FAState();
                                showPopup("2FA verified successfully", "success");
                                setTimeout(() => navigate("/dashboard"), 500);
                        } else {
                                hasVerified.current = false;
                                showPopup(response.message || "Invalid code");
                        }
                } catch (err) {
                        hasVerified.current = false;
                        showPopup("Server error while verifying 2FA");
                } finally {
                        setLoading(false);
                }
        };

        const handleCodeChange = (value, index) => {
                if (!/^[0-9]?$/.test(value)) return;

                const next = [...code];
                next[index] = value;
                setCode(next);

                if (value && index < 5) inputRefs.current[index + 1]?.focus();

                if (next.every((d) => d !== "") && !hasVerified.current) {
                        hasVerified.current = true;
                        verifyCode(next.join(""));
                }
        };

        const handleBackspace = (e, index) => {
                if (e.key === "Backspace" && index > 0 && code[index] === "") {
                        inputRefs.current[index - 1]?.focus();
                }
        };

        const handlePaste = (e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData("text").trim();
                if (!/^[0-9]{6}$/.test(pasted)) return;

                const digits = pasted.split("");
                setCode(digits);
                digits.forEach((digit, i) => {
                        if (inputRefs.current[i]) inputRefs.current[i].value = digit;
                });

                if (!hasVerified.current) {
                        hasVerified.current = true;
                        verifyCode(pasted);
                }
        };

        return (
                <div className="admin-login-wrapper user-not-select">
                        <div className="admin-login-left user-not-select">
                                <div className="admin-left-content">
                                        <img src={Config.moonlightcafelogo} alt="Moonlight Cafe" className="admin-left-logo" />
                                        <h1 className="admin-left-title">Moonlight Admin Panel</h1>
                                        <p className="admin-left-subtitle">
                                                Manage your cafe operations, users, and reports with ease.
                                        </p>
                                </div>
                        </div>

                        <div className="admin-login-right">
                                <div className="admin-form-card">
                                        <h2 className="admin-login-heading">Verify 2FA</h2>
                                        <p className="verify-subtitle fs-18">
                                                Enter the 6-digit code from your authenticator app
                                                <br />
                                                <span className="email-row mt-5">
                                                        <b className="white">{email}</b>
                                                </span>
                                        </p>

                                        <div className="otp-input-container">
                                                {code.map((digit, i) => (
                                                        <input
                                                                key={i}
                                                                ref={(el) => (inputRefs.current[i] = el)}
                                                                type="text"
                                                                maxLength="1"
                                                                className="otp-box"
                                                                value={digit}
                                                                onChange={(e) => handleCodeChange(e.target.value, i)}
                                                                onKeyDown={(e) => handleBackspace(e, i)}
                                                                onPaste={handlePaste}
                                                        />
                                                ))}
                                        </div>

                                        <button className="login-button" onClick={() => verifyCode()} disabled={loading}>
                                                {loading ? "Verifying..." : "Verify 2FA"}
                                        </button>

                                        <button
                                                className="unq-btn mt-20"
                                                onClick={() => {
                                                        clear2FAState();
                                                        navigate("/login");
                                                }}
                                        >
                                                Back to Login
                                        </button>
                                </div>

                                {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                        </div>
                </div>
        );
}
