
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
  clusterApiUrl,
  Commitment
} = require('@solana/web3.js');
const fs = require('fs');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);
const connection = new Connection(process.env.HELIUS_RPC || clusterApiUrl('mainnet-beta'), {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});
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

// Enhanced balance calculation with increased SOL reserves
function calculateSwapAmount(balance) {
  // Increased reserve to 0.025 SOL for fees in current network conditions
  const minBalance = 0.025 * LAMPORTS_PER_SOL; // Increased from 0.015 to 0.025 SOL
  const availableBalance = balance - minBalance;
  
  if (availableBalance <= 0) return 0;
  
  // Use 50% of available balance for swap (reduced from 60% for more conservative approach)
  return Math.floor(availableBalance * 0.5);
}

// Enhanced transaction confirmation with Web3.js v2 compatibility
async function confirmTransaction(signature, maxRetries = 45) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Use getSignatureStatus with proper error handling
      const status = await connection.getSignatureStatus(signature);
      
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        if (status.value.err) {
          throw new Error('Transaction failed on-chain');
        }
        return true;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(1.5, i), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

// Enhanced rate limiting with adaptive intervals
const jupiterRateLimit = {
  lastCall: 0,
  minInterval: 3000, // Increased to 3 seconds between calls
  retryCount: 0,
  maxRetries: 5,
  consecutiveFailures: 0
};

async function jupiterApiCall(url, options = {}) {
  const now = Date.now();
  const timeSinceLastCall = now - jupiterRateLimit.lastCall;
  
  if (timeSinceLastCall < jupiterRateLimit.minInterval) {
    await new Promise(resolve => setTimeout(resolve, jupiterRateLimit.minInterval - timeSinceLastCall));
  }
  
  jupiterRateLimit.lastCall = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SolanaVolumeBot/1.0',
        ...options.headers
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status === 429) {
      // Rate limit hit - implement exponential backoff
      const backoffTime = Math.min(5000 * Math.pow(2, jupiterRateLimit.consecutiveFailures), 30000);
      console.log(`Rate limit hit, waiting ${backoffTime/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      jupiterRateLimit.consecutiveFailures++;
      jupiterRateLimit.minInterval = Math.min(jupiterRateLimit.minInterval * 1.5, 15000);
      throw new Error('Rate limit exceeded');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jupiter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Reset rate limit on success
    jupiterRateLimit.consecutiveFailures = 0;
    jupiterRateLimit.minInterval = Math.max(3000, jupiterRateLimit.minInterval * 0.9);
    jupiterRateLimit.retryCount = 0;
    
    return data;
  } catch (error) {
    if (jupiterRateLimit.retryCount < jupiterRateLimit.maxRetries) {
      jupiterRateLimit.retryCount++;
      console.log(`Retrying Jupiter API call (${jupiterRateLimit.retryCount}/${jupiterRateLimit.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * jupiterRateLimit.retryCount));
      return jupiterApiCall(url, options);
    }
    throw error;
  }
}

// Validate token before starting simulation
async function validateToken(tokenMint) {
  try {
    const tokenPubkey = new PublicKey(tokenMint);
    
    // Check if token exists and has some basic info
    const tokenInfo = await connection.getAccountInfo(tokenPubkey);
    if (!tokenInfo) {
      throw new Error('Token does not exist on-chain');
    }
    
    // Try to get a quote to check liquidity
    const testQuote = await jupiterApiCall(
      `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenMint}&amount=${LAMPORTS_PER_SOL}&slippageBps=300`
    );
    
    if (testQuote.error) {
      throw new Error(`Token has insufficient liquidity: ${testQuote.error}`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}

// Enhanced dynamic priority fee calculation
async function getDynamicPriorityFee() {
  try {
    // Get recent priority fees from the network
    const recentPriorities = await connection.getRecentPrioritizationFees([
      new PublicKey('So11111111111111111111111111111111111111112') // SOL mint
    ]);
    
    if (recentPriorities.length > 0) {
      // Use 80th percentile of recent fees for better success rate
      const sortedFees = recentPriorities.map(fee => fee.prioritizationFee).sort((a, b) => a - b);
      const percentileIndex = Math.floor(sortedFees.length * 0.8);
      return Math.max(sortedFees[percentileIndex] || 10000, 10000); // Minimum 10,000 lamports
    }
  } catch (error) {
    console.log('Could not get dynamic priority fee, using default');
  }
  
  return 15000; // Increased default to 15,000 lamports
}

// Parallel processing with batch limits
async function processWalletBatch(wallets, startIndex, batchSize, tokenMint, priorityFee, ctx) {
  const batchResults = {
    successCount: 0,
    errorCount: 0,
    confirmedCount: 0,
    rateLimitCount: 0
  };
  
  const batch = wallets.slice(startIndex, startIndex + batchSize);
  const promises = batch.map(async (wallet, batchIndex) => {
    const walletIndex = startIndex + batchIndex;
    
    try {
      const keypair = Keypair.fromSecretKey(Uint8Array.from(wallet.secretKey));
      
      // Enhanced wallet balance validation
      const balance = await connection.getBalance(keypair.publicKey);
      if (balance < 25000000) { // Less than 0.025 SOL (increased threshold)
        console.log(`Wallet ${walletIndex + 1} has insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        batchResults.errorCount++;
        return;
      }

      // Calculate dynamic swap amount
      const swapAmount = calculateSwapAmount(balance);
      if (swapAmount <= 0) {
        console.log(`Wallet ${walletIndex + 1} has insufficient balance for swap`);
        batchResults.errorCount++;
        return;
      }

      // Get quote from Jupiter with enhanced error handling
      let quoteData;
      try {
        quoteData = await jupiterApiCall(
          `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenMint}&amount=${swapAmount}&slippageBps=300`
        );
      } catch (quoteError) {
        if (quoteError.message.includes('Rate limit')) {
          batchResults.rateLimitCount++;
          console.log(`Rate limit hit for wallet ${walletIndex + 1}, skipping...`);
        } else {
          console.log(`Quote error for wallet ${walletIndex + 1}: ${quoteError.message}`);
        }
        batchResults.errorCount++;
        return;
      }
      
      if (!quoteData || quoteData.error) {
        console.log(`No valid quote for wallet ${walletIndex + 1}:`, quoteData?.error);
        batchResults.errorCount++;
        return;
      }

      // Get swap transaction with enhanced error handling
      let swapData;
      try {
        swapData = await jupiterApiCall('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: keypair.publicKey.toBase58(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: priorityFee
          })
        });
      } catch (swapError) {
        console.log(`Swap transaction error for wallet ${walletIndex + 1}: ${swapError.message}`);
        batchResults.errorCount++;
        return;
      }
      
      if (!swapData.swapTransaction) {
        console.log(`No swap transaction for wallet ${walletIndex + 1}`);
        batchResults.errorCount++;
        return;
      }

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([keypair]);

      // Send transaction with enhanced options
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      });

      // Wait for confirmation with enhanced error handling
      try {
        await confirmTransaction(signature);
        batchResults.confirmedCount++;
        console.log(`✅ Wallet ${walletIndex + 1} transaction confirmed: https://solscan.io/tx/${signature}`);
      } catch (confirmError) {
        console.log(`❌ Wallet ${walletIndex + 1} transaction failed: ${confirmError.message}`);
        batchResults.errorCount++;
        return;
      }

      batchResults.successCount++;
      
    } catch (error) {
      console.error(`Error with wallet ${walletIndex + 1}:`, error.message);
      batchResults.errorCount++;
    }
  });
  
  await Promise.all(promises);
  return batchResults;
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

bot.command('add_token', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) {
    return ctx.reply('❌ Usage: /add_token <TOKEN_ADDRESS>\nExample: /add_token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }
  
  const tokenAddress = parts[1];
  if (!isValidSolanaAddress(tokenAddress)) {
    return ctx.reply('❌ Invalid Solana address format. Please provide a valid token mint address.');
  }
  
  try {
    ctx.reply('🔄 Validating token...');
    await validateToken(tokenAddress);
    TOKEN_MINT = tokenAddress;
    ctx.reply(`✅ Token successfully validated and set to: \`${TOKEN_MINT}\``);
  } catch (error) {
    ctx.reply(`❌ Token validation failed: ${error.message}`);
  }
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

1. Each wallet needs ~0.03-0.04 SOL for transaction fees and swaps
2. Add ~0.015 SOL for swap amounts (total ~0.045-0.055 SOL per wallet)
3. Total needed: ~${(0.05 * wallets.length).toFixed(2)} SOL for all ${wallets.length} wallets

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
      if (solBalance > 0.025) fundedWallets++; // Increased threshold
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

  ctx.reply(`🚀 Starting volume simulation for token: ${TOKEN_MINT}\n⏳ Processing ${wallets.length} wallets with parallel processing...`);

  let totalSuccessCount = 0;
  let totalErrorCount = 0;
  let totalConfirmedCount = 0;
  let totalRateLimitCount = 0;

  // Get dynamic priority fee
  const priorityFee = await getDynamicPriorityFee();

  // Process wallets in batches of 5 for parallel processing
  const batchSize = 5;
  const totalBatches = Math.ceil(wallets.length / batchSize);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * batchSize;
    
    try {
      const batchResults = await processWalletBatch(
        wallets, 
        startIndex, 
        batchSize, 
        TOKEN_MINT, 
        priorityFee, 
        ctx
      );
      
      totalSuccessCount += batchResults.successCount;
      totalErrorCount += batchResults.errorCount;
      totalConfirmedCount += batchResults.confirmedCount;
      totalRateLimitCount += batchResults.rateLimitCount;
      
      // Progress update every batch
      ctx.reply(`📊 Batch ${batchIndex + 1}/${totalBatches} completed:
✅ Success: ${batchResults.successCount} | ❌ Errors: ${batchResults.errorCount} | 🔍 Confirmed: ${batchResults.confirmedCount} | ⚡ Rate Limits: ${batchResults.rateLimitCount}

📈 Total Progress: ${Math.min(startIndex + batchSize, wallets.length)}/${wallets.length} wallets processed`);
      
      // Add delay between batches to avoid overwhelming the network
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`Error processing batch ${batchIndex + 1}:`, error);
      totalErrorCount += batchSize;
    }
  }

  ctx.reply(`🎉 Volume simulation completed!

📈 Results:
✅ Successful swaps: ${totalSuccessCount}
🔍 Confirmed transactions: ${totalConfirmedCount}
❌ Failed attempts: ${totalErrorCount}
⚡ Rate limit hits: ${totalRateLimitCount}
📊 Success rate: ${((totalSuccessCount / wallets.length) * 100).toFixed(1)}%

${totalSuccessCount > 0 ? `🔗 Check transactions on Solscan` : '⚠️ Consider checking wallet funding and token liquidity'}`);
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
