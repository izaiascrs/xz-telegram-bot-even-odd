"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneyManager = exports.PayoutCalculatorFactory = void 0;
class AbovePayoutCalculator {
    calculatePayout(strategy) {
        var _a;
        const digit = (_a = strategy.config.compareDigit) !== null && _a !== void 0 ? _a : 0;
        if (digit === 0)
            return 8;
        if (digit === 1)
            return 22;
        if (digit === 2)
            return 39;
        if (digit === 3)
            return 61;
        if (digit === 4)
            return 92;
        if (digit === 5)
            return 137;
        if (digit === 6)
            return 211;
        if (digit === 7)
            return 350;
        if (digit === 8)
            return 720;
        return 8;
    }
}
class BelowPayoutCalculator {
    calculatePayout(strategy) {
        var _a;
        const digit = (_a = strategy.config.compareDigit) !== null && _a !== void 0 ? _a : 0;
        if (digit === 1)
            return 720;
        if (digit === 2)
            return 350;
        if (digit === 3)
            return 211;
        if (digit === 4)
            return 137;
        if (digit === 5)
            return 92;
        if (digit === 6)
            return 61;
        if (digit === 7)
            return 39;
        if (digit === 8)
            return 22;
        if (digit === 9)
            return 8;
        return 8;
    }
}
class EvenPayoutCalculator {
    calculatePayout() {
        return 92;
    }
}
class OddPayoutCalculator {
    calculatePayout() {
        return 92;
    }
}
class MatchPayoutCalculator {
    calculatePayout() {
        return 720;
    }
}
class DifferPayoutCalculator {
    calculatePayout() {
        return 8;
    }
}
class BetweenPayoutCalculator {
    calculatePayout(strategy) {
        var _a, _b, _c, _d;
        const belowDigit = Math.min((_a = strategy.config.compareDigit) !== null && _a !== void 0 ? _a : 0, (_b = strategy.config.compareDigit2) !== null && _b !== void 0 ? _b : 0);
        const aboveDigit = Math.max((_c = strategy.config.compareDigit) !== null && _c !== void 0 ? _c : 0, (_d = strategy.config.compareDigit2) !== null && _d !== void 0 ? _d : 0);
        // Verifica explicitamente qual lado ganhou
        let winSide = "";
        if (strategy.config.resultDigit < belowDigit) {
            winSide = "below";
        }
        else if (strategy.config.resultDigit > aboveDigit) {
            winSide = "above";
        }
        if (winSide === "above") {
            if (aboveDigit === 0)
                return (8 - 100);
            if (aboveDigit === 1)
                return (22 - 100);
            if (aboveDigit === 2)
                return (39 - 100);
            if (aboveDigit === 3)
                return (61 - 100);
            if (aboveDigit === 4)
                return (92 - 100);
            if (aboveDigit === 5)
                return (137 - 100);
            if (aboveDigit === 6)
                return (211 - 100);
            if (aboveDigit === 7)
                return (350 - 100);
            if (aboveDigit === 8)
                return (720 - 100);
        }
        if (winSide === "below") {
            if (belowDigit === 1)
                return (720 - 100);
            if (belowDigit === 2)
                return (350 - 100);
            if (belowDigit === 3)
                return (211 - 100);
            if (belowDigit === 4)
                return (137 - 100);
            if (belowDigit === 5)
                return (92 - 100);
            if (belowDigit === 6)
                return (61 - 100);
            if (belowDigit === 7)
                return (39 - 100);
            if (belowDigit === 8)
                return (22 - 100);
            if (belowDigit === 9)
                return (8 - 100);
        }
        return 0;
    }
}
class DefaultPayoutCalculator {
    calculatePayout() {
        return 8;
    }
}
class CallPayoutCalculator {
    calculatePayout() {
        return 92;
    }
}
class PutPayoutCalculator {
    calculatePayout() {
        return 92;
    }
}
class PayoutCalculatorFactory {
    static createCalculator(strategy) {
        switch (strategy.config.compareType) {
            case "above":
                return new AbovePayoutCalculator();
            case "below":
                return new BelowPayoutCalculator();
            case "even":
                return new EvenPayoutCalculator();
            case "odd":
                return new OddPayoutCalculator();
            case "match":
                return new MatchPayoutCalculator();
            case "differ":
                return new DifferPayoutCalculator();
            case "between":
                return new BetweenPayoutCalculator();
            case "call":
                return new CallPayoutCalculator();
            case "put":
                return new PutPayoutCalculator();
            default:
                return new DefaultPayoutCalculator();
        }
    }
}
exports.PayoutCalculatorFactory = PayoutCalculatorFactory;
class MoneyManager {
    constructor(config, initialBalance, strategy) {
        var _a;
        this.config = config;
        this.trades = [];
        this.totalVolume = 0;
        this.consecutiveLosses = 0;
        this.maxStakeUsed = {
            stake: 0,
            balance: 0,
            tradeNumber: 0,
        };
        this.winsBeforeMartingale = 0; // Contador de vitórias antes de ativar martingale
        this.accumulatedLoss = 0;
        this.canUseMartingale = false; // Flag para controlar quando usar martingale
        this.baseStake = 0.35; // Inicializa com stake mínima
        this.waitingLossSequence = false; // Flag para indicar que está esperando sequência
        this.waitingWinSequence = false; // Flag para indicar que está esperando sequência
        this.consecutiveLossCount = 0; // Contador de losses consecutivos
        this.consecutiveWinCount = 0; // Contador de wins consecutivos
        this.cashoutBalance = 0;
        this.sorosLevelCount = 0;
        this.lastSorosProfit = 0;
        this.initialBalance = initialBalance;
        this.currentBalance = initialBalance;
        this.maxBalance = initialBalance;
        this.minBalance = initialBalance;
        this.totalBalance = initialBalance; // Inicializa saldo total
        this.sessionBalance = initialBalance; // Inicializa saldo da sessão
        this.initialSessionBalance =
            initialBalance / (((_a = this.config.fractionalConfig) === null || _a === void 0 ? void 0 : _a.divisions) || 10); // Inicializa saldo inicial da sessão
        this.lossVirtual = config.lossVirtual || 0;
        this.winVirtual = config.winVirtual || 0;
        this.currentWinsRequired = this.config.winsBeforeMartingale;
        this.sorosLevel = this.config.sorosLevel || 0;
        this.lastSorosProfit = 0;
        this.strategy = strategy;
        this.payoutCalculator = PayoutCalculatorFactory.createCalculator(strategy);
    }
    processTradeSignals(backTestResults) {
        const targetTickResults = backTestResults.find((r) => r.ticks === this.config.targetTick);
        if (!targetTickResults)
            return this.getEmptyResults();
        // Reseta valores iniciais
        this.currentBalance = this.initialBalance;
        this.cashoutBalance = 0;
        this.trades = [];
        this.accumulatedLoss = 0;
        this.winsBeforeMartingale = 0;
        for (const trade of targetTickResults.trades) {
            if (this.currentBalance <= 0)
                break;
            // Atualiza o resultDigit antes de calcular o stake
            this.strategy.config.resultDigit = trade.resultDigit;
            const stake = this.calculateStake();
            const isVirtual = this.waitingLossSequence || this.waitingWinSequence;
            // Calcula o payout usando o resultDigit atual
            const payout = this.payoutCalculator.calculatePayout(this.strategy);
            this.config.profitPercent = payout;
            // Calcula o profit usando a taxa de lucro
            const profitRate = this.config.profitPercent / 100;
            const isBetweenType = this.strategy.config.compareType === "between";
            const profit = trade.success
                ? stake * profitRate
                : -stake * (isBetweenType ? 2 : 1);
            if (!isVirtual) {
                this.currentBalance += profit;
                this.totalVolume += stake;
                if (this.currentBalance <= 0) {
                    this.currentBalance = 0;
                }
                // Verifica se atingiu cashout
                if (this.config.cashout && this.config.cashout > 0) {
                    const currentProfit = this.currentBalance - this.initialBalance;
                    if (currentProfit >= this.config.cashout) {
                        const cashoutMultiple = Math.floor(currentProfit / this.config.cashout);
                        const totalCashout = cashoutMultiple * this.config.cashout;
                        this.cashoutBalance += totalCashout;
                        this.currentBalance -= totalCashout;
                    }
                }
                // Atualiza maxStakeInfo
                if (stake > this.maxStakeUsed.stake) {
                    this.maxStakeUsed = {
                        stake,
                        balance: this.currentBalance,
                        tradeNumber: this.trades.length + 1,
                    };
                }
            }
            const tradeResult = {
                success: trade.success,
                stake,
                profit,
                balance: this.currentBalance,
                type: trade.success ? "win" : "loss",
                resultDigit: trade.resultDigit,
                entryDigit: trade.entryDigit,
                entryTime: trade.entryTime,
                resultTime: trade.resultTime,
                tradeType: trade.tradeType,
                isVirtual,
            };
            this.trades.push(tradeResult);
            if (!isVirtual) {
                this.updateStats(tradeResult);
            }
            if (this.currentBalance <= 0)
                break;
        }
        return {
            finalBalance: this.currentBalance + this.cashoutBalance,
            totalVolume: this.totalVolume,
            maxDrawdown: this.maxBalance > 0
                ? ((this.maxBalance - this.minBalance) / this.maxBalance) * 100
                : 0,
            maxBalance: this.maxBalance,
            minBalance: this.minBalance,
            trades: this.trades,
            maxStakeInfo: this.maxStakeUsed,
            cashoutBalance: this.cashoutBalance,
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateStats(_trade) {
        this.maxBalance = Math.max(this.maxBalance, this.currentBalance);
        this.minBalance = Math.min(this.minBalance, this.currentBalance);
    }
    calculateStake() {
        if (this.currentBalance <= 0)
            return 0;
        const lastTrade = this.trades[this.trades.length - 1];
        // Se não tem trade anterior, faz primeira entrada
        if (!lastTrade)
            return this.config.initialStake;
        // Se tem loss virtual configurado
        if (this.lossVirtual > 0) {
            // Se está esperando sequência de losses
            if (this.waitingLossSequence) {
                // Se última trade foi win, reseta contagem mas continua virtual
                if (lastTrade.type === "win") {
                    this.consecutiveLossCount = 0;
                }
                else if (lastTrade.type === "loss") {
                    // Se foi loss, incrementa contador
                    this.consecutiveLossCount++;
                    // Se atingiu número necessário de losses consecutivos
                    if (this.consecutiveLossCount >= this.lossVirtual) {
                        this.waitingLossSequence = false;
                        this.consecutiveLossCount = 0;
                        // Retorna stake para próxima trade válida
                        return this.calculateNextStake(lastTrade);
                    }
                }
                // Enquanto estiver esperando, todas as trades são virtuais
                return this.config.initialStake;
            }
            // Se não está em espera e última trade foi loss, começa nova sequência
            if (lastTrade.type === "loss") {
                this.waitingLossSequence = true;
                this.consecutiveLossCount = 0; // Começa do zero pois é uma nova sequência
                return this.config.initialStake;
            }
        }
        if (this.winVirtual > 0) {
            if (this.waitingWinSequence) {
                if (lastTrade.type === "loss") {
                    this.consecutiveWinCount = 0;
                }
                else if (lastTrade.type === "win") {
                    this.consecutiveWinCount++;
                    if (this.consecutiveWinCount >= this.winVirtual) {
                        this.waitingWinSequence = false;
                        this.consecutiveWinCount = 0;
                        lastTrade.profit = 0;
                        // Aqui mantemos o accumulatedLoss para calcular o próximo martingale
                        return this.calculateNextStake(lastTrade);
                    }
                }
                // Durante a sequência virtual, mantemos o accumulatedLoss mas retornamos stake inicial
                return this.config.initialStake;
            }
            if (lastTrade.type === "loss") {
                this.waitingWinSequence = true;
                this.consecutiveWinCount = 0;
                // Importante: Aqui acumulamos a perda mesmo antes de entrar na sequência virtual
                this.accumulatedLoss += Math.abs(lastTrade.stake);
                return this.config.initialStake;
            }
        }
        return this.calculateNextStake(lastTrade);
    }
    calculateNextStake(lastTrade) {
        switch (this.config.type) {
            case "fixed":
                return this.calculateFixedStake();
            case "martingale":
                return this.calculateMartingaleStake(lastTrade);
            case "martingale-optimized":
                return this.calculateOptimizedMartingale(lastTrade);
            case "soros":
                return this.calculateSorosStake(lastTrade);
            case "martingale-soros":
                return this.calculateMartingaleSorosStake(lastTrade);
            case "pattern-based":
                return this.calculatePatternBasedStake(lastTrade);
            case "recovery":
                return this.calculateRecoveryStake(lastTrade);
            case "fractional-martingale":
                return this.calculateFractionalMartingaleStake(lastTrade);
            case "hybrid":
                return this.calculateHybridStake(lastTrade);
            default:
                return this.calculateCustomStake(lastTrade);
        }
    }
    calculateFixedStake() {
        return Math.min(this.config.initialStake, this.currentBalance);
    }
    calculateMartingaleStake(lastTrade) {
        const winsNeeded = this.config.winsBeforeMartingale || 0;
        if (this.waitingWinSequence || this.waitingLossSequence) {
            return 0;
        }
        // Primeira trade
        if (!lastTrade) {
            this.winsBeforeMartingale = 0;
            this.canUseMartingale = winsNeeded === 0;
            this.accumulatedLoss = 0;
            return this.config.initialStake;
        }
        // Se perdeu
        if (lastTrade.type === "loss") {
            this.accumulatedLoss += Math.abs(lastTrade.stake);
            if (winsNeeded > 0) {
                this.winsBeforeMartingale = 0;
                this.canUseMartingale = false;
                return this.config.initialStake;
            }
            // Se winsNeeded = 0, calcula martingale direto
            const profitRate = this.config.profitPercent / 100;
            // Usa multiplicador se definido, senão usa stake inicial
            const requiredStake = this.config.martingaleMultiplier
                ? (this.accumulatedLoss * this.config.martingaleMultiplier) / profitRate
                : (this.accumulatedLoss + this.config.initialStake) / profitRate;
            return Math.min(requiredStake, this.config.maxStake || Infinity, this.currentBalance);
        }
        // Se ganhou
        if (lastTrade.type === "win") {
            // Se estava usando martingale e ganhou
            if (lastTrade.stake > this.config.initialStake) {
                this.accumulatedLoss = 0;
                this.winsBeforeMartingale = 0;
                this.canUseMartingale = winsNeeded === 0; // Se winsNeeded = 0, mantém martingale ativo
                return this.config.initialStake;
            }
            // Se precisa de vitórias para ativar martingale
            if (winsNeeded > 0) {
                this.winsBeforeMartingale++;
                if (this.winsBeforeMartingale >= winsNeeded) {
                    this.canUseMartingale = true;
                }
            }
            // Se tem perdas e pode usar martingale
            if ((winsNeeded === 0 || this.canUseMartingale) &&
                this.accumulatedLoss > 0) {
                const profitRate = this.config.profitPercent / 100;
                const requiredStake = (this.accumulatedLoss + this.config.initialStake) / profitRate;
                return Math.min(requiredStake, this.config.maxStake || Infinity, this.currentBalance);
            }
            return this.config.initialStake;
        }
        return this.config.initialStake;
    }
    calculateSorosStake(lastTrade) {
        if (lastTrade.type === "loss") {
            this.sorosLevelCount = 0;
            this.lastSorosProfit = 0;
            return this.config.initialStake;
        }
        // Adiciona o lucro da última trade ao stake inicial
        this.lastSorosProfit += lastTrade.profit;
        const newStake = this.config.initialStake + this.lastSorosProfit;
        this.sorosLevelCount++;
        if (this.sorosLevelCount > this.sorosLevel || lastTrade.profit === 0) {
            this.sorosLevelCount = 0;
            this.lastSorosProfit = 0;
            return this.config.initialStake;
        }
        return Math.min(newStake, this.config.maxStake || Infinity, this.currentBalance);
    }
    calculateMartingaleSorosStake(lastTrade) {
        const winsNeeded = this.currentWinsRequired;
        if (this.currentBalance <= 0)
            return 0;
        if (!lastTrade)
            return Math.min(this.config.initialStake, this.currentBalance);
        // Se perdeu
        if (lastTrade.type === "loss") {
            this.accumulatedLoss += Math.abs(lastTrade.profit);
            this.consecutiveLosses++;
            this.winsBeforeMartingale = 0;
            this.sorosLevelCount = 0;
            // Ao perder, também atualiza o número de wins necessários
            this.currentWinsRequired = this.getNextWinsRequired();
            if (this.winsBeforeMartingale <= 0) {
                const profitRate = this.config.profitPercent / 100;
                const requiredStake = this.accumulatedLoss / profitRate;
                return Math.min(requiredStake, this.currentBalance);
            }
            return Math.min(this.config.initialStake, this.currentBalance);
        }
        // Se ganhou
        if (lastTrade.type === "win") {
            // Se estava usando martingale (stake maior que inicial)
            if (lastTrade.stake > this.config.initialStake) {
                this.accumulatedLoss = 0;
                this.winsBeforeMartingale = 0;
                // Após ganhar com martingale, atualiza wins necessários
                this.currentWinsRequired = this.getNextWinsRequired();
                return this.config.initialStake;
            }
            // Se tem perdas acumuladas
            if (this.accumulatedLoss > 0) {
                this.winsBeforeMartingale++;
                // if(this.consecutiveLosses >= 2 && this.winsBeforeMartingale >= winsNeeded) {
                //   console.log('martingale losses', this.consecutiveLosses, this.winsBeforeMartingale, winsNeeded);
                //   this.consecutiveLosses = 0;
                // }
                // Se atingiu wins necessárias, usa martingale
                if (this.winsBeforeMartingale >= winsNeeded) {
                    const profitRate = this.config.profitPercent / 100;
                    const requiredStake = this.accumulatedLoss / profitRate;
                    return Math.min(requiredStake, this.currentBalance);
                }
                // Se não atingiu wins, continua com stake inicial
                return Math.min(this.config.initialStake, this.currentBalance);
            }
            if (this.sorosLevelCount > this.sorosLevel) {
                this.sorosLevelCount = 0;
                return Math.min(lastTrade.profit + this.config.initialStake, this.currentBalance);
            }
            // Se ganhou com stake normal ou soros, continua soros
            return Math.min(lastTrade.profit + this.config.initialStake, this.currentBalance);
        }
        return Math.min(this.config.initialStake, this.currentBalance);
    }
    calculateRecoveryStake(_lastTrade) {
        console.log("calculateRecoveryStake", _lastTrade);
        // Implemente o cálculo do recovery stake
        return this.config.initialStake;
    }
    calculateFractionalMartingaleStake(lastTrade) {
        var _a;
        const divisions = ((_a = this.config.fractionalConfig) === null || _a === void 0 ? void 0 : _a.divisions) || 10;
        const winsNeeded = this.config.winsBeforeMartingale || 0;
        if (this.currentBalance <= 0)
            return 0;
        // Primeira trade ou início de nova sessão
        if (!lastTrade) {
            this.totalBalance = this.currentBalance;
            this.initialSessionBalance = this.totalBalance / divisions;
            this.sessionBalance = this.initialSessionBalance;
            this.accumulatedLoss = 0;
            this.winsBeforeMartingale = 0;
            this.canUseMartingale = false;
            return this.config.initialStake;
        }
        // Se perdeu
        if (lastTrade.type === "loss") {
            this.sessionBalance += lastTrade.profit;
            this.accumulatedLoss += Math.abs(lastTrade.profit);
            this.winsBeforeMartingale = 0; // Reseta contador de vitórias
            this.canUseMartingale = winsNeeded === 0; // Desativa martingale após perda
            // Se não tem saldo suficiente para próxima stake mínima
            if (this.sessionBalance < this.config.initialStake) {
                if (this.totalBalance > this.initialSessionBalance) {
                    this.totalBalance -= this.initialSessionBalance;
                    this.sessionBalance = this.initialSessionBalance;
                    this.accumulatedLoss = 0;
                    return this.config.initialStake;
                }
                return 0;
            }
            // Só usa martingale se estiver ativado
            if (this.canUseMartingale && this.accumulatedLoss > 0) {
                const profitRate = this.config.profitPercent / 100;
                const requiredStake = (this.accumulatedLoss + this.config.initialStake) / profitRate;
                if (requiredStake >= this.sessionBalance) {
                    const finalStake = Math.floor(this.sessionBalance * 100) / 100;
                    this.sessionBalance = 0;
                    return finalStake;
                }
                return requiredStake;
            }
            return this.config.initialStake;
        }
        // Se ganhou
        if (lastTrade.type === "win") {
            this.sessionBalance += lastTrade.profit;
            // Se estava usando martingale e ganhou
            if (lastTrade.stake > this.config.initialStake) {
                this.accumulatedLoss = 0;
                this.winsBeforeMartingale = 0;
                this.canUseMartingale = false;
                return this.config.initialStake;
            }
            // Incrementa vitórias e verifica se pode ativar martingale
            if (winsNeeded > 0) {
                this.winsBeforeMartingale++;
                if (this.winsBeforeMartingale >= winsNeeded) {
                    this.canUseMartingale = true;
                }
            }
            else {
                // Se não precisa de vitórias, ativa martingale direto
                this.canUseMartingale = true;
            }
            // Se tem perdas e pode usar martingale
            if (this.canUseMartingale && this.accumulatedLoss > 0) {
                const profitRate = this.config.profitPercent / 100;
                const requiredStake = (this.accumulatedLoss + this.config.initialStake) / profitRate;
                if (requiredStake >= this.sessionBalance) {
                    const finalStake = Math.floor(this.sessionBalance * 100) / 100;
                    this.sessionBalance = 0;
                    return finalStake;
                }
                return requiredStake;
            }
            return this.config.initialStake;
        }
        return this.config.initialStake;
    }
    calculateHybridStake(lastTrade) {
        if (!lastTrade || this.currentBalance <= 0) {
            return this.config.initialStake;
        }
        const ultimas10 = this.trades.slice(-10);
        const lossStreak = this.getConsecutiveCount(ultimas10, "loss");
        const winRate = ultimas10.filter((t) => t.type === "win").length / ultimas10.length;
        // 1. Modo Recuperação (após losses)
        if (lossStreak >= 2) {
            const recuperacao = this.config.initialStake * 2.2;
            return Math.min(recuperacao, this.currentBalance * 0.08);
        }
        // 2. Modo Conservador (após drawdown)
        const drawdown = (this.maxBalance - this.currentBalance) / this.maxBalance;
        if (drawdown > 0.1) {
            return this.config.initialStake; // Stake mínima
        }
        // 3. Modo Agressivo (momento favorável)
        if (winRate >= 0.8 && lossStreak === 0) {
            return this.config.initialStake * 1.5;
        }
        // 4. Modo Skip (condições desfavoráveis)
        if (winRate < 0.7 && this.currentBalance < this.initialBalance * 0.95) {
            return 0; // Não opera
        }
        return this.config.initialStake;
    }
    calculateCustomStake(lastTrade) {
        // Primeira trade
        if (!lastTrade) {
            this.baseStake = this.config.initialStake;
            return this.baseStake;
        }
        const lossVirtual = this.config.lossVirtual || 0;
        // Se perdeu
        if (lastTrade.type === "loss") {
            // Se não está esperando sequência, começa a esperar
            if (!this.waitingLossSequence) {
                this.waitingLossSequence = true;
                this.consecutiveLossCount = 1;
                return 0; // Para de operar e começa a contar
            }
            // Se está esperando, incrementa contador
            this.consecutiveLossCount++;
            // Se atingiu a sequência necessária
            if (this.consecutiveLossCount >= lossVirtual) {
                this.waitingLossSequence = false;
                this.consecutiveLossCount = 0;
                return this.baseStake; // Libera próxima trade
            }
            return 0; // Continua esperando
        }
        // Se ganhou
        if (lastTrade.type === "win") {
            // Reseta contagem de losses consecutivos
            this.consecutiveLossCount = 0;
            // Se não está esperando sequência, opera normal
            if (!this.waitingLossSequence) {
                return this.baseStake;
            }
            return 0; // Se está esperando sequência, continua esperando
        }
        return this.baseStake;
    }
    calculatePatternBasedStake(lastTrade) {
        // Se não tem trade anterior ou saldo insuficiente
        if (!lastTrade || this.currentBalance <= 0) {
            return Math.min(this.config.initialStake, this.currentBalance);
        }
        // Analisa últimas 10 trades para padrões
        const recentTrades = this.trades.slice(-10);
        const winStreak = this.getConsecutiveCount(recentTrades, "win");
        const lossStreak = this.getConsecutiveCount(recentTrades, "loss");
        // Calcula win rate recente
        const recentWinRate = recentTrades.filter((t) => t.type === "win").length / recentTrades.length;
        // Calcula distância do drawdown
        const currentDrawdown = (this.maxBalance - this.currentBalance) / this.maxBalance;
        const drawdownDistance = 1 - currentDrawdown / 0.15; // 15% max drawdown
        // Calcula multiplicador baseado no contexto
        let multiplier = 1;
        // 1. Após 2 losses seguidos (maior probabilidade de win)
        if (lossStreak === 2) {
            multiplier = 2.2; // Stake: 0.77
        }
        // 2. Após 4+ wins seguidos (mantém entrada mínima)
        else if (winStreak >= 4) {
            multiplier = 1; // Stake: 0.35
        }
        // 3. Momento favorável (win rate alto e longe do drawdown)
        else if (recentWinRate >= 0.7 && drawdownDistance >= 0.7) {
            multiplier = 1.5; // Stake: 0.525
        }
        // 4. Momento de proteção
        else if (lossStreak >= 1 && drawdownDistance < 0.3) {
            multiplier = 1; // Stake: 0.35
        }
        // Calcula stake baseada no multiplicador, garantindo mínimo de 0.35
        const stake = Math.max(this.config.initialStake * multiplier, 0.35 // Garante stake mínima
        );
        // Aplica limites de proteção
        return Math.min(stake, this.currentBalance * 0.08, // Máximo 8% do saldo
        this.config.maxStake || Infinity);
    }
    getConsecutiveCount(trades, type) {
        let count = 0;
        for (let i = trades.length - 1; i >= 0; i--) {
            if (trades[i].type === type) {
                count++;
            }
            else {
                break;
            }
        }
        return count;
    }
    getEmptyResults() {
        return {
            finalBalance: this.currentBalance,
            totalVolume: 0,
            maxDrawdown: 0,
            maxBalance: this.currentBalance,
            minBalance: this.currentBalance,
            trades: [],
            maxStakeInfo: {
                stake: 0,
                balance: 0,
                tradeNumber: 0,
            },
            cashoutBalance: 0, // Adiciona cashoutBalance inicial
        };
    }
    getNextWinsRequired() {
        const max = this.config.winsBeforeMartingale;
        const min = this.config.winsBeforeMartingaleMin || 1;
        // Se atual é o máximo, volta para o mínimo
        if (this.currentWinsRequired >= max) {
            return min;
        }
        // Senão incrementa
        const next = this.currentWinsRequired + 1;
        return next;
    }
    calculateOptimizedMartingale(lastTrade) {
        if (!lastTrade || this.currentBalance <= 0) {
            return this.config.initialStake;
        }
        // Sequência de multiplicadores mais conservadora
        const multiplicadores = [
            1, // Primeira entrada: 0.35
            1.8, // Após 1 loss: 0.63
            2.8, // Após 2 losses: 0.98
            4.2, // Após 3 losses: 1.47
        ];
        if (lastTrade.type === "loss") {
            const lossStreak = this.getConsecutiveCount(this.trades, "loss");
            if (lossStreak >= multiplicadores.length) {
                return 0; // Para de operar após sequência máxima
            }
            const multiplier = multiplicadores[lossStreak];
            return this.config.initialStake * multiplier;
        }
        return this.config.initialStake;
    }
}
exports.MoneyManager = MoneyManager;
