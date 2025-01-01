import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN, web3 } from '@project-serum/anchor';
import { IDL } from './idl/stablecoin_factory';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Update this to use your deployed program ID
const PROGRAM_ID = "EmfioDoaTmpfdSKogUxGyVJfeCp3EYHJf3rVdSPM7c4d";

export class StablecoinProgram {
  private program: Program<Idl>;
  private connection: Connection;
  private provider: AnchorProvider;
  
  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: 'confirmed',
    });
    // Use the correct program ID here
    this.program = new Program(IDL as Idl, new PublicKey(PROGRAM_ID), this.provider);
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
          authority: this.provider.publicKey,
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
          authority: this.provider.publicKey,
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

  async getBondBalance(bondMint: string | PublicKey): Promise<BN> {
    try {
      const mintKey = typeof bondMint === 'string' ? new PublicKey(bondMint) : bondMint;
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.provider.publicKey,
        { mint: mintKey }
      );

      if (tokenAccounts.value.length === 0) {
        return new BN(0);
      }

      const balance = await this.connection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey
      );

      return new BN(balance.value.amount);
    } catch (error) {
      console.error('Error getting bond balance:', error);
      return new BN(0);
    }
  }
} 