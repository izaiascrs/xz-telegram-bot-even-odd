"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MartingaleSorosManager = void 0;
class MartingaleSorosManager {
    constructor(config, initialBalance) {
        this.config = config;
        this.lastWin = false;
        this.consecutiveLosses = 0;
        this.sorosLevel = 0;
        this.currentStake = config.initialStake;
        this.currentBalance = initialBalance;
    }
    calculateNextStake() {
        if (this.lastWin) {
            return this.calculateSorosStake();
        }
        return this.calculateMartingaleStake();
    }
    calculateMartingaleStake() {
        const lastStake = this.currentStake;
        const nextStake = (lastStake * 2) + this.config.initialStake;
        return Math.min(nextStake, this.config.maxStake);
    }
    calculateSorosStake() {
        if (this.sorosLevel >= this.config.sorosLevel) {
            this.sorosLevel = 0;
            return this.config.initialStake;
        }
        const lastProfit = (this.currentStake * this.config.profitPercent) / 100;
        this.sorosLevel++;
        return this.currentStake + lastProfit;
    }
    updateLastTrade(isWin) {
        this.lastWin = isWin;
        if (!isWin) {
            this.consecutiveLosses++;
            this.sorosLevel = 0;
        }
        else {
            this.consecutiveLosses = 0;
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
}
exports.MartingaleSorosManager = MartingaleSorosManager;
