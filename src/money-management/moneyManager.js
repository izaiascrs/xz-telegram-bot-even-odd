"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneyManager = void 0;
class MoneyManager {
    constructor(config, initialBalance) {
        this.config = config;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.sorosLevel = 0;
        this.lastTrade = null;
        this.accumulatedLoss = 0;
        this.recoveryMode = false;
        this.isMartingaleTrade = false;
        this.sessionProfit = 0;
        this.currentBalance = initialBalance;
        this.initialBalance = initialBalance;
        this.currentStake = config.initialStake;
        this.maxWinsRequired = config.winsBeforeMartingale || 3;
        this.currentWinsRequired = this.maxWinsRequired;
    }
    setOnTargetReached(callback) {
        this.onTargetReached = callback;
    }
    calculateNextStake() {
        if (this.currentBalance <= 0) {
            console.warn("Saldo insuficiente");
            return 0;
        }
        if (!this.lastTrade) {
            return Math.min(this.config.initialStake, this.currentBalance);
        }
        let nextStake = 0;
        switch (this.config.type) {
            case "fixed":
                nextStake = this.calculateFixedStake();
                break;
            case "martingale":
                nextStake = this.calculateMartingaleStake();
                break;
            case "soros":
                nextStake = this.calculateSorosStake();
                break;
            case "martingale-soros":
                nextStake = this.calculateMartingaleSorosStake();
                break;
            default:
                nextStake = this.config.initialStake;
        }
        // Verifica limites
        if (nextStake > this.currentBalance) {
            console.warn("Stake maior que saldo disponível");
            return 0;
        }
        if (nextStake > (this.config.maxStake || Infinity)) {
            console.warn("Stake maior que limite máximo");
            return 0;
        }
        this.currentStake = nextStake;
        return nextStake;
    }
    updateLastTrade(success) {
        const stake = this.currentStake;
        const profit = success ? stake * (this.config.profitPercent / 100) : -stake;
        this.currentBalance += profit;
        this.sessionProfit += profit;
        if (this.accumulatedLoss > 0) {
            this.accumulatedLoss =
                profit > this.accumulatedLoss ? 0 : this.accumulatedLoss - profit;
        }
        // Verifica se atingiu lucro alvo
        if (this.config.targetProfit &&
            this.sessionProfit >= this.config.targetProfit) {
            console.log(`🎯 Lucro alvo de $${this.config.targetProfit} atingido! Reiniciando saldo...`);
            // Notifica antes de resetar
            if (this.onTargetReached) {
                this.onTargetReached(this.sessionProfit, this.currentBalance);
            }
            this.resetSession();
        }
        this.lastTrade = {
            success,
            stake,
            profit,
            balance: this.currentBalance,
            type: success ? "win" : "loss",
            resultDigit: 0,
        };
        // Atualiza contadores
        if (success) {
            this.consecutiveLosses = 0;
            if (this.recoveryMode &&
                this.consecutiveWins >= this.currentWinsRequired) {
                this.recoveryMode = false;
                this.accumulatedLoss = 0;
                this.consecutiveWins = 0;
            }
        }
        else {
            this.consecutiveLosses++;
            this.consecutiveWins = 0;
            this.sorosLevel = 0;
        }
    }
    resetSession() {
        // Reseta para o saldo inicial
        this.currentBalance = this.initialBalance;
        this.sessionProfit = 0;
        this.currentStake = this.config.initialStake;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        this.sorosLevel = 0;
        this.accumulatedLoss = 0;
        this.recoveryMode = false;
        this.isMartingaleTrade = false;
        this.currentWinsRequired = this.maxWinsRequired;
    }
    calculateFixedStake() {
        return this.config.initialStake;
    }
    calculateMartingaleStake() {
        var _a, _b, _c, _d;
        if (((_a = this.lastTrade) === null || _a === void 0 ? void 0 : _a.type) === "win") {
            this.consecutiveLosses = 0;
            this.consecutiveWins++;
            if (this.consecutiveWins >= this.currentWinsRequired && this.accumulatedLoss > 0) {
                // Após win com martingale, próxima stake é lucro + entrada inicial
                // const profit = this.lastTrade.stake * (this.config.profitPercent / 100);
                // return this.config.initialStake + profit;
                const neededProfit = this.accumulatedLoss;
                const profitRate = this.config.profitPercent / 100;
                const recoveryStake = (neededProfit + this.config.initialStake) / profitRate;
                const finalStake = Math.min(recoveryStake, this.config.maxStake || Infinity, this.currentBalance);
                this.recoveryMode = false;
                this.consecutiveWins = 0;
                this.accumulatedLoss = 0;
                this.isMartingaleTrade = true;
                return finalStake;
            }
            return this.config.initialStake;
        }
        if (this.config.maxLoss && this.consecutiveLosses >= this.config.maxLoss) {
            console.warn("Limite máximo de losses atingido");
            this.consecutiveLosses = 0;
            return this.config.initialStake;
        }
        if (((_b = this.lastTrade) === null || _b === void 0 ? void 0 : _b.type) === "loss") {
            if (this.isMartingaleTrade) {
                this.currentWinsRequired = (_c = this.config.winsBeforeMartingale) !== null && _c !== void 0 ? _c : 0;
            }
            this.recoveryMode = true;
            this.consecutiveWins = 0;
            this.accumulatedLoss += Math.abs(this.lastTrade.profit);
            this.isMartingaleTrade = false;
            return this.config.initialStake;
        }
        // Corrigido cálculo do martingale
        const lastStake = ((_d = this.lastTrade) === null || _d === void 0 ? void 0 : _d.stake) || this.config.initialStake;
        const profitRate = this.config.profitPercent / 100;
        const nextStake = (lastStake + this.config.initialStake) / profitRate;
        return Math.min(nextStake, this.config.maxStake || Infinity, this.currentBalance);
    }
    calculateSorosStake() {
        var _a, _b;
        if (((_a = this.lastTrade) === null || _a === void 0 ? void 0 : _a.type) === "loss") {
            this.sorosLevel = 0;
            return this.config.initialStake;
        }
        this.sorosLevel++;
        if (this.sorosLevel > (this.config.sorosLevel || 1)) {
            this.sorosLevel = 0;
            return this.config.initialStake;
        }
        // No soros, após vitória, adiciona o lucro da última operação à stake inicial
        const lastProfit = ((_b = this.lastTrade) === null || _b === void 0 ? void 0 : _b.profit) || 0;
        return this.config.initialStake + lastProfit;
    }
    calculateMartingaleSorosStake() {
        var _a, _b, _c;
        if (((_a = this.lastTrade) === null || _a === void 0 ? void 0 : _a.type) === "win") {
            if (this.recoveryMode) {
                this.consecutiveWins++;
                if (this.consecutiveWins >= this.currentWinsRequired) {
                    const neededProfit = this.accumulatedLoss;
                    const profitRate = this.config.profitPercent / 100;
                    const recoveryStake = (neededProfit + this.config.initialStake) / profitRate;
                    const finalStake = Math.min(recoveryStake, this.config.maxStake || Infinity, this.currentBalance);
                    this.recoveryMode = false;
                    this.consecutiveWins = 0;
                    this.accumulatedLoss = 0;
                    this.isMartingaleTrade = true;
                    return finalStake;
                }
                return this.config.initialStake;
            }
            this.isMartingaleTrade = false;
            return this.calculateSorosStake();
        }
        if (((_b = this.lastTrade) === null || _b === void 0 ? void 0 : _b.type) === "loss") {
            if (this.isMartingaleTrade) {
                this.currentWinsRequired = (_c = this.config.winsBeforeMartingale) !== null && _c !== void 0 ? _c : 0;
                // this.currentWinsRequired =
                //   Math.floor(Math.random() * this.maxWinsRequired) + 1;
                console.log(`Martingale falhou. Novo número de wins necessários: ${this.currentWinsRequired}`);
            }
            this.recoveryMode = true;
            this.consecutiveWins = 0;
            this.sorosLevel = 0;
            this.accumulatedLoss += Math.abs(this.lastTrade.profit);
            this.isMartingaleTrade = false;
            return this.config.initialStake;
        }
        return this.config.initialStake;
    }
    getCurrentBalance() {
        return this.currentBalance;
    }
    getLastTrade() {
        return this.lastTrade;
    }
    getStats() {
        var _a, _b;
        return {
            currentBalance: this.currentBalance,
            initialBalance: this.initialBalance,
            sessionProfit: this.sessionProfit,
            targetProfit: this.config.targetProfit,
            consecutiveLosses: this.consecutiveLosses,
            sorosLevel: this.sorosLevel,
            lastStake: ((_a = this.lastTrade) === null || _a === void 0 ? void 0 : _a.stake) || 0,
            lastProfit: ((_b = this.lastTrade) === null || _b === void 0 ? void 0 : _b.profit) || 0,
            winsRequired: this.currentWinsRequired,
            currentWins: this.consecutiveWins,
        };
    }
    updateConfiguration(config) {
        this.config = Object.assign(Object.assign({}, this.config), config);
        if (config.initialBalance) {
            this.currentBalance = config.initialBalance;
        }
        console.log(config);
    }
}
exports.MoneyManager = MoneyManager;
