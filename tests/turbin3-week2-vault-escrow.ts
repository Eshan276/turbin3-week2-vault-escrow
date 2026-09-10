import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Turbin3Week2VaultEscrow } from "../target/types/turbin3_week2_vault_escrow";

describe("turbin3-week2-vault-escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.turbin3Week2VaultEscrow as Program<Turbin3Week2VaultEscrow>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
