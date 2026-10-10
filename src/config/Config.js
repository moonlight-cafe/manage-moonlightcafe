import NoOrderFound from "../assets/NoOrderFound.png"
import MoonlightCafeLogoSquare from "../assets/MoonlightCafeLogoSquare-47d9a8.png"
import MoonlightCafeLogo from "../assets/MoonlightCafeLogo-47d9a8.png"
import MoonlightCafeText from "../assets/MoonlightCafeText.png"
import ServerNotReachable from "../assets/ServerNotReachable.png"
import PageNotFound from "../assets/PageNotFound.png"
import NoDataFound from "../assets/NoDataFound.png"
import ThankYou from "../assets/ThankYou.png"
import GoogleLogo from "../assets/GoogleLogo.png"

class Config {
        constructor() {
                this.themeColors = [
                        "#47d9a8",
                        "#91cc75",
                        "#fac858",
                        "#ee6666",
                        "#73c0de",
                        "#3ba272",
                        "#fc8452",
                        "#9a60b4",
                        "#ea7ccc",
                        "#5470c6",
                        "#36d1dc",
                        "#f7b731"
                ];
                // this.backendurl = "http://192.168.1.4:8080/moonlightcafe/v1/";
                this.backendurl = "https://api-moonlightcafe.onrender.com/moonlightcafe/v1/";
                this.accesskey = "Moonlight_Cafe_A4C9D2F1-5F21-A5E7-4C8B-C1D9B6F0A277"
                this.issuer = "web"
                this.upiId = "jainilam75-1@okhdfcbank"
                this.moonlightcafelogo = MoonlightCafeLogo
                this.moonlightcafetext = MoonlightCafeText
                this.moonlightcafelogosquare = MoonlightCafeLogoSquare
                this.pagenotfoundimg = PageNotFound
                this.ordernotfoundimg = NoOrderFound
                this.servernotreachableimg = ServerNotReachable
                this.nodatafoundimg = NoDataFound
                this.thankyouimg = ThankYou
                this.googleLogo = GoogleLogo
                this.icons = {
                        sort: "sync_alt",
                        sort_asc: "arrow_upward",
                        sort_desc: "arrow_downward"
                }
                this.Sevice_type = [
                        { label: "Dine in", value: 1 },
                        { label: "Take Away", value: 2 },
                        // { label: "Reservation", value: 3 },
                ];
                this.Payment_type = [
                        { label: "Cash", value: 1 },
                        { label: "UPI", value: 2 }
                ];
                this.Time_Ranges = [
                        { label: "Today", value: "today" },
                        { label: "Yesterday", value: "yesterday" },
                        { label: "This Week", value: "this_week" },
                        { label: "Last Week", value: "last_week" },
                        { label: "Last 7 Days", value: "last_7_days" },
                        { label: "This Month", value: "this_month" },
                        { label: "Last Month", value: "last_month" },
                        { label: "Last 28 Days", value: "last_28_days" },
                        { label: "This Year", value: "this_year" },
                        { label: "Custom", value: "custom" }
                ];

                // Preload all images so they don't load half-half when first used
                const imagesToPreload = [
                        this.moonlightcafelogo,
                        this.moonlightcafetext,
                        this.moonlightcafelogosquare,
                        this.pagenotfoundimg,
                        this.ordernotfoundimg,
                        this.servernotreachableimg,
                        this.nodatafoundimg,
                        this.thankyouimg,
                        this.googleLogo
                ];
                imagesToPreload.forEach(src => {
                        if (src) {
                                const img = new Image();
                                img.src = src;
                        }
                });
        }
}

export default Config