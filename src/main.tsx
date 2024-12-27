import './polyfills';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import { WalletContextProvider } from './context/WalletContextProvider';
import './index.css';
import 'util';
import 'http-browserify';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
      <Toaster position="bottom-right" />
    </WalletContextProvider>
  </StrictMode>
);