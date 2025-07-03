"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealMoneyManager = void 0;
const martingale_soros_1 = require("./martingale-soros");
const fixed_with_recovery_1 = require("./fixed-with-recovery");
class RealMoneyManager {
    constructor(config, initialBalance) {
        this.consecutiveLosses = 0;
        this.sorosLevel = 0;
        this.lastTrade = null;
        this.accumulatedProfit = 0;
        this.config = config;
        this.currentBalance = initialBalance;
        this.currentStake = config.initialStake;
        this.accumulatedProfit = 0;
        switch (config.type) {
            case "martingale-soros":
                this.manager = new martingale_soros_1.MartingaleSorosManager(config, initialBalance);
                break;
            case "fixed-with-recovery":
                this.manager = new fixed_with_recovery_1.FixedWithRecoveryManager(config, initialBalance);
                break;
            default:
                this.manager = new fixed_with_recovery_1.FixedWithRecoveryManager(Object.assign(Object.assign({}, config), { type: "fixed-with-recovery", enableSoros: false, winsBeforeRecovery: 999 // Número alto para nunca ativar recovery no modo fixed
                 }), initialBalance);
        }
    }
    calculateNextStake() {
        return this.manager.calculateNextStake();
    }
    updateLastTrade(isWin, stake) {
        if (this.manager instanceof fixed_with_recovery_1.FixedWithRecoveryManager) {
            this.manager.updateLastTrade(isWin, stake || this.currentStake);
        }
        else {
            this.manager.updateLastTrade(isWin);
        }
    }
    setStake(stake) {
        this.manager.setStake(stake);
    }
    getCurrentBalance() {
        return this.manager.getCurrentBalance();
    }
    updateBalance(newBalance) {
        this.manager.updateBalance(newBalance);
    }
    getLastTrade() {
        return this.lastTrade;
    }
    getStats() {
        var _a, _b;
        return {
            currentBalance: this.currentBalance,
            consecutiveLosses: this.consecutiveLosses,
            sorosLevel: this.sorosLevel,
            lastStake: ((_a = this.lastTrade) === null || _a === void 0 ? void 0 : _a.stake) || 0,
            lastProfit: ((_b = this.lastTrade) === null || _b === void 0 ? void 0 : _b.profit) || 0
        };
    }
}
exports.RealMoneyManager = RealMoneyManager;
