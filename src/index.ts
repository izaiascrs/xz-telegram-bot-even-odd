import "dotenv/config";
import { TradeService } from "./database/trade-service";
import { initDatabase } from "./database/schema";
import { ContractStatus, TicksStreamResponse } from "@deriv/api-types";
import { TelegramManager } from "./telegram";
import apiManager from "./ws";
import { DERIV_TOKEN } from "./utils/constants";
import { RiskManager, TRiskManagerConfig } from "./risk-management";
import { getBackTestAllDigits } from "./backtest";
import { schedule } from "node-cron";
import { VirtualEntryManager } from "./virtual-entry";
import { MoneyManager } from "./money-management/moneyManager";

type TSymbol = (typeof symbols)[number];
type TContractType = (typeof contractTypes)[number];

const symbols = ["R_10", "R_25", "R_50", "R_75", "R_100"] as const;
const contractTypes = ["DIGITODD", "DIGITEVEN"] as const;
let currentContractType: TContractType | undefined = undefined;

const CONTRACT_SECONDS = 2;
let CONTRACT_TICKS = 10;
let backTestLoaded = false;

let lastResult: "W" | "L" | null = null;
let invertTrade = false;

const tradeConfig = {
  entryDigit: 0,
  ticksCount: 0, 
}

let isAuthorized = false;
let isTrading = false;
let waitingVirtualLoss = false;
let tickCount = 0;
let consecutiveWins = 0;
let lastContractId: number | undefined = undefined;
let lastContractIntervalId: NodeJS.Timeout | null = null;

let subscriptions: {
  ticks?: any;
  contracts?: any;
} = {};

// Adicionar um array para controlar todas as subscrições ativas
let activeSubscriptions: any[] = [];

const config: TRiskManagerConfig = {
  profit: 5, // amount to risk on all trades
  payout: 1.9, // payout
  entry: 10, // 10 trades
  performance: 4, // 4 wins 
}
const balance = 100; // initial balance

export const riskManager = new RiskManager(config, {
  balance,
  stopWin: 1.5,
  stopLoss: 10,
});

const virtualEntryManager = new VirtualEntryManager({
  entryDigit: 0,
  ticksCount: 0,
  expectedType: "DIGITODD"
});

const moneyManager = new MoneyManager({
  type: "martingale",
  initialBalance: 100,
  initialStake: 0.35,
  profitPercent: 91,
  winsBeforeMartingale: 0,
  targetProfit: 2,
}, 100);


// Inicializar o banco de dados
const database = initDatabase();
const tradeService = new TradeService(database);
const telegramManager = new TelegramManager(tradeService);

const getNextSymbol = (): (() => TSymbol) => {
  let startIndex = 0;
  return () => {
    const symbol = symbols[startIndex];
    startIndex++;
    if(startIndex >= symbols.length) startIndex = 0;
    return symbol;
  }
}
const nextSymbol = getNextSymbol();

const getRandomContractType = () => {
  const randomIndex = Math.floor(Math.random() * contractTypes.length);
  return contractTypes[randomIndex];
}

riskManager.setOnSessionEnded((profit, balance) => {
  const message = 
    `🎯 Rodada finalizada!\n` +
    `💰 Lucro: $${profit.toFixed(2)}\n` +
    `💵 Saldo: $${balance.toFixed(2)}\n` +
    `✨ Iniciando nova rodada...`;

  setTimeout(() => {
    telegramManager.sendMessage(message);  
    riskManager.resetStatistics();  
    backTestLoaded = false;
    currentContractType = undefined;    
    getNextSymbolAndInitialize();

    // reset last result and invert trade for next session
    lastResult = null;
    invertTrade = false;
  }, 500);
    
});

moneyManager.setOnTargetReached((profit, balance) => {  
  const message = 
    `🎯 Sessão finalizada!\n` +
    `💰 Lucro: $${profit.toFixed(2)}\n` +
    `💵 Saldo: $${balance.toFixed(2)}\n` +
    `✨ Nova sessão será iniciada em breve...`;

  setTimeout(async () => {
    telegramManager.sendMessage(message);
    await stopBot();
    telegramManager.setBotRunning(false);
  }, 1000);
});


const task = schedule('0 */1 * * *', async () => {
  if (!telegramManager.isRunningBot()) {
    await startBot();
    telegramManager.setBotRunning(true);
  }
}, {
  scheduled: false,
  timezone: "America/Sao_Paulo"
});

const ticksMap = new Map<TSymbol, number[]>([]);

function createTradeTimeout() {
  lastContractIntervalId = setInterval(() => {
    if(lastContractId) {
      getLastTradeResult(lastContractId);
    }
  }, ((CONTRACT_TICKS * CONTRACT_SECONDS) * 1000) * 2);
}

function clearTradeTimeout() {
  if(lastContractIntervalId) {
    clearInterval(lastContractIntervalId);
    lastContractIntervalId = null;
  }
}

function handleTradeResult({
  profit,
  stake,
  status
}: {
  profit: number;
  stake: number;
  status: ContractStatus;
}) {

  if(status === "open") return;
  updateActivityTimestamp();
  const isWin = status === "won";
  
  // Calcular novo saldo baseado no resultado
  const currentBalance = riskManager.getBalance();
  let newBalance = currentBalance;

  isTrading = false;
  tickCount = 0;
  lastContractId = undefined;
  waitingVirtualLoss = false;
  
  if (isWin) {
    newBalance = currentBalance + profit;
    consecutiveWins++;
  } else {
    newBalance = currentBalance - stake;
    consecutiveWins = 0;
  }
  
  moneyManager.updateLastTrade(isWin);

  riskManager.updateLastResult(isWin ? "W" : "L");
  telegramManager.updateTradeResult(isWin, moneyManager.getCurrentBalance());

  const resultMessage = isWin ? "✅ Trade ganho!" : "❌ Trade perdido!";
  telegramManager.sendMessage(
    `${resultMessage}\n` +
    `💰 ${isWin ? 'Lucro' : 'Prejuízo'}: $${isWin ? profit : stake}\n` +
    `💵 Saldo: $${moneyManager.getCurrentBalance().toFixed(2)}`
  );  

  // Salvar trade no banco
  tradeService.saveTrade({
    isWin,
    stake,
    profit: isWin ? profit : -stake,
    balanceAfter: newBalance
  }).catch(err => console.error('Erro ao salvar trade:', err));

  clearTradeTimeout();

  // Invert trade if last result is not null and invertTrade is true
  if(invertTrade === true && lastResult !== null) {
    invertTrade = false;
  }

  // Invert trade if last result is null and invertTrade is false and isWin is false
  // we only try to invert trade once per session
  // if(isWin === false) {
  //   if(invertTrade === false && lastResult === null)  {
  //     invertTrade = true;
  //     lastResult = "L";
  //   }
  // }

  virtualEntryManager.reset();
  virtualEntryManager.onRealEntryResult(isWin ? "W" : "L");


}

async function getLastTradeResult(contractId: number | undefined) {
  if(!contractId) return;

  try {
    const data = await apiManager.augmentedSend('proposal_open_contract', { contract_id: contractId })
    const contract = data.proposal_open_contract;
    const profit = contract?.profit ?? 0;
    const stake = contract?.buy_price ?? 0;
    const status = contract?.status;
    handleTradeResult({
      profit,
      stake,
      status: status ?? "open"
    });    
  } catch (error) {
    console.error('Erro ao obter resultado do trade:', error);
    clearTradeTimeout();
    isTrading = false;
  }
}

const checkStakeAndBalance = (stake: number) => {
  const hasSufficientBalance = riskManager.hasSufficientBalance();  
  if (stake < 0.35 || !hasSufficientBalance) {
    telegramManager.sendMessage(
      "🚨 *ALERTA CRÍTICO*\n\n" +
        "❌ Bot finalizado automaticamente!\n" +
        "💰 Saldo ou stake chegou a zero\n" +
        `💵 stake: $${stake}\n` +
        `💵 Saldo final: $${riskManager.getBalance().toFixed(2)}`
    );
    stopBot();
    telegramManager.setBotRunning(false);
    return false;
  }
  return true;
};

async function initializeSymbol(symbol: TSymbol) {
  await clearTicksAndContractSubscriptions();
  const contractType = getRandomContractType();
  await runBackTestForSymbol(symbol, contractType);
  subscriptions.ticks = subscribeToTicks(symbol);
  subscriptions.contracts = subscribeToOpenOrders();
  currentContractType = contractType;

  const message = 
  `🚦 Inicializando símbolo: ${symbol.replace("_", " ")}\n` +
  `📄 Tipo de contrato: ${contractType === "DIGITODD" ? "Ímpar" : "Par"}\n` +
  `🔢 Dígito de entrada: ${tradeConfig.entryDigit}\n` +
  `⏱️ Ticks: ${tradeConfig.ticksCount}`;
  telegramManager.sendMessage(message);
}

function getNextSymbolAndInitialize() {
  const nextSym = nextSymbol();
  initializeSymbol(nextSym);
}

const clearSubscriptions = async () => {
  try {
    // Limpar todas as subscrições ativas
    for (const subscription of activeSubscriptions) {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error("Erro ao limpar subscrição:", error);
        }
      }
    }
    
    // Limpar array de subscrições
    activeSubscriptions = [];
    
    // Limpar objeto de subscrições
    subscriptions = {};

    // Resetar todos os estados
    isTrading = false;
    waitingVirtualLoss = false;
    isAuthorized = false;
    tickCount = 0;
    lastContractId = undefined;
    clearTradeTimeout();
    ticksMap.clear();
    
  } catch (error) {
    console.error("Erro ao limpar subscrições:", error);
  }
};

const clearTicksAndContractSubscriptions = async () => {
  try {
    for (const subscription of activeSubscriptions) {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error("Erro ao limpar subscrição:", error);
        }
      }
    }
    activeSubscriptions = [];
    subscriptions = {};
    tickCount = 0;
    ticksMap.clear();
  } catch (error) {
    console.error("Erro ao limpar subscrições:", error);
  }
}

const startBot = async () => {
  updateActivityTimestamp(); // Atualizar timestamp ao iniciar o bot
  await clearSubscriptions();
  
  try {
    if (!isAuthorized) await authorize();
    await initializeSymbol(nextSymbol());

    if (!subscriptions.ticks || !subscriptions.contracts) {
      throw new Error("Falha ao criar subscrições");
    }

    telegramManager.sendMessage("🤖 Bot iniciado e conectado aos serviços Deriv");
  } catch (error) {
    console.error("Erro ao iniciar bot:", error);
    telegramManager.sendMessage("❌ Erro ao iniciar o bot. Tentando parar e limpar as conexões...");
    await stopBot();
  }
};

const stopBot = async () => {
  updateActivityTimestamp(); // Atualizar timestamp ao parar o bot
  clearTradeTimeout();
  lastContractId = undefined;
  backTestLoaded = false;
  currentContractType = undefined;
  await clearSubscriptions();
  telegramManager.sendMessage("🛑 Bot parado e desconectado dos serviços Deriv");
};

const subscribeToTicks = (symbol: TSymbol) => {
  const ticksStream = apiManager.augmentedSubscribe("ticks_history", {
    ticks_history: symbol,
    end: "latest",
    count: 21 as unknown as undefined,
  });

  const subscription = ticksStream.subscribe((data) => {
    updateActivityTimestamp(); // Atualizar timestamp ao receber ticks

    if (!telegramManager.isRunningBot()) {
      subscription.unsubscribe();
      const index = activeSubscriptions.indexOf(subscription);
      if (index > -1) {
        activeSubscriptions.splice(index, 1);
      }
      return;
    }

    if (data.msg_type === "history") {
      const ticksPrices = data.history?.prices || [];
      const digits = ticksPrices.map((price) => {
        return +price.toFixed(data?.pip_size).slice(-1);
      });
      ticksMap.set(symbol, digits);
    }

    if (data.msg_type === "tick") {
      const tickData = data as TicksStreamResponse;
      const currentPrice = +(tickData.tick?.quote || 0)
        .toFixed(tickData.tick?.pip_size)
        .slice(-1);

      const prevTicks = ticksMap.get(symbol) || [];
      if (prevTicks.length >= 5) {
        prevTicks.shift();
        prevTicks.push(currentPrice);
        ticksMap.set(symbol, prevTicks);
      }
    }

    const currentDigits = ticksMap.get(symbol) || [];
    const lastTick = currentDigits[currentDigits.length - 1];

    virtualEntryManager.onTick(lastTick);

    if (!isAuthorized || !telegramManager.isRunningBot() || !backTestLoaded) return;

    if (isTrading) return;

    if (lastTick === tradeConfig.entryDigit) {
      updateActivityTimestamp(); // Atualizar timestamp ao identificar sinal
      const amount = moneyManager.calculateNextStake();
      const canContinue = riskManager.canContinue();
      const shouldEnter = virtualEntryManager.shouldEnter();

      if (!checkStakeAndBalance(amount) || !canContinue) {
        return;
      }

      if(!currentContractType) return;

      if(!shouldEnter) return;

      let contractTypeToUse = currentContractType;
      if (invertTrade) {
        contractTypeToUse = currentContractType === "DIGITODD" ? "DIGITEVEN" : "DIGITODD";
        telegramManager.sendMessage(
          `🔄 Trade invertido!\n` +
          `📄 Tipo: ${contractTypeToUse === "DIGITODD" ? "Ímpar" : "Par"}`
        );
      }

      telegramManager.sendMessage(
        `🎯 Sinal identificado!\n` +
        `💰 Valor da entrada: $${amount.toFixed(2)}`
      );

      apiManager.augmentedSend("buy", {
        buy: "1",
        price: 100,
        parameters: {
          symbol,
          currency: "USD",
          basis: "stake",
          duration: tradeConfig.ticksCount,
          duration_unit: "t",
          amount: Number(amount.toFixed(2)),
          contract_type: contractTypeToUse,
        },
      }).then(async (data) => {
        const contractId = data.buy?.contract_id;
        lastContractId = contractId;
        createTradeTimeout();
      }).catch((error) => {
        console.error('Erro ao abrir contrato:', error);
        clearTradeTimeout();
        isTrading = false;
      });
   
      isTrading = true;
      tickCount = 0;
    }
  });

  activeSubscriptions.push(subscription);
  return ticksStream;
};

const subscribeToOpenOrders = () => {
  const contractSub = apiManager.augmentedSubscribe("proposal_open_contract");
  
  const subscription = contractSub.subscribe((data) => {
    updateActivityTimestamp();

    if (!telegramManager.isRunningBot()) {
      subscription.unsubscribe();
      const index = activeSubscriptions.indexOf(subscription);
      if (index > -1) {
        activeSubscriptions.splice(index, 1);
      }
      return;
    }

    const contract = data.proposal_open_contract;
    const status = contract?.status;
    const profit = contract?.profit ?? 0;
    const stake = contract?.buy_price || 0;

    handleTradeResult({
      profit,
      stake,
      status: status ?? "open"
    });

  });

  activeSubscriptions.push(subscription);
  return contractSub;
};

const authorize = async () => {
  try {
    await apiManager.authorize(DERIV_TOKEN);
    isAuthorized = true;
    telegramManager.sendMessage("🔐 Bot autorizado com sucesso na Deriv");
    return true;
  } catch (err) {
    isAuthorized = false;
    telegramManager.sendMessage("❌ Erro ao autorizar bot na Deriv");
    return false;
  }
};

const runBackTestForSymbol = async (symbol: TSymbol, contractType: TContractType) => {
  const defaultConfig = () => {
    backTestLoaded = true;
    tradeConfig.entryDigit = 1;
    tradeConfig.ticksCount = 10;
    // update virtual entry manager config
    virtualEntryManager.reset();
    virtualEntryManager.updateConfig({
      entryDigit: tradeConfig.entryDigit,
      ticksCount: tradeConfig.ticksCount,
      expectedType: contractType
    });
  }

  try {
    const data = await getBackTestAllDigits(symbol, contractType === "DIGITODD" ? "odd" : "even");
    if(!data) return;
    const fiveBestResults = data.slice(0, 5);
    const randomIndex = Math.floor(Math.random() * fiveBestResults.length);
    const bestResult = fiveBestResults[randomIndex];
    if(!bestResult) {
      defaultConfig();
      return;
    }
    const ticks = bestResult.ticks;
    const digit = bestResult.digit;
    tradeConfig.entryDigit = digit;
    tradeConfig.ticksCount = ticks;
    backTestLoaded = true;    
    // update virtual entry manager config
    virtualEntryManager.reset();
    virtualEntryManager.updateConfig({
      entryDigit: tradeConfig.entryDigit,
      ticksCount: tradeConfig.ticksCount,
      expectedType: contractType
    });
  } catch (error) {
    console.error('Erro ao executar backtest:', error);
    defaultConfig();
  }

}

// Adicionar verificação periódica do estado do bot
setInterval(async () => {
  if (telegramManager.isRunningBot() && !isTrading && !waitingVirtualLoss && riskManager.getBalance() > 0) {
    // Verificar se o bot está "travado"
    const lastActivity = Date.now() - lastActivityTimestamp;
    if (lastActivity > (60_000 * 2)) { // 2 minutos sem atividade
      console.log("Detectado possível travamento do bot, resetando estados...");
      isTrading = false;
      waitingVirtualLoss = false;
      tickCount = 0;
      lastActivityTimestamp = Date.now();
      await clearSubscriptions();
    }
  }
}, (30_000)); // 30 segundos

// Adicionar timestamp da última atividade
let lastActivityTimestamp = Date.now();

// Atualizar o timestamp em momentos importantes
const updateActivityTimestamp = () => {
  lastActivityTimestamp = Date.now();
};

function main() {
  apiManager.connection.addEventListener("open", async () => {
    telegramManager.sendMessage("🌐 Conexão WebSocket estabelecida");
    authorize();
  });

  apiManager.connection.addEventListener("close", async () => {
    isAuthorized = false;
    await clearSubscriptions();
    telegramManager.sendMessage("⚠️ Conexão WebSocket fechada");
  });

  apiManager.connection.addEventListener("error", async (event) => {
    console.error("Erro na conexão:", event);
    telegramManager.sendMessage("❌ Erro na conexão com o servidor Deriv");
    await clearSubscriptions();
  });

  // Observadores do estado do bot do Telegram
  setInterval(async () => {
    if (telegramManager.isRunningBot() && !subscriptions.ticks) {
      await startBot();
    } else if (
      !telegramManager.isRunningBot() &&
      (subscriptions.ticks || subscriptions.contracts)
    ) {
      await stopBot();
    }
  }, 10_000);
}

main();
task.start();
