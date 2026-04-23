import axios from "axios";
import { Method, Config } from './Init.js'
import { getFCMToken } from "./firebase.js";

const canRequestNotificationPermission = () =>
        typeof window !== "undefined" &&
        "Notification" in window &&
        typeof Notification.requestPermission === "function";

axios.interceptors.request.use(
        (config) => {
                let authData = Method.getCookie("authdata");

                if (typeof authData === "string") {
                        try { authData = JSON.parse(authData); }
                        catch { authData = {}; }
                }

                if (authData?.token) config.headers.token = `Bearer ${authData.token}`;
                if (authData?.uid) config.headers.uid = authData.uid;
                if (authData?.uniqueid) config.headers.unqkey = authData.uniqueid;
                if (authData?.name) config.headers.username = authData.name;
                if (typeof window !== "undefined") {
                        const path = window.location.pathname || "";
                        config.headers.pagename = path.replace(/^\//, "");
                }
                config.headers.platform = "web"
                return config;
        },
        (error) => Promise.reject(error)
);

// ðŸ”„ Auto Update Cookie + Logout on 401
axios.interceptors.response.use(
        (response) => response,
        (error) => {
                if (error.response && error.response.status === 401) {
                        localStorage.clear();
                        sessionStorage.clear();

                        document.cookie.split(";").forEach(cookie => {
                                const name = cookie.split("=")[0].trim();
                                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                        });
                        window.location.href = "/login";
                }
                return Promise.reject(error);
        }
);

export default class APIs {

        // ðŸ”’ SAFE POST
        async safePost(url, body = {}, headers = {}) {
                try {
                        const response = await axios.post(`${Config.backendurl}${url}`, body, { headers });
                        if (response.data.status === 200 && response.headers.token) {
                                const authCookie = {
                                        token: response.headers.token,
                                        uid: response.headers.uid,
                                        uniqueid: response.headers.unqkey,
                                };
                                Method.setCookie("authdata", authCookie);
                        }
                        return { ...response.data, __headers: response.headers };
                } catch (error) {
                        if (error.response) return error.response.data;
                        return { status: 500, message: "Network Connection Error" };
                }
        }

        // ðŸ—‘ï¸ SAFE DELETE
        async safeDelete(url, data = {}) {
                try {
                        const response = await axios.delete(`${Config.backendurl}${url}`, { data });
                        return response.data;
                } catch (error) {
                        if (error.response) return error.response.data;
                        return { status: 500, message: "Network Connection Error" };
                }
        }

        // ðŸ”‘ AUTH
        async GetAccessToken(email) {

                document.cookie.split(";").forEach(cookie => {
                        const name = cookie.split("=")[0].trim();
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                });

                const unqkey = Method.generateRandomString(25);
                const unqid = Method.generateuuid();
                const mainKey = Config.accesskey;
                const id = Method.generateRandomNumber(4);
                const key = Method.secureHash(mainKey, unqkey, unqid, id);

                const headers = { key, unqkey, unqid, issuer: Config.issuer, code: email, id };

                const result = await this.safePost("getaccesstoken", {}, headers);
                return result;
        }

        async Login(email, password) {
                const result = await this.safePost("admin/login", { email, password });
                if (result.status === 200 && !result.requires2FA) {
                        Method.setCookie("admindata", result.data);
                        if (result.permission) {
                                Method.setPermissions(result.permission);
                        }
                        Notification.requestPermission().then(async (permission) => {
                                console.log("ðŸš€ ~ APIs.js:99 ~ APIs ~ Login ~ permission>>", permission);

                                if (permission === "granted") {
                                        const token = await getFCMToken();
                                        await this.GetDeviceToken(token)
                                        console.log("FCM Token:", token);
                                }
                        });
                        await this.LoginData(result.data)
                }
                return result;
        }

        async VerifyAdmin2FA(email, tempToken, code) {
                const result = await this.safePost("auth/2fa/verify", { email, tempToken, code });
                if (result.status === 200) {
                        Method.setCookie("admindata", result.data);
                        if (result.permission) {
                                Method.setPermissions(result.permission);
                        }
                        Notification.requestPermission().then(async (permission) => {
                                if (permission === "granted") {
                                        const token = await getFCMToken();
                                        await this.GetDeviceToken(token);
                                }
                        });
                        await this.LoginData(result.data);
                }
                return result;
        }

        async LoginData(userdata) {
                const result = await this.safePost("logindata", {});
                if (result.status === 200) {
                        Method.setPermissions(result.permission);
                        Method.setCookie("backgroundimgs", result.bgimgs);
                }
                return result;
        }

        async GoogleLogin(name, email, number) {
                const result = await this.safePost("employee/google/login", { name, email, number });
                if (result.status === 200) {
                        Method.setCookie("admindata", result);
                        Notification.requestPermission().then(async (permission) => {
                                console.log("ðŸš€ ~ APIs.js:114 ~ APIs ~ GoogleLogin ~ permission>>", permission);
                                if (permission === "granted") {
                                        const token = await getFCMToken();
                                        await this.GetDeviceToken(token)
                                        console.log("FCM Token:", token);
                                }
                        });
                        await this.LoginData(result.data)
                }
                return result;
        }

        async GetDeviceToken(token) {
                const result = await this.safePost("getdevicetoken", { token });

                return result
        }

        async ChangeForgotPassword(email, password, cnfpassword, token) {
                const result = await this.safePost("emp/change/forgot/password", { email, password, cnfpassword, token });
                if (result.status === 200 && result.token) {
                        localStorage.setItem("token", result.token);
                        Method.setCookie("customerdata", result);
                }
                return result;
        }

        async ChangeTheme(id, darkmodeaccess) {
                const result = await this.safePost("emp/change/theme", { _id: id, darkmodeaccess: darkmodeaccess });
                if (result.status === 200) {
                        const admin = Method.getCookie("admindata");

                        if (!admin) return;

                        const updated = {
                                ...JSON.parse(admin),
                                darkmodeaccess: darkmodeaccess
                        };

                        Method.setCookie("admindata", updated);
                }
                return result;
        }

        async Logout() {
                const result = await this.safePost("logout", {});

                if (result.status === 200) {
                        localStorage.clear();
                        sessionStorage.clear();

                        document.cookie.split(";").forEach(cookie => {
                                const name = cookie.split("=")[0].trim();
                                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                        });
                }

                return { status: 200, message: "Logged out successfully" };
        }

        fetchCustomerSupport(pageno = 1, pagelimit = 20, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`contactus`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        ResolveCustomerSupport(id, remark) {
                return this.safePost(`resolve/contactus`, { _id: id, remark: remark, iscompleted: 1 });
        }

        // ðŸ”” NOTIFICATIONS
        ListNotification(pageno = 1, pagelimit = 10, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`notification/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        ReadNotification(payload) {
                return this.safePost(`notification/read`, payload);
        }

        // ðŸ½ï¸ Background
        fetchBackground() {
                return this.safePost(`background/list`, {});
        }

        CreateUpdateBackground(route = "add", payload) {
                return this.safePost(`background/${route}`, payload);
        }

        RemoveBackground(id) {
                return this.safeDelete(`background/delete`, { _id: id });
        }

        // ðŸ½ï¸ MENUS
        fetchMenus(pageno = 1, pagelimit = 20, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`menu/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        CreateUpdateMenus(route = "add", payload) {
                return this.safePost(`menu/${route}`, payload);
        }

        RemoveMenus(id) {
                return this.safeDelete(`menu/remove`, { _id: id });
        }

        // ðŸ› FOOD ITEMS
        fetchFoodItems(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`fooditems/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        CreateUpdateFoodItems(route = "add", payload) {
                return this.safePost(`fooditems/${route}`, payload);
        }

        RemoveFoodItems(id) {
                return this.safeDelete(`fooditems/remove`, { _id: id });
        }

        // ðŸ—‚ï¸ CATEGORY
        fetchCategory(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`category/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        CreateUpdateCategory(route = "add", payload) {
                return this.safePost(`category/${route}`, payload);
        }

        RemoveCategory(id) {
                return this.safeDelete(`category/remove`, { _id: id });
        }

        // ðŸª‘ TABLES
        fetchTables(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`tables/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        CreateUpdateTables(route = "add", payload) {
                return this.safePost(`table/${route}`, payload);
        }

        RemoveTables(id) {
                return this.safeDelete(`table/remove`, { _id: id });
        }

        // ðŸ‘¤ CUSTOMER
        fetchCustomerDetails(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`customer/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        // ðŸ‘¤ EMPLOYEE USER ROLES

        fetchUserRoles(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`userroles/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        AddUserRole(data) {
                return this.safePost("userroles/add", data);
        }

        UpdateUserRole(data) {
                return this.safePost("userroles/update", data);
        }

        RemoveUserRole(id) {
                return this.safeDelete(`userroles/delete`, { _id: id });
        }

        // ðŸ‘¤ EMPLOYEES
        fetchEmployees(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`employee/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        // ðŸ” PERMISSIONS
        ListPermissions(payload) {
                return this.safePost(`permissions/list`, payload);
        }

        AddUpdatePermissions(payload) {
                return this.safePost(`permissions/addupdate`, payload);
        }

        AddEmployees(payload) {
                return this.safePost(`employee/add`, payload);
        }

        UpdateEmployees(payload) {
                return this.safePost(`employee/update`, payload);
        }

        UpdateProfile(payload) {
                return this.safePost(`emp/update/profile`, payload);
        }

        UpdateEmpStatus(payload) {
                return this.safePost(`employee/toggle/status`, payload);
        }

        Setup2FA() {
                return this.safePost("emp/2fa/setup", {});
        }

        Enable2FA(code) {
                return this.safePost("emp/2fa/enable", { code });
        }

        Disable2FA(code) {
                return this.safePost("emp/2fa/disable", { code });
        }

        // ðŸ’° PAYMENTS
        ListPendingPayments(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`list/orders`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        AdminPaymentVerify(orderId, customerid, url) {
                return this.safePost(`admin/payments/received`, { _id: orderId, customerid, url, status: 2 });
        }

        // ðŸ” OTP
        SendOTP(email) {
                return this.safePost(`admin/send/otp`, { email });
        }

        VerifyOTP(email, otp) {
                return this.safePost(`verify/otp`, { email, otp });
        }

        async VerifyResetToken(token, email) {
                return this.safePost("verify/otp/token", { token, email });
        }

        async ListRating(pageno = 1, pagelimit = 20, sort = { number: 1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost("rating", {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        fetchShiftTimes(pageno = 1, pagelimit = 50, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`shift/time/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        CreateShiftTime(payload) {
                return this.safePost(`shift/time/add`, payload);
        }

        UpdateShiftTime(payload) {
                return this.safePost(`shift/time/update`, payload);
        }

        RemoveShiftTime(id) {
                return this.safePost(`shift/time/delete`, { _id: id });
        }

        fetchShiftAssigns(pageno = 1, pagelimit = 50, sort = { _id: -1 }, filter = {}, projection = {}, searchtext = "") {
                return this.safePost(`shift/assign/list`, {
                        paginationinfo: { pageno, pagelimit, sort, projection, filter },
                        searchtext
                });
        }

        CreateShiftAssign(payload) {
                return this.safePost(`shift/assign/add`, payload);
        }

        UpdateShiftAssign(payload) {
                return this.safePost(`shift/assign/update`, payload);
        }

        RemoveShiftAssign(id) {
                return this.safePost(`shift/assign/delete`, { _id: id });
        }
}
