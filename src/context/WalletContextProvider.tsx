import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '../utils/errors';
import { ConnectionConfig } from '@solana/web3.js';
import { RPC_ENDPOINT } from '../utils/constants';

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => RPC_ENDPOINT, []);
  
  const connectionConfig = {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    wsEndpoint: endpoint.replace('https', 'wss'),
    disableRetryOnRateLimit: false
  };

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider 
      endpoint={endpoint} 
      config={connectionConfig as ConnectionConfig}
    >
      <WalletProvider 
        wallets={wallets} 
        autoConnect
        onError={(error) => {
          console.error('Wallet error:', error);
          toast.error(getErrorMessage(error));
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};