import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Coins className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold">stable.fun</span>
        </div>
        <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 transition-colors" />
      </div>
    </header>
  );
};