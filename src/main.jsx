import React from 'react'
import ReactDOM from 'react-dom/client'
import OneSignal from 'react-onesignal'
import App from './App.jsx'
import './index.css'

OneSignal.init({
  appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
  safari_web_id: 'web.onesignal.auto.' + import.meta.env.VITE_ONESIGNAL_APP_ID,
  notifyButton: { enable: false },
  allowLocalhostAsSecureOrigin: true,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
