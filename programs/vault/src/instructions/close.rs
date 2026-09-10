use crate::state::VaultState;
use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"state", user.key().as_ref()],
        bump = vault_state.state_bump,
        close = user,
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl<'info> Close<'info> {
    pub fn close(&mut self) -> Result<()> {
        // TODO: drain the FULL vault balance back to the user, PDA-signed.
        // `close = user` on vault_state handles the rent refund separately,
        // and it runs after this body returns Ok.
        //
        // Order matters: the signing seeds depend on vault_state, so the vault
        // must be drained before vault_state is closed.
        todo!("transfer self.vault.lamports() from vault -> user")
    }
}
