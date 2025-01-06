import { Connection, PublicKey, Transaction, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, MINT_SIZE, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint } from '@solana/spl-token';
import { Program, AnchorProvider, BN, Idl } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { IDL } from './idl/stablecoin_factory';
import { PROGRAM_ID } from './constants';

export class StablecoinProgram {
  private program: Program<Idl>;

  constructor(
    private connection: Connection,
    private wallet: WalletContextState
  ) {
    if (!PROGRAM_ID) {
      throw new Error('Program ID not configured');
    }

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );

    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  async createStablecoin(params: CreateStablecoinParams): Promise<string> {
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Generate a new keypair for the mint
      const stablecoinMint = Keypair.generate();
      
      // Calculate the minimum rent for the mint account
      const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);

      // Create the transaction
      const tx = new Transaction();

      // Get the latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;

      // Add the create mint account instruction
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: this.wallet.publicKey,
          newAccountPubkey: stablecoinMint.publicKey,
          lamports: mintRent,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID
        })
      );

      // Add the initialize mint instruction
      tx.add(
        createInitializeMintInstruction(
          stablecoinMint.publicKey,
          params.decimals,
          this.wallet.publicKey,
          this.wallet.publicKey,
          TOKEN_PROGRAM_ID
        )
      );

      // Add the create stablecoin instruction
      tx.add(
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
            stablecoinData: params.stablecoinData.publicKey,
            stablecoinMint: stablecoinMint.publicKey,
            bondMint: params.bondMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction()
      );

      // Sign with the mint keypair
      tx.partialSign(stablecoinMint);

      // Send and confirm transaction
      const signature = await this.wallet.sendTransaction(tx, this.connection, {
        signers: [stablecoinMint]
      });

      // Wait for confirmation
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: await this.connection.getBlockHeight()
      });

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

export interface CreateStablecoinParams {
  name: string;
  symbol: string;
  decimals: number;
  iconUrl: string;
  targetCurrency: string;
  bondMint: PublicKey;
  stablecoinData: Keypair;
  stablecoinMint: Keypair;
} 