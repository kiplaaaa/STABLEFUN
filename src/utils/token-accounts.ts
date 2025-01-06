import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  sendTransaction: (transaction: Transaction) => Promise<string>
) {
  try {
    const associatedToken = await getAssociatedTokenAddress(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Check if account exists
    const account = await connection.getAccountInfo(associatedToken);

    if (!account) {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer,
          associatedToken,
          owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      await sendTransaction(transaction);
    }

    return associatedToken;
  } catch (error) {
    throw new Error(`Error creating token account: ${error}`);
  }
}

export async function validateBondMint(
  connection: Connection,
  bondMint: PublicKey,
  owner: PublicKey
): Promise<boolean> {
  try {
    // Check if bond mint exists and is initialized
    const bondMintInfo = await connection.getAccountInfo(bondMint);
    if (!bondMintInfo) return false;

    // Get associated token account
    const ata = await getAssociatedTokenAddress(bondMint, owner);
    const balance = await connection.getTokenAccountBalance(ata);
    // Verify balance
    return balance.value.uiAmount ? balance.value.uiAmount > 0 : false;
  } catch (error) {
    console.error('Error validating bond mint:', error);
    return false;
  }
}

export async function getTokenBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<number> {
  try {
    // First try to get all token accounts for this mint and owner
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      owner,
      {
        mint: mint,
      }
    );

    if (tokenAccounts.value.length > 0) {
      const balance = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
      return balance.value.uiAmount || 0;
    }

    // If no accounts found, try the ATA
    const ata = await getAssociatedTokenAddress(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const balance = await connection.getTokenAccountBalance(ata);
    return balance.value.uiAmount || 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
} 