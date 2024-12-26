import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

type Stablecoin = {
  name: string;
  symbol: string;
  currency: string;
  icon: string;
  supply: number;
};

export const StablecoinList = () => {
  const { publicKey } = useWallet();
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStablecoins = async () => {
      if (!publicKey) return;
      
      try {
        // TODO: Fetch user's stablecoins using Etherfuse SDK
        setStablecoins([]);
      } catch (error) {
        console.error('Failed to fetch stablecoins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStablecoins();
  }, [publicKey]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
      </div>
    );
  }

  if (stablecoins.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No stablecoins found. Create one to get started!
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stablecoins.map((coin, index) => (
        <div
          key={index}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <img
              src={coin.icon}
              alt={coin.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{coin.name}</h3>
              <p className="text-sm text-gray-400">{coin.symbol}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Currency</span>
              <span>{coin.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Supply</span>
              <span>{coin.supply.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Mint
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Redeem
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};