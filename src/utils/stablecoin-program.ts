import { Connection, PublicKey, Transaction, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, MINT_SIZE, createInitializeMintInstruction } from '@solana/spl-token';
import { Program, AnchorProvider, web3, BN, Idl } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { IDL } from './idl/stablecoin_factory';

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
  private connection: Connection;
  private wallet: WalletContextState;
  private program: Program<Idl>;

  constructor(connection: Connection, wallet: WalletContextState) {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
    this.connection = connection;
    this.wallet = wallet;

    // Initialize the program in constructor
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );
    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  async createStablecoin(params: CreateStablecoinParams): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Input validation
      if (!params.name.trim() || !params.symbol.trim() || !params.targetCurrency.trim()) {
        throw new Error('Name, symbol, and target currency are required');
      }

      // Create stablecoin data account
      const [stablecoinDataPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('stablecoin'),
          this.wallet.publicKey.toBuffer(),
          Buffer.from(params.name)
        ],
        this.program.programId
      );
      // Create mint account
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const mintAccount = Keypair.generate();

      const transaction = new Transaction();

      // Add mint account creation instruction
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: this.wallet.publicKey,
          newAccountPubkey: mintAccount.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      // Add create stablecoin instruction
      transaction.add(
        await this.program.methods
          .createStablecoin(
            params.name,
            params.symbol,
            params.decimals,
            params.iconUrl,
            params.targetCurrency
          )
          .accounts({
            authority: this.wallet.publicKey,
            stablecoinData: stablecoinDataPda,
            stablecoinMint: mintAccount.publicKey,
            bondMint: params.bondMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction()
      );

      // Sign and send transaction
      const signature = await this.wallet.sendTransaction(transaction, this.connection, {
        signers: [mintAccount]
      });

      await this.connection.confirmTransaction(signature);
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