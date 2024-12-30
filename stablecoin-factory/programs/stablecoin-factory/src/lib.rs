use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use switchboard_v2::AggregatorAccountData;

declare_id!("2DBNsiRobyiP1xHW1fsg9DK1sCxfyRhfBp84Vr2sW2Xz");

#[program]
pub mod stablecoin_factory {
    use super::*;

    pub fn create_stablecoin(
        ctx: Context<CreateStablecoin>,
        name: String,
        symbol: String,
        decimals: u8,
        icon_url: String,
        target_currency: String,
    ) -> Result<()> {
        let stablecoin = &mut ctx.accounts.stablecoin_data;
        stablecoin.name = name;
        stablecoin.symbol = symbol;
        stablecoin.decimals = decimals;
        stablecoin.icon_url = icon_url;
        stablecoin.target_currency = target_currency;
        stablecoin.authority = ctx.accounts.authority.key();
        stablecoin.bond_mint = ctx.accounts.bond_mint.key();
        stablecoin.total_supply = 0;

        Ok(())
    }

    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        // Get exchange rate from oracle
        let feed = &ctx.accounts.oracle_feed.load()?;
        let result = feed.latest_confirmed_round.result;
        // Calculate price from mantissa and scale
        let exchange_rate = (result.mantissa as f64) * 10f64.powi(result.scale as i32);

        // Calculate token amount based on bond amount and exchange rate
        let token_amount = (amount as f64 * exchange_rate) as u64;

        // Transfer bonds from user
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_bond_account.to_account_info(),
                    to: ctx.accounts.program_bond_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint stablecoins to user
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.stablecoin_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // Update total supply
        let stablecoin = &mut ctx.accounts.stablecoin_data;
        stablecoin.total_supply = stablecoin.total_supply.checked_add(token_amount)
            .ok_or(ErrorCode::CalculationOverflow)?;

        Ok(())
    }

    pub fn redeem_tokens(
        ctx: Context<RedeemTokens>,
        amount: u64,
    ) -> Result<()> {
        // Get exchange rate from oracle
        let feed = &ctx.accounts.oracle_feed.load()?;
        let result = feed.latest_confirmed_round.result;
        // Calculate price from mantissa and scale
        let exchange_rate = (result.mantissa as f64) * 10f64.powi(result.scale as i32);

        // Calculate bond amount based on token amount and exchange rate
        let bond_amount = (amount as f64 / exchange_rate) as u64;

        // Burn stablecoins from user
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.stablecoin_mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer bonds back to user
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.program_bond_account.to_account_info(),
                    to: ctx.accounts.user_bond_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            bond_amount,
        )?;

        // Update total supply
        let stablecoin = &mut ctx.accounts.stablecoin_data;
        stablecoin.total_supply = stablecoin.total_supply.checked_sub(amount)
            .ok_or(ErrorCode::CalculationOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, decimals: u8, icon_url: String, target_currency: String)]
pub struct CreateStablecoin<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + StablecoinData::SIZE,
    )]
    pub stablecoin_data: Account<'info, StablecoinData>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority,
    )]
    pub stablecoin_mint: Account<'info, Mint>,
    
    pub bond_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub stablecoin_data: Account<'info, StablecoinData>,
    
    #[account(mut)]
    pub stablecoin_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_bond_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub program_bond_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Oracle feed account
    pub oracle_feed: AccountLoader<'info, AggregatorAccountData>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RedeemTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub stablecoin_data: Account<'info, StablecoinData>,
    
    #[account(mut)]
    pub stablecoin_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_bond_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub program_bond_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Oracle feed account
    pub oracle_feed: AccountLoader<'info, AggregatorAccountData>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct StablecoinData {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub icon_url: String,
    pub target_currency: String,
    pub bond_mint: Pubkey,
    pub authority: Pubkey,
    pub total_supply: u64,
}

impl StablecoinData {
    pub const SIZE: usize = 32 + // name
                           8 +  // symbol
                           1 +  // decimals
                           32 + // icon_url
                           8 +  // target_currency
                           32 + // bond_mint
                           32 + // authority
                           8;  // total_supply
}

#[error_code]
pub enum ErrorCode {
    #[msg("Calculation overflow")]
    CalculationOverflow,
}