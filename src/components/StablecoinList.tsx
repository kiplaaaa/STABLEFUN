import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { PublicKey, Transaction } from '@solana/web3.js';
import { StablecoinProgram } from '../utils/stablecoin-program';
import { getOracleFeed, getExchangeRate } from '../utils/oracle-feeds';
import { getStablecoinAccounts } from '../utils/account-utils';

interface Stablecoin {
  mint: string;
  name: string;
  symbol: string;
  currency: string;
  icon: string;
  supply: number;
  bondMint: string;
}

type TokenAction = {
  stablecoin: Stablecoin;
  type: 'mint' | 'redeem';
};

export const StablecoinList = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet } = useWallet();
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [transacting, setTransacting] = useState<TokenAction | null>(null);
  const [amount, setAmount] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    const fetchStablecoins = async () => {
      if (!connection || !publicKey) return;
      setLoading(true);
      try {
        // Implement your fetch logic here
        setStablecoins([]); // Replace with actual fetch
      } catch (error) {
        console.error('Failed to fetch stablecoins:', error);
        toast.error('Failed to load stablecoins');
      } finally {
        setLoading(false);
      }
    };

    fetchStablecoins();
  }, [connection, publicKey]);

  const handleAction = async (stablecoin: Stablecoin, actionType: 'mint' | 'redeem') => {
    setTransacting({ stablecoin, type: actionType });
    setShowActionModal(true);
  };

  const handleConfirmAction = async () => {
    if (!transacting || !publicKey || !wallet?.adapter.sendTransaction || !connection) return;
    
    try {
      const { stablecoin, type } = transacting;
      const stablecoinProgram = new StablecoinProgram(
        connection,
        {
          publicKey,
          sendTransaction: async (transaction: Transaction) => {
            const signature = await wallet.adapter.sendTransaction(
              transaction,
              connection
            );
            return signature;
          }
        }
      );

      const oracleFeed = getOracleFeed(stablecoin.currency);
      const exchangeRate = await getExchangeRate(connection, oracleFeed);
      const amountLamports = Math.floor(parseFloat(amount) * Math.pow(10, 6));

      const stablecoinMint = new PublicKey(stablecoin.mint);
      const accounts = await getStablecoinAccounts(
        connection,
        publicKey,
        stablecoinMint,
        new PublicKey(stablecoin.bondMint),
        oracleFeed,
        (tx, conn) => wallet.adapter.sendTransaction(tx, conn)
      );

      if (type === 'mint') {
        await stablecoinProgram.mintTokens({
          amount: amountLamports,
          ...accounts
        });
      } else {
        await stablecoinProgram.redeemTokens({
          amount: amountLamports,
          ...accounts
        });
      }

      toast.success(`Successfully ${type}ed tokens`);
      setShowActionModal(false);
      setAmount('');
      setTransacting(null);
    } catch (error) {
      console.error(`${transacting.type} failed:`, error);
      toast.error(`Failed to ${transacting.type} tokens`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (stablecoins.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No stablecoins found. Create one to get started!
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stablecoins.map((coin) => (
          <div key={coin.mint} className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
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
              <button
                onClick={() => handleAction(coin, 'mint')}
                disabled={!publicKey || !!transacting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transacting?.stablecoin.mint === coin.mint && transacting.type === 'mint' 
                  ? 'Minting...' 
                  : 'Mint'}
              </button>
              <button
                onClick={() => handleAction(coin, 'redeem')}
                disabled={!publicKey || !!transacting}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transacting?.stablecoin.mint === coin.mint && transacting.type === 'redeem'
                  ? 'Redeeming...'
                  : 'Redeem'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Modal */}
      {showActionModal && transacting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {transacting.type === 'mint' ? 'Mint' : 'Redeem'} {transacting.stablecoin.symbol}
            </h3>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmAction}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setTransacting(null);
                  setAmount('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};