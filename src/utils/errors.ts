export enum ErrorCode {
  CalculationOverflow = 6000
}

export function getErrorMessage(error: any): string {
  if (error.code === ErrorCode.CalculationOverflow) {
    return 'Calculation overflow occurred. Try a smaller amount.';
  }
  return error.message || 'An unknown error occurred';
} 