import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { IDL } from './idl/stablecoin_factory';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class StablecoinProgram {
  private program: Program;
  private connection: Connection;
  
  constructor(connection: Connection, wallet: any) {
    const provider = new Provider(connection, wallet, {
      preflightCommitment: 'confirmed',
    });
    this.program = new Program(IDL, new PublicKey("your_program_id"), provider);
    this.connection = connection;
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
          authority: this.program.provider.wallet.publicKey,
          stablecoinData: stablecoinData.publicKey,
          stablecoinMint: stablecoinMint.publicKey,
          bondMint: params.bondMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([stablecoinData, stablecoinMint])
        .rpc();

      await this.connection.confirmTransaction(tx, 'confirmed');
      return { stablecoinData: stablecoinData.publicKey, stablecoinMint: stablecoinMint.publicKey };
    } catch (error) {
      console.error('Error creating stablecoin:', error);
      throw error;
    }
  }

  async mintTokens(params: {
    amount: number;
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
          authority: this.program.provider.wallet.publicKey,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          userBondAccount: params.userBondAccount,
          programBondAccount: params.programBondAccount,
          userTokenAccount: params.userTokenAccount,
          oracleFeed: params.oracleFeed,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await this.connection.confirmTransaction(tx, 'confirmed');
      return tx;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }

  async redeemTokens(params: {
    amount: number;
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
          authority: this.program.provider.wallet.publicKey,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          userBondAccount: params.userBondAccount,
          programBondAccount: params.programBondAccount,
          userTokenAccount: params.userTokenAccount,
          oracleFeed: params.oracleFeed,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await this.connection.confirmTransaction(tx, 'confirmed');
      return tx;
    } catch (error) {
      console.error('Error redeeming tokens:', error);
      throw error;
    }
  }
} 