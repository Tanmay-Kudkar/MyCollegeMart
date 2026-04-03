import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import the CSS with Tailwind directives
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_MYCOLLEGEMART_GOOGLE_CLIENT_ID ||
  import.meta.env.REACT_APP_MYCOLLEGEMART_GOOGLE_CLIENT_ID ||
  '';

if (!GOOGLE_CLIENT_ID) {
  console.warn(
    'Google OAuth client ID is missing. Set VITE_MYCOLLEGEMART_GOOGLE_CLIENT_ID.'
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} onScriptLoadError={() => console.error("Google OAuth script failed to load")}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
