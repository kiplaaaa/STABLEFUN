export interface StablecoinError extends Error {
  code?: string | number;
  msg?: string;
}

export enum ErrorCode {
  CalculationOverflow = 6000,
  InvalidBondMint = 6001,
  InvalidDecimals = 6002,
  InsufficientBondBalance = 6003,
}

export function getErrorMessage(error: unknown): string {
  const err = error as StablecoinError;
  
  switch (err.code) {
    case ErrorCode.CalculationOverflow:
      return 'Calculation overflow occurred. Try a smaller amount.';
    case ErrorCode.InvalidBondMint:
      return 'Invalid bond mint address provided.';
    case ErrorCode.InvalidDecimals:
      return 'Invalid decimal places specified.';
    case ErrorCode.InsufficientBondBalance:
      return 'Insufficient bond balance.';
    default:
      return err.message || err.msg || 'An unknown error occurred';
  }
} 