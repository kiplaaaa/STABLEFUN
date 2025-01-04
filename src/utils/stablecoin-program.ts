import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, MINT_SIZE } from '@solana/spl-token';
import { IDL } from './idl/stablecoin_factory';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

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
  private wallet: WalletContextState;
  public programId: PublicKey = PROGRAM_ID;
  
  constructor(connection: Connection, wallet: WalletContextState) {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
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
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = new AnchorProvider(
        this.connection,
        this.wallet as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(IDL, PROGRAM_ID, provider);

      // Create mint account for the stablecoin
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const createMintIx = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: params.stablecoinMint.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      });

      // Calculate space for data account
      const space = 8 + // discriminator
                    32 + // authority
                    32 + // bond_mint
                    8 +  // total_supply
                    1 +  // decimals
                    4 + params.name.length + // name
                    4 + params.symbol.length + // symbol
                    4 + params.iconUrl.length + // icon_url
                    4 + params.targetCurrency.length; // target_currency

      // Create data account
      const dataRent = await this.connection.getMinimumBalanceForRentExemption(space);
      const createDataIx = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: params.stablecoinData.publicKey,
        space,
        lamports: dataRent,
        programId: PROGRAM_ID,
      });

      // Create stablecoin instruction
      const createStablecoinIx = await program.methods
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
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Build and sign transaction
      const transaction = new Transaction()
        .add(createMintIx)
        .add(createDataIx)
        .add(createStablecoinIx);

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      // Sign with the required keypairs
      transaction.partialSign(params.stablecoinMint);
      transaction.partialSign(params.stablecoinData);

      // Send transaction
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Error in createStablecoin:', error);
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