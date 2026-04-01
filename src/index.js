import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import MoonlightCafeLogoSquare from './assets/MoonlightCafeLogoSquare-47d9a8.png';

const ensureLinkTag = (rel) => {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  return link;
};

const setAppIcons = (href) => {
  if (!href) return;
  const favicon = ensureLinkTag('icon');
  favicon.type = 'image/png';
  favicon.href = href;

  const appleTouch = ensureLinkTag('apple-touch-icon');
  appleTouch.href = href;
};

setAppIcons(MoonlightCafeLogoSquare);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
