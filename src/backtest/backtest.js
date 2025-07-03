"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Backtest = void 0;
class Backtest {
    constructor(strategy) {
        this.strategy = strategy;
        this.RESULT_DELAY = 2; // Delay de 2 ticks para receber resultado
        this.maxTicks = 10;
        this.minTicks = 1;
        this.tickOffset = 0;
        this.entryTickOffset = 1;
        this.skipSignalWhileTrading = true;
    }
    runTest(ticksData) {
        var _a, _b;
        const results = [];
        let digits = ticksData.map(tick => tick.price);
        let times = ticksData.map(tick => tick.time);
        for (let ticks = this.minTicks; ticks <= this.maxTicks; ticks++) {
            let totalTrades = 0;
            let skippedTrades = 0;
            let possibleTrades = 0;
            let wins = 0;
            let losses = 0;
            let consecutiveWins = 0;
            let consecutiveLosses = 0;
            let maxConsecutiveWins = 0;
            let maxConsecutiveLosses = 0;
            const trades = [];
            let lastTradeIndex = -1;
            for (let i = 0; i < digits.length - ticks; i++) {
                const result = this.strategy.execute(digits, i, ticks, times, ticksData);
                if (result !== null) {
                    possibleTrades++;
                    // Verifica se é o primeiro trade ou se já passou tempo suficiente desde a última trade
                    const minTicksNeeded = lastTradeIndex === -1 ? 0 : lastTradeIndex + ticks + this.RESULT_DELAY;
                    if (this.skipSignalWhileTrading) {
                        if (i < minTicksNeeded) {
                            skippedTrades++;
                            continue;
                        }
                    }
                    totalTrades++;
                    trades.push({
                        success: result,
                        position: i,
                        resultDigit: digits[i + ticks + this.tickOffset],
                        entryDigit: digits[i + this.entryTickOffset],
                        entryTime: times[i + this.entryTickOffset],
                        resultTime: times[i + ticks + this.tickOffset],
                        tradeType: this.strategy.config.compareType
                    });
                    lastTradeIndex = i;
                    if (result) {
                        wins++;
                        consecutiveWins++;
                        consecutiveLosses = 0;
                        maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
                    }
                    else {
                        losses++;
                        consecutiveLosses++;
                        consecutiveWins = 0;
                        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
                    }
                }
            }
            results.push({
                ticks,
                totalTrades,
                wins,
                losses,
                winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
                lossRate: totalTrades > 0 ? (losses / totalTrades) * 100 : 0,
                maxConsecutiveWins,
                maxConsecutiveLosses,
                trades,
                skippedTrades,
                possibleTrades
            });
        }
        (_b = (_a = this.strategy) === null || _a === void 0 ? void 0 : _a.resetDigits) === null || _b === void 0 ? void 0 : _b.call(_a);
        return results;
    }
}
exports.Backtest = Backtest;
