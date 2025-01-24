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
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';


interface Bond {
  mint: string;
  name: string;
  symbol: string;
}

export const CreateStablecoin = ({ addStablecoin }: { addStablecoin: any }) => {
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
  const handleBondSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bondMint = e.target.value;
    console.log('Selected bond:', bondMint);
    setFormData(prev => ({ ...prev, bondMint }));
  };

  const checkBondBalance = async (bondMintAddress: string) => {
    if (!publicKey || !connection) return;

    try {
      console.log('Checking bond balance for:', bondMintAddress);
      const bondMintPubkey = new PublicKey(bondMintAddress);

      // Get the ATA address first
      const ata = await getAssociatedTokenAddress(
        bondMintPubkey,
        publicKey,
        false, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('Checking ATA:', ata.toString());

      // Get all token accounts by owner
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        publicKey,
        {
          mint: bondMintPubkey,
        }
      );

      console.log('Found token accounts:', tokenAccounts.value);

      // Check if we have any accounts
      if (tokenAccounts.value.length > 0) {
        // Get the balance of the first account (should be the ATA)
        const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        const balance = accountInfo.value.uiAmount;
        console.log('Found balance:', balance);
        setBondBalance(balance || 0);
      } else {
        // Try to get the ATA directly
        try {
          const accountInfo = await connection.getTokenAccountBalance(ata);
          const balance = accountInfo.value.uiAmount;
          console.log('Found ATA balance:', balance);
          setBondBalance(balance || 0);
        } catch (e) {
          console.log('No ATA found or zero balance');
          setBondBalance(0);
        }
      }

    } catch (error) {
      console.error('Error checking bond balance:', error);
      setBondBalance(0);
    }
  };

  // Add this useEffect to monitor bond selection changes
  useEffect(() => {
    const loadBondBalance = async () => {
      if (formData.bondMint && publicKey && connection) {
        await checkBondBalance(formData.bondMint);
      }
    };

    loadBondBalance();
  }, [formData.bondMint, publicKey, connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !connection || !formData.bondMint) return;

    try {
      setLoading(true);
      
      const bondMintPubkey = new PublicKey(formData.bondMint);
      
      // Get all token accounts for this mint
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        publicKey,
        {
          mint: bondMintPubkey,
        }
      );

      console.log('Found token accounts:', tokenAccounts.value);

      // If no token accounts found, try to get the ATA
      if (tokenAccounts.value.length === 0) {
        const ata = await getAssociatedTokenAddress(
          bondMintPubkey,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Add the ATA to our token accounts if it exists
        try {
          const ataInfo = await connection.getAccountInfo(ata);
          if (ataInfo) {
            tokenAccounts.value = [{
              pubkey: ata,
              account: ataInfo
            }];
          }
        } catch (error) {
          console.error('Error checking ATA:', error);
        }
      }

      if (tokenAccounts.value.length === 0) {
        toast.error('Bond token account not found');
        return;
      }

      // Use the first token account found (usually the ATA)
      const userBondAccount = tokenAccounts.value[0].pubkey;
      console.log('Using bond account:', userBondAccount.toString());

      const program = new StablecoinProgram(connection, wallet);
      
      const stablecoinMint = Keypair.generate();
      const stablecoinData = Keypair.generate();

      console.log('Creating stablecoin with params:', {
        bondMint: bondMintPubkey.toString(),
        userBondAccount: userBondAccount.toString(),
        stablecoinMint: stablecoinMint.publicKey.toString(),
        stablecoinData: stablecoinData.publicKey.toString()
      });

      const signature = await program.createStablecoin({
        name: formData.name,
        symbol: formData.symbol,
        decimals: 9,
        iconUrl: formData.iconUrl || 'https://example.com/icon.png',
        targetCurrency: formData.currency,
        bondMint: bondMintPubkey,
        stablecoinData,
        stablecoinMint,
        userBondAccount // Pass the actual token account pubkey
      });

      // Add the new stablecoin to the state
      addStablecoin({
        mint: stablecoinMint.publicKey.toString(),
        name: formData.name,
        symbol: formData.symbol,
        currency: formData.currency,
        icon: formData.iconUrl || 'https://example.com/icon.png',
        supply: 0, // Initial supply can be set to 0 or fetched later
        bondMint: bondMintPubkey.toString(),
        apy: "8.5", // Example APY, adjust as needed
        tokensAvailable: 0, // Initial tokens available
        costPerToken: 1.0, // Example cost per token
        startDate: new Date().toLocaleString(), // Current date as start date
        tvl: "$0" // Initial TVL
      });

      toast.success('Stablecoin created successfully!');
      console.log('Transaction signature:', signature);
    } catch (error) {
      console.error('Error creating stablecoin:', error);
      toast.error(getErrorMessage(error));
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
        
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Bond
          </label>
          <select
            value={formData.bondMint}
            onChange={handleBondSelect}
            className="input-primary"
            required
          >
            <option value="">Select a bond</option>
            {availableBonds.map((bond) => (
              <option key={bond.mint} value={bond.mint}>
                {bond.name}
              </option>
            ))}
          </select>
          
          {formData.bondMint && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  Your Balance: 
                </span>
                <span className={`text-sm ${bondBalance !== null && bondBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {bondBalance !== null ? bondBalance.toString() : 'Loading...'} tokens
                </span>
              </div>
              {bondBalance === 0 && (
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