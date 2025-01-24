import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { StablecoinProgram } from '../utils/stablecoin-program';
import { getOracleFeed, getExchangeRate } from '../utils/oracle-feeds';
import { getStablecoinAccounts } from '../utils/account-utils';

// Define interfaces
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

// Define the wallet context interface to match what StablecoinProgram expects
interface WalletContextState {
  publicKey: PublicKey | null;
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;
}

export const StablecoinList = ({ stablecoins }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
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
    if (!transacting || !publicKey || !wallet || !connection) return;
    
    try {
      const { stablecoin, type } = transacting;
      const stablecoinProgram = new StablecoinProgram(
        connection,
        wallet
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
        wallet.sendTransaction.bind(wallet)
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

  if (!wallet || !publicKey || !connection) {
    return (
      <div className="text-center py-8 text-gray-400">
        Please connect your wallet to continue.
      </div>
    );
  }

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
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stablecoins.map((coin) => (
        <div key={coin.mint} className="relative bg-[#1C1C1C] rounded-lg border border-[#2A2A2A] p-6 hover:border-[#3A3A3A] transition-all">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-medium">{coin.symbol}</h3>
                <div className="bg-[#2A2A2A] px-2 py-0.5 rounded text-xs text-gray-400">
                  {coin.currency}
                </div>
              </div>
              <div className="text-[#CDFE00] text-sm flex items-center gap-2">
                <span>8.5% APY</span>
                <button className="hover:text-white" title="Annual Percentage Yield">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <path strokeWidth="2" d="M12 16v-4M12 8h.01"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="bg-black/40 p-2 rounded-lg">
              <img
                src={coin.icon}
                alt={coin.name}
                className="w-8 h-8 rounded"
              />
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">TVL</span>
              <span className="font-medium">{coin.currency} {coin.supply.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Tokens Available</span>
              <span className="font-medium">{(coin.supply * 0.8).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Cost in {coin.currency}</span>
              <span className="font-medium">{coin.currency === 'USD' ? '$' : ''}{(coin.supply * 0.001).toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Start Date</span>
              <span className="font-medium text-sm">1/2/2025, 10 PM</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleAction(coin, 'mint')}
              className="flex-1 bg-[#1C1C1C] border border-[#CDFE00] text-[#CDFE00] font-medium py-2 px-4 rounded 
                         hover:bg-[#CDFE00] hover:text-black transition-all"
            >
              BOND DETAILS
            </button>
            <button
              onClick={() => handleAction(coin, 'redeem')}
              className="flex-1 bg-[#CDFE00] text-black font-medium py-2 px-4 rounded 
                         hover:bg-[#b8e400] transition-all"
            >
              SELECT
            </button>
          </div>

          {/* Action Modal */}
          {showActionModal && transacting && transacting.stablecoin.mint === coin.mint && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-[#1C1C1C] p-6 rounded-lg max-w-md w-full mx-4 border border-[#2A2A2A]">
                <h3 className="text-xl font-bold mb-4">
                  {transacting.type === 'mint' ? 'Mint' : 'Redeem'} {transacting.stablecoin.symbol}
                </h3>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input-primary mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmAction}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1 btn-primary"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setShowActionModal(false);
                      setTransacting(null);
                      setAmount('');
                    }}
                    className="flex-1 bg-[#2A2A2A] text-white font-medium py-2 px-4 rounded 
                               hover:bg-[#3A3A3A] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};