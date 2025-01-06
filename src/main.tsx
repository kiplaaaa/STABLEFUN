import './index.css';
import './polyfills';
import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletContextProvider } from './context/WalletContextProvider';
import App from './App';
import { StablecoinsPage } from './pages/StablecoinsPage';

// Set buffer for wallet compatibility
window.Buffer = Buffer;

// Define routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/stablecoins",
    element: <StablecoinsPage />,
  },
]);

// Create and render app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletContextProvider>
      <RouterProvider router={router} />
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1C1C1C',
            color: '#fff',
            border: '1px solid #2A2A2A',
          },
          success: {
            iconTheme: {
              primary: '#CDFE00',
              secondary: '#000',
            },
          },
        }}
      />
    </WalletContextProvider>
  </StrictMode>
);