import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset de estilos directamente en el DOM para eliminar bordes blancos
const style = document.createElement('style');
style.innerHTML = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    overflow-x: hidden;
    background-color: #1e2a3a; /* Asegúrate de que coincida con el fondo de tu app */
  }
  #root {
    margin: 0;
    padding: 0;
  }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
