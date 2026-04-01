import React, { useState, useEffect, useRef } from "react";
import "./Login.css";
import { Method, Config, API } from '../config/Init.js'
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../config/firebase";

const cafelogo = Config.moonlightcafetext;
const cafelogosquare = Config.moonlightcafelogosquare;

export default function AdminLogin() {
        const [form, setForm] = useState({
                email: "",
                password: "",
                showPassword: false,
        });
        const emailRef = useRef(null);
        const navigate = useNavigate();
        const [loading, setLoading] = useState(false);

        const [popup, setPopup] = useState({
                message: "",
                type: "",
                visible: false,
        });
        const logindata = Method.checkLoginStatus()

        const popupTimer = useRef(null);

        useEffect(() => {

                if (logindata.status == 200) {
                        navigate("/dashboard");
                }

                document.body.classList.add("no-navbar-layout");
                emailRef.current?.focus();
                return () => {
                        document.body.classList.remove("no-navbar-layout");
                        // cleanup popup timer if any when unmounting
                        if (popupTimer.current) {
                                clearTimeout(popupTimer.current);
                                popupTimer.current = null;
                        }
                };
        }, []);

        const updateField = (field, value) => {
                setForm((prev) => ({ ...prev, [field]: value }));
        };

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        const handleLogin = async (e) => {
                e.preventDefault();

                const { email, password } = form;

                if (!email || !password) {
                        showPopup("Please enter both email and password");
                        return;
                }

                setLoading(true);

                try {
                        const accessResp = await API.GetAccessToken(email);
                        console.log("🚀 ~ Login.js:68 ~ handleLogin ~ accessResp>>", accessResp);
                        if (accessResp.status !== 200) {
                                showPopup(accessResp.message || "Access token failed");
                                return;
                        }

                        const loginResp = await API.Login(email, password);

                        if (loginResp.status === 200) {
                                if (loginResp.requires2FA) {
                                        localStorage.setItem("twofa_email", loginResp.email || email);
                                        localStorage.setItem("twofa_temp_token", loginResp.tempToken || "");
                                        showPopup("Enter your authenticator code to continue", "info");
                                        setTimeout(() => navigate(`/verify/2fa?email=${encodeURIComponent(loginResp.email || email)}`), 500);
                                } else {
                                        localStorage.removeItem("twofa_email");
                                        localStorage.removeItem("twofa_temp_token");
                                        navigate("/dashboard");
                                }
                        } else {
                                showPopup(loginResp.message || "Invalid credentials");
                        }

                } catch (error) {
                        showPopup(
                                error?.response?.data?.message || "Server error or network issue"
                        );
                } finally {
                        setLoading(false);
                }
        };


        const handleForgotPassword = async () => {
                if (!form.email) {
                        showPopup("Please enter your email before proceeding");
                        return;
                }
                try {
                        const response = await API.SendOTP(form.email);

                        if (response.status === 200) {
                                showPopup("OTP sent successfully", "success");
                                setTimeout(() => {
                                        localStorage.setItem("otpRequestedFor", form.email);
                                        navigate(`/verify/otp?email=${form.email}`)
                                }, 800);
                        } else {
                                showPopup(response.message || "Failed to send OTP");
                        }
                } catch (err) {
                        showPopup("Server error while sending OTP");
                }
        };

        const handleGoogleLogin = async () => {
                setLoading(true);

                try {
                        // 🔐 Google Sign-In Popup
                        const result = await signInWithPopup(auth, provider);
                        const user = result.user;

                        if (!user?.email) {
                                showPopup("Google account email not found");
                                return;
                        }

                        // 🔑 Access Token Check (your backend logic)
                        const accessResp = await API.GetAccessToken(user.email);
                        if (accessResp.status !== 200) {
                                showPopup(accessResp.message || "Access token failed");
                                return;
                        }

                        // 🚀 Employee Google Login API
                        const response = await API.GoogleLogin(
                                user.displayName || "Employee",
                                user.email,
                                user.phoneNumber || ""
                        );

                        if (response.status === 200) {
                                showPopup("Login successful", "success");

                                setTimeout(() => {
                                        navigate("/dashboard");
                                }, 500);
                        } else {
                                showPopup(response.message || "Google login failed");
                        }

                } catch (error) {
                        console.error("Google login error:", error);

                        if (error.code === "auth/popup-closed-by-user") {
                                showPopup("Google login cancelled");
                        } else {
                                showPopup("Google sign-in failed");
                        }
                } finally {
                        setLoading(false);
                }
        };

        return (
                <div className="admin-login-wrapper user-not-select">
                        <div className="admin-login-left user-not-select">
                                <div className="admin-left-content">
                                        <h1 className="admin-left-title">Welcome To</h1>
                                        <img src={cafelogosquare} alt="Moonlight Cafe" className="admin-left-logo" /><br />
                                        <img src={cafelogo} alt="Moonlight Cafe" className="admin-left-logo" width="200px" />
                                        <p className="admin-left-subtitle main-color">
                                                Manage your café operations, users, and reports with ease.
                                        </p>
                                </div>
                        </div>

                        <div className="admin-login-right">
                                <div className="admin-form-card">
                                        <h2 className="admin-login-heading">Log in to your account</h2>
                                        <form onSubmit={handleLogin}>
                                                <div className="admin-form-group">
                                                        <label>Email</label>
                                                        <input
                                                                ref={emailRef}
                                                                type="email"
                                                                placeholder="Email"
                                                                value={form.email}
                                                                onChange={(e) => updateField("email", e.target.value)}
                                                                required
                                                        />
                                                </div>

                                                <div className="admin-form-group password-group">
                                                        <label>Password</label>
                                                        <div className="password-input-wrapper">
                                                                <input
                                                                        type={form.showPassword ? "text" : "password"}
                                                                        placeholder="Password"
                                                                        value={form.password}
                                                                        onChange={(e) => updateField("password", e.target.value)}
                                                                        required
                                                                />

                                                                <span
                                                                        className="material-symbols-outlined visibility-icon"
                                                                        onClick={() =>
                                                                                updateField("showPassword", !form.showPassword)
                                                                        }
                                                                        style={{
                                                                                cursor: "pointer",
                                                                                userSelect: "none",
                                                                                marginLeft: "10px",
                                                                        }}
                                                                >
                                                                        {form.showPassword ? "visibility_off" : "visibility"}
                                                                </span>
                                                        </div>

                                                        <div className="loginform-group">
                                                                <div className="forgot-link-wrapper">
                                                                        <div
                                                                                className="forgot-password-text"
                                                                                onClick={handleForgotPassword}
                                                                                style={{ cursor: "pointer" }}
                                                                        >
                                                                                Forgot password?
                                                                        </div>

                                                                </div>
                                                        </div>
                                                </div>

                                                <button className="login-button" type="submit" disabled={loading}>
                                                        {loading ? "Logging in..." : "Login"}
                                                </button>
                                                <div className="login-divider">
                                                        <span>or</span>
                                                </div>

                                                {/* ✅ Google Login Button */}
                                                <button
                                                        type="button"
                                                        className="google-login-button"
                                                        onClick={handleGoogleLogin}
                                                        disabled={loading}
                                                >
                                                        <img
                                                                src={Config.googleLogo}
                                                                alt="Google"
                                                                style={{ width: "20px", marginRight: "10px" }}
                                                        />
                                                        Continue with Google
                                                </button>
                                        </form>

                                        {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                                </div>
                        </div>
                </div>
        );
}
