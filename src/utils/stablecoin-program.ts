import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Wallet } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { IDL } from './idl/stablecoin_factory';

// Update this to use your deployed program ID
const PROGRAM_ID = new PublicKey("EmfioDoaTmpfdSKogUxGyVJfeCp3EYHJf3rVdSPM7c4d");

type NodeWallet = {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
  payer: Keypair;
};

export class StablecoinProgram {
  private program: Program;
  private connection: Connection;
  private wallet: {
    publicKey: PublicKey;
    sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;
  };
  public programId: PublicKey = PROGRAM_ID;
  
  constructor(
    connection: Connection,
    wallet: {
      publicKey: PublicKey;
      sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;
    }
  ) {
    this.connection = connection;
    this.wallet = wallet;

    // Create AnchorProvider with dummy signTransaction methods
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: async (tx: Transaction) => tx,
        signAllTransactions: async (txs: Transaction[]) => txs,
      },
      { preflightCommitment: 'confirmed' }
    );

    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  async createStablecoin(params: {
    name: string;
    symbol: string;
    decimals: number;
    iconUrl: string;
    targetCurrency: string;
    bondMint: PublicKey;
    stablecoinData: PublicKey;
    stablecoinMint: PublicKey;
    signers: Keypair[];
  }) {
    try {
      console.log('Creating stablecoin with params:', {
        ...params,
        bondMint: params.bondMint.toBase58(),
        stablecoinData: params.stablecoinData.toBase58(),
        stablecoinMint: params.stablecoinMint.toBase58(),
      });

      // Create the transaction
      const tx = await this.program.methods
        .createStablecoin(
          params.name,
          params.symbol,
          params.decimals,
          params.iconUrl,
          params.targetCurrency
        )
        .accounts({
          authority: this.wallet.publicKey,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          bondMint: params.bondMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .transaction();

      console.log('Transaction created');

      // Get latest blockhash
      const latestBlockhash = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = latestBlockhash.blockhash;
      tx.feePayer = this.wallet.publicKey;

      console.log('Added blockhash and feePayer');

      // Sign with all signers
      params.signers.forEach(signer => {
        console.log('Signing with:', signer.publicKey.toBase58());
        tx.sign(signer);
      });

      console.log('Transaction signed by all signers');

      // Add transaction options
      const txWithOptions = Object.assign(tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5
      });

      // Send the transaction using the wallet's sendTransaction
      console.log('Sending transaction...');
      const signature = await this.wallet.sendTransaction(tx, this.connection);

      console.log('Transaction sent, signature:', signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('Transaction confirmed');

      return {
        signature,
        stablecoinData: params.stablecoinData,
        stablecoinMint: params.stablecoinMint,
      };
    } catch (error) {
      console.error('Detailed error in createStablecoin:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create stablecoin: ${error.message}`);
      }
      throw error;
    }
  }

  async mintTokens(params: {
    amount: number;
    authority: PublicKey;
    stablecoinData: PublicKey;
    stablecoinMint: PublicKey;
    userBondAccount: PublicKey;
    programBondAccount: PublicKey;
    userTokenAccount: PublicKey;
    oracleFeed: PublicKey;
  }) {
    try {
      const tx = await this.program.methods
        .mintTokens(new BN(params.amount))
        .accounts({
          authority: params.authority,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          userBondAccount: params.userBondAccount,
          programBondAccount: params.programBondAccount,
          userTokenAccount: params.userTokenAccount,
          oracleFeed: params.oracleFeed,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await this.connection.confirmTransaction(tx);
      return tx;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }

  async redeemTokens(params: {
    amount: number;
    authority: PublicKey;
    stablecoinData: PublicKey;
    stablecoinMint: PublicKey;
    userBondAccount: PublicKey;
    programBondAccount: PublicKey;
    userTokenAccount: PublicKey;
    oracleFeed: PublicKey;
  }) {
    try {
      const tx = await this.program.methods
        .redeemTokens(new BN(params.amount))
        .accounts({
          authority: params.authority,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          userBondAccount: params.userBondAccount,
          programBondAccount: params.programBondAccount,
          userTokenAccount: params.userTokenAccount,
          oracleFeed: params.oracleFeed,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await this.connection.confirmTransaction(tx);
      return tx;
    } catch (error) {
      console.error('Error redeeming tokens:', error);
      throw error;
    }
  }
} 