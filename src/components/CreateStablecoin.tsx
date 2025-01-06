import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StablebondProgram } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  Keypair,
} from '@solana/web3.js';
import { StablecoinProgram } from '../utils/stablecoin-program';
import { getErrorMessage } from '../utils/errors';
import { WalletContextState } from '@solana/wallet-adapter-react';


interface Bond {
  mint: string;
  name: string;
  symbol: string;
}

export const CreateStablecoin = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [loading, setLoading] = useState(false);
  const [availableBonds, setAvailableBonds] = useState<Bond[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    currency: 'USD',
    iconUrl: '',
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
  const handleBondSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bondMint = e.target.value;
    setFormData(prev => ({ ...prev, bondMint }));
    
    // Add validation before checking balance
    if (!PublicKey.isOnCurve(new PublicKey(bondMint))) {
      toast.error('Invalid bond mint address');
      return;
    }

    if (bondMint) {
      console.log("Checking balance for bond mint:", bondMint);
      await checkBondBalance(bondMint);
    }
  };

  const checkBondBalance = async (bondMintStr: string) => {
    if (!publicKey || !connection) {
      console.log("No wallet connection");
      return;
    }

    try {
      const bondMintPubkey = new PublicKey(bondMintStr);
      
      // First find all token accounts owned by the user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: bondMintPubkey }
      );

      // Log for debugging
      console.log("Token accounts found:", tokenAccounts.value);

      if (tokenAccounts.value.length > 0) {
        // Get the balance from the first account found
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log("Found balance:", balance);
        setBondBalance(balance);
      } else {
        console.log("No token accounts found for this mint");
        setBondBalance(0);
      }

    } catch (error) {
      console.error('Error checking bond balance:', error);
      setBondBalance(0);
    }
  };

  useEffect(() => {
    if (formData.bondMint) {
      checkBondBalance(formData.bondMint);
    }
  }, [formData.bondMint, publicKey, connection]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (!publicKey || !connection) {
        throw new Error('Wallet not connected');
      }

      // Add validation
      if (!formData.name || !formData.symbol || !formData.bondMint) {
        throw new Error('Please fill in all required fields');
      }

      // Create keypairs first
      const stablecoinData = Keypair.generate();
      const stablecoinMint = Keypair.generate();

      // Initialize StablecoinProgram
      const program = new StablecoinProgram(connection, wallet);

      console.log('Creating stablecoin with params:', {
        name: formData.name,
        symbol: formData.symbol,
        bondMint: formData.bondMint
      });

      // Create the stablecoin
      const signature = await program.createStablecoin({
        name: formData.name,
        symbol: formData.symbol,
        decimals: 9,
        iconUrl: formData.iconUrl || 'https://example.com/icon.png', // Provide default if empty
        targetCurrency: formData.currency,
        bondMint: new PublicKey(formData.bondMint),
        stablecoinData,
        stablecoinMint,
      });

      console.log('Transaction signature:', signature);
      toast.success('Stablecoin created successfully!');
      
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create stablecoin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1E1E1E] rounded-lg border border-[#2C2C2C] p-6">
      <h2 className="text-2xl font-medium text-white mb-6">Create New Stablecoin</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Name
          </label>
          <input
            type="text"
            placeholder="My Stablecoin"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-[#141414] text-white rounded-md border border-[#2C2C2C] 
                     px-4 py-2.5 focus:outline-none focus:border-[#CDFE00] 
                     transition-colors placeholder-gray-600"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Symbol
          </label>
          <input
            type="text"
            placeholder="MYUSD"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full bg-[#141414] text-white rounded-md border border-[#2C2C2C] 
                     px-4 py-2.5 focus:outline-none focus:border-[#CDFE00] 
                     transition-colors placeholder-gray-600"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Target Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full bg-[#141414] text-white rounded-md border border-[#2C2C2C] 
                     px-4 py-2.5 focus:outline-none focus:border-[#CDFE00] 
                     transition-colors appearance-none"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Icon URL
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="https://example.com/icon"
              value={formData.iconUrl}
              onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              className="w-full bg-[#141414] text-white rounded-md border border-[#2C2C2C] 
                       px-4 py-2.5 focus:outline-none focus:border-[#CDFE00] 
                       transition-colors placeholder-gray-600 pr-10"
            />
            <button 
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                       hover:text-[#CDFE00] transition-colors"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm mb-2">
            Bond
          </label>
          <select
            value={formData.bondMint}
            onChange={handleBondSelect}
            className="w-full bg-[#141414] text-white rounded-md border border-[#2C2C2C] 
                     px-4 py-2.5 focus:outline-none focus:border-[#CDFE00] 
                     transition-colors appearance-none"
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
              <span className={`text-sm ${bondBalance !== null && bondBalance > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                Your Balance: {bondBalance === null ? 'Loading...' : `${bondBalance} ${bondBalance > 0 ? 'tokens' : ''}`}
              </span>
              {bondBalance !== null && bondBalance === 0 && (
                <p className="text-red-400 text-sm mt-1">
                  You need to have some bonds to create a stablecoin
                </p>
              )}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || !publicKey}
          className="w-full bg-[#CDFE00] text-black font-medium py-2.5 px-4 rounded-md
                   hover:bg-[#bae800] transition-colors mt-6 disabled:opacity-50 
                   disabled:cursor-not-allowed"
        >
          {loading ? (
            <span>Creating...</span>
          ) : !publicKey ? (
            <span>Connect Wallet to Create</span>
          ) : (
            <span>Create Stablecoin</span>
          )}
        </button>
      </form>
    </div>
  );
};