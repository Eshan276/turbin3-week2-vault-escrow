use crate::state::VaultState;
use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        seeds = [b"state", user.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        // TODO: CPI vault -> user for `amount`.
        // The source is the vault PDA, which has no private key, so this needs
        // CpiContext::new_with_signer with seeds:
        //   [b"vault", vault_state.key().as_ref(), &[vault_state.vault_bump]]
        let _ = amount;
        todo!("transfer from the vault PDA using new_with_signer")
    }
}
