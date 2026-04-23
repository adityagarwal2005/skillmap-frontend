import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './components/Toast.css';
import './components/Skeleton.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </AuthProvider>
);