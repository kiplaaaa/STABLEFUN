import { Connection, PublicKey } from '@solana/web3.js';
import { SwitchboardProgram, AggregatorAccount } from '@switchboard-xyz/solana.js';

export const ORACLE_FEEDS = {
  'USD': new PublicKey('Frkcq8bWREur6hRrtGZidPDn1P3Byi8fjbJxfiJvRWFB'),
  'MXN': new PublicKey('Frkcq8bWREur6hRrtGZidPDn1P3Byi8fjbJxfiJvRWFB'),
  'EUR': new PublicKey('7Eg6PFHteYGPr4PwpcDVibFtAihuzyB5BgqYK4DB8u3Q'),
} as const;

export type SupportedCurrency = keyof typeof ORACLE_FEEDS;

export function getOracleFeed(currency: string): PublicKey {
  if (currency in ORACLE_FEEDS) {
    return ORACLE_FEEDS[currency as SupportedCurrency];
  }
  throw new Error(`No oracle feed found for currency: ${currency}`);
}

export async function getExchangeRate(
  connection: Connection,
  oracleFeed: PublicKey
): Promise<number> {
  const program = await SwitchboardProgram.load('devnet', connection);
  const aggregator = new AggregatorAccount(program, oracleFeed);
  
  const result = await aggregator.fetchLatestValue();
  if (result === null) throw new Error('No oracle value available');
  
  return result;
} 