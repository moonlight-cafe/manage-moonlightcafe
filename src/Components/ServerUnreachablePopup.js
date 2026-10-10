import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Config } from '../config/Init.js';

const ServerUnreachablePopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleServerUnreachable = () => {
            setIsOpen(true);
        };
        window.addEventListener('server-unreachable', handleServerUnreachable);
        return () => window.removeEventListener('server-unreachable', handleServerUnreachable);
    }, []);

    const handleRetry = async () => {
        setLoading(true);
        try {
            const url = Config.backendurl.replace(/\/$/, '') + '/healthcheck';
            const response = await axios.get(url);
            
            if (response.status === 200) {
                setIsOpen(false);
            }
        } catch (error) {
            console.error("Retry failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay fade-in">
            <div className="modal-content-select order-modal server-unreachable-modal">
                <img 
                    src={Config.servernotreachableimg} 
                    alt="Server Unreachable" 
                    className="server-unreachable-img" 
                />

                <button 
                    className="main-btn server-unreachable-btn"
                    onClick={handleRetry} 
                    disabled={loading}
                >
                    {loading ? 'RETRYING...' : 'RETRY'}
                </button>
            </div>
        </div>
    );
};

export default ServerUnreachablePopup;
