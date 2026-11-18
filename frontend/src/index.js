import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { saleService } from './services/api';
import { startOfflineSync } from './utils/offlineSales';
import './styles.css';

// Las ventas guardadas sin conexion se envian al volver la red, en cualquier seccion.
startOfflineSync({ send: saleService.createSale });

// Aplicacion instalable: el service worker (generado por Workbox en el build de
// produccion) permite abrirla sin red. En desarrollo no se registra.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
