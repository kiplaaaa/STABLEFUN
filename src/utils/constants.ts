import { PublicKey } from "@solana/web3.js";

export const MINT_SIZE = 82; // Fixed size for mint accounts
export const StablecoinData = {
  SIZE: 8 + 32 + 32 + 8 + 1 + (4 + 32) + (4 + 8) + (4 + 128) + (4 + 8)
}; 

export const PROGRAM_ID = new PublicKey("CGnwq4D9qErCRjPujz5MVkMaixR8BLRACpAmLWsqoRRe"); 