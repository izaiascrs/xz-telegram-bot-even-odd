import { calculateStake } from "../utils/risk-manager";

export type TRiskManagerConfig = {
  payout: number;
  profit: number;
  entry: number;
  performance: number;
}

type TLastResult = {
  status: 'W' | 'L' | '',
  stakeValue: number,
  profit: number,
  totalAmount: number,
}

type TTargetConfig = {
  balance: number;
  stopLoss: number;
  stopWin: number;
}

export class RiskManager {
  private lastResults: TLastResult[] = [];
  private config: TRiskManagerConfig;
  private onSessionEnded?: (profit: number, balance: number) => void;
  private onTargetReached?: (profit: number, balance: number) => void;
  private shouldStop: boolean = false;
  private initialConfig: TRiskManagerConfig;
  private currentBalance: number = 0;
  private initialBalance: number = 0;
  private stopLoss: number = 0;
  private stopWin: number = 0;
  
  constructor(config: TRiskManagerConfig, targetConfig: TTargetConfig) {
    this.config = config;
    this.initialConfig = { ...config };
    this.initialBalance = targetConfig.balance;
    this.currentBalance = targetConfig.balance;  
    this.stopLoss = targetConfig.stopLoss;
    this.stopWin = targetConfig.stopWin;
    this.calculateFirstStake(config);
  }

  calculateFirstStake(config: TRiskManagerConfig) {
    const { stake } = calculateStake({
      performance: config.performance,
      entry: config.entry,
      payout: config.payout,
      profit: config.profit,
      loses: 0,
      wins: 0,
    });

    this.lastResults.push({
      status: "",
      stakeValue: stake,
      profit: config.profit,
      totalAmount: stake,
    })
  }

  setOnSessionEnded(callback: (profit: number, balance: number) => void) {
    this.onSessionEnded = callback;
  }

  setOnTargetReached(callback: (profit: number, balance: number) => void) {
    this.onTargetReached = callback;
  }

  updateLastResult(result: "W" | "L") {
    if(this.shouldStop) return;
    const lastResult = this.lastResults[this.lastResults.length - 1];
    const { current, newRow, hasReachTotalTrades } = this.handleUpdateLastRowStatus(this.config, lastResult, result);
    const updatedProfit = Number((this.config.profit + current.profit).toFixed(2));
    this.config.profit = updatedProfit;
    lastResult.status = result;

    const { stake } = calculateStake({
      ...this.config,
      wins: newRow.wins,
      loses: newRow.loses,
      profit: updatedProfit,
    })

    this.lastResults.push({
      status: "",
      stakeValue: stake,
      profit: current.profit,
      totalAmount: updatedProfit,
    });

    const profit = this.config.profit - this.config.entry;
    this.currentBalance = this.currentBalance + current.profit;

    if(hasReachTotalTrades) {
      this.shouldStop = true;
      this.onSessionEnded?.(profit, this.currentBalance);      
      return;
    }

    if(this.checkIfShouldStop(this.lastResults)) {
      this.onSessionEnded?.(profit, this.currentBalance);
      this.shouldStop = true;
    }

    if(this.checkIfShouldStopByTarget()) {
      this.shouldStop = true;
      this.onTargetReached?.(profit, this.currentBalance);
      // update initial balance for the next session 
      this.initialBalance = this.currentBalance;
    }
  }

  calculateNextStake() {
    const lastResult = this.lastResults[this.lastResults.length - 1];
    return lastResult.stakeValue;
  }

  private getStartProfit(entries: TLastResult[]) {
    return Math.max(...entries.map((entry) => entry.totalAmount), this.config.entry);
  }
  
  private handleUpdateLastRowStatus(state: TRiskManagerConfig, lastRow: TLastResult, status: TLastResult['status'] ) {
    let profit = 0;
    let totalAmount = 0;

    const maxProfit = (this.getStartProfit(this.lastResults));
    const initialProfit = state.entry;

    let startProfit = (maxProfit > initialProfit) ? maxProfit : initialProfit;  
    let { loses, wins } = this.calculateWinsAndLoses(this.lastResults, state.performance, initialProfit);
    
    if (lastRow.totalAmount > startProfit) {
      startProfit = lastRow.totalAmount;
    }
    
    if (status === 'L') {
      profit = -lastRow.stakeValue;
      totalAmount = lastRow.totalAmount - lastRow.stakeValue;
      loses++; // increment loses
    }

    if (status === 'W') {
      profit = lastRow.stakeValue * (state.payout - 1);
      totalAmount = lastRow.totalAmount + profit;
      loses > 0 && wins++;

      if (totalAmount > startProfit) {
        loses = 0;
        wins = 0;
        startProfit = totalAmount;
      }

      if (loses > 0 && wins > loses) {
        loses = 0;
        wins = 0;
      }

      if(wins === state.performance) {
        loses = 0;
        wins = 0;
      }
    }

    const newRowData = {
      loses: loses,
      wins: wins,
      profit: totalAmount,
      entry: state.entry,
      payout: state.payout,
      performance: state.performance,
      totalRisk: state.entry,
    }

    const hasReachTotalTrades = this.lastResults.length === state.entry;

    return {
      current: {
        status: status,
        profit: profit,
        totalAmount: totalAmount,
      },
      newRow: newRowData,
      hasReachTotalTrades: hasReachTotalTrades,
    }
  }
  
  private calculateWinsAndLoses(entries: TLastResult[], performance: number, initialProfit: number) {
    const profit = entries.length > 2 
      ? entries.slice(0,-2).reduce((acc, row) => {
          if(row.totalAmount > acc) return row.totalAmount;
          return acc;
        }, 0) 
      : 0;

    const maxProfit = profit > initialProfit ? profit : initialProfit;

    const { loses, wins } = entries.reduce((acc, row) => {
      if(row.status === 'L') acc.loses++;
      if(row.status === 'W' && acc.loses > 0) acc.wins++;

      if(row.totalAmount > maxProfit && row.status === 'W') {
        acc.wins = 0;
        acc.loses = 0;
      }

      if(acc.loses > 0 && acc.wins >= acc.loses ) {
        acc.wins = 0;
        acc.loses = 0;
      }

      if(acc.wins === performance) {
        acc.wins = 0;
        acc.loses = 0
      }
      return acc;
    }, { wins: 0, loses: 0 });

    return { wins, loses };
  }

  private checkIfShouldStop(lastResults: TLastResult[]) {
    // check if we has 4 wins consecutively
    if(lastResults.length < 4) return false;
    const consecutiveWins = lastResults.reduce((acc, result) => {
      if(result.status === 'W') return acc + 1;
      if(result.status === 'L') return acc = 0;
      return acc;
    }, 0);

    if(consecutiveWins === 4) {
      return true;
    }

    // if the the next stake is greater or equal to the current balance, stop
    const nextStake = lastResults[lastResults.length - 1].stakeValue;
    const currentBalance = this.config.profit;

    if(nextStake >= Math.abs(currentBalance)) {
      return true;
    }

    // if is the last trade and we have last than 4 wins, stop
    const { winsCount, totalTrades} = lastResults.reduce((acc, result) => {
      if(result.status === 'W') acc.winsCount++;
      acc.totalTrades++;
      return acc;
    }, { winsCount: 0, totalTrades: 0 });

    if(winsCount <= 4 && totalTrades === this.config.entry) {
      return true;
    }

    // if we have 5 wins before 10 trades, stop
    if(winsCount >= 5) {
      return true;
    }

    return false
  }

  private checkIfShouldStopByTarget() {
    const currentProfit = this.currentBalance - this.initialBalance;
    if(currentProfit >= this.stopWin) {
      return true;
    }

    if(currentProfit <= -this.stopLoss) {
      return true;
    }

    return false;
  }

  canContinue() {
    const canContinue = !this.shouldStop;
    if(this.shouldStop) {
      this.resetStatistics();
    }
    return canContinue;
  }

  hasSufficientBalance() {
    return this.currentBalance >= this.initialConfig.profit; // check if the balance is greater than the needed to start the next round
  }

  getBalance() {
    return this.currentBalance;
  }

  getCurrentProfit() {
    return this.config.profit;
  }

  resetStatistics() {
    this.shouldStop = false;
    this.lastResults = [];
    this.config = { ...this.initialConfig };
    this.calculateFirstStake({ ...this.initialConfig });
  }

  private reset() {
    this.shouldStop = false;
    this.lastResults = [];
    this.config = { ...this.initialConfig };
    this.currentBalance = 0;
    this.initialBalance = 0;
  }
}


