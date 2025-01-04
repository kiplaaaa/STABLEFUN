import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StablecoinFactory } from "../target/types/stablecoin_factory";

describe("stablecoin-factory", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.StablecoinFactory as Program<StablecoinFactory>;

  it("Creates a stablecoin!", async () => {
    const tx = await program.methods
      .createStablecoin(
        "My Stablecoin",
        "STBL",
        6,
        "https://example.com/icon.png",
        "USD"
      )
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
