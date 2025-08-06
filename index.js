
require('dotenv').config();

// Validate required environment variables
if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'your_actual_telegram_bot_token') {
  console.error('❌ BOT_TOKEN is missing or not configured properly in .env file');
  process.exit(1);
}

if (!process.env.HELIUS_RPC || process.env.HELIUS_RPC === 'https://mainnet.helius-rpc.com/?api-key=your_api_key') {
  console.warn('⚠️ HELIUS_RPC is missing or not configured. Using free Solana RPC (may have rate limits)');
}

const { Telegraf } = require('telegraf');
const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} = require('@solana/web3.js');
const fs = require('fs');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);
const connection = new Connection(process.env.HELIUS_RPC || clusterApiUrl('mainnet-beta'), 'confirmed');
const walletFile = './wallets.json';

let TOKEN_MINT = null;

// Ensure wallets file exists
if (!fs.existsSync(walletFile)) {
  fs.writeFileSync(walletFile, JSON.stringify([], null, 2));
}

function loadWallets() {
  try {
    return JSON.parse(fs.readFileSync(walletFile, 'utf8'));
  } catch (error) {
    console.error('Error loading wallets:', error);
    return [];
  }
}

function saveWallets(wallets) {
  try {
    fs.writeFileSync(walletFile, JSON.stringify(wallets, null, 2));
  } catch (error) {
    console.error('Error saving wallets:', error);
  }
}

function isValidSolanaAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Calculate dynamic swap amount based on wallet balance
function calculateSwapAmount(balance) {
  const minBalance = 0.005 * LAMPORTS_PER_SOL; // Keep 0.005 SOL for fees
  const availableBalance = balance - minBalance;
  
  if (availableBalance <= 0) return 0;
  
  // Use 70% of available balance for swap
  return Math.floor(availableBalance * 0.7);
}

// Wait for transaction confirmation
async function confirmTransaction(signature, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }
      return true;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

// Rate limiting for Jupiter API calls
const jupiterRateLimit = {
  lastCall: 0,
  minInterval: 500 // 500ms between calls
};

async function jupiterApiCall(url, options = {}) {
  const now = Date.now();
  const timeSinceLastCall = now - jupiterRateLimit.lastCall;
  
  if (timeSinceLastCall < jupiterRateLimit.minInterval) {
    await new Promise(resolve => setTimeout(resolve, jupiterRateLimit.minInterval - timeSinceLastCall));
  }
  
  jupiterRateLimit.lastCall = Date.now();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

bot.start((ctx) => {
  ctx.reply(`Welcome to the Solana Volume Simulator Bot! 🚀

Available Commands:
/add_token <TOKEN_ADDRESS> - Set target token
/create_wallets - Generate 50 wallets
/fund_all - Get funding instructions
/wallets - View wallet addresses
/balance - Check wallet balances
/simulate - Start volume simulation
/help - Show this message`);
});

bot.command('help', (ctx) => {
  ctx.reply(`📖 Commands:
/add_token <TOKEN_ADDRESS> - Set the target token for simulation
/create_wallets - Generate 50 fresh wallets
/fund_all - Instructions for funding wallets
/wallets - Display all wallet public keys
/balance - Check SOL balance of all wallets
/simulate - Begin volume simulation (requires funded wallets)

⚠️ Make sure to fund wallets before running simulation!`);
});

bot.command('add_token', (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) {
    return ctx.reply('❌ Usage: /add_token <TOKEN_ADDRESS>\nExample: /add_token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }
  
  const tokenAddress = parts[1];
  if (!isValidSolanaAddress(tokenAddress)) {
    return ctx.reply('❌ Invalid Solana address format. Please provide a valid token mint address.');
  }
  
  TOKEN_MINT = tokenAddress;
  ctx.reply(`✅ Token successfully set to: \`${TOKEN_MINT}\``);
});

bot.command('create_wallets', async (ctx) => {
  try {
    ctx.reply('🔄 Generating 50 wallets...');
    
    let wallets = [];
    for (let i = 0; i < 50; i++) {
      const keypair = Keypair.generate();
      wallets.push({
        secretKey: Array.from(keypair.secretKey),
        pubkey: keypair.publicKey.toBase58()
      });
    }
    
    saveWallets(wallets);
    ctx.reply('✅ Successfully created 50 wallets! Use /wallets to view addresses.');
  } catch (error) {
    console.error('Error creating wallets:', error);
    ctx.reply('❌ Error creating wallets. Please try again.');
  }
});

bot.command('fund_all', async (ctx) => {
  const wallets = loadWallets();
  if (wallets.length === 0) {
    return ctx.reply('❌ No wallets found. Use /create_wallets first.');
  }
  
  ctx.reply(`💰 Funding Instructions:

1. Each wallet needs ~0.01-0.02 SOL for transaction fees
2. Add ~0.01 SOL for swap amounts (total ~0.02-0.03 SOL per wallet)
3. Total needed: ~${(0.025 * wallets.length).toFixed(2)} SOL for all ${wallets.length} wallets

Use /wallets to get all addresses, then send SOL from your main wallet.

⚠️ Ensure all wallets are funded before running /simulate`);
});

bot.command('wallets', (ctx) => {
  const wallets = loadWallets();
  if (wallets.length === 0) {
    return ctx.reply('❌ No wallets found. Use /create_wallets first.');
  }
  
  const pubkeys = wallets.map((w, i) => `${i + 1}. ${w.pubkey}`).join('\n');
  ctx.reply(`🔐 Wallet Addresses (${wallets.length} total):\n\n${pubkeys}`);
});

bot.command('balance', async (ctx) => {
  const wallets = loadWallets();
  if (wallets.length === 0) {
    return ctx.reply('❌ No wallets found. Use /create_wallets first.');
  }
  
  ctx.reply('🔄 Checking balances...');
  
  try {
    let totalBalance = 0;
    let fundedWallets = 0;
    
    for (let i = 0; i < Math.min(wallets.length, 10); i++) { // Check first 10 to avoid spam
      const balance = await connection.getBalance(new PublicKey(wallets[i].pubkey));
      const solBalance = balance / LAMPORTS_PER_SOL;
      totalBalance += solBalance;
      if (solBalance > 0.001) fundedWallets++;
    }
    
    ctx.reply(`💰 Balance Summary (first 10 wallets):
Funded wallets: ${fundedWallets}/10
Total SOL: ${totalBalance.toFixed(4)}
Average: ${(totalBalance / 10).toFixed(4)} SOL per wallet

${fundedWallets < 5 ? '⚠️ Consider funding more wallets before simulation' : '✅ Good funding level'}`);
  } catch (error) {
    console.error('Error checking balances:', error);
    ctx.reply('❌ Error checking balances. Please try again.');
  }
});

bot.command('simulate', async (ctx) => {
  if (!TOKEN_MINT) {
    return ctx.reply('❌ No token set. Use /add_token <TOKEN_ADDRESS> first.');
  }
  
  const wallets = loadWallets();
  if (wallets.length === 0) {
    return ctx.reply('❌ No wallets found. Use /create_wallets first.');
  }

  ctx.reply(`🚀 Starting volume simulation for token: ${TOKEN_MINT}\n⏳ Processing ${wallets.length} wallets...`);

  let successCount = 0;
  let errorCount = 0;
  let confirmedCount = 0;

  for (let i = 0; i < wallets.length; i++) {
    try {
      const keypair = Keypair.fromSecretKey(Uint8Array.from(wallets[i].secretKey));
      
      // Check wallet balance first
      const balance = await connection.getBalance(keypair.publicKey);
      if (balance < 10000000) { // Less than 0.01 SOL
        console.log(`Wallet ${i + 1} has insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        errorCount++;
        continue;
      }

      // Calculate dynamic swap amount
      const swapAmount = calculateSwapAmount(balance);
      if (swapAmount <= 0) {
        console.log(`Wallet ${i + 1} has insufficient balance for swap`);
        errorCount++;
        continue;
      }

      // Get quote from Jupiter with dynamic amount
      const quoteData = await jupiterApiCall(
        `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${TOKEN_MINT}&amount=${swapAmount}&slippageBps=300`
      );
      
      if (!quoteData || quoteData.error) {
        console.log(`No valid quote for wallet ${i + 1}:`, quoteData?.error);
        errorCount++;
        continue;
      }

      // Get swap transaction
      const swapData = await jupiterApiCall('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });
      
      if (!swapData.swapTransaction) {
        console.log(`No swap transaction for wallet ${i + 1}`);
        errorCount++;
        continue;
      }

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([keypair]);

      // Send transaction
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      });

      // Wait for confirmation
      try {
        await confirmTransaction(signature);
        confirmedCount++;
        console.log(`✅ Wallet ${i + 1} transaction confirmed: https://solscan.io/tx/${signature}`);
      } catch (confirmError) {
        console.log(`❌ Wallet ${i + 1} transaction failed: ${confirmError.message}`);
        errorCount++;
        // Remove 'continue' - let it count as success but not confirmed
      }

      successCount++;
      
      if (i % 5 === 0 || i === wallets.length - 1) {
        ctx.reply(`📊 Progress: ${i + 1}/${wallets.length} | ✅ Success: ${successCount} | ❌ Errors: ${errorCount} | 🔍 Confirmed: ${confirmedCount}`);
      }
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      
    } catch (error) {
      console.error(`Error with wallet ${i + 1}:`, error.message);
      errorCount++;
    }
  }

  ctx.reply(`🎉 Volume simulation completed!

📈 Results:
✅ Successful swaps: ${successCount}
🔍 Confirmed transactions: ${confirmedCount}
❌ Failed attempts: ${errorCount}
📊 Success rate: ${((successCount / wallets.length) * 100).toFixed(1)}%

${successCount > 0 ? `🔗 Check transactions on Solscan` : '⚠️ Consider checking wallet funding and token liquidity'}`);
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again.');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('🤖 Solana Volume Bot starting...');
bot.launch().then(() => {
  console.log('✅ Bot is running!');
});
