import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Transaction, PublicKey } from '@solana/web3.js';

export const GetTestBonds = ({ bondMint }: { bondMint: string }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const getTestBonds = async () => {
    if (!publicKey || !bondMint) return;

    try {
      const bondMintPubkey = new PublicKey(bondMint);
      
      // Get or create associated token account
      const ata = await getAssociatedTokenAddress(
        bondMintPubkey,
        publicKey,
        false
      );

      const transaction = new Transaction();

      // Check if the token account exists
      const account = await connection.getAccountInfo(ata);
      if (!account) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            ata,
            publicKey,
            bondMintPubkey
          )
        );
      }

      // Add instruction to mint/transfer test bonds
      // You'll need to get the actual instruction from Etherfuse's faucet or test program
      
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);
      
      toast.success('Test bonds acquired successfully!');
    } catch (error) {
      console.error('Error getting test bonds:', error);
      toast.error('Failed to get test bonds');
    }
  };

  return (
    <button
      onClick={getTestBonds}
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
    >
      Get Test Bonds
    </button>
  );
}; 