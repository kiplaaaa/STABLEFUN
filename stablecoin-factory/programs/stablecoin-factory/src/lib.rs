use anchor_lang::prelude::*;

declare_id!("BNTeFeKEfzeQjWqUY12ohgBr1XA4WbKFBefrHi6DHKMY");

#[program]
pub mod stablecoin_factory {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
