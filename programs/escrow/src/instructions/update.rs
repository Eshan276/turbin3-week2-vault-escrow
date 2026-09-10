use anchor_lang::prelude::*;

use crate::{Escrow, ESCROW_SEED};

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
        // TODO: set the new asking price on self.escrow.
        // Consider rejecting zero with EscrowError::InvalidAmount.
        let _ = receive;
        todo!("update escrow.receive")
    }
}
