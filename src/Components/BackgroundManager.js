import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Method } from "../config/Init.js";
import "./BackgroundManager.css";

const BACKGROUND_INTERVAL = 10000;
const TRANSITION_DURATION = 1200;
const ANIMATIONS = ["fade", "slide-left", "slide-right", "zoom", "blur"];

export default function BackgroundManager() {
        const location = useLocation();

        const [images, setImages] = useState([]);
        const [darkMode, setDarkMode] = useState(false);
        const [currentImage, setCurrentImage] = useState("");
        const [nextImage, setNextImage] = useState("");
        const [activeAnimation, setActiveAnimation] = useState("fade");

        const lastIndexRef = useRef(-1);
        const intervalRef = useRef(null);
        const transitionRef = useRef(null);
        const isTransitioningRef = useRef(false);

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
                        console.error("Invalid background image cookie", err);
                        return [];
                }
        };

        const applyThemeFromCookie = () => {
                const admindata = Method.getCookie("admindata");
                const theme = Number(JSON.parse(admindata)?.darkmodeaccess) || 0;
                setDarkMode(theme);
        };

        const clearTimers = () => {
                if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                }
                if (transitionRef.current) {
                        clearTimeout(transitionRef.current);
                        transitionRef.current = null;
                }
                isTransitioningRef.current = false;
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
                clearTimers();

                if (darkMode === 1) {
                        document.body.style.backgroundImage = "none";
                        document.body.style.backgroundColor = "#1e1e1e";
                        setCurrentImage("");
                        setNextImage("");
                        lastIndexRef.current = -1;
                        return;
                }

                document.body.style.backgroundImage = "none";
                document.body.style.backgroundColor = "#1e1e1efa";

                if (!images.length) {
                        setCurrentImage("");
                        setNextImage("");
                        lastIndexRef.current = -1;
                        return;
                }

                if (!currentImage || !images.includes(currentImage)) {
                        const firstIndex = Math.floor(Math.random() * images.length);
                        lastIndexRef.current = firstIndex;
                        setCurrentImage(images[firstIndex]);
                }

                const pickNextIndex = () => {
                        let randomIndex;

                        do {
                                randomIndex = Math.floor(Math.random() * images.length);
                        } while (
                                randomIndex === lastIndexRef.current &&
                                images.length > 1
                        );

                        return randomIndex;
                };

                const pickAnimation = () =>
                        ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)];

                const updateBackground = () => {
                        if (isTransitioningRef.current) return;
                        if (!images.length) return;

                        const randomIndex = pickNextIndex();
                        const next = images[randomIndex];
                        const animation = pickAnimation();

                        lastIndexRef.current = randomIndex;
                        isTransitioningRef.current = true;
                        setActiveAnimation(animation);
                        setNextImage(next);

                        transitionRef.current = setTimeout(() => {
                                setCurrentImage(next);
                                setNextImage("");
                                isTransitioningRef.current = false;
                        }, TRANSITION_DURATION);
                };

                intervalRef.current = setInterval(updateBackground, BACKGROUND_INTERVAL);

                return () => clearTimers();
        }, [images, darkMode, location.pathname, currentImage]);

        const animationClass = nextImage ? `anim-${activeAnimation}` : "";

        return (
                <div className={`bg-manager ${darkMode === 1 ? "hidden" : ""} ${animationClass}`}>
                        <div
                                className="bg-layer current"
                                style={{ backgroundImage: currentImage ? `url('${currentImage}')` : "none" }}
                        />
                        <div
                                className="bg-layer next"
                                style={{ backgroundImage: nextImage ? `url('${nextImage}')` : "none" }}
                        />
                </div>
        );
}
