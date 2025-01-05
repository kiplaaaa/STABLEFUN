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
      console.error('Wallet connection error: No public key found');
      throw new Error('Wallet not connected');
    }

    try {
      console.log('Starting stablecoin creation process...');
      console.log('Params:', {
        name: params.name,
        symbol: params.symbol,
        decimals: params.decimals,
        targetCurrency: params.targetCurrency,
        bondMint: params.bondMint.toBase58(),
        stablecoinMint: params.stablecoinMint.publicKey.toBase58(),
        stablecoinData: params.stablecoinData.publicKey.toBase58(),
      });

      // Check for sufficient SOL balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      console.log('Current wallet balance:', balance / web3.LAMPORTS_PER_SOL, 'SOL');
      
      const minimumBalance = web3.LAMPORTS_PER_SOL * 0.1;
      if (balance < minimumBalance) {
        console.error('Insufficient balance:', balance / web3.LAMPORTS_PER_SOL, 'SOL');
        throw new Error('Insufficient SOL balance for transaction');
      }

      // Create mint account
      console.log('Creating mint account...');
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      console.log('Mint rent:', mintRent / web3.LAMPORTS_PER_SOL, 'SOL');
      
      const createMintIx = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: params.stablecoinMint.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      });
      console.log('Mint account instruction created');

      // Initialize mint
      console.log('Creating initialize mint instruction...');
      const initializeMintIx = createInitializeMintInstruction(
        params.stablecoinMint.publicKey,
        params.decimals,
        this.wallet.publicKey,
        this.wallet.publicKey,
        TOKEN_PROGRAM_ID
      );
      console.log('Initialize mint instruction created');

      // Create data account
      console.log('Calculating data account space...');
      const space = 8 + 32 + 32 + 8 + 1 + 
                    4 + Buffer.from(params.name).length + 
                    4 + Buffer.from(params.symbol).length + 
                    4 + Buffer.from(params.iconUrl).length + 
                    4 + Buffer.from(params.targetCurrency).length;
      console.log('Data account space required:', space, 'bytes');

      const dataRent = await this.connection.getMinimumBalanceForRentExemption(space);
      console.log('Data account rent:', dataRent / web3.LAMPORTS_PER_SOL, 'SOL');

      const createDataIx = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: params.stablecoinData.publicKey,
        space,
        lamports: dataRent,
        programId: PROGRAM_ID,
      });
      console.log('Data account instruction created');

      // Create stablecoin instruction
      console.log('Creating stablecoin instruction...');
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
          stablecoinMint: params.stablecoinMint.publicKey,
          bondMint: params.bondMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([params.stablecoinMint, params.stablecoinData])
        .instruction();
      console.log('Stablecoin instruction created');

      // Create transaction
      console.log('Building transaction...');
      const transaction = new Transaction();
      
      // Add all instructions
      transaction.add(createMintIx)
                .add(initializeMintIx)
                .add(createDataIx)
                .add(createStablecoinIx);

      // Get latest blockhash and set transaction properties
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      console.log('Transaction built, preparing for signing...');
      
      // Create a copy of the transaction for simulation
      const simTransaction = Transaction.from(transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      }));

      // Sign the simulation transaction with all required signers
      simTransaction.sign(params.stablecoinMint, params.stablecoinData);
      
      console.log('Simulating transaction with signatures...');
      try {
        const simulation = await this.connection.simulateTransaction(simTransaction);
        
        console.log('Simulation result:', {
          err: simulation.value.err,
          logs: simulation.value.logs,
          unitsConsumed: simulation.value.unitsConsumed,
        });

        if (simulation.value.err) {
          console.error('Simulation failed:', simulation.value.err);
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      } catch (simError) {
        console.error('Simulation error:', simError);
        throw simError;
      }

      // If simulation succeeds, proceed with actual transaction
      console.log('Simulation successful, proceeding with actual transaction...');

      // Sign with auxiliary signers first
      transaction.partialSign(params.stablecoinMint);
      transaction.partialSign(params.stablecoinData);

      console.log('Transaction signed by auxiliary signers');

      // Send the transaction
      console.log('Sending transaction...');
      const signature = await this.wallet.sendTransaction(transaction, this.connection, {
        skipPreflight: true, // Skip preflight since we already simulated
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      });

      console.log('Transaction sent, signature:', signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('Transaction confirmed successfully!');
      return signature;

    } catch (error) {
      console.error('Error in createStablecoin:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : undefined,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        logs: error instanceof Error && 'logs' in error ? error.logs : undefined,
      });
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
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