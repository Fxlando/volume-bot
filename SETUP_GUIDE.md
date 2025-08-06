# Solana Volume Bundler - Setup Guide

## ✅ CRITICAL ISSUE RESOLVED

The corrupted `.env` file has been fixed! The file was encoded in UTF-16 with a BOM, which was causing Node.js to fail when reading it. The file has been recreated with proper UTF-8 encoding.

## 🔧 Current Status

### ✅ Fixed Issues:
1. **Corrupted .env file** - Recreated with proper UTF-8 encoding
2. **File encoding issues** - Resolved UTF-16 BOM problem

### ⚠️ Remaining Issues to Address:

#### 1. Missing Telegram Bot Token
- **Current**: `BOT_TOKEN=your_actual_telegram_bot_token`
- **Required**: Actual bot token from @BotFather on Telegram
- **Impact**: Application will exit immediately without real token

#### 2. Missing Helius RPC Key  
- **Current**: `HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_api_key`
- **Required**: Real Helius API key (optional but recommended)
- **Impact**: Will fallback to free Solana RPC (rate limited)

#### 3. Empty Wallets File
- **Current**: `wallets.json` contains only `[]`
- **Required**: Wallets need to be created using `/create_wallets` command
- **Impact**: Bot will work but no wallets exist yet

## 🚀 How to Complete Setup

### Step 1: Get Telegram Bot Token
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Replace `your_actual_telegram_bot_token` in `.env` file

### Step 2: Get Helius API Key (Optional but Recommended)
1. Go to https://www.helius.dev/
2. Sign up for free account
3. Get your API key
4. Replace `your_api_key` in the HELIUS_RPC URL in `.env` file

### Step 3: Update .env File
Replace the placeholder values in `.env`:

```env
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_actual_helius_key
```

### Step 4: Create Wallets
1. Start the bot: `node index.js`
2. In Telegram, send `/create_wallets` to your bot
3. The bot will create new wallets and save them

### Step 5: Fund Wallets
1. Get the wallet addresses from the bot response
2. Send some SOL to each wallet (recommend 0.1 SOL each)
3. Wait for transactions to confirm

### Step 6: Test the Bot
1. Send `/start` to see available commands
2. Use `/simulate_volume` to test the volume bundling
3. Monitor the bot's activity

## 📋 Available Commands

- `/start` - Show welcome message and available commands
- `/create_wallets` - Generate new Solana wallets
- `/list_wallets` - Show all wallet addresses and balances
- `/simulate_volume` - Run volume bundling simulation
- `/help` - Show detailed help information

## 🔍 Troubleshooting

### If bot still won't start:
1. Check `.env` file encoding (should be UTF-8, no BOM)
2. Verify bot token is correct
3. Ensure all dependencies are installed: `npm install`

### If transactions fail:
1. Check wallet balances have enough SOL
2. Verify Helius RPC is working
3. Check network congestion

## 📁 File Structure
```
solana_volume_bundler/
├── .env                    ✅ Fixed (UTF-8 encoding)
├── index.js               ✅ Main application
├── package.json           ✅ Dependencies
├── wallets.json           ⚠️ Empty (needs wallets)
└── README.md             ✅ Documentation
```

## 🎯 Next Steps
1. Get real Telegram bot token
2. Optionally get Helius API key
3. Update `.env` with real values
4. Start bot and create wallets
5. Fund wallets and test functionality

The critical encoding issue has been resolved! The project should now start properly once you add real tokens to the `.env` file. 