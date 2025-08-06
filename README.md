
# Solana Volume Bundler Bot

A Telegram bot for simulating volume on Solana tokens using Jupiter aggregator. This bot creates multiple wallets, funds them, and executes swaps to generate trading volume.

## 🚀 Recent Updates & Critical Fixes

### ✅ Fixed Issues
- **Corrupted .env file** - Recreated with proper encoding
- **Outdated Solana Web3.js** - Updated to v1.95.0
- **Transaction confirmation** - Now uses `getSignatureStatus` instead of deprecated method
- **Rate limiting** - Enhanced with 2-second intervals and retry logic
- **Error handling** - Added comprehensive error handling for Jupiter API calls
- **Balance calculation** - Increased fee reserves to 0.015 SOL
- **Input validation** - Added token validation before simulation
- **Dynamic priority fees** - Automatic fee calculation based on network conditions
- **Memory management** - Improved wallet handling and cleanup

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- Telegram Bot Token (from @BotFather)
- Helius RPC API Key (optional, but recommended)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solana_volume_bundler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Edit .env file with your credentials
   BOT_TOKEN=your_actual_telegram_bot_token
   HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_api_key
   ```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Your Telegram bot token from @BotFather | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `HELIUS_RPC` | Helius RPC endpoint (optional) | `https://mainnet.helius-rpc.com/?api-key=your_key` |

### Getting Your Bot Token

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow the instructions to create your bot
4. Copy the token provided

### Getting Helius RPC (Recommended)

1. Visit [Helius.xyz](https://helius.xyz)
2. Sign up for a free account
3. Create a new API key
4. Use the mainnet RPC URL

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize the bot |
| `/help` | Show available commands |
| `/add_token <ADDRESS>` | Set target token for simulation |
| `/create_wallets` | Generate 50 new wallets |
| `/fund_all` | Get funding instructions |
| `/wallets` | View all wallet addresses |
| `/balance` | Check wallet balances |
| `/simulate` | Start volume simulation |

## 📊 Usage Workflow

1. **Set up your bot** with proper credentials
2. **Add target token** using `/add_token <TOKEN_ADDRESS>`
3. **Create wallets** with `/create_wallets`
4. **Fund wallets** - Get addresses with `/wallets` and send SOL
5. **Check balances** with `/balance` to ensure proper funding
6. **Start simulation** with `/simulate`

## 💰 Funding Requirements

- **Per wallet**: 0.03-0.04 SOL
- **50 wallets**: ~1.5-2.0 SOL total
- **Breakdown**:
  - 0.015 SOL reserved for fees
  - 0.01 SOL for swap amounts
  - 0.005-0.015 SOL buffer

## 🔧 Technical Features

### Enhanced Error Handling
- Rate limit detection and backoff
- Transaction failure recovery
- Network error retry logic
- Comprehensive logging

### Dynamic Fee Management
- Automatic priority fee calculation
- Network congestion adaptation
- Minimum fee guarantees

### Security Improvements
- Input validation for all addresses
- Token liquidity verification
- Balance threshold checks
- Memory cleanup for sensitive data

### Performance Optimizations
- Intelligent rate limiting
- Dynamic delays based on network conditions
- Efficient transaction confirmation
- Progress tracking and reporting

## ⚠️ Important Notes

### Rate Limits
- Jupiter API: 2-second intervals between calls
- Automatic retry on rate limit hits
- Dynamic backoff for network congestion

### Network Requirements
- Minimum 0.02 SOL per wallet for successful transactions
- Recommended 0.03-0.04 SOL for optimal performance
- Higher balances improve success rates

### Token Requirements
- Token must exist on-chain
- Sufficient liquidity required
- Valid mint address format

## 🚨 Troubleshooting

### Common Issues

**"BOT_TOKEN is missing"**
- Ensure `.env` file exists and has correct format
- Check for extra spaces or special characters

**"Rate limit exceeded"**
- Bot automatically handles this with retry logic
- Wait for automatic recovery

**"Insufficient balance"**
- Fund wallets with more SOL (0.03-0.04 per wallet)
- Check `/balance` command for current status

**"Token validation failed"**
- Verify token address is correct
- Ensure token has sufficient liquidity
- Check if token exists on mainnet

### Performance Tips

1. **Use Helius RPC** for better reliability
2. **Fund wallets adequately** (0.03-0.04 SOL each)
3. **Choose liquid tokens** for better success rates
4. **Monitor progress** during simulation
5. **Check transaction status** on Solscan

## 📈 Monitoring

The bot provides real-time progress updates:
- Success/failure counts
- Confirmed transaction tracking
- Rate limit monitoring
- Detailed error reporting

## 🔒 Security

- Private keys are stored locally only
- No sensitive data transmitted
- Input validation on all addresses
- Memory cleanup after operations

## 📝 License

This project is for educational purposes. Use responsibly and in compliance with applicable laws and regulations.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify your configuration
3. Review the error logs
4. Ensure proper funding

---

**⚠️ Disclaimer**: This tool is for educational purposes. Users are responsible for compliance with applicable laws and regulations. Use at your own risk.
