#![cfg_attr(feature = "program", compiler_builtins::stack_size = "8192")]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use switchboard_solana::AggregatorAccountData;

declare_id!("CGnwq4D9qErCRjPujz5MVkMaixR8BLRACpAmLWsqoRRe");

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
        // Add validation for input parameters
        require!(decimals <= 9, ErrorCode::InvalidDecimals); // Add decimal validation
        require!(!name.is_empty(), ErrorCode::InvalidName);
        require!(!symbol.is_empty(), ErrorCode::InvalidSymbol);
        require!(!target_currency.is_empty(), ErrorCode::InvalidCurrency);

        // Initialize the stablecoin data account
        let stablecoin_data = &mut ctx.accounts.stablecoin_data;
        stablecoin_data.authority = ctx.accounts.authority.key();
        stablecoin_data.bond_mint = ctx.accounts.bond_mint.key();
        stablecoin_data.total_supply = 0;
        stablecoin_data.decimals = decimals;
        stablecoin_data.name = name;
        stablecoin_data.symbol = symbol;
        stablecoin_data.icon_url = icon_url;
        stablecoin_data.target_currency = target_currency;

        // Initialize the mint account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeMint {
                mint: ctx.accounts.stablecoin_mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );
        token::initialize_mint(cpi_context, decimals, &ctx.accounts.authority.key(), Some(&ctx.accounts.authority.key()))?;

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
        space = StablecoinData::SIZE,
        seeds = [b"stablecoin", authority.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub stablecoin_data: Account<'info, StablecoinData>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority.key(),
    )]
    pub stablecoin_mint: Account<'info, Mint>,
    
    #[account(
        constraint = bond_mint.decimals <= 9 @ ErrorCode::InvalidDecimals
    )]
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
    pub authority: Pubkey,      // Move fixed-size fields to the top
    pub bond_mint: Pubkey,
    pub total_supply: u64,
    pub decimals: u8,
    // String fields last
    pub name: String,
    pub symbol: String,
    pub icon_url: String,
    pub target_currency: String,
}

impl StablecoinData {
    pub const SIZE: usize = 8 +  // discriminator
                           32 + // authority
                           32 + // bond_mint
                           8 +  // total_supply
                           1 +  // decimals
                           4 + 32 + // name (4 bytes for length + max 32 bytes for string)
                           4 + 8 +  // symbol (4 bytes for length + max 8 bytes for string)
                           4 + 32 + // icon_url (4 bytes for length + max 32 bytes for string)
                           4 + 8;   // target_currency (4 bytes for length + max 8 bytes for string)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Calculation overflow")]
    CalculationOverflow,
    #[msg("Invalid bond mint")]
    InvalidBondMint,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid name provided")]
    InvalidName,
    #[msg("Invalid symbol provided")]
    InvalidSymbol,
    #[msg("Invalid currency provided")]
    InvalidCurrency,
}