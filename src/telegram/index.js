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
exports.TelegramManager = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const constants_1 = require("../utils/constants");
class TelegramManager {
    constructor(tradeService) {
        this.tradeService = tradeService;
        this.isRunning = false;
        this.startTime = null;
        this.trades = { win: 0, loss: 0 };
        this.balance = 0;
        this.bot = new node_telegram_bot_api_1.default(constants_1.TELEGRAM_TOKEN, { polling: true });
        this.setupCommands();
        // Adicionar este listener temporário para mostrar IDs
        this.bot.on('message', (msg) => {
            var _a, _b;
            console.log(`Mensagem recebida de: Chat ID: ${msg.chat.id}, User ID: ${(_a = msg.from) === null || _a === void 0 ? void 0 : _a.id}`);
            if (msg.text === '/myid') {
                this.bot.sendMessage(msg.chat.id, `🆔 Suas informações:\nChat ID: ${msg.chat.id}\nUser ID: ${(_b = msg.from) === null || _b === void 0 ? void 0 : _b.id}`);
            }
        });
    }
    setupCommands() {
        this.bot.onText(/\/start/, (msg) => {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            if (!this.isAdminChat(msg.chat.id)) {
                this.bot.sendMessage(msg.chat.id, '⛔ Apenas o administrador pode iniciar o bot!');
                return;
            }
            if (!this.isRunning) {
                this.isRunning = true;
                if (!this.startTime) {
                    this.startTime = new Date();
                }
                this.bot.sendMessage(msg.chat.id, '🟢 Bot iniciado com sucesso!');
                constants_1.ALLOWED_CHAT_IDS.forEach(chatId => {
                    if (chatId !== msg.chat.id) {
                        this.bot.sendMessage(chatId, '🟢 Bot foi iniciado pelo administrador');
                    }
                });
            }
            else {
                this.bot.sendMessage(msg.chat.id, '⚠️ Bot já está em execução!');
            }
        });
        this.bot.onText(/\/stop/, (msg) => {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            if (!this.isAdminChat(msg.chat.id)) {
                this.bot.sendMessage(msg.chat.id, '⛔ Apenas o administrador pode parar o bot!');
                return;
            }
            if (this.isRunning) {
                this.isRunning = false;
                this.bot.sendMessage(msg.chat.id, '🔴 Bot parado com sucesso!');
                constants_1.ALLOWED_CHAT_IDS.forEach(chatId => {
                    if (chatId !== msg.chat.id) {
                        this.bot.sendMessage(chatId, '🔴 Bot foi parado pelo administrador');
                    }
                });
            }
            else {
                this.bot.sendMessage(msg.chat.id, '⚠️ Bot já está parado!');
            }
        });
        this.bot.onText(/\/reset/, (msg) => {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            if (!this.isAdminChat(msg.chat.id)) {
                this.bot.sendMessage(msg.chat.id, '⛔ Apenas o administrador pode resetar o bot!');
                return;
            }
            const wasRunning = this.isRunning;
            this.isRunning = false;
            this.startTime = null;
            this.trades = { win: 0, loss: 0 };
            this.balance = 0;
            const message = '*🔄 Bot resetado com sucesso!*\n\n' +
                'Todas as estatísticas foram zeradas.\n' +
                'Use /start para iniciar uma nova sessão.';
            this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
            constants_1.ALLOWED_CHAT_IDS.forEach(chatId => {
                if (chatId !== msg.chat.id) {
                    this.bot.sendMessage(chatId, '🔄 Bot foi resetado pelo administrador');
                }
            });
            if (wasRunning) {
                this.bot.sendMessage(msg.chat.id, '⚠️ Bot estava em execução e foi parado. Use /start para iniciar novamente.');
            }
        });
        this.bot.onText(/\/status/, (msg) => {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            const status = this.getBasicStatus();
            this.bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
        });
        this.bot.onText(/\/stats(?:\s+(\d{2}-\d{2}))?/, (msg, match) => __awaiter(this, void 0, void 0, function* () {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            const now = new Date();
            const currentYear = now.getFullYear();
            let date;
            if (match === null || match === void 0 ? void 0 : match[1]) {
                // Converter DD-MM para YYYY-MM-DD
                const [day, month] = match[1].split('-');
                date = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            else {
                // Usar data atual
                date = now.toISOString().split('T')[0];
            }
            const stats = yield this.tradeService.getHourlyStats(date);
            if (stats.length === 0) {
                this.bot.sendMessage(msg.chat.id, '📊 Nenhuma estatística disponível' +
                    (date ? ` para ${match === null || match === void 0 ? void 0 : match[1]}` : ' para hoje') + '.');
                return;
            }
            // Formatar a data para exibição (DD/MM)
            const displayDate = date.split('-').reverse().slice(0, 2).join('/');
            let message = `*📊 Estatísticas do dia ${displayDate}*\n\n`;
            // Calcular totais do dia
            const totalTrades = stats.reduce((sum, s) => sum + s.totalTrades, 0);
            const totalWins = stats.reduce((sum, s) => sum + (s.totalTrades * s.winRate / 100), 0);
            const totalLosses = totalTrades - Math.floor(totalWins);
            const totalWinRate = (totalWins / totalTrades) * 100;
            const totalProfit = stats.reduce((sum, s) => sum + s.totalProfit, 0);
            // Encontrar máximos do dia
            const maxConsecutiveWins = Math.max(...stats.map(s => s.maxConsecutiveWins));
            const maxConsecutiveLosses = Math.max(...stats.map(s => s.maxConsecutiveLosses));
            // Adicionar resumo do dia
            message += `*Resumo do Dia*\n` +
                `Total de Trades: ${totalTrades}\n` +
                `Vitórias: ${Math.floor(totalWins)}\n` +
                `Derrotas: ${totalLosses}\n` +
                `Taxa de Acerto: ${totalWinRate.toFixed(2)}%\n` +
                `Lucro Total: $${totalProfit.toFixed(2)}\n` +
                `Máx. Wins Consecutivos: ${maxConsecutiveWins}\n` +
                `Máx. Losses Consecutivos: ${maxConsecutiveLosses}\n\n` +
                `*Detalhes por Horário*\n`;
            stats.forEach(stat => {
                const formattedTime = this.formatBrazilianDateTime(stat.date, stat.hour);
                const losses = stat.totalTrades - Math.floor((stat.totalTrades * stat.winRate) / 100);
                message += `\n*${formattedTime}*\n` +
                    `Trades: ${stat.totalTrades}\n` +
                    `Wins: ${Math.floor((stat.totalTrades * stat.winRate) / 100)}\n` +
                    `Losses: ${losses}\n` +
                    `Taxa: ${stat.winRate.toFixed(2)}%\n` +
                    `Lucro: $${stat.totalProfit.toFixed(2)}\n` +
                    `Máx. Wins: ${stat.maxConsecutiveWins}\n` +
                    `Máx. Losses: ${stat.maxConsecutiveLosses}`;
            });
            this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        }));
        this.bot.onText(/\/cleardb/, (msg) => __awaiter(this, void 0, void 0, function* () {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            if (!this.isAdminChat(msg.chat.id)) {
                this.bot.sendMessage(msg.chat.id, '⛔ Apenas o administrador pode limpar o banco de dados!');
                return;
            }
            try {
                // Confirma que o bot não está rodando
                if (this.isRunning) {
                    this.bot.sendMessage(msg.chat.id, '⚠️ Por favor, pare o bot antes de limpar o banco de dados.\nUse /stop primeiro.');
                    return;
                }
                yield this.tradeService.clearDatabase();
                const message = '*🗑️ Banco de dados limpo com sucesso!*\n\n' +
                    'Todas as estatísticas históricas foram removidas.\n' +
                    'O banco será recriado automaticamente na próxima operação.';
                this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
                // Notifica outros chats autorizados
                constants_1.ALLOWED_CHAT_IDS.forEach(chatId => {
                    if (chatId !== msg.chat.id) {
                        this.bot.sendMessage(chatId, '🗑️ Banco de dados foi limpo pelo administrador');
                    }
                });
            }
            catch (error) {
                console.error('Erro ao limpar banco de dados:', error);
                this.bot.sendMessage(msg.chat.id, '❌ Erro ao limpar banco de dados. Verifique os logs.');
            }
        }));
        this.bot.onText(/\/sequences/, (msg) => __awaiter(this, void 0, void 0, function* () {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            const sequences = yield this.tradeService.getSequenceStats();
            if (sequences.length === 0) {
                this.bot.sendMessage(msg.chat.id, '📊 Nenhuma sequência encontrada.');
                return;
            }
            let message = '*�� Sequências*\n\n';
            sequences.forEach(seq => {
                message += `*${seq.date} - ${seq.type === 'current' ? 'Principal' : 'Monitoramento'}*\n` +
                    `Status: ${seq.isCompleted ? '✅ Completa' : '🔄 Em andamento'}\n` +
                    `Trades: ${seq.tradesCount}/${constants_1.TRADES_TO_MONITOR}\n` +
                    `Taxa Atual: ${seq.winRate.toFixed(2)}%\n` +
                    (seq.referenceWinRate ? `Taxa Referência: ${seq.referenceWinRate.toFixed(2)}%\n` : '') +
                    (seq.completedWinRate ? `Taxa Final: ${seq.completedWinRate.toFixed(2)}%\n` : '') +
                    '\n';
            });
            this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        }));
        this.bot.onText(/\/compare(?:\s+(\d{1,2}))?/, (msg, match) => __awaiter(this, void 0, void 0, function* () {
            if (!this.isAuthorizedChat(msg.chat.id))
                return;
            const targetHour = (match === null || match === void 0 ? void 0 : match[1]) ? parseInt(match[1]) : new Date().getHours();
            const stats = yield this.tradeService.getComparisonStats(targetHour);
            if (stats.length === 0) {
                this.bot.sendMessage(msg.chat.id, `📊 Nenhuma estatística disponível para o horário ${targetHour}:00-${targetHour + 2}:00`);
                return;
            }
            let message = `*📊 Comparação de Horários: ${targetHour}:00-${targetHour + 2}:00*\n\n`;
            stats.forEach(stat => {
                message += `*${stat.date}*\n` +
                    `Trades: ${stat.totalTrades}\n` +
                    `Taxa de Acerto: ${stat.winRate.toFixed(2)}%\n` +
                    `Lucro Total: $${stat.totalProfit.toFixed(2)}\n` +
                    `Máx. Wins Consecutivos: ${stat.maxConsecutiveWins}\n` +
                    `Máx. Losses Consecutivos: ${stat.maxConsecutiveLosses}\n\n`;
            });
            // Adicionar média geral
            const avgWinRate = stats.reduce((sum, s) => sum + s.winRate, 0) / stats.length;
            const avgProfit = stats.reduce((sum, s) => sum + s.totalProfit, 0) / stats.length;
            const totalTrades = stats.reduce((sum, s) => sum + s.totalTrades, 0);
            message += `*Média Geral*\n` +
                `Total de Trades: ${totalTrades}\n` +
                `Taxa Média: ${avgWinRate.toFixed(2)}%\n` +
                `Lucro Médio: $${avgProfit.toFixed(2)}\n`;
            this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        }));
    }
    isAuthorizedChat(chatId) {
        return constants_1.ALLOWED_CHAT_IDS.includes(chatId);
    }
    isAdminChat(chatId) {
        return chatId === constants_1.ADMIN_CHAT_ID;
    }
    getBasicStatus() {
        const runtime = this.startTime ? this.getRuntime() : 'Bot não iniciado';
        const winRate = this.calculateWinRate();
        return `*📊 Status do Bot*\n\n` +
            `*Status:* ${this.isRunning ? '🟢 Ativo' : '🔴 Parado'}\n` +
            `*Tempo em execução:* ${runtime}\n` +
            `*Trades hoje:* ${this.trades.win + this.trades.loss}\n` +
            `*Vitórias:* ${this.trades.win}\n` +
            `*Derrotas:* ${this.trades.loss}\n` +
            `*Taxa de acerto:* ${winRate}%\n` +
            `*Saldo atual:* $${this.balance.toFixed(2)}`;
    }
    getRuntime() {
        if (!this.startTime)
            return '0m';
        const diff = new Date().getTime() - this.startTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }
    calculateWinRate() {
        const total = this.trades.win + this.trades.loss;
        if (total === 0)
            return '0.00';
        return ((this.trades.win / total) * 100).toFixed(2);
    }
    updateTradeResult(isWin, currentBalance) {
        if (isWin) {
            this.trades.win++;
        }
        else {
            this.trades.loss++;
        }
        this.balance = currentBalance;
    }
    isRunningBot() {
        return this.isRunning;
    }
    sendMessage(message) {
        constants_1.ALLOWED_CHAT_IDS.forEach(chatId => {
            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        });
    }
    formatBrazilianDateTime(date, hour, showDate = true) {
        // A hora já está em GMT-3, não precisa converter
        const startHour = Math.floor(hour / 2) * 2;
        const endHour = (startHour + 2) % 24;
        const formattedStartHour = startHour.toString().padStart(2, '0');
        const formattedEndHour = endHour.toString().padStart(2, '0');
        return showDate ?
            `${date} ${formattedStartHour}:00-${formattedEndHour}:00` :
            `${formattedStartHour}:00-${formattedEndHour}:00`;
    }
}
exports.TelegramManager = TelegramManager;
