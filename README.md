
# Solana Volume Bundler Bot

A Telegram bot for simulating volume on Solana tokens using Jupiter DEX aggregator. This bot creates multiple wallets, funds them, and executes swaps to generate trading volume.

## 🚀 Recent Updates (v2.0)

### Critical Fixes Implemented:
- ✅ **Updated to Web3.js v2.0+** - Latest Solana SDK with improved performance
- ✅ **Enhanced Transaction Confirmation** - Better error handling and retry logic
- ✅ **Parallel Processing** - Process wallets in batches for improved speed
- ✅ **Increased SOL Reserves** - 0.025 SOL minimum balance (up from 0.015)
- ✅ **Adaptive Rate Limiting** - Smart backoff for Jupiter API calls
- ✅ **Enhanced Error Handling** - Better categorization and user feedback
- ✅ **Security Improvements** - Proper .gitignore and environment protection

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- Telegram Bot Token (from @BotFather)
- Helius RPC endpoint (recommended) or Solana RPC
- SOL for funding wallets

## 🔧 Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd solana_volume_bundler
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
BOT_TOKEN=your_telegram_bot_token_here
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=your_api_key_here
```

**⚠️ SECURITY WARNING:** Never commit your `.env` file to version control!

### 3. Start the Bot
```bash
npm start
```

## 🤖 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and command list |
| `/help` | Show available commands |
| `/add_token <ADDRESS>` | Set target token for simulation |
| `/create_wallets` | Generate 50 new wallets |
| `/fund_all` | Get funding instructions |
| `/wallets` | Display all wallet addresses |
| `/balance` | Check wallet balances |
| `/simulate` | Start volume simulation |

## 💰 Funding Requirements

### Per Wallet:
- **Minimum Balance**: 0.025 SOL (increased for better success rate)
- **Recommended**: 0.05 SOL per wallet
- **Swap Amount**: 50% of available balance after fees

### Total for 50 Wallets:
- **Minimum**: ~1.25 SOL
- **Recommended**: ~2.5 SOL

## 🔒 Security Features

- ✅ Environment variables protection
- ✅ Wallet private keys stored locally only
- ✅ Rate limiting to prevent API abuse
- ✅ Transaction validation and confirmation
- ✅ Error handling and logging

## ⚡ Performance Improvements

### Parallel Processing
- Processes wallets in batches of 5
- Reduces total execution time significantly
- Maintains rate limit compliance

### Enhanced Rate Limiting
- Adaptive intervals based on API response
- Exponential backoff for rate limit hits
- Smart retry logic with increasing delays

### Transaction Optimization
- Dynamic priority fee calculation
- Increased confirmation timeout (45 retries)
- Better error categorization and handling

## 🛠️ Technical Details

### Dependencies
- `@solana/web3.js`: ^2.0.0 (latest)
- `telegraf`: ^4.16.2
- `node-fetch`: ^2.7.0
- `dotenv`: ^16.4.5

### Key Features
- **Web3.js v2 Compatibility**: Latest Solana SDK
- **Jupiter DEX Integration**: Best swap routes
- **Multi-wallet Management**: 50 wallet support
- **Real-time Monitoring**: Telegram progress updates
- **Error Recovery**: Automatic retry mechanisms

## 📊 Success Rate Optimization

### Recent Improvements:
1. **Increased SOL Reserves**: 0.025 SOL minimum (prevents insufficient funds)
2. **Conservative Swap Amounts**: 50% of available balance
3. **Dynamic Priority Fees**: 80th percentile of recent fees
4. **Enhanced Confirmation**: 45 retry attempts with exponential backoff
5. **Parallel Processing**: 5 wallets per batch for speed

### Expected Success Rate: 85-95% (depending on network conditions)

## 🚨 Important Notes

### Before Running Simulation:
1. ✅ Set target token with `/add_token`
2. ✅ Create wallets with `/create_wallets`
3. ✅ Fund all wallets (check with `/balance`)
4. ✅ Ensure sufficient SOL reserves

### Network Considerations:
- **Mainnet**: Use Helius RPC for best performance
- **Rate Limits**: Jupiter API has strict limits
- **Priority Fees**: Dynamic calculation based on network congestion
- **Confirmation Times**: 30-90 seconds per transaction

## 🔧 Troubleshooting

### Common Issues:
1. **Insufficient Balance**: Increase funding per wallet
2. **Rate Limit Errors**: Bot automatically handles with backoff
3. **Transaction Failures**: Check token liquidity and network congestion
4. **Timeout Errors**: Increase confirmation timeout if needed

### Debug Commands:
- `/balance` - Check wallet funding status
- Monitor console logs for detailed error information

## 📈 Usage Example

```bash
# 1. Start bot
npm start

# 2. In Telegram:
/add_token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
/create_wallets
/fund_all
# Send SOL to all wallet addresses
/balance
/simulate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational purposes. Use responsibly and in compliance with applicable laws and regulations.

---

**⚠️ Disclaimer**: This bot is for educational purposes. Users are responsible for compliance with applicable laws and regulations. Use at your own risk.
