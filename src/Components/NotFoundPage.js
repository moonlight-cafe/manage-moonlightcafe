// Components/NotFoundPage.js
import React from 'react';
import { Navbar, Config } from "../config/Init.js"
const pagenotfoundimg = Config.pagenotfoundimg;

const NotFoundPage = () => {
        return (
                <>
                        <Navbar />
                        <div className="notfound-wrapper">
                                <div className="notfound-box">
                                        <div className='notfoundiimg'>
                                                <img
                                                        src={pagenotfoundimg}
                                                        alt="404 Not Found"
                                                        className="notfound-image"
                                                />
                                        </div>
                                        <div className='notfoundtext'>

                                                <h2 className="notfound-heading">Oops! Page Not Found</h2>
                                                <p className="notfound-text">
                                                        The page you’re looking for might have been removed, renamed, or it never existed.
                                                </p>
                                                <a href="/" className="main-btn user-not-select no-text-decoration">
                                                        ⬅ Back to Home
                                                </a>
                                        </div>
                                </div>
                        </div>
                </>
        );
};

export default NotFoundPage;
