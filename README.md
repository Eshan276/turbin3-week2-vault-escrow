# Vault & Escrow

Two Anchor programs built for Week 2 of the Turbin3 builders cohort.

| Program | ID | What it does |
| --- | --- | --- |
| `vault` | `B8Rag68dpewk8RNVgxN3NdLpP479SeWWJnipM9X1qS9d` | Per-user SOL vault |
| `escrow` | `FK2UGDLUCU2why6dD81Sn9MdM18cWG2vgcwVhFvZeJaT` | Trustless two-party token swap |

## Vault

A user deposits SOL into a PDA that only this program can move funds out of.

### Accounts

| Account | Seeds | Owner | Holds |
| --- | --- | --- | --- |
| `vault_state` | `["state", user]` | vault program | `vault_bump`, `state_bump` |
| `vault` | `["vault", vault_state]` | System Program | SOL, no data |

`vault` derives from `vault_state`'s address rather than the user's, so the
chain is `user -> vault_state -> vault`.

### Instructions

| Instruction | Effect | Who authorises the transfer |
| --- | --- | --- |
| `initialize` | Creates `vault_state`, caches both bumps | — |
| `deposit(amount)` | SOL: user -> vault | user's signature |
| `withdraw(amount)` | SOL: vault -> user | vault PDA, via seeds |
| `close` | Drains the vault, closes state, refunds rent | vault PDA, via seeds |

The `deposit` / `withdraw` asymmetry is the point worth understanding. On
deposit the source is the user's own wallet, so their transaction signature is
enough. On withdraw the source is the vault PDA, which has no private key —
the program passes the seeds, the runtime re-derives the address, and on a
match grants signer privilege. Only this program, with these seeds, can move
that SOL.

`vault` is a `SystemAccount`, so the System Program owns it and every movement
of lamports is a CPI. The program cannot simply edit a balance.

## Escrow

A maker locks token A in a vault and names a price in token B. Any taker
holding token B can complete the swap atomically. If nobody does, the maker
refunds.

### State

`Escrow` stores `seed`, `maker`, `mint_a`, `mint_b`, `receive`, `bump`, at
seeds `["escrow", maker, seed]`. The `seed` field lets one maker run several
escrows at once.

The vault is an ATA for `mint_a` owned by the escrow PDA.

### Instructions

| Instruction | Effect |
| --- | --- |
| `make(seed, deposit, receive)` | Creates the escrow, moves token A into the vault |
| `take` | Taker pays the maker in token B, vault releases token A to the taker, both accounts close |
| `refund` | Returns token A to the maker, closes both accounts |
| `update(receive)` | Maker revises the asking price |

`take` and `refund` move tokens out of the vault, so both sign as the escrow
PDA. `update` is guarded by `has_one = maker`, which is what stops anyone else
from repricing an escrow.

## Running it

```bash
anchor build
anchor test --validator legacy
```

`anchor test` starts a local validator, deploys both programs, and runs the
TypeScript suites in `tests/`. The `--validator legacy` flag selects
`solana-test-validator`; Anchor 0.32 otherwise defaults to `surfpool`.

### Test coverage

```
escrow
  make: moves token A into the vault and records the terms
  update: the maker can change the asking price
  update: anyone other than the maker is rejected
  update: rejects a zero price
  take: swaps both sides and closes the escrow
  refund: returns the deposit and closes the escrow

vault
  initializes the vault and stores both bumps
  deposits SOL into the vault
  withdraws SOL from the vault
  rejects a withdrawal larger than the balance
  closes the vault and returns everything

11 passing
```

## Notes

The `Take` accounts struct boxes its token accounts. Six `InterfaceAccount`
fields overflow the 4 KB BPF stack frame during `try_accounts`, so
`Box<InterfaceAccount<..>>` moves them to the heap.

## Layout

```
programs/
  vault/src/
    lib.rs                    entrypoint, four instructions
    state.rs                  VaultState
    instructions/             one file per instruction
  escrow/src/
    lib.rs                    entrypoint, four instructions
    state.rs                  Escrow
    constants.rs              ESCROW_SEED
    error.rs                  EscrowError
    instructions/             one file per instruction
tests/
  vault.ts
  escrow.ts
```
