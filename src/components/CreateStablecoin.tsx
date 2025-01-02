import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StablebondProgram, Stablebond } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, VersionedTransaction, Keypair } from '@solana/web3.js';
import { StablecoinProgram } from '../utils/stablecoin-program';
import * as web3 from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { GetTestBonds } from './GetTestBonds';

interface StablebondType {
  mint: {
    toString: () => string;
  };
  name: string;
  symbol: string;
}

interface Bond {
  mint: string;
  name: string;
  symbol: string;
}

export const CreateStablecoin = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [availableBonds, setAvailableBonds] = useState<Bond[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    currency: 'USD',
    icon: '',
    bondMint: ''
  });
  const [bondBalance, setBondBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBonds = async () => {
      if (!connection) return;
      
      try {
        const bonds = await StablebondProgram.getBonds(connection.rpcEndpoint);
        
        const formattedBonds = bonds.map((bond: any) => {
          console.log('Raw bond data:', bond);
          
          // Extract the mint address from the correct nested structure
          const mintString = bond.mint?.address;
          
          if (!mintString) {
            console.error('Missing mint address for bond:', bond);
            return null;
          }
          
          try {
            // Verify it's a valid Solana address
            new PublicKey(mintString);
            
            return {
              mint: mintString,
              name: bond.mint?.name || 'Unnamed Bond',
              symbol: bond.mint?.symbol || 'USTRY' // Using the symbol from your console output
            };
          } catch (e) {
            console.error('Invalid mint address:', mintString, e);
            return null;
          }
        })
        .filter(Boolean); // Remove any null entries
        
        console.log('Formatted bonds:', formattedBonds);
        setAvailableBonds(formattedBonds);
      } catch (error) {
        console.error('Failed to fetch bonds:', error);
        toast.error('Failed to fetch available bonds');
      }
    };
    
    fetchBonds();
  }, [connection]);

  // Handle bond selection
  const handleBondSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      bondMint: e.target.value
    }));
  };

  const checkBondBalance = async (bondMintStr: string) => {
    if (!publicKey || !connection) return;
    
    try {
      const bondMintPubkey = new PublicKey(bondMintStr);
      const userBondAccount = await getAssociatedTokenAddress(
        bondMintPubkey,
        publicKey,
        false
      );

      // Check if account exists
      const account = await connection.getAccountInfo(userBondAccount);
      if (!account) {
        setBondBalance(null);
        return;
      }

      const balance = await connection.getTokenAccountBalance(userBondAccount);
      setBondBalance(balance.value.uiAmount);
    } catch (error) {
      console.error('Error checking bond balance:', error);
      setBondBalance(null);
    }
  };

  useEffect(() => {
    if (formData.bondMint) {
      checkBondBalance(formData.bondMint);
    }
  }, [formData.bondMint, publicKey, connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey || !connection) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.bondMint) {
      toast.error('Please select a bond');
      return;
    }

    if (bondBalance === null || bondBalance === 0) {
      toast.error('You need to acquire some bonds first');
      return;
    }

    try {
      setLoading(true);

      // Get the bond mint public key
      const bondMintPubkey = new PublicKey(formData.bondMint);

      // Get the user's associated token account for this bond
      const userBondAccount = await getAssociatedTokenAddress(
        bondMintPubkey,      // mint
        publicKey,           // owner
        false               // allowOwnerOffCurve
      );

      // Check if the token account exists
      const tokenAccount = await connection.getAccountInfo(userBondAccount);
      if (!tokenAccount) {
        toast.error('You don\'t have a token account for this bond. Please acquire some bonds first.');
        return;
      }

      // Now check the balance of the associated token account
      const bondBalance = await connection.getTokenAccountBalance(userBondAccount);
      
      if (!bondBalance || bondBalance.value.uiAmount === 0) {
        toast.error('No bond balance found. Please acquire some bonds first.');
        return;
      }

      console.log('Bond balance:', bondBalance.value.uiAmount);

      // Generate new keypairs for the stablecoin accounts
      const stablecoinData = Keypair.generate();
      const stablecoinMint = Keypair.generate();

      // Create the stablecoin program instance
      const program = new StablecoinProgram(
        connection,
        {
          publicKey,
          sendTransaction: async (transaction: Transaction) => {
            try {
              return await sendTransaction(transaction, connection);
            } catch (err) {
              console.error('Error in sendTransaction:', err);
              throw err;
            }
          }
        }
      );

      // Create the stablecoin
      const result = await program.createStablecoin({
        name: formData.name,
        symbol: formData.symbol,
        decimals: 9,
        iconUrl: formData.icon,
        targetCurrency: formData.currency,
        bondMint: bondMintPubkey,
        stablecoinData,
        stablecoinMint,
      });

      console.log('Stablecoin created successfully:', result);
      toast.success('Stablecoin created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        currency: 'USD',
        icon: '',
        bondMint: ''
      });
    } catch (error) {
      console.error('Detailed error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Failed to create stablecoin: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Create New Stablecoin</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            placeholder="My Stablecoin"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            placeholder="MYUSD"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Target Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="MXN">MXN</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Icon URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="flex-1 bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
              placeholder="https://example.com/icon"
            />
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2"
              onClick={() => {/* TODO: Implement icon upload */}}
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="bond" className="block text-sm font-medium text-gray-200">
            Bond
          </label>
          <select
            id="bond"
            value={formData.bondMint}
            onChange={handleBondSelect}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">Select a bond</option>
            {availableBonds.map((bond) => (
              <option key={bond.mint} value={bond.mint}>
                {bond.symbol} - {bond.name}
              </option>
            ))}
          </select>
          
          {formData.bondMint && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  Your Balance: {bondBalance === null ? 'No tokens' : `${bondBalance} tokens`}
                </span>
                <GetTestBonds bondMint={formData.bondMint} />
              </div>
              {bondBalance === null && (
                <p className="text-sm text-red-400">
                  You need to acquire some test bonds before creating a stablecoin
                </p>
              )}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!publicKey || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Stablecoin'}
        </button>
      </form>
    </div>
  );
};