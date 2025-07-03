"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneyManager = void 0;
class MoneyManager {
    constructor(config, initialBalance) {
        this.config = config;
        this.trades = [];
        this.totalVolume = 0;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.maxStakeUsed = {
            stake: 0,
            balance: 0,
            tradeNumber: 0
        };
        this.currentBalance = initialBalance;
        this.maxBalance = initialBalance;
        this.minBalance = initialBalance;
    }
    processTradeSignals(backTestResults) {
        const targetTickResults = backTestResults.find(r => r.ticks === this.config.targetTick);
        if (!targetTickResults)
            return this.getEmptyResults();
        for (const trade of targetTickResults.trades) {
            if (this.currentBalance <= 0) {
                console.warn('Stop Loss: Saldo zerado');
                break;
            }
            const stake = this.calculateStake();
            if (stake === 0 || stake > this.currentBalance) {
                console.warn('Stop Loss: Stake maior que saldo disponível', {
                    stake,
                    currentBalance: this.currentBalance
                });
                break;
            }
            this.totalVolume += stake;
            // Atualiza informação da maior stake
            if (stake > this.maxStakeUsed.stake) {
                this.maxStakeUsed = {
                    stake,
                    balance: this.currentBalance,
                    tradeNumber: this.trades.length + 1
                };
            }
            if (trade.success) {
                const profit = stake * (this.config.profitPercent / 100);
                this.currentBalance += profit;
                this.consecutiveWins++;
                this.consecutiveLosses = 0;
                const tradeResult = {
                    success: true,
                    stake,
                    profit,
                    balance: this.currentBalance,
                    type: 'win',
                    resultDigit: trade.resultDigit
                };
                this.trades.push(tradeResult);
                this.updateStats(tradeResult);
            }
            else {
                if (this.currentBalance - stake <= 0) {
                    console.warn('Stop Loss: Saldo insuficiente para próxima operação', {
                        currentBalance: this.currentBalance,
                        requiredStake: stake
                    });
                    break;
                }
                this.currentBalance -= stake;
                this.consecutiveLosses++;
                this.consecutiveWins = 0;
                const tradeResult = {
                    success: false,
                    stake,
                    profit: -stake,
                    balance: this.currentBalance,
                    type: 'loss',
                    resultDigit: trade.resultDigit
                };
                this.trades.push(tradeResult);
                this.updateStats(tradeResult);
            }
        }
        return {
            cashoutBalance: this.currentBalance,
            finalBalance: this.currentBalance,
            totalVolume: this.totalVolume,
            maxDrawdown: this.maxBalance > 0 ? ((this.maxBalance - this.minBalance) / this.maxBalance) * 100 : 0,
            maxBalance: this.maxBalance,
            minBalance: this.minBalance,
            trades: this.trades,
            maxStakeInfo: this.maxStakeUsed
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateStats(_trade) {
        this.maxBalance = Math.max(this.maxBalance, this.currentBalance);
        this.minBalance = Math.min(this.minBalance, this.currentBalance);
        // Log para debug
        // console.log('Trade:', {
        //   type: trade.type,
        //   stake: trade.stake,
        //   profit: trade.profit,
        //   balance: this.currentBalance,
        //   maxBalance: this.maxBalance,
        //   minBalance: this.minBalance,
        //   totalVolume: this.totalVolume,
        //   drawdown: ((this.maxBalance - this.minBalance) / this.maxBalance) * 100
        // });
    }
    calculateStake() {
        if (this.currentBalance <= 0)
            return 0;
        const lastTrade = this.trades[this.trades.length - 1];
        if (!lastTrade) {
            return Math.min(this.config.initialStake, this.currentBalance);
        }
        switch (this.config.type) {
            case 'fixed':
                return this.calculateFixedStake();
            case 'martingale':
                return this.calculateMartingaleStake(lastTrade);
            case 'soros':
                return this.calculateSorosStake(lastTrade);
            case 'martingale-soros':
                return this.calculateMartingaleSorosStake(lastTrade);
            default:
                return this.config.initialStake;
        }
    }
    calculateFixedStake() {
        return Math.min(this.config.initialStake, this.currentBalance);
    }
    calculateMartingaleStake(lastTrade) {
        if (lastTrade.type === 'win') {
            return this.config.initialStake;
        }
        // Calcula valor necessário para recuperar perdas
        const lossAmount = lastTrade.stake;
        const profitRate = this.config.profitPercent / 100;
        const requiredStake = (lossAmount + this.config.initialStake) / profitRate;
        return Math.min(requiredStake, this.config.maxStake || Infinity, this.currentBalance);
    }
    calculateSorosStake(lastTrade) {
        if (lastTrade.type === 'loss') {
            return this.config.initialStake;
        }
        // Adiciona o lucro da última trade ao stake inicial
        const newStake = this.config.initialStake + lastTrade.profit;
        return Math.min(newStake, this.config.maxStake || Infinity, this.currentBalance);
    }
    calculateMartingaleSorosStake(lastTrade) {
        if (lastTrade.type === 'win') {
            return this.calculateSorosStake(lastTrade);
        }
        return this.calculateMartingaleStake(lastTrade);
    }
    getEmptyResults() {
        return {
            cashoutBalance: this.currentBalance,
            finalBalance: this.currentBalance,
            totalVolume: 0,
            maxDrawdown: 0,
            maxBalance: this.currentBalance,
            minBalance: this.currentBalance,
            trades: [],
            maxStakeInfo: {
                stake: 0,
                balance: 0,
                tradeNumber: 0
            }
        };
    }
}
exports.MoneyManager = MoneyManager;
