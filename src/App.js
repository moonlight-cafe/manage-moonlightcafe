import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import './Common.css';
import BackgroundManager from './Components/BackgroundManager.js';
import { Method } from "./config/Init.js";

const Login = lazy(() => import('./Components/Login.js'));
const Dashboard = lazy(() => import('./Components/dashboard.js'));
const CustomerSupport = lazy(() => import('./Components/CustomerSupport.js'));
const NotFoundPage = lazy(() => import('./Components/NotFoundPage.js'));
const Menu = lazy(() => import('./Components/Menu.js'));
const Table = lazy(() => import('./Components/Table.js'));
const Permissions = lazy(() => import('./Components/Permissions.js'));
const Userrole = lazy(() => import('./Components/Userrole.js'));
const Employee = lazy(() => import('./Components/Employee.js'));
const Fooditems = lazy(() => import('./Components/Fooditems.js'));
const Category = lazy(() => import('./Components/Category.js'));
const Review = lazy(() => import('./Components/Review.js'));
const Setting = lazy(() => import('./Components/Setting.js'));
const Profile = lazy(() => import('./Components/Profile.js'));
const Notification = lazy(() => import('./Components/Notification.js'));
const CustomerDetails = lazy(() => import('./Components/CustomerDetails.js'));
const PaymentVerify = lazy(() => import('./Components/PaymentVerify.js'));
const OrderHistory = lazy(() => import('./Components/OrderHistory.js'));
const ResetPassword = lazy(() => import('./Components/ResetPassword.js'));
const VerifyOTP = lazy(() => import('./Components/VerifyOTP.js'));
const Verify2FA = lazy(() => import('./Components/Verify2FA.js'));
const Background = lazy(() => import('./Components/Background.js'));

function ProtectedRoute({ children }) {
  const location = useLocation();
  const path = location.pathname || "/";
  if (Method.isPermissionBypassPath(path)) return children;
  const permissions = Method.getPermissions();

  if (!permissions.length) return <Navigate to="/dashboard" replace />;

  const canView = Method.canAccess(path, "view");
  return canView ? children : <Navigate to="/dashboard" replace />;
}

function AppLoader() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      {Method.showLoader()}
    </div>
  );
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
      <Suspense fallback={<AppLoader />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
