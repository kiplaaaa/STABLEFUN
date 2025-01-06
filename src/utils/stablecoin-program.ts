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

      // Get the latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

      // Create the transaction
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;

      // Create the mint account instruction
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: stablecoinMint.publicKey,
        lamports: mintRent,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID
      });

      // Initialize mint instruction
      const initMintIx = createInitializeMintInstruction(
        stablecoinMint.publicKey, // mint
        params.decimals, // decimals
        this.wallet.publicKey, // mint authority
        this.wallet.publicKey, // freeze authority (you can use null)
        TOKEN_PROGRAM_ID
      );

      // Create stablecoin instruction
      const createStablecoinIx = await this.program.methods
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
          bondMint: new PublicKey(params.bondMint),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Add all instructions
      tx.add(createAccountIx);
      tx.add(initMintIx);
      tx.add(createStablecoinIx);

      try {
        // First simulate the transaction
        const simulation = await this.connection.simulateTransaction(tx);
        if (simulation.value.err) {
          console.error('Simulation failed:', simulation.value.err);
          throw new Error(`Transaction simulation failed: ${simulation.value.err}`);
        }

        // Sign with the mint keypair
        tx.partialSign(stablecoinMint);

        // Send the transaction
        const signature = await this.wallet.sendTransaction(tx, this.connection, {
          signers: [], // Remove stablecoinMint from here since we already signed with it
          preflightCommitment: 'confirmed',
        });

        // Wait for confirmation
        const confirmation = await this.connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight: await this.connection.getBlockHeight(),
        }, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }

        return signature;

      } catch (error: unknown) {
        console.error('Transaction failed:', error);
        if (error instanceof Error) {
          throw new Error(`Failed to send transaction: ${error.message}`);
        }
        throw new Error(`Failed to send transaction: ${String(error)}`);
      }

    } catch (error: unknown) {
      console.error('Error in createStablecoin:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
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