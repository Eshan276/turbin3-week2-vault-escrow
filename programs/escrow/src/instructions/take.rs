use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

use crate::{Escrow, ESCROW_SEED};

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub mint_a: InterfaceAccount<'info, Mint>,
    pub mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program
    )]
    pub taker_ata_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program
    )]
    pub taker_ata_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_ata_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = mint_a,
        has_one = mint_b,
        seeds = [ESCROW_SEED, maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Take<'info> {
    pub fn deposit(&mut self) -> Result<()> {
        // TODO: taker pays the maker — transfer_checked taker_ata_b -> maker_ata_b
        // for escrow.receive. The taker signs.
        todo!("send the agreed amount of mint_b to the maker")
    }

    pub fn release(&mut self) -> Result<()> {
        // TODO: release the vault to the taker — transfer_checked vault -> taker_ata_a
        // for the vault's full balance.
        // Authority is the escrow PDA, so new_with_signer with seeds:
        //   [ESCROW_SEED, maker.key().as_ref(), &escrow.seed.to_le_bytes(), &[escrow.bump]]
        todo!("release vault tokens to the taker, escrow-PDA signed")
    }

    pub fn close_vault(&mut self) -> Result<()> {
        // TODO: close the now-empty vault ATA, rent back to the maker.
        // Same escrow-PDA signer seeds as release().
        // `close = maker` on the escrow account handles the escrow account itself.
        todo!("close_account on the vault")
    }
}
