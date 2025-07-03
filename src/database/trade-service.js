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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeService = void 0;
const constants_1 = require("../utils/constants");
class TradeService {
    constructor(db) {
        this.db = db;
        this.SEQUENCE_SIZE = constants_1.TRADES_TO_MONITOR;
    }
    getLocalDate(date) {
        const d = date || new Date();
        // Ajusta para UTC-3 (Brasil)
        const brazilTime = new Date(d.getTime() - (3 * 60 * 60 * 1000));
        return brazilTime.toISOString().split('T')[0];
    }
    getLocalHour(date) {
        const d = date || new Date();
        // Ajusta para UTC-3 (Brasil)
        const brazilTime = new Date(d.getTime() - (3 * 60 * 60 * 1000));
        return brazilTime.getHours();
    }
    saveTrade(trade) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            // Ajusta para UTC-3 (Brasil)
            const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
            const date = brazilTime.toISOString().split('T')[0];
            const hour = brazilTime.getHours();
            // Garante que a hora seja sempre par
            const hourInterval = Math.floor(hour / 2) * 2;
            return new Promise((resolve, reject) => {
                this.db.run(`
        INSERT INTO trades (timestamp, date, hour, is_win, stake, profit, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                    Date.now(),
                    date,
                    hourInterval,
                    trade.isWin ? 1 : 0,
                    trade.stake,
                    trade.profit,
                    trade.balanceAfter
                ], (err) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        console.error('Erro ao salvar trade:', err);
                        reject(err);
                        return;
                    }
                    yield this.updateHourlyStats(date, hourInterval);
                    yield this.updateSequenceStats({
                        isWin: trade.isWin,
                        timestamp: Date.now(),
                        date
                    });
                    resolve();
                }));
            });
        });
    }
    updateHourlyStats(date, hour) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.calculateHourlyStats(date, hour);
            return new Promise((resolve, reject) => {
                this.db.run(`
        INSERT OR REPLACE INTO hourly_stats 
        (date, hour, total_trades, wins, win_rate, total_profit, 
         max_consecutive_wins, max_consecutive_losses, 
         current_consecutive_wins, current_consecutive_losses)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                    date,
                    hour,
                    stats.totalTrades,
                    stats.wins,
                    stats.winRate,
                    stats.totalProfit,
                    stats.maxConsecutiveWins,
                    stats.maxConsecutiveLosses,
                    stats.currentConsecutiveWins,
                    stats.currentConsecutiveLosses
                ], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar estatísticas:', err);
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    calculateHourlyStats(date, hour) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.db.all(`
        SELECT is_win, timestamp
        FROM trades 
        WHERE date = ? AND hour = ?
        ORDER BY timestamp ASC
      `, [date, hour], (err, rows) => {
                    if (err) {
                        console.error('Erro ao calcular estatísticas:', err);
                        resolve({
                            totalTrades: 0,
                            wins: 0,
                            winRate: 0,
                            totalProfit: 0,
                            maxConsecutiveWins: 0,
                            maxConsecutiveLosses: 0,
                            currentConsecutiveWins: 0,
                            currentConsecutiveLosses: 0
                        });
                        return;
                    }
                    let currentWins = 0;
                    let currentLosses = 0;
                    let maxWins = 0;
                    let maxLosses = 0;
                    let totalWins = 0;
                    let totalProfit = 0;
                    rows.forEach((row) => {
                        if (row.is_win) {
                            currentWins++;
                            currentLosses = 0;
                            totalWins++;
                            maxWins = Math.max(maxWins, currentWins);
                            totalProfit += row.profit;
                        }
                        else {
                            currentLosses++;
                            currentWins = 0;
                            maxLosses = Math.max(maxLosses, currentLosses);
                            totalProfit += row.profit;
                        }
                    });
                    const totalTrades = rows.length;
                    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
                    resolve({
                        totalTrades,
                        wins: totalWins,
                        winRate: Number(winRate.toFixed(2)),
                        totalProfit: Number(totalProfit.toFixed(2)),
                        maxConsecutiveWins: maxWins,
                        maxConsecutiveLosses: maxLosses,
                        currentConsecutiveWins: currentWins,
                        currentConsecutiveLosses: currentLosses
                    });
                });
            });
        });
    }
    getHourlyStats(date) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const now = new Date();
                // Ajusta para UTC-3 (Brasil)
                const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
                const currentDate = brazilTime.toISOString().split('T')[0];
                const currentHour = brazilTime.getHours();
                const currentInterval = Math.floor(currentHour / 2) * 2;
                const query = date
                    ? `SELECT * FROM hourly_stats WHERE date = ? ORDER BY hour ASC`
                    : `
          SELECT * FROM hourly_stats 
          WHERE (date < ? OR (date = ? AND hour <= ?)) 
          ORDER BY date DESC, hour ASC
        `;
                const params = date ? [date] : [currentDate, currentDate, currentInterval];
                this.db.all(query, params, (err, rows) => {
                    if (err) {
                        console.error('Erro ao buscar estatísticas:', err);
                        resolve([]);
                        return;
                    }
                    resolve(rows.map(row => ({
                        date: row.date || '',
                        hour: row.hour || 0,
                        totalTrades: row.total_trades || 0,
                        winRate: row.win_rate || 0,
                        totalProfit: Number(row.total_profit || 0),
                        maxConsecutiveWins: row.max_consecutive_wins || 0,
                        maxConsecutiveLosses: row.max_consecutive_losses || 0
                    })));
                });
            });
        });
    }
    clearDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    // Dropar as tabelas existentes
                    this.db.run('DROP TABLE IF EXISTS trades', (err) => {
                        if (err) {
                            console.error('Erro ao dropar tabela trades:', err);
                            reject(err);
                            return;
                        }
                    });
                    this.db.run('DROP TABLE IF EXISTS hourly_stats', (err) => {
                        if (err) {
                            console.error('Erro ao dropar tabela hourly_stats:', err);
                            reject(err);
                            return;
                        }
                    });
                    this.db.run('DROP TABLE IF EXISTS sequence_stats', (err) => {
                        if (err) {
                            console.error('Erro ao dropar tabela sequence_stats:', err);
                            reject(err);
                            return;
                        }
                    });
                    // Recriar as tabelas com a nova estrutura
                    this.db.run(`
          CREATE TABLE trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            date TEXT NOT NULL,
            hour INTEGER NOT NULL,
            is_win BOOLEAN NOT NULL,
            stake REAL NOT NULL,
            profit REAL NOT NULL,
            balance_after REAL NOT NULL
          )
        `);
                    this.db.run(`
          CREATE TABLE hourly_stats (
            date TEXT NOT NULL,
            hour INTEGER NOT NULL,
            total_trades INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            win_rate REAL DEFAULT 0,
            total_profit REAL DEFAULT 0,
            max_consecutive_wins INTEGER DEFAULT 0,
            max_consecutive_losses INTEGER DEFAULT 0,
            current_consecutive_wins INTEGER DEFAULT 0,
            current_consecutive_losses INTEGER DEFAULT 0,
            PRIMARY KEY (date, hour)
          )
        `);
                    this.db.run(`
          CREATE TABLE sequence_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_timestamp INTEGER NOT NULL,
            end_timestamp INTEGER NOT NULL,
            date TEXT NOT NULL,
            sequence_type TEXT NOT NULL,
            trades_count INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            win_rate REAL DEFAULT 0,
            is_completed BOOLEAN DEFAULT 0,
            reference_win_rate REAL
          )
        `, (err) => {
                        if (err) {
                            console.error('Erro ao recriar tabelas:', err);
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            });
        });
    }
    updateSequenceStats(trade) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentSequence = yield this.getCurrentSequence();
            if (!currentSequence) {
                yield this.createNewSequence('current', trade);
                return;
            }
            yield this.updateSequence(currentSequence, trade);
            const currentWinRate = ((currentSequence.wins + (trade.isWin ? 1 : 0)) /
                (currentSequence.trades_count + 1)) * 100;
            if (currentSequence.trades_count + 1 >= this.SEQUENCE_SIZE) {
                if (currentWinRate < 80) {
                    yield this.completeSequence(currentSequence.id, currentWinRate);
                    yield this.createNewSequence('current', trade);
                    yield this.createNewSequence('next', trade, currentWinRate);
                }
                else {
                    yield this.completeSequence(currentSequence.id, currentWinRate);
                    yield this.createNewSequence('current', trade);
                }
                return;
            }
            const nextSequence = yield this.getNextSequence();
            if (nextSequence && nextSequence.reference_win_rate !== null) {
                if (currentWinRate < nextSequence.reference_win_rate) {
                    yield this.resetNextSequence(nextSequence.id);
                    yield this.createNewSequence('next', trade, currentWinRate);
                }
                else {
                    yield this.updateSequence(nextSequence, trade);
                    if (nextSequence.trades_count + 1 >= this.SEQUENCE_SIZE) {
                        const nextWinRate = ((nextSequence.wins + (trade.isWin ? 1 : 0)) /
                            this.SEQUENCE_SIZE) * 100;
                        yield this.completeSequence(nextSequence.id, nextWinRate);
                    }
                }
            }
        });
    }
    getCurrentSequence() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.db.get(`
        SELECT * FROM sequence_stats 
        WHERE sequence_type = 'current' 
        AND trades_count < ? 
        AND is_completed = 0
        ORDER BY id DESC LIMIT 1
      `, [this.SEQUENCE_SIZE], (err, row) => {
                    if (err) {
                        console.error('Erro ao buscar sequência atual:', err);
                        resolve(null);
                        return;
                    }
                    resolve(row || null);
                });
            });
        });
    }
    getNextSequence() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.db.get(`
        SELECT * FROM sequence_stats 
        WHERE sequence_type = 'next' 
        AND trades_count < ? 
        AND is_completed = 0
        ORDER BY id DESC LIMIT 1
      `, [this.SEQUENCE_SIZE], (err, row) => {
                    if (err) {
                        console.error('Erro ao buscar próxima sequência:', err);
                        resolve(null);
                        return;
                    }
                    resolve(row || null);
                });
            });
        });
    }
    createNewSequence(type, trade, referenceWinRate) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.db.run(`
        INSERT INTO sequence_stats (
          start_timestamp, end_timestamp, date, sequence_type,
          trades_count, wins, win_rate, reference_win_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                    trade.timestamp,
                    trade.timestamp,
                    trade.date,
                    type,
                    1,
                    trade.isWin ? 1 : 0,
                    trade.isWin ? 100 : 0,
                    referenceWinRate || null
                ], (err) => {
                    if (err) {
                        console.error('Erro ao criar nova sequência:', err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    updateSequence(sequence, trade) {
        return __awaiter(this, void 0, void 0, function* () {
            const newWins = sequence.wins + (trade.isWin ? 1 : 0);
            const newCount = sequence.trades_count + 1;
            const newWinRate = (newWins / newCount) * 100;
            return new Promise((resolve, reject) => {
                this.db.run(`
        UPDATE sequence_stats 
        SET trades_count = ?,
            wins = ?,
            win_rate = ?,
            end_timestamp = ?,
            is_completed = ?
        WHERE id = ?
      `, [
                    newCount,
                    newWins,
                    newWinRate,
                    trade.timestamp,
                    newCount >= this.SEQUENCE_SIZE ? 1 : 0,
                    sequence.id
                ], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar sequência:', err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    resetNextSequence(sequenceId) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.db.run(`
        UPDATE sequence_stats 
        SET is_completed = 1
        WHERE id = ?
      `, [sequenceId], (err) => {
                    if (err) {
                        console.error('Erro ao resetar sequência:', err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    completeSequence(sequenceId, finalWinRate) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.db.run(`
        UPDATE sequence_stats 
        SET is_completed = 1,
            completed_win_rate = ?
        WHERE id = ?
      `, [finalWinRate, sequenceId], (err) => {
                    if (err) {
                        console.error('Erro ao completar sequência:', err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    getSequenceStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.db.all(`
        SELECT 
          sequence_type,
          trades_count,
          wins,
          win_rate,
          is_completed,
          reference_win_rate,
          completed_win_rate,
          date
        FROM sequence_stats 
        ORDER BY start_timestamp DESC, id DESC
        LIMIT 10
      `, [], (err, rows) => {
                    if (err) {
                        console.error('Erro ao buscar estatísticas de sequência:', err);
                        resolve([]);
                        return;
                    }
                    resolve(rows.map(row => ({
                        type: row.sequence_type,
                        tradesCount: row.trades_count,
                        winRate: row.win_rate,
                        isCompleted: Boolean(row.is_completed),
                        referenceWinRate: row.reference_win_rate,
                        completedWinRate: row.completed_win_rate,
                        date: row.date
                    })));
                });
            });
        });
    }
    getComparisonStats(targetHour) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                // Ajusta para hora par mais próxima
                const hour = Math.floor(targetHour / 2) * 2;
                this.db.all(`
        SELECT * FROM hourly_stats 
        WHERE hour = ?
        ORDER BY date DESC
        LIMIT 7  -- últimos 7 dias
      `, [hour], (err, rows) => {
                    if (err) {
                        console.error('Erro ao buscar estatísticas comparativas:', err);
                        resolve([]);
                        return;
                    }
                    resolve(rows.map(row => ({
                        date: row.date,
                        hour: row.hour,
                        totalTrades: row.total_trades || 0,
                        winRate: row.win_rate || 0,
                        totalProfit: Number(row.total_profit || 0),
                        maxConsecutiveWins: row.max_consecutive_wins || 0,
                        maxConsecutiveLosses: row.max_consecutive_losses || 0
                    })));
                });
            });
        });
    }
}
exports.TradeService = TradeService;
