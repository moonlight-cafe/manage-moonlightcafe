import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Method } from "../config/Init.js";

const BACKGROUND_INTERVAL = 10000;

export default function BackgroundManager() {
        const location = useLocation();

        const [images, setImages] = useState([]);
        const [darkMode, setDarkMode] = useState(false);

        const lastIndexRef = useRef(-1);

        const getBackgroundImages = () => {
                try {
                        const raw = Method.getCookie("backgroundimgs");
                        if (!raw) return [];

                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) return parsed;
                        if (typeof parsed === "string") {
                                const reparsed = JSON.parse(parsed);
                                return Array.isArray(reparsed) ? reparsed : [];
                        }
                        return [];
                } catch (err) {
                        console.error("❌ Invalid background image cookie", err);
                        return [];
                }
        };

        const applyThemeFromCookie = () => {
                const admindata = Method.getCookie("admindata");
                const theme = Number(JSON.parse(admindata)?.darkmodeaccess) || 0;
                setDarkMode(theme);
        };

        useEffect(() => {
                applyThemeFromCookie();

                const imgs = getBackgroundImages();
                setImages(imgs);
        }, []);

        useEffect(() => {
                const handleBackgroundUpdate = () => {
                        applyThemeFromCookie();
                        const imgs = getBackgroundImages();
                        lastIndexRef.current = -1;
                        setImages(imgs);
                };

                window.addEventListener("themeChanged", handleBackgroundUpdate);

                return () =>
                        window.removeEventListener("themeChanged", handleBackgroundUpdate);
        }, []);

        useEffect(() => {
                if (darkMode === 1) {
                        document.body.style.backgroundImage = "none";
                        document.body.style.backgroundColor = "#1e1e1e";
                        return;
                }

                if (!images.length) return;

                const updateBackground = () => {
                        let randomIndex;

                        do {
                                randomIndex = Math.floor(Math.random() * images.length);
                        } while (
                                randomIndex === lastIndexRef.current &&
                                images.length > 1
                        );

                        lastIndexRef.current = randomIndex;

                        document.body.style.backgroundImage = `url('${images[randomIndex]}')`;
                        document.body.style.backgroundSize = "cover";
                        document.body.style.backgroundPosition = "center";
                        document.body.style.backgroundRepeat = "no-repeat";
                        document.body.style.backgroundAttachment = "fixed";
                        document.body.style.backgroundBlendMode = "multiply";
                        document.body.style.backgroundColor = "#1e1e1efa";

                };

                updateBackground();
                const interval = setInterval(updateBackground, BACKGROUND_INTERVAL);

                return () => clearInterval(interval);
        }, [images, darkMode, location.pathname]);

        return null;
}
