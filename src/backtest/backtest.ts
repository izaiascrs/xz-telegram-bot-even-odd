import { BackTestAnalysis, Strategy, TradeSignal, TTickData } from './types';

export class Backtest {
  private readonly RESULT_DELAY = 2; // Delay de 2 ticks para receber resultado
  private maxTicks = 10;
  private minTicks = 1;
  private tickOffset = 0;
  private entryTickOffset = 1;
  private skipSignalWhileTrading = true;

  constructor(private strategy: Strategy) {
 
  }

  runTest(ticksData: TTickData[]): BackTestAnalysis[] {
    const results: BackTestAnalysis[] = [];  
    let digits = ticksData.map(tick => tick.price);
    let times = ticksData.map(tick => tick.time);

    
    for (let ticks = this.minTicks; ticks <= this.maxTicks; ticks++) {
      let totalTrades = 0;
      let skippedTrades = 0;
      let possibleTrades = 0;
      let wins = 0;
      let losses = 0;
      let consecutiveWins = 0;
      let consecutiveLosses = 0;
      let maxConsecutiveWins = 0;
      let maxConsecutiveLosses = 0;
      const trades: TradeSignal[] = [];
      
      let lastTradeIndex = -1;
      
      for (let i = 0; i < digits.length - ticks; i++) {
        const result = this.strategy.execute(digits, i, ticks, times, ticksData);
        
        if (result !== null) {
          possibleTrades++;
          
          // Verifica se é o primeiro trade ou se já passou tempo suficiente desde a última trade
          const minTicksNeeded = 
            lastTradeIndex === -1 ? 0 :lastTradeIndex + ticks + this.RESULT_DELAY;

          if(this.skipSignalWhileTrading) {
            if(i < minTicksNeeded) {
              skippedTrades++;
              continue;
            }
          } 

          totalTrades++;
          trades.push({ 
            success: result, 
            position: i,
            resultDigit: digits[i + ticks + this.tickOffset],
            entryDigit: digits[i+this.entryTickOffset],
            entryTime: times[i+this.entryTickOffset],
            resultTime: times[i + ticks + this.tickOffset],
            tradeType: this.strategy.config.compareType
          });
          
          lastTradeIndex = i;
          
          if (result) {
            wins++;
            consecutiveWins++;
            consecutiveLosses = 0;
            maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
          } else {
            losses++;
            consecutiveLosses++;
            consecutiveWins = 0;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
          }
          
        }
      }

      results.push({
        ticks,
        totalTrades,
        wins,
        losses,
        winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
        lossRate: totalTrades > 0 ? (losses / totalTrades) * 100 : 0,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        trades,
        skippedTrades,
        possibleTrades
      });
    }

    this.strategy?.resetDigits?.();

    return results;
  }
} 