import React, { useState, useEffect, useRef } from "react";
import "./Login.css";
import { Method, Config, API } from '../config/Init.js'
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../config/firebase";

const cafelogo = Config.moonlightcafetext;
const cafelogosquare = Config.moonlightcafelogosquare;

const GoogleIcon = ({ src, alt = "Google", className = "google-logo-icon" }) => {
        const [isLoaded, setIsLoaded] = useState(false);
        const [hasError, setHasError] = useState(false);

        const defaultSvg = (
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
        );

        if (hasError || !src) {
                return defaultSvg;
        }

        return (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
                        {!isLoaded && defaultSvg}
                        <img
                                src={src}
                                alt={alt}
                                className={className}
                                style={{ display: isLoaded ? "inline-block" : "none", width: 20, height: 20, objectFit: "contain" }}
                                onLoad={() => setIsLoaded(true)}
                                onError={() => setHasError(true)}
                        />
                </span>
        );
};

export default function AdminLogin() {
        const [form, setForm] = useState({
                email: "",
                password: "",
                showPassword: false,
                rememberMe: false
        });
        const emailRef = useRef(null);
        const navigate = useNavigate();
        const location = useLocation();
        const [loading, setLoading] = useState(false);
        const queryParams = new URLSearchParams(location.search);
        const redirectPage = queryParams.get("page") || "/dashboard";

        const [popup, setPopup] = useState({
                message: "",
                type: "",
                visible: false,
        });

        const popupTimer = useRef(null);

        useEffect(() => {
                const logindata = Method.checkLoginStatus();
                if (logindata && logindata.status === 200) {
                        navigate(redirectPage);
                }

                const rememberedEmail = localStorage.getItem("admin_remember_email");
                const rememberedPassword = localStorage.getItem("admin_remember_password");
                if (rememberedEmail && rememberedPassword) {
                        setForm(prev => ({
                                ...prev,
                                email: rememberedEmail,
                                password: rememberedPassword,
                                rememberMe: true
                        }));
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
        }, [navigate, redirectPage]);

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
                        const accessResp = await API.GetAccessToken(email, form.rememberMe);
                        console.log("🚀 ~ Login.js:68 ~ handleLogin ~ accessResp>>", accessResp);
                        if (accessResp.status !== 200) {
                                showPopup(accessResp.message || "Access token failed");
                                return;
                        }

                        if (form.rememberMe) {
                                localStorage.setItem("admin_remember_me", "true");
                                localStorage.setItem("admin_remember_email", email);
                                localStorage.setItem("admin_remember_password", password);
                        } else {
                                localStorage.removeItem("admin_remember_me");
                                localStorage.removeItem("admin_remember_email");
                                localStorage.removeItem("admin_remember_password");
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
                                        navigate(redirectPage);
                                }
                        } else {
                                showPopup(loginResp.message || "Invalid credentials");
                        }

                } catch (error) {
                        console.error("Login Error:", error);
                        showPopup(error?.response?.data?.message || "Server connection failed. Please check your internet or try again.");
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
                                        navigate(redirectPage);
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
                <div className="auth-outer-wrapper user-not-select">
                        <div className="auth-left-panel">
                                <div className="auth-left-content">
                                        <h1 className="auth-welcome-title">Welcome To</h1>
                                        <div className="auth-logo-stack">
                                                <img src={cafelogosquare} alt="Logo" className="auth-logo-sq" />
                                                <img src={cafelogo} alt="Moonlight Cafe" className="auth-logo-tx" />
                                        </div>
                                        <p className="auth-left-tagline">
                                                Manage your café operations, users, and reports with ease.
                                        </p>
                                </div>
                        </div>

                        <div className="auth-right-panel">
                                <div className="auth-form-card">
                                        <div className="auth-header">
                                                <h2>Admin Login</h2>
                                                <p>Welcome back! Please enter your details.</p>
                                        </div>

                                        <form onSubmit={handleLogin} className="auth-form">
                                                <div className="auth-input-group">
                                                        {/* <label className="main-color fs-18">Email</label> */}
                                                        <div className="input-wrapper">
                                                                <span className="material-symbols-outlined input-icon">mail</span>
                                                                <input
                                                                        ref={emailRef}
                                                                        type="email"
                                                                        placeholder="Email"
                                                                        value={form.email}
                                                                        onChange={(e) => updateField("email", e.target.value)}
                                                                        required
                                                                />
                                                        </div>
                                                </div>

                                                <div className="auth-input-group mt-20">
                                                        {/* <label className="main-color fs-18">Password</label> */}
                                                        <div className="input-wrapper">
                                                                <span className="material-symbols-outlined input-icon">lock</span>
                                                                <input
                                                                        type={form.showPassword ? "text" : "password"}
                                                                        placeholder="Password"
                                                                        value={form.password}
                                                                        onChange={(e) => updateField("password", e.target.value)}
                                                                        required
                                                                />
                                                                <span
                                                                        className="material-symbols-outlined visibility-trigger"
                                                                        onClick={() => updateField("showPassword", !form.showPassword)}
                                                                >
                                                                        {form.showPassword ? "visibility_off" : "visibility"}
                                                                </span>
                                                        </div>
                                                        <div className="auth-extra-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <label className="premium-checkbox-wrapper">
                                                                        <input
                                                                                type="checkbox"
                                                                                className="premium-checkbox-input"
                                                                                checked={form.rememberMe}
                                                                                onChange={(e) => updateField("rememberMe", e.target.checked)}
                                                                        />
                                                                        <span className="premium-checkbox-tile">
                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="premium-check-svg">
                                                                                        <polyline points="4 12 9 17 20 6"></polyline>
                                                                                </svg>
                                                                        </span>
                                                                        <span className="premium-checkbox-text">Remember Me</span>
                                                                </label>
                                                                <span className="forgot-trigger fs-16" onClick={handleForgotPassword}>
                                                                        Forgot Password?
                                                                </span>
                                                        </div>
                                                </div>

                                                <button className="main-btn fs-18" type="submit" disabled={loading}>
                                                        {loading ? (
                                                                <span className="btn-loader"></span>
                                                        ) : (
                                                                "Login"
                                                        )}
                                                </button>

                                                <div className="auth-divider">
                                                        <span>OR</span>
                                                </div>

                                                <button
                                                        type="button"
                                                        className="auth-google-btn fs-16"
                                                        onClick={handleGoogleLogin}
                                                        disabled={loading}
                                                >
                                                        <GoogleIcon src={Config.googleLogo} alt="Google" />
                                                        <span>Sign in with Google</span>
                                                </button>
                                        </form>
                                </div>
                        </div>
                        {Method.renderPopup(popup, () => Method.hidePopup(setPopup, popupTimer))}
                </div>
        );
}
