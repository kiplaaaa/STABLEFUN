// #![cfg_attr(feature = "program", compiler_builtins::stack_size = "8192")]

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint as Token22Mint, TokenAccount as Token22Account, Token},
    token_2022::{self as token22, Token2022},
};
use switchboard_solana::AggregatorAccountData;
use std::str::FromStr;

declare_id!("A6ZS2FHTzLuB6vP1XwDbb9TEtFdGZwT86dEJcGXmQPeU");

// Constants
const MAX_NAME_LENGTH: usize = 32;
const MAX_SYMBOL_LENGTH: usize = 8;
const MAX_ICON_URL_LENGTH: usize = 128;
const MAX_TARGET_CURRENCY_LENGTH: usize = 16;
const ORACLE_FEEDS: &[(&str, &str)] = &[
    ("USD", "Frkcq8bWREur6hRrtGZidPDn1P3Byi8fjbJxfiJvRWFB"),
    ("EUR", "7Eg6PFHteYGPr4PwpcDVibFtAihuzyB5BgqYK4DB8u3Q"),
    ("MXN", "Frkcq8bWREur6hRrtGZidPDn1P3Byi8fjbJxfiJvRWFB"),
];

// Move the helper function outside the program module
pub fn get_oracle_feed(currency: &str) -> Result<Pubkey> {
    for &(curr, feed) in ORACLE_FEEDS {
        if curr == currency {
            return Ok(Pubkey::from_str(feed).unwrap());
        }
    }
    Err(error!(ErrorCode::InvalidCurrency))
}

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
        msg!("Creating stablecoin with params:");
        msg!("Name: {}", name);
        msg!("Symbol: {}", symbol);
        msg!("Decimals: {}", decimals);
        msg!("Icon URL: {}", icon_url);
        msg!("Target Currency: {}", target_currency);
        msg!("Bond mint: {}", ctx.accounts.bond_mint.key());
        
        // Add validation
        require!(decimals <= 9, ErrorCode::InvalidDecimals);
        require!(!name.is_empty() && name.len() <= MAX_NAME_LENGTH, ErrorCode::InvalidName);
        require!(!symbol.is_empty() && symbol.len() <= MAX_SYMBOL_LENGTH, ErrorCode::InvalidSymbol);
        require!(!icon_url.is_empty() && icon_url.len() <= MAX_ICON_URL_LENGTH, ErrorCode::InvalidIconUrl);
        require!(!target_currency.is_empty() && target_currency.len() <= MAX_TARGET_CURRENCY_LENGTH, ErrorCode::InvalidCurrency);
        
        // Validate bond mint
        let bond_mint = &ctx.accounts.bond_mint;
        require!(bond_mint.is_initialized, ErrorCode::InvalidBondMint);
        require!(bond_mint.mint_authority.is_some(), ErrorCode::InvalidBondMint);

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

        msg!("Stablecoin created successfully");
        Ok(())
    }

    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
        minimum_tokens_out: u64,
    ) -> Result<()> {
        let feed = &ctx.accounts.oracle_feed.load()?;
        let result = feed.latest_confirmed_round.result;
        require!(result.scale >= 0, ErrorCode::InvalidOracleData);
        
        let exchange_rate = (result.mantissa as f64) * 10f64.powi(result.scale as i32);
        require!(exchange_rate > 0.0, ErrorCode::InvalidExchangeRate);

        let token_amount = (amount as f64 * exchange_rate) as u64;
        require!(token_amount >= minimum_tokens_out, ErrorCode::SlippageExceeded);

        token22::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token22::Transfer {
                    from: ctx.accounts.user_bond_account.to_account_info(),
                    to: ctx.accounts.program_bond_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        token22::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token22::MintTo {
                    mint: ctx.accounts.stablecoin_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            token_amount,
        )?;

        let stablecoin = &mut ctx.accounts.stablecoin_data;
        stablecoin.total_supply = stablecoin.total_supply.checked_add(token_amount)
            .ok_or(ErrorCode::CalculationOverflow)?;

        Ok(())
    }

    pub fn redeem_tokens(
        ctx: Context<RedeemTokens>,
        amount: u64,
    ) -> Result<()> {
        let feed = &ctx.accounts.oracle_feed.load()?;
        let result = feed.latest_confirmed_round.result;
        require!(result.scale >= 0, ErrorCode::InvalidOracleData);

        let exchange_rate = (result.mantissa as f64) * 10f64.powi(result.scale as i32);
        require!(exchange_rate > 0.0, ErrorCode::InvalidExchangeRate);

        let bond_amount = (amount as f64 / exchange_rate) as u64;
        token22::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token22::Burn {
                    mint: ctx.accounts.stablecoin_mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        token22::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token22::Transfer {
                    from: ctx.accounts.program_bond_account.to_account_info(),
                    to: ctx.accounts.user_bond_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            bond_amount,
        )?;

        let stablecoin = &mut ctx.accounts.stablecoin_data;
        stablecoin.total_supply = stablecoin.total_supply.checked_sub(amount)
            .ok_or(ErrorCode::CalculationOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    name: String,
    symbol: String,
    decimals: u8,
    icon_url: String,
    target_currency: String
)]
pub struct CreateStablecoin<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = StablecoinData::SIZE
    )]
    pub stablecoin_data: Account<'info, StablecoinData>,

    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority.key(),
    )]
    pub stablecoin_mint: Account<'info, Token22Mint>,

    pub bond_mint: Account<'info, Token22Mint>,

    #[account(
        mut,
        associated_token::mint = bond_mint,
        associated_token::authority = authority
    )]
    pub user_bond_account: Account<'info, Token22Account>,

    #[account(
        mut,
        seeds = [b"bond", bond_mint.key().as_ref()],
        bump
    )]
    pub program_bond_account: Account<'info, Token22Account>,

    pub token_program: Program<'info, Token2022>,
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
    pub stablecoin_mint: Account<'info, Token22Mint>,

    #[account(
        mut,
        constraint = user_token_account.owner == authority.key(),
        constraint = user_token_account.mint == stablecoin_mint.key()
    )]
    pub user_token_account: Account<'info, Token22Account>,

    #[account(
        mut,
        constraint = user_bond_account.owner == authority.key(),
        constraint = user_bond_account.mint == stablecoin_data.bond_mint
    )]
    pub user_bond_account: Account<'info, Token22Account>,

    #[account(mut)]
    pub program_bond_account: Account<'info, Token22Account>,

    #[account(
        constraint = {
            let expected_feed = get_oracle_feed(&stablecoin_data.target_currency)?;
            oracle_feed.key() == expected_feed
        }
    )]
    pub oracle_feed: AccountLoader<'info, AggregatorAccountData>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct RedeemTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub stablecoin_data: Account<'info, StablecoinData>,

    #[account(mut)]
    pub stablecoin_mint: Account<'info, Token22Mint>,

    #[account(mut)]
    pub user_bond_account: Account<'info, Token22Account>,

    #[account(mut)]
    pub program_bond_account: Account<'info, Token22Account>,

    #[account(mut)]
    pub user_token_account: Account<'info, Token22Account>,

    #[account(
        constraint = {
            let expected_feed = get_oracle_feed(&stablecoin_data.target_currency)?;
            oracle_feed.key() == expected_feed
        }
    )]
    pub oracle_feed: AccountLoader<'info, AggregatorAccountData>,

    pub token_program: Program<'info, Token2022>,
}

#[account]
pub struct StablecoinData {
    pub authority: Pubkey,
    pub bond_mint: Pubkey,
    pub total_supply: u64,
    pub decimals: u8,
    pub name: String,
    pub symbol: String,
    pub icon_url: String,
    pub target_currency: String,
}

impl StablecoinData {
    pub const SIZE: usize = 8 +
                           32 +
                           32 +
                           8 +
                           1 +
                           4 + MAX_NAME_LENGTH +
                           4 + MAX_SYMBOL_LENGTH +
                           4 + MAX_ICON_URL_LENGTH +
                           4 + MAX_TARGET_CURRENCY_LENGTH;
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
    #[msg("Invalid icon URL")]
    InvalidIconUrl,
    #[msg("Invalid currency provided")]
    InvalidCurrency,
    #[msg("Invalid oracle data")]
    InvalidOracleData,
    #[msg("Invalid exchange rate")]
    InvalidExchangeRate,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
}
