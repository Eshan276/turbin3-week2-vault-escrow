import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import BN from "bn.js";
import { expect } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;
  const maker = (provider.wallet as anchor.Wallet).payer;
  const taker = Keypair.generate();

  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: PublicKey;
  let takerAtaB: PublicKey;

  const DECIMALS = 6;
  const ONE = 10 ** DECIMALS;
  const DEPOSIT = new BN(100 * ONE);
  const RECEIVE = new BN(200 * ONE);

  // Each test that needs its own escrow calls this with a fresh seed.
  const escrowFor = (seed: BN) => {
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );
    const vault = getAssociatedTokenAddressSync(mintA, escrowPda, true);
    return { escrowPda, vault };
  };

  const makeEscrow = async (seed: BN, receive = RECEIVE) => {
    const { escrowPda, vault } = escrowFor(seed);
    await program.methods
      .make(seed, DEPOSIT, receive)
      .accountsStrict({
        maker: maker.publicKey,
        mintA,
        mintB,
        makerAtaA,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return { escrowPda, vault };
  };

  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      taker.publicKey,
      2_000_000_000,
    );
    await provider.connection.confirmTransaction(sig);

    mintA = await createMint(
      provider.connection, maker, maker.publicKey, null, DECIMALS,
    );
    mintB = await createMint(
      provider.connection, maker, maker.publicKey, null, DECIMALS,
    );

    // Maker holds plenty of token A; taker holds token B to pay with.
    makerAtaA = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection, maker, mintA, maker.publicKey,
      )
    ).address;
    await mintTo(
      provider.connection, maker, mintA, makerAtaA, maker, 1000 * ONE,
    );

    takerAtaB = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection, taker, mintB, taker.publicKey,
      )
    ).address;
    await mintTo(
      provider.connection, maker, mintB, takerAtaB, maker, 1000 * ONE,
    );
  });

  it("make: moves token A into the vault and records the terms", async () => {
    const seed = new BN(1);
    const before = (await getAccount(provider.connection, makerAtaA)).amount;

    const { escrowPda, vault } = await makeEscrow(seed);

    expect((await getAccount(provider.connection, vault)).amount).to.equal(
      BigInt(DEPOSIT.toString()),
    );
    expect((await getAccount(provider.connection, makerAtaA)).amount).to.equal(
      before - BigInt(DEPOSIT.toString()),
    );

    const state = await program.account.escrow.fetch(escrowPda);
    expect(state.maker.toBase58()).to.equal(maker.publicKey.toBase58());
    expect(state.mintA.toBase58()).to.equal(mintA.toBase58());
    expect(state.mintB.toBase58()).to.equal(mintB.toBase58());
    expect(state.receive.toString()).to.equal(RECEIVE.toString());
  });

  it("update: the maker can change the asking price", async () => {
    const seed = new BN(1);
    const { escrowPda } = escrowFor(seed);
    const newPrice = new BN(250 * ONE);

    await program.methods
      .update(newPrice)
      .accountsStrict({ maker: maker.publicKey, escrow: escrowPda })
      .rpc();

    const state = await program.account.escrow.fetch(escrowPda);
    expect(state.receive.toString()).to.equal(newPrice.toString());

    // Put it back so the take test uses the original price.
    await program.methods
      .update(RECEIVE)
      .accountsStrict({ maker: maker.publicKey, escrow: escrowPda })
      .rpc();
  });

  it("update: anyone other than the maker is rejected", async () => {
    const seed = new BN(1);
    const { escrowPda } = escrowFor(seed);

    try {
      await program.methods
        .update(new BN(1 * ONE))
        .accountsStrict({ maker: taker.publicKey, escrow: escrowPda })
        .signers([taker])
        .rpc();
      expect.fail("a non-maker should not be able to reprice the escrow");
    } catch (err) {
      // The escrow PDA's seeds include the maker, so a different signer derives
      // a different address and ConstraintSeeds rejects it on-chain.
      // `has_one = maker` is the second line of defence.
      expect(String(err)).to.match(/ConstraintSeeds|ConstraintHasOne/);
    }
  });

  it("update: rejects a zero price", async () => {
    const seed = new BN(1);
    const { escrowPda } = escrowFor(seed);

    try {
      await program.methods
        .update(new BN(0))
        .accountsStrict({ maker: maker.publicKey, escrow: escrowPda })
        .rpc();
      expect.fail("zero should be rejected");
    } catch (err) {
      expect(String(err)).to.include("InvalidAmount");
    }
  });

  it("take: swaps both sides and closes the escrow", async () => {
    const seed = new BN(1);
    const { escrowPda, vault } = escrowFor(seed);

    const takerAtaA = getAssociatedTokenAddressSync(mintA, taker.publicKey);
    const makerAtaB = getAssociatedTokenAddressSync(mintB, maker.publicKey);

    const takerBBefore = (await getAccount(provider.connection, takerAtaB)).amount;

    await program.methods
      .take()
      .accountsStrict({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA,
        mintB,
        takerAtaA,
        takerAtaB,
        makerAtaB,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    // Taker received the deposit.
    expect((await getAccount(provider.connection, takerAtaA)).amount).to.equal(
      BigInt(DEPOSIT.toString()),
    );
    // Maker received the asking price.
    expect((await getAccount(provider.connection, makerAtaB)).amount).to.equal(
      BigInt(RECEIVE.toString()),
    );
    // Taker paid it.
    expect((await getAccount(provider.connection, takerAtaB)).amount).to.equal(
      takerBBefore - BigInt(RECEIVE.toString()),
    );

    // Both accounts are gone.
    expect(await provider.connection.getAccountInfo(escrowPda)).to.be.null;
    expect(await provider.connection.getAccountInfo(vault)).to.be.null;
  });

  it("refund: returns the deposit and closes the escrow", async () => {
    const seed = new BN(2);
    const before = (await getAccount(provider.connection, makerAtaA)).amount;

    const { escrowPda, vault } = await makeEscrow(seed);
    expect((await getAccount(provider.connection, makerAtaA)).amount).to.equal(
      before - BigInt(DEPOSIT.toString()),
    );

    await program.methods
      .refund()
      .accountsStrict({
        maker: maker.publicKey,
        mintA,
        makerAtaA,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Maker is whole again.
    expect((await getAccount(provider.connection, makerAtaA)).amount).to.equal(
      before,
    );
    expect(await provider.connection.getAccountInfo(escrowPda)).to.be.null;
    expect(await provider.connection.getAccountInfo(vault)).to.be.null;
  });
});
