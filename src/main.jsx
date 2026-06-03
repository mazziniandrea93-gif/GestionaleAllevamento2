import React from 'react'
import ReactDOM from 'react-dom/client'
import { initOneSignal } from './lib/onesignal'
import App from './App.jsx'
import './index.css'

// Avvia l'init il prima possibile (non blocca il rendering)
initOneSignal()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
