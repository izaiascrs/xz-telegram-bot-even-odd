"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskManager = void 0;
require("dotenv/config");
const trade_service_1 = require("./database/trade-service");
const schema_1 = require("./database/schema");
const telegram_1 = require("./telegram");
const ws_1 = __importDefault(require("./ws"));
const constants_1 = require("./utils/constants");
const risk_management_1 = require("./risk-management");
const backtest_1 = require("./backtest");
const symbols = ["R_10", "R_25", "R_50", "R_75", "R_100"];
const contractTypes = ["DIGITODD", "DIGITEVEN"];
let currentContractType = undefined;
const CONTRACT_SECONDS = 2;
let CONTRACT_TICKS = 10;
let backTestLoaded = false;
const tradeConfig = {
    entryDigit: 0,
    ticksCount: 0,
};
let isAuthorized = false;
let isTrading = false;
let waitingVirtualLoss = false;
let tickCount = 0;
let consecutiveWins = 0;
let lastContractId = undefined;
let lastContractIntervalId = null;
let subscriptions = {};
// Adicionar um array para controlar todas as subscrições ativas
let activeSubscriptions = [];
const config = {
    profit: 10, // amount to risk on all trades
    payout: 1.9, // payout
    entry: 10, // 10 trades
    performance: 4, // 4 wins 
};
const balance = 100; // initial balance
exports.riskManager = new risk_management_1.RiskManager(config, balance);
// Inicializar o banco de dados
const database = (0, schema_1.initDatabase)();
const tradeService = new trade_service_1.TradeService(database);
const telegramManager = new telegram_1.TelegramManager(tradeService);
const getNextSymbol = () => {
    let startIndex = 0;
    return () => {
        const symbol = symbols[startIndex];
        startIndex++;
        if (startIndex >= symbols.length)
            startIndex = 0;
        return symbol;
    };
};
const nextSymbol = getNextSymbol();
const getRandomContractType = () => {
    const randomIndex = Math.floor(Math.random() * contractTypes.length);
    return contractTypes[randomIndex];
};
exports.riskManager.setOnTargetReached((profit, balance) => {
    const message = `🎯 Rodada finalizada!\n` +
        `💰 Lucro: $${profit.toFixed(2)}\n` +
        `💵 Saldo: $${balance.toFixed(2)}\n` +
        `✨ Iniciando nova rodada...`;
    setTimeout(() => {
        telegramManager.sendMessage(message);
        exports.riskManager.resetStatistics();
        backTestLoaded = false;
        currentContractType = undefined;
        getNextSymbolAndInitialize();
    }, 500);
});
const ticksMap = new Map([]);
function createTradeTimeout() {
    lastContractIntervalId = setInterval(() => {
        if (lastContractId) {
            getLastTradeResult(lastContractId);
        }
    }, ((CONTRACT_TICKS * CONTRACT_SECONDS) * 1000) * 2);
}
function clearTradeTimeout() {
    if (lastContractIntervalId) {
        clearInterval(lastContractIntervalId);
        lastContractIntervalId = null;
    }
}
function handleTradeResult({ profit, stake, status }) {
    if (status === "open")
        return;
    updateActivityTimestamp();
    const isWin = status === "won";
    // Calcular novo saldo baseado no resultado
    const currentBalance = exports.riskManager.getBalance();
    let newBalance = currentBalance;
    isTrading = false;
    tickCount = 0;
    lastContractId = undefined;
    waitingVirtualLoss = false;
    // if(!isWin) {
    //   currentDigit++;
    //   if(currentDigit > 9) currentDigit = 0;
    //   const nextTickCount = digitsMap.get(currentDigit);
    //   if(nextTickCount !== undefined) {
    //     tradeConfig.entryDigit = currentDigit;
    //     tradeConfig.ticksCount = nextTickCount;
    //   }
    // }
    if (isWin) {
        newBalance = currentBalance + profit;
        consecutiveWins++;
    }
    else {
        newBalance = currentBalance - stake;
        consecutiveWins = 0;
    }
    exports.riskManager.updateLastResult(isWin ? "W" : "L");
    telegramManager.updateTradeResult(isWin, exports.riskManager.getBalance());
    const resultMessage = isWin ? "✅ Trade ganho!" : "❌ Trade perdido!";
    telegramManager.sendMessage(`${resultMessage}\n` +
        `💰 ${isWin ? 'Lucro' : 'Prejuízo'}: $${isWin ? profit : stake}\n` +
        `💵 Saldo: $${exports.riskManager.getCurrentProfit().toFixed(2)}`);
    // Salvar trade no banco
    tradeService.saveTrade({
        isWin,
        stake,
        profit: isWin ? profit : -stake,
        balanceAfter: newBalance
    }).catch(err => console.error('Erro ao salvar trade:', err));
    clearTradeTimeout();
}
function getLastTradeResult(contractId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!contractId)
            return;
        const data = yield ws_1.default.augmentedSend('proposal_open_contract', { contract_id: contractId });
        const contract = data.proposal_open_contract;
        const profit = (_a = contract === null || contract === void 0 ? void 0 : contract.profit) !== null && _a !== void 0 ? _a : 0;
        const stake = (_b = contract === null || contract === void 0 ? void 0 : contract.buy_price) !== null && _b !== void 0 ? _b : 0;
        const status = contract === null || contract === void 0 ? void 0 : contract.status;
        handleTradeResult({
            profit,
            stake,
            status: status !== null && status !== void 0 ? status : "open"
        });
    });
}
const checkStakeAndBalance = (stake) => {
    const hasSufficientBalance = exports.riskManager.hasSufficientBalance();
    if (stake < 0.35 || !hasSufficientBalance) {
        telegramManager.sendMessage("🚨 *ALERTA CRÍTICO*\n\n" +
            "❌ Bot finalizado automaticamente!\n" +
            "💰 Saldo ou stake chegou a zero\n" +
            `💵 Saldo final: $${exports.riskManager.getBalance().toFixed(2)}`);
        stopBot();
        return false;
    }
    return true;
};
function initializeSymbol(symbol) {
    return __awaiter(this, void 0, void 0, function* () {
        yield clearTicksAndContractSubscriptions();
        const contractType = getRandomContractType();
        yield runBackTestForSymbol(symbol, contractType);
        subscriptions.ticks = subscribeToTicks(symbol);
        subscriptions.contracts = subscribeToOpenOrders();
        currentContractType = contractType;
        const message = `🚦 Inicializando símbolo: ${symbol.replace("_", " ")}\n` +
            `📄 Tipo de contrato: ${contractType === "DIGITODD" ? "Ímpar" : "Par"}\n` +
            `🔢 Dígito de entrada: ${tradeConfig.entryDigit}\n` +
            `⏱️ Ticks: ${tradeConfig.ticksCount}`;
        telegramManager.sendMessage(message);
    });
}
function getNextSymbolAndInitialize() {
    const nextSym = nextSymbol();
    initializeSymbol(nextSym);
}
const clearSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Limpar todas as subscrições ativas
        for (const subscription of activeSubscriptions) {
            if (subscription) {
                try {
                    subscription.unsubscribe();
                }
                catch (error) {
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
        ticksMap.clear();
    }
    catch (error) {
        console.error("Erro ao limpar subscrições:", error);
    }
});
const clearTicksAndContractSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        for (const subscription of activeSubscriptions) {
            if (subscription) {
                try {
                    subscription.unsubscribe();
                }
                catch (error) {
                    console.error("Erro ao limpar subscrição:", error);
                }
            }
        }
        activeSubscriptions = [];
        subscriptions = {};
        tickCount = 0;
        ticksMap.clear();
    }
    catch (error) {
        console.error("Erro ao limpar subscrições:", error);
    }
});
const startBot = () => __awaiter(void 0, void 0, void 0, function* () {
    updateActivityTimestamp(); // Atualizar timestamp ao iniciar o bot
    yield clearSubscriptions();
    try {
        if (!isAuthorized)
            yield authorize();
        yield initializeSymbol(nextSymbol());
        // subscriptions.ticks = subscribeToTicks("R_10");
        // subscriptions.contracts = subscribeToOpenOrders();
        if (!subscriptions.ticks || !subscriptions.contracts) {
            throw new Error("Falha ao criar subscrições");
        }
        telegramManager.sendMessage("🤖 Bot iniciado e conectado aos serviços Deriv");
    }
    catch (error) {
        console.error("Erro ao iniciar bot:", error);
        telegramManager.sendMessage("❌ Erro ao iniciar o bot. Tentando parar e limpar as conexões...");
        yield stopBot();
    }
});
const stopBot = () => __awaiter(void 0, void 0, void 0, function* () {
    updateActivityTimestamp(); // Atualizar timestamp ao parar o bot
    yield clearSubscriptions();
    telegramManager.sendMessage("🛑 Bot parado e desconectado dos serviços Deriv");
});
const subscribeToTicks = (symbol) => {
    const ticksStream = ws_1.default.augmentedSubscribe("ticks_history", {
        ticks_history: symbol,
        end: "latest",
        count: 21,
    });
    const subscription = ticksStream.subscribe((data) => {
        var _a, _b, _c;
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
            const ticksPrices = ((_a = data.history) === null || _a === void 0 ? void 0 : _a.prices) || [];
            const digits = ticksPrices.map((price) => {
                return +price.toFixed(data === null || data === void 0 ? void 0 : data.pip_size).slice(-1);
            });
            ticksMap.set(symbol, digits);
        }
        if (data.msg_type === "tick") {
            const tickData = data;
            const currentPrice = +(((_b = tickData.tick) === null || _b === void 0 ? void 0 : _b.quote) || 0)
                .toFixed((_c = tickData.tick) === null || _c === void 0 ? void 0 : _c.pip_size)
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
        if (!isAuthorized || !telegramManager.isRunningBot() || !backTestLoaded)
            return;
        if (isTrading)
            return;
        if (lastTick === tradeConfig.entryDigit) {
            updateActivityTimestamp(); // Atualizar timestamp ao identificar sinal
            if (!waitingVirtualLoss) {
                let amount = exports.riskManager.calculateNextStake();
                const canContinue = exports.riskManager.canContinue();
                if (!checkStakeAndBalance(amount) || !canContinue) {
                    return;
                }
                if (!currentContractType)
                    return;
                telegramManager.sendMessage(`🎯 Sinal identificado!\n` +
                    `💰 Valor da entrada: $${amount.toFixed(2)}`);
                ws_1.default.augmentedSend("buy", {
                    buy: "1",
                    price: 100,
                    parameters: {
                        symbol,
                        currency: "USD",
                        basis: "stake",
                        duration: tradeConfig.ticksCount,
                        duration_unit: "t",
                        amount: Number(amount.toFixed(2)),
                        contract_type: currentContractType,
                    },
                }).then((data) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a;
                    const contractId = (_a = data.buy) === null || _a === void 0 ? void 0 : _a.contract_id;
                    lastContractId = contractId;
                    createTradeTimeout();
                }));
            }
            else {
                telegramManager.sendMessage("⏳ Aguardando confirmação de loss virtual");
            }
            isTrading = true;
            tickCount = 0;
        }
    });
    activeSubscriptions.push(subscription);
    return ticksStream;
};
const subscribeToOpenOrders = () => {
    const contractSub = ws_1.default.augmentedSubscribe("proposal_open_contract");
    const subscription = contractSub.subscribe((data) => {
        var _a;
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
        const status = contract === null || contract === void 0 ? void 0 : contract.status;
        const profit = (_a = contract === null || contract === void 0 ? void 0 : contract.profit) !== null && _a !== void 0 ? _a : 0;
        const stake = (contract === null || contract === void 0 ? void 0 : contract.buy_price) || 0;
        handleTradeResult({
            profit,
            stake,
            status: status !== null && status !== void 0 ? status : "open"
        });
    });
    activeSubscriptions.push(subscription);
    return contractSub;
};
const authorize = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield ws_1.default.authorize(constants_1.DERIV_TOKEN);
        isAuthorized = true;
        telegramManager.sendMessage("🔐 Bot autorizado com sucesso na Deriv");
        return true;
    }
    catch (err) {
        isAuthorized = false;
        telegramManager.sendMessage("❌ Erro ao autorizar bot na Deriv");
        return false;
    }
});
const runBackTestForSymbol = (symbol, contractType) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield (0, backtest_1.getBackTestAllDigits)(symbol, contractType === "DIGITODD" ? "odd" : "even");
    if (!data)
        return;
    const bestResult = data[0];
    if (!bestResult)
        return;
    const ticks = bestResult.ticks;
    const digit = bestResult.digit;
    tradeConfig.entryDigit = digit;
    tradeConfig.ticksCount = ticks;
    backTestLoaded = true;
});
// Adicionar verificação periódica do estado do bot
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    if (telegramManager.isRunningBot() && !isTrading && !waitingVirtualLoss && exports.riskManager.getBalance() > 0) {
        // Verificar se o bot está "travado"
        const lastActivity = Date.now() - lastActivityTimestamp;
        if (lastActivity > (60000 * 2)) { // 2 minutos sem atividade
            console.log("Detectado possível travamento do bot, resetando estados...");
            isTrading = false;
            waitingVirtualLoss = false;
            tickCount = 0;
            lastActivityTimestamp = Date.now();
            yield clearSubscriptions();
        }
    }
}), (30000)); // 30 segundos
// Adicionar timestamp da última atividade
let lastActivityTimestamp = Date.now();
// Atualizar o timestamp em momentos importantes
const updateActivityTimestamp = () => {
    lastActivityTimestamp = Date.now();
};
function main() {
    ws_1.default.connection.addEventListener("open", () => __awaiter(this, void 0, void 0, function* () {
        telegramManager.sendMessage("🌐 Conexão WebSocket estabelecida");
        authorize();
    }));
    ws_1.default.connection.addEventListener("close", () => __awaiter(this, void 0, void 0, function* () {
        isAuthorized = false;
        yield clearSubscriptions();
        telegramManager.sendMessage("⚠️ Conexão WebSocket fechada");
    }));
    ws_1.default.connection.addEventListener("error", (event) => __awaiter(this, void 0, void 0, function* () {
        console.error("Erro na conexão:", event);
        telegramManager.sendMessage("❌ Erro na conexão com o servidor Deriv");
        yield clearSubscriptions();
    }));
    // Observadores do estado do bot do Telegram
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        if (telegramManager.isRunningBot() && !subscriptions.ticks) {
            yield startBot();
        }
        else if (!telegramManager.isRunningBot() &&
            (subscriptions.ticks || subscriptions.contracts)) {
            yield stopBot();
        }
    }), 10000);
}
main();
