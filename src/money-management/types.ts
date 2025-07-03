import { StrategyType } from "../backtest/types";

export type ManagementType = 
| "fixed"
| "martingale"
| "soros"
| "martingale-soros"
| "recovery"
| "fractional-martingale"
| "pattern-based"
| "hybrid"
| "martingale-optimized";

export type MoneyManagementV2 = {
  type: 'fixed' | 'martingale' | 'soros' | 'martingale-soros';
  initialStake: number;
  maxStake?: number;
  profitPercent: number;
  maxLoss?: number;
  sorosLevel?: number;
  winsBeforeMartingale?: number;
  targetProfit?: number;
  initialBalance: number;
};

export type MoneyManagement = {
  type: "fixed" | "martingale-soros" | "fixed-with-recovery";
  initialStake: number;
  profitPercent: number;
  maxStake: number;
  maxLoss: number;
  sorosLevel: number;
  // Campos para o fixed-with-recovery
  enableSoros: boolean;
  sorosPercent: number;
  winsBeforeRecovery: number;
  initialBalance: number;
};

export interface MoneyManagementV3 {
  type: ManagementType;
  initialBalance?: number;
  initialStake: number;
  profitPercent: number; // Exemplo: 95 para 95%
  maxStake?: number; // Limite máximo de entrada
  maxLoss?: number; // Limite máximo de loss consecutivo (para martingale)
  sorosLevel?: number; // Quantos níveis de soros aplicar
  targetTick: number;
  winsBeforeMartingale: number;
  winsBeforeMartingaleMin?: number; // Mínimo de wins antes do martingale
  lossVirtual?: number; // Quantidade de losses consecutivos necessários
  winVirtual?: number; // Quantidade de wins necessários
  martingaleMultiplier?: number; // Novo multiplicador para cálculo do martingale
  cashout: number; // Valor de lucro para realizar cashout (0 = desativado)
  fractionalConfig?: {
    divisions: number; // Em quantas partes dividir a banca
    targetProfit: number; // Lucro alvo por sessão
  };
}

export interface TradeResult {
  success: boolean;
  stake: number;
  profit: number;
  balance: number;
  type: "win" | "loss";
  resultDigit: number;
  isVirtual?: boolean; // Flag para indicar se é uma trade virtual
  entryDigit?: number;
  nextDigits?: number[];
  entryTime?: number;
  resultTime?: number;
  tradeType?: StrategyType;
}
