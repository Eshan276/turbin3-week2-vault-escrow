pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("FK2UGDLUCU2why6dD81Sn9MdM18cWG2vgcwVhFvZeJaT");

// A trustless two-party token swap.
//
// The maker deposits token A into a program-owned vault and states how much
// token B they want back. Any taker holding token B can complete the swap
// atomically. If nobody takes it, the maker can refund at any time.
//
//   make    maker's token A  ->  vault (PDA-owned)
//   take    taker's token B  ->  maker,  vault's token A -> taker
//   refund  vault's token A  ->  maker,  escrow + vault closed
//   update  maker revises the asking price

#[program]
pub mod escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, deposit: u64, receive: u64) -> Result<()> {
        ctx.accounts.init_escrow(seed, receive, &ctx.bumps)?;
        ctx.accounts.deposit(deposit)
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.deposit()?;
        ctx.accounts.release()?;
        ctx.accounts.close_vault()
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close()
    }

    pub fn update(ctx: Context<Update>, receive: u64) -> Result<()> {
        ctx.accounts.update(receive)
    }
}
