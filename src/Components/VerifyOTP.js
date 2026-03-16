import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./VerifyOTP.css";

import { Method, API, Config } from "../config/Init.js"

export default function VerifyOTP() {
        const navigate = useNavigate();
        const location = useLocation();

        const email = new URLSearchParams(location.search).get("email");

        const [otp, setOtp] = useState(["", "", "", "", "", ""]);
        const inputRefs = useRef([]);
        const popupTimer = useRef(null);
        const hasVerified = useRef(false);

        const [loading, setLoading] = useState(false);
        const [resendTimer, setResendTimer] = useState(30);
        const [resendLoading, setResendLoading] = useState(false);

        const [popup, setPopup] = useState({
                message: "",
                type: "",
                visible: false,
        });

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        /* ---------------- Route Protection ---------------- */
        useEffect(() => {
                const storedEmail = localStorage.getItem("otpRequestedFor");

                if (!email || !storedEmail || storedEmail !== email) {
                        navigate("/login");
                        return;
                }

                inputRefs.current[0]?.focus();
                document.body.classList.add("no-navbar-layout");
                startTimer();

                return () => {
                        document.body.classList.remove("no-navbar-layout");
                };
        }, [email, navigate]);

        /* ---------------- Resend Timer ---------------- */
        const startTimer = () => setResendTimer(30);

        useEffect(() => {
                if (resendTimer === 0) return;
                const interval = setInterval(
                        () => setResendTimer((s) => s - 1),
                        1000
                );
                return () => clearInterval(interval);
        }, [resendTimer]);

        /* ---------------- OTP Input ---------------- */
        const handleOTPChange = (value, index) => {
                if (!/^[0-9]?$/.test(value)) return;

                const newOTP = [...otp];
                newOTP[index] = value;
                setOtp(newOTP);

                if (value && index < 5) inputRefs.current[index + 1]?.focus();

                if (newOTP.every((d) => d !== "") && !hasVerified.current) {
                        hasVerified.current = true;
                        verifyOTP(newOTP.join(""));
                }
        };

        const handleBackspace = (e, index) => {
                if (e.key === "Backspace" && index > 0 && otp[index] === "") {
                        inputRefs.current[index - 1]?.focus();
                }
        };

        const handlePaste = (e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData("text").trim();

                if (!/^[0-9]{6}$/.test(pasted)) return;

                const digits = pasted.split("");
                setOtp(digits);

                digits.forEach((d, i) => {
                        if (inputRefs.current[i]) inputRefs.current[i].value = d;
                });

                if (!hasVerified.current) {
                        hasVerified.current = true;
                        verifyOTP(pasted);
                }
        };

        /* ---------------- Verify OTP ---------------- */
        const verifyOTP = async (code = null) => {
                const finalOTP = code || otp.join("");

                if (finalOTP.length !== 6) {
                        hasVerified.current = false;
                        showPopup("Enter the 6-digit OTP correctly");
                        return;
                }

                setLoading(true);
                try {
                        const response = await API.VerifyOTP(email, finalOTP);

                        if (response.status === 200) {
                                showPopup("OTP Verified Successfully!", "success");

                                localStorage.setItem("verified_otp", email);
                                localStorage.setItem("reset_token", response.token);

                                setTimeout(() => navigate("/reset/password"), 800);
                        } else {
                                hasVerified.current = false;
                                showPopup(response.message || "Invalid OTP");
                        }
                } catch (error) {
                        hasVerified.current = false;
                        showPopup("Server error during verification");
                } finally {
                        setLoading(false);
                }
        };

        /* ---------------- Resend OTP ---------------- */
        const resendOTP = async () => {
                if (resendTimer > 0) return;

                setResendLoading(true);
                hasVerified.current = false;

                try {
                        const response = await API.SendOTP(email);
                        if (response.status === 200) {
                                setOtp(["", "", "", "", "", ""]);
                                inputRefs.current[0]?.focus();
                                showPopup("OTP Sent Again", "success");
                                startTimer();
                        } else {
                                showPopup(response.message || "Failed to resend OTP");
                        }
                } catch {
                        showPopup("Network error while resending OTP");
                } finally {
                        setResendLoading(false);
                }
        };

        const isOTPComplete = otp.every((d) => d !== "");

        /* ---------------- UI ---------------- */
        return (
                <div className="admin-login-wrapper user-not-select">
                        <div className="admin-login-left user-not-select">
                                <div className="admin-left-content">
                                        <img src={Config.moonlightcafelogo} alt="Moonlight Cafe" className="admin-left-logo" />
                                        <h1 className="admin-left-title">Moonlight Admin Panel</h1>
                                        <p className="admin-left-subtitle">
                                                Manage your café operations, users, and reports with ease.
                                        </p>
                                </div>
                        </div>

                        <div className="admin-login-right">
                                <div className="admin-form-card">
                                        <h2 className="admin-login-heading">Verify OTP</h2>

                                        <p className="verify-subtitle fs-18">
                                                Enter the 6-digit code sent to
                                                <br />
                                                <span className="email-row mt-5">
                                                        <b className="white">{email}</b>
                                                        <span
                                                                className="material-symbols-outlined pointer fs-15 white mt-4"
                                                                onClick={() => {
                                                                        localStorage.removeItem("otpRequestedFor");
                                                                        navigate("/login");
                                                                }}
                                                        >
                                                                edit_square
                                                        </span>
                                                </span>
                                        </p>

                                        <div className="otp-input-container">
                                                {otp.map((digit, i) => (
                                                        <input
                                                                key={i}
                                                                ref={(el) => (inputRefs.current[i] = el)}
                                                                type="text"
                                                                maxLength="1"
                                                                className="otp-box"
                                                                value={digit}
                                                                onChange={(e) => handleOTPChange(e.target.value, i)}
                                                                onKeyDown={(e) => handleBackspace(e, i)}
                                                                onPaste={handlePaste}
                                                        />
                                                ))}
                                        </div>

                                        <button
                                                className="login-button"
                                                onClick={() => verifyOTP()}
                                                disabled={loading}
                                        >
                                                {loading ? "Verifying..." : "Verify OTP"}
                                        </button>

                                        <button
                                                className="unq-btn mt-20"
                                                onClick={resendOTP}
                                                disabled={resendTimer > 0 || resendLoading}
                                        >
                                                {resendTimer > 0
                                                        ? `Resend OTP in ${resendTimer}s`
                                                        : resendLoading
                                                                ? "Resending..."
                                                                : "Resend OTP"}
                                        </button>
                                </div>

                                {Method.renderPopup(popup, () =>
                                        Method.hidePopup(setPopup, popupTimer)
                                )}
                        </div>
                </div>
        );
}