import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

describe("vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.vault as Program<Vault>;
  const user = provider.wallet.publicKey;

  const [vaultStatePda, stateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("state"), user.toBuffer()],
    program.programId,
  );

  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultStatePda.toBuffer()],
    program.programId,
  );

  it("initializes the vault and stores both bumps", async () => {
    await program.methods
      .initialize()
      .accountsStrict({
        user,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.vaultState.fetch(vaultStatePda);
    expect(state.vaultBump).to.equal(vaultBump);
    expect(state.stateBump).to.equal(stateBump);
  });

  it("deposits SOL into the vault", async () => {
    const amount = 1 * LAMPORTS_PER_SOL;
    const before = await provider.connection.getBalance(vaultPda);

    await program.methods
      .deposit(new BN(amount))
      .accountsStrict({
        user,
        vault: vaultPda,
        vaultState: vaultStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const after = await provider.connection.getBalance(vaultPda);
    expect(after).to.equal(before + amount);
  });

  it("withdraws SOL from the vault", async () => {
    const amount = 0.5 * LAMPORTS_PER_SOL;
    const before = await provider.connection.getBalance(vaultPda);

    await program.methods
      .withdraw(new BN(amount))
      .accountsStrict({
        user,
        vault: vaultPda,
        vaultState: vaultStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const after = await provider.connection.getBalance(vaultPda);
    expect(after).to.equal(before - amount);
  });

  // TODO: a withdraw of more than the vault holds should fail.

  it("closes the vault and returns everything", async () => {
    const before = await provider.connection.getBalance(user);

    await program.methods
      .close()
      .accountsStrict({
        user,
        vault: vaultPda,
        vaultState: vaultStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(await provider.connection.getBalance(vaultPda)).to.equal(0);
    expect(await provider.connection.getAccountInfo(vaultStatePda)).to.be.null;
    // The user gets the vault balance plus the rent that paid for vault_state.
    expect(await provider.connection.getBalance(user)).to.be.greaterThan(before);
  });
});
