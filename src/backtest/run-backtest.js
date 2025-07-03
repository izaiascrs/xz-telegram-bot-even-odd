"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBackTest = runBackTest;
const backtest_1 = require("./backtest");
const money_manager_v2_1 = require("../money-management/money-manager-v2");
function runBackTest(ticks, strategy, initialBalance = 100) {
    // Executa o backtest puro para todos os ticks
    const backtest = new backtest_1.Backtest(strategy);
    const backTestResults = backtest.runTest(ticks.ticks);
    // Executa o gerenciamento separadamente
    const moneyManager = new money_manager_v2_1.MoneyManager(strategy.moneyManagement, initialBalance, strategy);
    const financialResults = moneyManager.processTradeSignals(backTestResults);
    // Processa estatísticas adicionais para cada tick
    const processedResults = backTestResults.map((result) => {
        const winStreaks = getStreaks(result.trades, true);
        const lossStreaks = getStreaks(result.trades, false);
        return Object.assign(Object.assign({}, result), { averageConsecutiveWins: average(winStreaks), averageConsecutiveLosses: average(lossStreaks), winsAfterConsecutiveLosses: calculateTradesAfterLosses(result.trades), lossesAfterConsecutiveWins: calculateTradesAfterWins(result.trades), streakDistribution: {
                wins: countStreaks(winStreaks),
                losses: countStreaks(lossStreaks),
            }, 
            // Valores financeiros zerados para todos os ticks
            finalBalance: initialBalance, totalVolume: 0, maxDrawdown: 0, maxBalance: initialBalance, minBalance: initialBalance, trades: [] });
    });
    return {
        backtest: processedResults,
        management: financialResults,
    };
}
// Helper functions
const getStreaks = (trades, forWins) => {
    const streaks = [];
    let current = 0;
    trades.forEach((trade) => {
        if (trade.success === forWins) {
            current++;
        }
        else if (current > 0) {
            streaks.push(current);
            current = 0;
        }
    });
    if (current > 0)
        streaks.push(current);
    return streaks;
};
const average = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const countStreaks = (streaks) => streaks.reduce((acc, streak) => (Object.assign(Object.assign({}, acc), { [streak]: (acc[streak] || 0) + 1 })), {});
const calculateTradesAfterLosses = (trades) => {
    const result = {};
    let lossCount = 0;
    for (let i = 0; i < trades.length - 1; i++) {
        if (!trades[i].success) {
            lossCount++;
        }
        else {
            if (lossCount > 0) {
                if (!result[lossCount]) {
                    result[lossCount] = {
                        occurrences: 0,
                        averageTradesToNextLoss: 0,
                        winRate: 0,
                    };
                }
                // Conta quantos trades até próxima derrota
                let tradesToNextLoss = 1;
                for (let j = i + 1; j < trades.length; j++) {
                    if (!trades[j].success)
                        break;
                    tradesToNextLoss++;
                }
                result[lossCount].occurrences++;
                result[lossCount].averageTradesToNextLoss =
                    (result[lossCount].averageTradesToNextLoss *
                        (result[lossCount].occurrences - 1) +
                        tradesToNextLoss) /
                        result[lossCount].occurrences;
                result[lossCount].winRate =
                    (result[lossCount].occurrences / trades.length) * 100;
            }
            lossCount = 0;
        }
    }
    return result;
};
const calculateTradesAfterWins = (trades) => {
    const result = {};
    let winCount = 0;
    for (let i = 0; i < trades.length - 1; i++) {
        if (trades[i].success) {
            winCount++;
        }
        else {
            if (winCount > 0) {
                if (!result[winCount]) {
                    result[winCount] = {
                        occurrences: 0,
                        averageTradesToNextWin: 0,
                        lossRate: 0,
                    };
                }
                // Conta quantos trades até próxima vitória
                let tradesToNextWin = 1;
                for (let j = i + 1; j < trades.length; j++) {
                    if (trades[j].success)
                        break;
                    tradesToNextWin++;
                }
                result[winCount].occurrences++;
                result[winCount].averageTradesToNextWin =
                    (result[winCount].averageTradesToNextWin *
                        (result[winCount].occurrences - 1) +
                        tradesToNextWin) /
                        result[winCount].occurrences;
                result[winCount].lossRate =
                    (result[winCount].occurrences / trades.length) * 100;
            }
            winCount = 0;
        }
    }
    return result;
};
// Nova função para calcular estatísticas dos dígitos
function calculateDigitStats(trades, digits, config) {
    const targetDigit = config.entryDigit;
    // Pega os 500 trades mais recentes
    const recentTrades = trades.slice(-500);
    // Filtra trades onde o dígito de entrada é o configurado
    const targetTrades = recentTrades.filter((trade) => Math.floor(digits[trade.position]) === targetDigit);
    // Calcula win rate para trades com dígito 9
    const winningTrades = targetTrades.filter((t) => t.success);
    const winRate = (winningTrades.length / targetTrades.length) * 100;
    // Coleta histórico dos próximos 10 dígitos após cada entrada
    const validSequences = targetTrades
        .map((trade) => {
        const startIndex = trade.position + 1;
        const sequence = digits.slice(startIndex, startIndex + 10);
        return sequence.length === 10 ? sequence.map((d) => Math.floor(d)) : null;
    })
        .filter((seq) => seq !== null);
    // Pega as 150 sequências mais recentes
    const tradesDigitsHistory = validSequences.slice(-500);
    return {
        digit: targetDigit,
        trades: targetTrades.length,
        winRate: Number(winRate.toFixed(1)),
        tradesDigitsHistory,
    };
}
