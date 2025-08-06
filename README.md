
# Solana Volume Bundler Bot

This Telegram bot lets you simulate buy/sell volume on Solana tokens using 50 programmatically generated wallets.

## Features
- Set a target token address
- Create 50 wallets
- Simulate buy volume via Jupiter swaps
- Fund wallets externally
- Track wallet public keys
- Real-time transaction confirmation tracking

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root with:

```env
BOT_TOKEN=your_actual_telegram_bot_token
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_api_key
```

**Required:**
- `BOT_TOKEN`: Your Telegram bot token from @BotFather
- `HELIUS_RPC`: Helius RPC URL (recommended) or any Solana RPC endpoint

### 3. Get Your Bot Token
1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Copy the token and add it to your `.env` file

### 4. Get Helius RPC (Recommended)
1. Sign up at [helius.xyz](https://helius.xyz)
2. Get your API key
3. Use the mainnet RPC URL in your `.env` file

### 5. Start the Bot
```bash
npm start
```

## Usage

1. **Start the bot**: Send `/start` to your bot
2. **Set token**: Use `/settoken <token_address>` to set target token
3. **Create wallets**: Use `/createwallets` to generate 50 wallets
4. **Fund wallets**: Send SOL to the generated wallet addresses
5. **Start simulation**: Use `/startvolume` to begin volume simulation

## Recent Fixes Applied

### ✅ Fixed .env File Corruption
- Recreated `.env` file with proper encoding
- Added environment variable validation
- Bot now exits gracefully if BOT_TOKEN is missing

### ✅ Added Helius RPC Support
- Proper fallback to free Solana RPC if Helius not configured
- Warning message when using free RPC (rate limited)

### ✅ Fixed Transaction Confirmation Logic
- Removed problematic `continue` statement in confirmation loop
- Fixed mismatch between `successCount` and `confirmedCount`
- Transactions now properly tracked as sent vs confirmed

## Troubleshooting

### Bot Won't Start
- Check that `.env` file exists and has proper BOT_TOKEN
- Ensure no extra spaces or encoding issues in `.env`

### Transactions Failing
- Verify Helius RPC is configured (free RPC has rate limits)
- Check wallet balances (minimum 0.01 SOL required)
- Ensure target token has sufficient liquidity

### Rate Limiting
- Bot includes automatic delays between transactions
- Consider upgrading to Helius RPC for better performance

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- The bot generates wallets locally - private keys are stored in `wallets.json`
- Consider using a dedicated wallet for funding operations
