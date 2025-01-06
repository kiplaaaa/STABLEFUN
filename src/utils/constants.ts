import { PublicKey } from "@solana/web3.js";

export const MINT_SIZE = 82; // Fixed size for mint accounts
export const StablecoinData = {
  SIZE: 8 + 32 + 32 + 8 + 1 + (4 + 32) + (4 + 8) + (4 + 128) + (4 + 8)
}; 

export const PROGRAM_ID = new PublicKey("A6ZS2FHTzLuB6vP1XwDbb9TEtFdGZwT86dEJcGXmQPeU"); 

export const RPC_ENDPOINT = "https://devnet.helius-rpc.com/?api-key=e26a41e3-3e82-45eb-956f-5a2160c31324"; 