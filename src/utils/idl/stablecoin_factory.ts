export const IDL = {
  "version": "0.1.0",
  "name": "stablecoin_factory",
  "instructions": [
    {
      "name": "createStablecoin",
      "accounts": [
        // ... add your program's IDL structure here
      ],
      "args": [
        {"name": "name", "type": "string"},
        {"name": "symbol", "type": "string"},
        {"name": "decimals", "type": "u8"},
        {"name": "iconUrl", "type": "string"},
        {"name": "targetCurrency", "type": "string"}
      ]
    },
    // ... other instructions
  ]
}; 