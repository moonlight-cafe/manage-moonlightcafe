import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { Navbar, API, Method } from '../config/Init';

export default function Profile() {
        const navigate = useNavigate();
        const logindata = Method.checkLoginStatus();

        const [user, setUser] = useState(null);
        const [loading, setLoading] = useState(false);
        const [modalVisible, setModalVisible] = useState(false);
        const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
        const [twoFAModalVisible, setTwoFAModalVisible] = useState(false);
        const [isAnimatingAlertOut, setIsAnimatingAlertOut] = useState(false);
        const [isAnimatingResetAlertOut, setIsAnimatingResetAlertOut] = useState(false);
        const [isAnimatingTwoFAAlertOut, setIsAnimatingTwoFAAlertOut] = useState(false);
        const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
        const [twoFALoading, setTwoFALoading] = useState(false);
        const [twoFACode, setTwoFACode] = useState("");
        const [twoFASecret, setTwoFASecret] = useState("");
        const [twoFAOtpAuthUrl, setTwoFAOtpAuthUrl] = useState("");

        const [popup, setPopup] = useState({ message: "", type: "", visible: false });
        const [formData, setFormData] = useState({
                fname: "",
                lname: "",
                email: "",
                number: ""
        });

        const popupTimer = useRef(null);

        const showPopup = (message, type = "error") =>
                Method.showPopup(setPopup, popupTimer, message, type);

        /* =========================
           FETCH LOGGED-IN USER
        ========================== */
        const fetchProfile = async () => {
                if (loading) return;

                try {
                        setLoading(true);

                        const filter = { _id: logindata?.data?._id };
                        const response = await API.fetchEmployees(1, 1, {}, filter, {}, "");

                        if (response.status === 200) {
                                const data = response.data?.data || response.data || [];
                                setUser(data[0] || null);
                        } else {
                                showPopup(response.message || "Failed to load profile");
                        }
                } catch (err) {
                        console.error("Profile fetch error:", err);
                        showPopup("Server error while loading profile");
                } finally {
                        setLoading(false);
                }
        };

        useEffect(() => {
                fetchProfile();
        }, []);

        if (!user) {
                return (
                        <div className="profile-page">
                                <Navbar />
                                {Method.showLoader()}
                                {/* <p className="white text-center mt-40">Loading profile...</p> */}
                        </div>
                );
        }

        const handleChange = (e) => {
                const { name, value } = e.target;
                setFormData(prev => ({ ...prev, [name]: value }));
        };

        const openEditModal = () => {
                setFormData({
                        fname: user.fname || "",
                        lname: user.lname || "",
                        email: user.email || "",
                        number: user.number || ""
                });
                setModalVisible(true);
        };

        const handleUpdateProfile = async () => {
                try {
                        const payload = {
                                _id: user._id,
                                fname: formData.fname,
                                lname: formData.lname
                        };

                        const response = await API.UpdateProfile(payload);

                        if (response.status === 200) {
                                showPopup("Profile updated successfully", "success");

                                // Update local state
                                setUser(prev => ({
                                        ...prev,
                                        fname: formData.fname,
                                        lname: formData.lname,
                                        name: `${formData.fname} ${formData.lname}`
                                }));

                                // ✅ Update cookie correctly
                                const admin = Method.getCookie("admindata");
                                if (admin) {
                                        const parsedAdmin = JSON.parse(admin);

                                        const updatedAdmin = {
                                                ...parsedAdmin,
                                                name: `${formData.fname} ${formData.lname}`
                                        };

                                        Method.setCookie("admindata", updatedAdmin);
                                }

                                closeAlertModal();
                        } else {
                                showPopup(response.message || "Update failed");
                        }
                } catch (err) {
                        console.error(err);
                        showPopup("Server error while updating profile");
                }
        };

        const closeAlertModal = () => {
                setIsAnimatingAlertOut(true);
                setTimeout(() => {
                        setModalVisible(false);
                        setIsAnimatingAlertOut(false)
                }, 300);
        }

        const openResetPasswordModal = () => {
                setResetPasswordModalVisible(true);
        };

        const closeResetPasswordModal = () => {
                setIsAnimatingResetAlertOut(true);
                setTimeout(() => {
                        setResetPasswordModalVisible(false);
                        setIsAnimatingResetAlertOut(false);
                }, 300);
        };

        const handleSendResetOtp = async () => {
                if (!user?.email) {
                        showPopup("Email not found for this account");
                        return;
                }

                try {
                        setResetPasswordLoading(true);
                        const response = await API.SendOTP(user.email);

                        if (response.status === 200) {
                                showPopup("OTP sent successfully", "success");
                                localStorage.setItem("otpRequestedFor", user.email);
                                closeResetPasswordModal();
                                setTimeout(() => navigate(`/verify/otp?email=${user.email}`), 800);
                        } else {
                                showPopup(response.message || "Failed to send OTP");
                        }
                } catch (err) {
                        console.error("Reset password OTP error:", err);
                        showPopup("Server error while sending OTP");
                } finally {
                        setResetPasswordLoading(false);
                }
        };

        const openTwoFAModal = async () => {
                setTwoFAModalVisible(true);
                setTwoFACode("");

                if (user?.twoFactorEnabled === 1) return;

                try {
                        setTwoFALoading(true);
                        const response = await API.Setup2FA();
                        if (response.status === 200) {
                                setTwoFASecret(response?.data?.secret || "");
                                setTwoFAOtpAuthUrl(response?.data?.otpauthUrl || "");
                        } else {
                                showPopup(response.message || "Failed to initialize 2FA");
                        }
                } catch (err) {
                        console.error("2FA setup error:", err);
                        showPopup("Server error while setting up 2FA");
                } finally {
                        setTwoFALoading(false);
                }
        };

        const closeTwoFAModal = () => {
                setIsAnimatingTwoFAAlertOut(true);
                setTimeout(() => {
                        setTwoFAModalVisible(false);
                        setIsAnimatingTwoFAAlertOut(false);
                }, 300);
        };

        const handleEnable2FA = async () => {
                if (!/^\d{6}$/.test(twoFACode)) {
                        showPopup("Enter a valid 6-digit code");
                        return;
                }
                try {
                        setTwoFALoading(true);
                        const response = await API.Enable2FA(twoFACode);
                        if (response.status === 200) {
                                showPopup("2FA enabled successfully", "success");
                                setUser(prev => ({ ...prev, twoFactorEnabled: 1 }));
                                const admin = Method.getCookie("admindata");
                                if (admin) {
                                        const parsed = JSON.parse(admin);
                                        Method.setCookie("admindata", { ...parsed, twoFactorEnabled: 1 });
                                }
                                closeTwoFAModal();
                        } else {
                                showPopup(response.message || "Failed to enable 2FA");
                        }
                } catch (err) {
                        console.error("Enable 2FA error:", err);
                        showPopup("Server error while enabling 2FA");
                } finally {
                        setTwoFALoading(false);
                }
        };

        const handleDisable2FA = async () => {
                if (!/^\d{6}$/.test(twoFACode)) {
                        showPopup("Enter a valid 6-digit code");
                        return;
                }
                try {
                        setTwoFALoading(true);
                        const response = await API.Disable2FA(twoFACode);
                        if (response.status === 200) {
                                showPopup("2FA disabled successfully", "success");
                                setUser(prev => ({ ...prev, twoFactorEnabled: 0 }));
                                const admin = Method.getCookie("admindata");
                                if (admin) {
                                        const parsed = JSON.parse(admin);
                                        Method.setCookie("admindata", { ...parsed, twoFactorEnabled: 0 });
                                }
                                closeTwoFAModal();
                        } else {
                                showPopup(response.message || "Failed to disable 2FA");
                        }
                } catch (err) {
                        console.error("Disable 2FA error:", err);
                        showPopup("Server error while disabling 2FA");
                } finally {
                        setTwoFALoading(false);
                }
        };

        return (
                <>
                        <div className="profile-page user-not-select">
                                <Navbar />

                                <main className="profile-main">
                                        <section className="profile-section">
                                                <header className="profile-header">
                                                        <h1 className="m-0 main-color fs-35">My Profile</h1>
                                                </header>

                                                <hr className="mt-20 main-color" />

                                                {/* ================= PERSONAL INFO ================= */}
                                                <div className="profile-sub-section mt-20">
                                                        <h3 className="m-0 section-title fs-30">Personal Information</h3>

                                                        <div className="info-grid">
                                                                <div className="info-item">
                                                                        <span className="profile-item-icon fs-20">
                                                                                {Method.getInitials(user.name)}
                                                                        </span>
                                                                        <div className="info-text">
                                                                                <p className="info-label">Full Name</p>
                                                                                <p className="info-value">{user.name || "-"}</p>
                                                                        </div>
                                                                </div>

                                                                <div className="info-item">
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                mail
                                                                        </span>
                                                                        <div className="info-text">
                                                                                <p className="info-label">Email</p>
                                                                                <p className="info-value">{user.email || "-"}</p>
                                                                        </div>
                                                                </div>

                                                                <div className="info-item">
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                call
                                                                        </span>
                                                                        <div className="info-text">
                                                                                <p className="info-label">Phone Number</p>
                                                                                <p className="info-value">{user.number || "-"}</p>
                                                                        </div>
                                                                </div>

                                                                <div className="info-item">
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                id_card
                                                                        </span>
                                                                        <div className="info-text">
                                                                                <p className="info-label">Role</p>
                                                                                <p className="info-value">{user.role || "-"}</p>
                                                                        </div>
                                                                </div>

                                                                <div className="info-item">
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                calendar_month
                                                                        </span>
                                                                        <div className="info-text">
                                                                                <p className="info-label">Joined Date</p>
                                                                                <p className="info-value">
                                                                                        {Method.formatDate(user.createdAt)}
                                                                                </p>
                                                                        </div>
                                                                </div>

                                                                <div className="info-item">
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                badge
                                                                        </span>
                                                                        <div className="info-text">
                                                                                <p className="info-label">Employee ID</p>
                                                                                <p className="info-value">{user.employeeid || "-"}</p>
                                                                        </div>
                                                                </div>
                                                        </div>

                                                        <button className="main-btn plr-40 mt-20" onClick={openEditModal}>
                                                                Edit Profile
                                                        </button>
                                                </div>

                                                <hr className="main-color" style={{ margin: "12px 125px" }} />

                                                {/* ================= SECURITY ================= */}
                                                <div className="profile-sub-section">
                                                        <h3 className="m-0 section-title fs-30">Password & Security</h3>

                                                        <div className="info-grid">
                                                                <div className="info-item cursor-pointer" onClick={openResetPasswordModal}>
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                password
                                                                        </span>
                                                                        <p className="info-label fs-18">Change Password</p>
                                                                        <span className="material-symbols-outlined white">
                                                                                edit
                                                                        </span>
                                                                </div>

                                                                <div className="info-item cursor-pointer" onClick={openTwoFAModal}>
                                                                        <span className="material-symbols-outlined profile-item-icon">
                                                                                fingerprint
                                                                        </span>
                                                                        <p className="info-label fs-18">
                                                                                Two-Factor Authentication {user?.twoFactorEnabled === 1 ? "(Enabled)" : "(Disabled)"}
                                                                        </p>
                                                                        <span className="material-symbols-outlined white">
                                                                                edit
                                                                        </span>
                                                                </div>
                                                        </div>
                                                </div>
                                        </section>
                                </main>
                        </div>

                        {modalVisible && (
                                <div className="modal-overlay">
                                        <div className={`modal-content-select width-40 alert-modal ${isAnimatingAlertOut ? "fade-out" : ""}`}>
                                                <h3 className="modal-title fs-25 ">Edit Profile</h3>

                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                First Name <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="fname"
                                                                className="common-input-text"
                                                                value={formData.fname}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                </div>

                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Last Name <span className="required">*</span>
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="lname"
                                                                className="common-input-text"
                                                                value={formData.lname}
                                                                onChange={handleChange}
                                                                required
                                                        />
                                                </div>

                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Email
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="email"
                                                                className="common-input-text"
                                                                value={formData.email}
                                                                disabled
                                                        />
                                                </div>

                                                <div className="form-group">
                                                        <label className="form-group-label">
                                                                Phone Number
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="number"
                                                                className="common-input-text"
                                                                value={formData.number}
                                                                disabled
                                                        />
                                                </div>

                                                <div className="text-center mt-20">
                                                        <button className="main-btn mr-20" onClick={handleUpdateProfile}>
                                                                Save Changes
                                                        </button>

                                                        <button className="main-btn ml-20" onClick={closeAlertModal}>
                                                                Cancel
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {resetPasswordModalVisible && (
                                <div className="modal-overlay">
                                        <div className={`modal-content-select width-40 alert-modal ${isAnimatingResetAlertOut ? "fade-out" : ""}`}>
                                                <h3 className="modal-title fs-25">Reset Password</h3>
                                                <p className="form-group-label" style={{ paddingLeft: 0 }}>A one-time OTP will be sent to your email.</p>
                                                <div className="form-group mt-20">
                                                        <label className="form-group-label">
                                                                Email
                                                        </label>
                                                        <input
                                                                type="text"
                                                                name="email"
                                                                className="common-input-text"
                                                                value={user?.email || ""}
                                                                disabled
                                                        />
                                                </div>

                                                <div className="text-center mt-20">
                                                        <button className="main-btn mr-20" onClick={handleSendResetOtp} disabled={resetPasswordLoading}>
                                                                {resetPasswordLoading ? "Sending..." : "Send OTP"}
                                                        </button>
                                                        <button className="main-cancle-btn ml-20" onClick={closeResetPasswordModal} disabled={resetPasswordLoading}>
                                                                Cancel
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {twoFAModalVisible && (
                                <div className="modal-overlay">
                                        <div className={`modal-content-select width-40 alert-modal ${isAnimatingTwoFAAlertOut ? "fade-out" : ""}`}>
                                                <h3 className="modal-title fs-25">Two-Factor Authentication</h3>
                                                {user?.twoFactorEnabled === 1 ? (
                                                        <p className="form-group-label" style={{ paddingLeft: 0 }}>
                                                                Enter your authenticator code to disable 2FA.
                                                        </p>
                                                ) : (
                                                        <p className="form-group-label" style={{ paddingLeft: 0 }}>
                                                                Scan this setup QR in Google Authenticator/Authy and enter the 6-digit code.
                                                        </p>
                                                )}

                                                {!user?.twoFactorEnabled && twoFAOtpAuthUrl && (
                                                        <div className="text-center mt-20">
                                                                <img
                                                                        src={`https://quickchart.io/qr?text=${encodeURIComponent(twoFAOtpAuthUrl)}&size=200`}
                                                                        alt="2FA QR"
                                                                        style={{ width: 200, height: 200, borderRadius: 8 }}
                                                                />
                                                        </div>
                                                )}

                                                {!user?.twoFactorEnabled && !!twoFASecret && (
                                                        <div className="form-group mt-20">
                                                                <label className="form-group-label">Manual Setup Key</label>
                                                                <input
                                                                        type="text"
                                                                        className="common-input-text"
                                                                        value={twoFASecret}
                                                                        readOnly
                                                                />
                                                        </div>
                                                )}

                                                <div className="form-group mt-20">
                                                        <label className="form-group-label">Authenticator Code</label>
                                                        <input
                                                                type="text"
                                                                className="common-input-text"
                                                                value={twoFACode}
                                                                maxLength={6}
                                                                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ""))}
                                                                placeholder="Enter 6-digit code"
                                                        />
                                                </div>

                                                <div className="text-center mt-20">
                                                        {user?.twoFactorEnabled === 1 ? (
                                                                <button className="main-cancle-btn mr-20" onClick={handleDisable2FA} disabled={twoFALoading}>
                                                                        {twoFALoading ? "Disabling..." : "Disable 2FA"}
                                                                </button>
                                                        ) : (
                                                                <button className="main-btn mr-20" onClick={handleEnable2FA} disabled={twoFALoading}>
                                                                        {twoFALoading ? "Enabling..." : "Enable 2FA"}
                                                                </button>
                                                        )}
                                                        <button className="main-btn ml-20" onClick={closeTwoFAModal} disabled={twoFALoading}>
                                                                Cancel
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {Method.renderPopup(popup, () =>
                                Method.hidePopup(setPopup, popupTimer)
                        )}
                </>
        );
}
