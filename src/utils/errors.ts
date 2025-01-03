export interface StablecoinError extends Error {
  code?: string | number;
  msg?: string;
}

export enum ErrorCode {
  CalculationOverflow = 6000
}

export function getErrorMessage(error: unknown): string {
  const err = error as StablecoinError;
  
  if (err.code === ErrorCode.CalculationOverflow) {
    return 'Calculation overflow occurred. Try a smaller amount.';
  }
  
  return err.message || err.msg || 'An unknown error occurred';
} 