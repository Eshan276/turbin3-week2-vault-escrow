import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { BN } from "bn.js";
import { expect } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;
  const maker = (provider.wallet as anchor.Wallet).payer;
  const taker = Keypair.generate();

  const seed = new BN(Math.floor(Math.random() * 1_000_000));

  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: PublicKey;
  let takerAtaB: PublicKey;
  let escrowPda: PublicKey;
  let vaultAta: PublicKey;

  const DEPOSIT = 100n * 1_000_000n; // 100 tokens, 6 decimals
  const RECEIVE = 200n * 1_000_000n;

  before(async () => {
    // Fund the taker.
    const sig = await provider.connection.requestAirdrop(
      taker.publicKey,
      2_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    // Two mints, both 6 decimals, maker is the mint authority.
    mintA = await createMint(
      provider.connection, maker, maker.publicKey, null, 6,
    );
    mintB = await createMint(
      provider.connection, maker, maker.publicKey, null, 6,
    );

    // Maker holds token A, taker holds token B.
    const makerA = await getOrCreateAssociatedTokenAccount(
      provider.connection, maker, mintA, maker.publicKey,
    );
    makerAtaA = makerA.address;
    await mintTo(
      provider.connection, maker, mintA, makerAtaA, maker, DEPOSIT,
    );

    const takerB = await getOrCreateAssociatedTokenAccount(
      provider.connection, taker, mintB, taker.publicKey,
    );
    takerAtaB = takerB.address;
    await mintTo(
      provider.connection, maker, mintB, takerAtaB, maker, RECEIVE,
    );

    [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );

    vaultAta = getAssociatedTokenAddressSync(mintA, escrowPda, true);
  });

  it("make: deposits token A into the vault", async () => {
    // TODO: call program.methods.make(seed, deposit, receive)
    // then assert the vault holds DEPOSIT and the Escrow state matches.
  });

  it("update: maker changes the asking price", async () => {
    // TODO: call update() and assert escrow.receive changed.
  });

  it("update: a non-maker cannot change the price", async () => {
    // TODO: call update() signed by the taker and assert it throws.
    // `has_one = maker` is what should reject it.
  });

  it("take: swaps both sides atomically", async () => {
    // TODO: call take() as the taker. Assert the taker received token A,
    // the maker received token B, and the escrow + vault are closed.
  });

  it("refund: returns the deposit to the maker", async () => {
    // TODO: make a fresh escrow with a new seed, refund it, and assert the
    // maker got their token A back and both accounts are closed.
  });
});
