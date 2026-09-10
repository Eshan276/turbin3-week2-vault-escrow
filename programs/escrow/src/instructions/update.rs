use anchor_lang::prelude::*;

use crate::{Escrow, EscrowError, ESCROW_SEED};

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    // `has_one = maker` is what stops anyone else from repricing this escrow.
    #[account(
        mut,
        has_one = maker,
        seeds = [ESCROW_SEED, maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,
}

impl<'info> Update<'info> {
    pub fn update(&mut self, receive: u64) -> Result<()> {
        require!(receive > 0, EscrowError::InvalidAmount);

        // `has_one = maker` on the struct already rejects anyone else.
        self.escrow.receive = receive;

        Ok(())
    }
}
