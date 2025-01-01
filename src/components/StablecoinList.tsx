import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { StablebondProgram } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { Transaction, Connection } from '@solana/web3.js';

type Stablecoin = {
  name: string;
  symbol: string;
  currency: string;
  icon: string;
  supply: number;
  mint: string;
};

type Bond = {
  name: string;
  symbol: string;
  currency: string;
  icon?: string;
  mint: string;
};

export const StablecoinList = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStablecoins = async () => {
      if (!publicKey) return;
      
      try {
        const program = new StablebondProgram(connection.rpcEndpoint, {
          publicKey,
          sendTransaction: async (_transaction: Transaction, _connection: Connection) => {
            throw new Error('Not implemented');
          }
        });

        // Get all bonds first
        const bonds = await StablebondProgram.getBonds(connection.rpcEndpoint);
        
        // Get user's stablecoins and their balances
        const userStablecoins = await Promise.all(
          bonds.map(async (bond: Bond) => {
            try {
              const balance = await program.getBondBalance(bond.mint);
              if (balance && !balance.isZero()) {
                return {
                  name: bond.name,
                  symbol: bond.symbol,
                  currency: bond.currency,
                  icon: bond.icon || '/default-coin.png',
                  supply: balance.toNumber(),
                  mint: bond.mint
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching balance for ${bond.symbol}:`, error);
              return null;
            }
          })
        );

        setStablecoins(userStablecoins.filter((coin): coin is Stablecoin => coin !== null));
      } catch (error) {
        console.error('Failed to fetch stablecoins:', error);
        toast.error('Failed to load stablecoins');
      } finally {
        setLoading(false);
      }
    };

    fetchStablecoins();
  }, [publicKey, connection]);

  // Add mint/redeem handlers
  const handleMint = async (bondMint: string) => {
    if (!publicKey) return;
    
    try {
      const program = new StablebondProgram(connection.rpcEndpoint, {
        publicKey,
        sendTransaction: async (transaction: Transaction, connection: Connection) => {
          const signature = await sendTransaction(transaction, connection);
          return { signature };
        }
      });

      const tx = await program.mintStablecoin(bondMint, 1); // Amount TBD
      await tx.confirm('confirmed');
      toast.success('Successfully minted tokens');
    } catch (error) {
      console.error('Mint failed:', error);
      toast.error('Failed to mint tokens');
    }
  };

  const handleRedeem = async (bondMint: string) => {
    if (!publicKey) return;
    
    try {
      const program = new StablebondProgram(connection.rpcEndpoint, {
        publicKey,
        sendTransaction: async (transaction: Transaction, connection: Connection) => {
          const signature = await sendTransaction(transaction, connection);
          return { signature };
        }
      });

      const tx = await program.redeemStablecoin(bondMint, 1); // Amount TBD
      await tx.confirm('confirmed');
      toast.success('Successfully redeemed tokens');
    } catch (error) {
      console.error('Redeem failed:', error);
      toast.error('Failed to redeem tokens');
    }
  };

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
      {stablecoins.map((coin) => (
        <div key={coin.mint.toString()} className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
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
              onClick={() => handleMint(coin.mint.toString())}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Mint
            </button>
            <button
              onClick={() => handleRedeem(coin.mint.toString())}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Redeem
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};