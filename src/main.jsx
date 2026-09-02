import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles/index.css';

// Suppress benign browser extension messaging errors (e.g. LastPass, Grammarly, React DevTools)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string') {
    if (
      event.reason.message.includes('A listener indicated an asynchronous response') ||
      event.reason.message.includes('message channel closed before a response was received')
    ) {
      event.preventDefault();
    }
  }
});

// Register Service Worker for PWA WebAPK & Web Share Target support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          };
        }
      };
    }).catch((err) => {
      console.warn('SW regisztráció:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

