import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import './Common.css';
import BackgroundManager from './Components/BackgroundManager.js';
import Login from './Components/Login.js';
import Dashboard from './Components/dashboard.js';
import CustomerSupport from './Components/CustomerSupport.js';
import NotFoundPage from './Components/NotFoundPage.js';
import Menu from './Components/Menu.js';
import Table from './Components/Table.js';
import Permissions from './Components/Permissions.js';
import Userrole from './Components/Userrole.js';
import Employee from './Components/Employee.js';
import Fooditems from './Components/Fooditems.js';
import Category from './Components/Category.js';
import Review from './Components/Review.js';
import Setting from './Components/Setting.js';
import Profile from './Components/Profile.js';
import Notification from './Components/Notification.js';
import CustomerDetails from './Components/CustomerDetails.js';
import PaymentVerify from './Components/PaymentVerify.js';
import OrderHistory from './Components/OrderHistory.js';
import ResetPassword from './Components/ResetPassword.js';
import VerifyOTP from './Components/VerifyOTP.js';
import Verify2FA from './Components/Verify2FA.js';
import Background from './Components/Background.js';
import { Method } from "./config/Init.js";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const path = location.pathname || "/";
  if (Method.isPermissionBypassPath(path)) return children;
  const permissions = Method.getPermissions();

  if (!permissions.length) return <Navigate to="/dashboard" replace />;

  const canView = Method.canAccess(path, "view");
  return canView ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  useEffect(() => {
    const logoutOnClose = () => {
      localStorage.removeItem("userSession");
    };

    window.addEventListener("beforeunload", logoutOnClose);

    return () => window.removeEventListener("beforeunload", logoutOnClose);
  }, []);

  return (
    <Router>
      <BackgroundManager />
      <Routes>
        {/* HOME PAGE */}
        <Route path="/login" element={<Login />} />
        <Route path="//background" element={<Background />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/customer/support" element={<ProtectedRoute><CustomerSupport /></ProtectedRoute>} />
        <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
        <Route path="/table" element={<ProtectedRoute><Table /></ProtectedRoute>} />
        <Route path="/tables" element={<ProtectedRoute><Table /></ProtectedRoute>} />
        <Route path="/userrole" element={<ProtectedRoute><Userrole /></ProtectedRoute>} />
        <Route path="/employee" element={<ProtectedRoute><Employee /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><Permissions /></ProtectedRoute>} />
        <Route path="/customerdata" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />
        <Route path="/fooditems" element={<ProtectedRoute><Fooditems /></ProtectedRoute>} />
        <Route path="/category" element={<ProtectedRoute><Category /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Category /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><Review /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Setting /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notification /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
        <Route path="/verify/otp" element={<VerifyOTP />} />
        <Route path="/verify/2fa" element={<Verify2FA />} />
        <Route path="/reset/password" element={<ResetPassword />} />
        <Route path="/verify_payment" element={<ProtectedRoute><PaymentVerify /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </Router>
  );
}

export default App;
