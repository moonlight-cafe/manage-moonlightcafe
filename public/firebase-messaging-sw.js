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
                data: payload.data
        });
});

self.addEventListener('notificationclick', function(event) {
        event.notification.close();
        
        let click_action = '/';
        if (event.notification.data && event.notification.data.clickaction) {
                click_action = event.notification.data.clickaction;
        }
        
        const urlToOpen = new URL(click_action, self.location.origin).href;

        event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                        for (let i = 0; i < clientList.length; i++) {
                                const client = clientList[i];
                                if (client.url && 'focus' in client) {
                                        client.navigate(urlToOpen);
                                        return client.focus();
                                }
                        }
                        if (clients.openWindow) {
                                return clients.openWindow(urlToOpen);
                        }
                })
        );
});
