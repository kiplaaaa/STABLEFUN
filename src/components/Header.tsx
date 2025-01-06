import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins } from 'lucide-react';

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            stable.fun
          </span>
        </div>
        <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 !transition-all !rounded-xl" />
      </div>
    </header>
  );
};