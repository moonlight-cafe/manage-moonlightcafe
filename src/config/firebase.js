import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
        apiKey: "AIzaSyCyiEJw6UlCUMWeiPL1XwIZ0AMl-wCtTUw",
        authDomain: "moonlightcafe-91677.firebaseapp.com",
        projectId: "moonlightcafe-91677",
        storageBucket: "moonlightcafe-91677.firebasestorage.app",
        messagingSenderId: "474399538032",
        appId: "1:474399538032:web:eb8692e49ed5ecdaa46db5",
        measurementId: "G-VBM4TEYFP2"
};
// vapidKey:- BJR4CcHCHf_zboMRs823ynYFo53MX-BrO9V5da2dpsrj2q3mqgV70mlC8U1W7eBx_EShOVNRZ1-_IfexJ7osgDw

const app = initializeApp(firebaseConfig);

// Keep a lazy promise so callers can await support checks before using messaging APIs.
let messagingInstance = null;
let messagingInitPromise = null;

const isBrowserMessagingCapable = () =>
        typeof window !== "undefined" &&
        window.isSecureContext &&
        "Notification" in window &&
        "serviceWorker" in navigator;

const initMessaging = async () => {
        if (messagingInitPromise) return messagingInitPromise;

        messagingInitPromise = (async () => {
                if (!isBrowserMessagingCapable()) return null;
                try {
                        const supported = await isSupported();
                        if (!supported) return null;
                        messagingInstance = getMessaging(app);
                        return messagingInstance;
                } catch (err) {
                        console.warn("Firebase messaging not supported:", err?.message || err);
                        return null;
                }
        })();

        return messagingInitPromise;
};

// Get FCM token safely
export const getFCMToken = async () => {
        const messaging = await initMessaging();
        if (!messaging) return null;
        if (!("Notification" in window) || typeof Notification.requestPermission !== "function") return null;

        try {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") return null;

                const currentToken = await getToken(messaging, {
                        vapidKey: "BJR4CcHCHf_zboMRs823ynYFo53MX-BrO9V5da2dpsrj2q3mqgV70mlC8U1W7eBx_EShOVNRZ1-_IfexJ7osgDw" // put your key here
                });
                console.log("🚀 ~ firebase.js:42 ~ getFCMToken ~ currentToken>>", currentToken);

                return currentToken;
        } catch (err) {
                console.error("FCM token error", err);
                return null;
        }
};

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };

// Listen for foreground messages safely
export const listenToMessages = (callback) => {
        initMessaging()
                .then((messaging) => {
                        if (!messaging) return;
                        onMessage(messaging, callback);
                })
                .catch(() => null);
};
