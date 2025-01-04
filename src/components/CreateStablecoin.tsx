import { useState, useEffect } from 'react';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StablebondProgram } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from '@solana/spl-token';
import { StablecoinProgram } from '../utils/stablecoin-program';
import { getErrorMessage } from '../utils/errors';

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
  const wallet = useWallet();
  const { publicKey } = wallet;
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
  const handleBondSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bondMint = e.target.value;
    setFormData(prev => ({ ...prev, bondMint }));
    
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
    if (!publicKey || !wallet.connected || !connection) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);

      const stablecoinMint = Keypair.generate();
      const stablecoinData = Keypair.generate();

      console.log('Generated keypairs:', {
        stablecoinMint: stablecoinMint.publicKey.toString(),
        stablecoinData: stablecoinData.publicKey.toString()
      });

      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const stablecoinProgram = new StablecoinProgram(
        connection,
        {
          publicKey: wallet.publicKey,
          sendTransaction: wallet.sendTransaction.bind(wallet)
        }
      );

      const transaction = new Transaction();

      // Calculate proper space and rent
      const mintRent = await getMinimumBalanceForRentExemptMint(connection);
      const dataSpace = 215; // Use the exact space shown in your logs
      const dataRent = await connection.getMinimumBalanceForRentExemption(dataSpace);

      // Add account creation instructions
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: stablecoinMint.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          stablecoinMint.publicKey,
          6,
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID
        ),
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: stablecoinData.publicKey,
          space: dataSpace,
          lamports: dataRent,
          programId: stablecoinProgram.programId,
        })
      );

      // The createStablecoin method already sends and confirms the transaction
      const signature = await stablecoinProgram.createStablecoin({
        name: formData.name,
        symbol: formData.symbol,
        decimals: 6,
        iconUrl: formData.icon,
        targetCurrency: formData.currency,
        bondMint: new PublicKey(formData.bondMint),
        stablecoinData: stablecoinData,
        stablecoinMint: stablecoinMint
      });

      // You can use the signature to check the status or display to user
      console.log("Transaction signature:", signature);

      // Get latest blockhash
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      // Sign with all required signers
      transaction.sign(stablecoinMint, stablecoinData);
      
      console.log('Sending transaction with signers:', {
        feePayer: publicKey.toString(),
        stablecoinMint: stablecoinMint.publicKey.toString(),
        stablecoinData: stablecoinData.publicKey.toString()
      });

      // Send and confirm transaction
      const signed = await wallet.sendTransaction(transaction, connection, {
        signers: [stablecoinMint, stablecoinData],
        preflightCommitment: 'confirmed',
        maxRetries: 5
      });

      console.log('Transaction sent:', signed);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: signed
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('Transaction confirmed:', confirmation);
      toast.success('Stablecoin created successfully!');

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating stablecoin:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
      toast.error(getErrorMessage(error));
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
          disabled={!publicKey || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Stablecoin'}
        </button>
      </form>
    </div>
  );
};