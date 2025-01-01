export const IDL = {
  version: "0.1.0",
  name: "stablecoin_factory",
  instructions: [
    {
      name: "createStablecoin",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "stablecoinData", isMut: true, isSigner: true },
        { name: "stablecoinMint", isMut: true, isSigner: true },
        { name: "bondMint", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "name", type: "string" },
        { name: "symbol", type: "string" },
        { name: "decimals", type: "u8" },
        { name: "iconUrl", type: "string" },
        { name: "targetCurrency", type: "string" }
      ]
    },
    {
      name: "mintTokens",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "stablecoinData", isMut: true, isSigner: false },
        { name: "stablecoinMint", isMut: true, isSigner: false },
        { name: "userBondAccount", isMut: true, isSigner: false },
        { name: "programBondAccount", isMut: true, isSigner: false },
        { name: "userTokenAccount", isMut: true, isSigner: false },
        { name: "oracleFeed", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    },
    {
      name: "redeemTokens",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "stablecoinData", isMut: true, isSigner: false },
        { name: "stablecoinMint", isMut: true, isSigner: false },
        { name: "userBondAccount", isMut: true, isSigner: false },
        { name: "programBondAccount", isMut: true, isSigner: false },
        { name: "userTokenAccount", isMut: true, isSigner: false },
        { name: "oracleFeed", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    }
  ],
  accounts: [
    {
      name: "StablecoinData",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "bondMint", type: "pubkey" },
          { name: "totalSupply", type: "u64" },
          { name: "decimals", type: "u8" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "iconUrl", type: "string" },
          { name: "targetCurrency", type: "string" }
        ]
      }
    }
  ],
  errors: [
    {
      code: 6000,
      name: "CalculationOverflow",
      msg: "Calculation overflow"
    }
  ]
};