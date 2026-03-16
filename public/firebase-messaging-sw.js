importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
        apiKey: "AIzaSyCyiEJw6UlCUMWeiPL1XwIZ0AMl-wCtTUw",
        authDomain: "moonlightcafe-91677.firebaseapp.com",
        projectId: "moonlightcafe-91677",
        storageBucket: "moonlightcafe-91677.firebasestorage.app",
        messagingSenderId: "474399538032",
        appId: "1:474399538032:web:eb8692e49ed5ecdaa46db5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
        self.registration.showNotification(payload.notification.title, {
                body: payload.notification.body,
        });
});
