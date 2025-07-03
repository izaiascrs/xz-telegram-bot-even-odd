"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedWithRecoveryManager = void 0;
class FixedWithRecoveryManager {
    constructor(config, initialBalance) {
        this.lastWin = false;
        this.lastProfit = 0;
        this.consecutiveWins = 0;
        this.sorosCount = 0; // Contador para controlar níveis do soros
        this.config = Object.assign(Object.assign({}, config), { enableSoros: config.enableSoros || false, sorosPercent: config.sorosPercent || 20, winsBeforeRecovery: config.winsBeforeRecovery || 3, initialBalance: initialBalance });
        this.currentStake = config.initialStake;
        this.currentBalance = initialBalance;
    }
    calculateNextStake() {
        // Se atingiu o número máximo de soros, volta para stake inicial
        if (this.sorosCount >= this.config.sorosLevel) {
            this.sorosCount = 0;
            return this.config.initialStake;
        }
        // Se o saldo estiver abaixo do inicial e tivermos wins suficientes, calcular recovery
        if (this.shouldUseRecovery()) {
            const valueToRecover = this.config.initialBalance - this.currentBalance;
            return this.calculateRecoveryStake(valueToRecover);
        }
        // Se tiver soros habilitado, última foi win e saldo > inicial
        if (this.shouldUseSoros()) {
            const sorosStake = this.calculateSorosStake();
            if (sorosStake <= this.config.maxStake) {
                this.sorosCount++; // Incrementa contador de soros
                return sorosStake;
            }
        }
        // Reset do contador de soros quando voltar ao stake inicial
        this.sorosCount = 0;
        return this.config.initialStake;
    }
    shouldUseSoros() {
        const profitFromInitial = this.currentBalance - this.config.initialBalance;
        return (this.config.enableSoros &&
            this.lastWin &&
            profitFromInitial > 0 && // Verifica se tem lucro em relação ao saldo inicial
            this.lastProfit > 0);
    }
    shouldUseRecovery() {
        return (this.currentBalance < this.config.initialBalance &&
            this.consecutiveWins >= this.config.winsBeforeRecovery &&
            this.calculateRecoveryStake(this.config.initialBalance - this.currentBalance) <= this.config.maxStake);
    }
    calculateRecoveryStake(valueToRecover) {
        if (valueToRecover <= 0)
            return this.config.initialStake;
        const stake = (valueToRecover * 100) / this.config.profitPercent;
        return Math.max(Math.min(Number(stake.toFixed(2)), this.config.maxStake), this.config.initialStake);
    }
    calculateSorosStake() {
        // Calcula a porcentagem configurada do último lucro
        const sorosValue = (this.lastProfit * this.config.sorosPercent) / 100;
        // Retorna a stake inicial + a porcentagem do lucro
        const nextStake = this.config.initialStake + sorosValue;
        return Math.max(Math.min(Number(nextStake.toFixed(2)), this.config.maxStake), this.config.initialStake);
    }
    updateLastTrade(isWin, stake) {
        this.lastWin = isWin;
        if (isWin) {
            // O lucro é calculado com base na stake e na porcentagem de lucro
            this.lastProfit = (stake * this.config.profitPercent) / 100;
            this.consecutiveWins++;
        }
        else {
            this.lastProfit = 0;
            this.consecutiveWins = 0;
            this.sorosCount = 0; // Reset do contador em caso de loss
            this.currentStake = this.config.initialStake;
        }
    }
    setStake(stake) {
        this.currentStake = stake;
    }
    getCurrentBalance() {
        return this.currentBalance;
    }
    updateBalance(newBalance) {
        this.currentBalance = newBalance;
    }
    getConsecutiveWins() {
        return this.consecutiveWins;
    }
}
exports.FixedWithRecoveryManager = FixedWithRecoveryManager;
