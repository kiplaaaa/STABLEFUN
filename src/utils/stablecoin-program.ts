import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { IDL } from './idl/stablecoin_factory';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

// Update this to use your deployed program ID
const PROGRAM_ID = new PublicKey("CGnwq4D9qErCRjPujz5MVkMaixR8BLRACpAmLWsqoRRe");

interface CreateStablecoinParams {
  name: string;
  symbol: string;
  decimals: number;
  iconUrl: string;
  targetCurrency: string;
  bondMint: PublicKey;
  stablecoinData: Keypair;
  stablecoinMint: Keypair;
}

interface WalletAdapter {
  publicKey: PublicKey;
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;
}

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

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: async (tx: Transaction) => tx,
        signAllTransactions: async (txs: Transaction[]) => txs,
      },
      { commitment: 'confirmed' }
    );

    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  async createStablecoin(params: CreateStablecoinParams): Promise<string> {
    const provider = new AnchorProvider(
      this.connection,
      {
        publicKey: this.wallet.publicKey,
        signTransaction: async (tx: Transaction) => {
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );

    const program = new Program(IDL, PROGRAM_ID, provider);

    const transaction = new Transaction();
    
    // Add create stablecoin instruction
    const ix = await program.methods
      .createStablecoin(
        params.name,
        params.symbol,
        params.decimals,
        params.iconUrl,
        params.targetCurrency
      )
      .accounts({
        authority: this.wallet.publicKey,
        stablecoinData: params.stablecoinData.publicKey,
        stablecoinMint: params.stablecoinMint.publicKey,
        bondMint: params.bondMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    transaction.add(ix);

    // Get latest blockhash
    const latestBlockhash = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = this.wallet.publicKey;

    // Sign with required keypairs
    transaction.sign(params.stablecoinMint, params.stablecoinData);

    // Send transaction
    const txid = await this.wallet.sendTransaction(transaction, this.connection);
    
    return txid;
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
        .transaction();

      const signature = await this.wallet.sendTransaction(tx, this.connection);
      await this.connection.confirmTransaction(signature);
      return signature;
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