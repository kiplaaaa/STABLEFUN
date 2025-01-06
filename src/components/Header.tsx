import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-[#1C1C1C] border-b border-[#2A2A2A]">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-[#CDFE00]" />
              <span className="text-xl font-medium text-white">stable.fun</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Home</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Account</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Information</a>
            </nav>
          </div>
          <WalletMultiButton className="!bg-[#CDFE00] !text-black hover:!bg-[#b8e400] !transition-all !rounded-lg !py-2 !px-4" />
        </div>
      </div>
    </header>
  );
};