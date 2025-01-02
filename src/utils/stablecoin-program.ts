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
  private provider: AnchorProvider;
  
  constructor(
    connection: Connection,
    wallet: { publicKey: PublicKey; sendTransaction: (transaction: Transaction) => Promise<string> }
  ) {
    this.connection = connection;

    // Create a wallet adapter that implements the NodeWallet interface
    const walletAdapter: NodeWallet = {
      publicKey: wallet.publicKey,
      signTransaction: async (tx: Transaction) => tx, // Phantom handles signing
      signAllTransactions: async (txs: Transaction[]) => txs, // Phantom handles signing
      payer: Keypair.generate(), // Create a dummy keypair since we don't use it
    };
    
    this.provider = new AnchorProvider(
      connection,
      walletAdapter as unknown as Wallet,
      { preflightCommitment: 'confirmed' }
    );
    
    this.program = new Program(
      IDL,
      PROGRAM_ID,
      this.provider
    );
  }

  async createStablecoin(params: {
    name: string;
    symbol: string;
    decimals: number;
    iconUrl: string;
    targetCurrency: string;
    bondMint: PublicKey;
  }) {
    const stablecoinData = web3.Keypair.generate();
    const stablecoinMint = web3.Keypair.generate();

    try {
      const tx = await this.program.methods
        .createStablecoin(
          params.name,
          params.symbol,
          params.decimals,
          params.iconUrl,
          params.targetCurrency
        )
        .accounts({
          authority: this.provider.publicKey,
          stablecoinData: stablecoinData.publicKey,
          stablecoinMint: stablecoinMint.publicKey,
          bondMint: params.bondMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([stablecoinData, stablecoinMint])
        .rpc();

      await this.connection.confirmTransaction(tx);
      
      return {
        stablecoinData: stablecoinData.publicKey,
        stablecoinMint: stablecoinMint.publicKey,
        signature: tx
      };
    } catch (error) {
      console.error('Error creating stablecoin:', error);
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