import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

export interface StablecoinAccounts {
  authority: PublicKey;
  stablecoinData: PublicKey;
  stablecoinMint: PublicKey;
  userBondAccount: PublicKey;
  programBondAccount: PublicKey;
  userTokenAccount: PublicKey;
  oracleFeed: PublicKey;
  tokenProgram: PublicKey;
}

export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
): Promise<{ address: PublicKey }> {
  const associatedToken = await getAssociatedTokenAddress(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID
  );

  try {
    const account = await connection.getAccountInfo(associatedToken);
    
    if (!account) {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer,
          associatedToken,
          owner,
          mint,
          TOKEN_PROGRAM_ID
        )
      );

      await sendTransaction(transaction, connection);
    }

    return { address: associatedToken };
  } catch (error) {
    throw new Error(`Error creating token account: ${error}`);
  }
}

export async function getStablecoinAccounts(
  connection: Connection,
  wallet: PublicKey,
  stablecoinMint: PublicKey,
  bondMint: PublicKey,
  oracleFeed: PublicKey,
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>
): Promise<StablecoinAccounts> {
  const userBondAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    bondMint,
    wallet,
    sendTransaction
  );

  const programBondAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    bondMint,
    stablecoinMint,
    sendTransaction
  );

  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    stablecoinMint,
    wallet,
    sendTransaction
  );

  return {
    authority: wallet,
    stablecoinData: stablecoinMint,
    stablecoinMint,
    userBondAccount: userBondAccount.address,
    programBondAccount: programBondAccount.address,
    userTokenAccount: userTokenAccount.address,
    oracleFeed,
    tokenProgram: TOKEN_PROGRAM_ID
  };
} 