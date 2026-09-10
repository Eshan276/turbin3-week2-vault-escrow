pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use state::*;

declare_id!("B8Rag68dpewk8RNVgxN3NdLpP479SeWWJnipM9X1qS9d");

// A per-user SOL vault.
//
// Each user gets two PDAs:
//   vault_state  seeds = ["state", user]   holds the two bumps
//   vault        seeds = ["vault", vault_state]   holds the SOL
//
// The vault is a SystemAccount, so the System Program owns it and every
// movement of lamports goes through a CPI. Withdrawals are authorised by the
// vault PDA signing with its seeds.

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        ctx.accounts.close()
    }
}
