
export type Ticks = {
  ticks: TTickData[];
  pipSize: number;
};

export type TTickData = {
  price: number;
  time: number;
};

export type TLoadHistoricalDataResult<T extends "ticks" | "digits"> =
  T extends "ticks"
    ? {
        ticks: TTickData[];
        pipSize: number;
      }
    : T extends "digits"
    ? number[]
    : never;

export type LoadTicksDataProps = {
  symbol: string;
  endTime?: string;
  count: number;
};

export type loadHistoricalDataProps<T extends "ticks" | "digits"> =
  LoadTicksDataProps & {
    format?: T;
  };


export interface HistoricalDataParams {
  symbol: string;
  count: number;
  endTime: string;
  format: "ticks" | "digits";
}

export type HourRange = {
  startHour: number;
  endHour: number;
  timezoneOffset: number;
};

export type HistoricalDataParamsProps<T extends "ticks" | "digits"> = {
  symbol: TSymbol;
  date: Date;
  hourRange: HourRange;
  format?: T;
};

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

export interface MoneyManagement {
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

// Nova interface para sinais de trade do backtest puro
export interface TradeSignal {
  success: boolean;
  position: number;
  resultDigit: number; // Adiciona o dígito do resultado
  entryDigit?: number;
  entryTime?: number;
  resultTime?: number;
  tradeType?: StrategyType;
}

// Nova interface para análise do backtest
export interface BackTestAnalysis {
  ticks: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  trades: TradeSignal[];
  skippedTrades: number;
  possibleTrades: number;
}

// Nova interface para resultados financeiros
export interface FinancialResults {
  finalBalance: number;
  totalVolume: number;
  maxDrawdown: number;
  maxBalance: number;
  minBalance: number;
  trades: TradeResult[];
  maxStakeInfo: {
    stake: number;
    balance: number;
    tradeNumber: number;
  };
  cashoutBalance: number; // Adiciona campo para o saldo de cashout
}

export interface BackTestResult {
  ticks: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageConsecutiveWins: number;
  averageConsecutiveLosses: number;
  skippedTrades: number;
  possibleTrades: number;
  winsAfterConsecutiveLosses: {
    [key: number]: {
      occurrences: number;

      averageTradesToNextLoss: number;
      winRate: number;
    };
  };
  lossesAfterConsecutiveWins: {
    [key: number]: {
      occurrences: number;
      averageTradesToNextWin: number;
      lossRate: number;
    };
  };
  streakDistribution: {
    wins: { [length: number]: number };
    losses: { [length: number]: number };
  };
  finalBalance: number;
  totalVolume: number;
  maxDrawdown: number;
  maxBalance: number;
  minBalance: number;
  trades: TradeResult[];
}

export interface Strategy {
  name: string;
  minTicks: number;
  virtualLoss: number;
  moneyManagement: MoneyManagement;
  skipSignalWhileTrading?: boolean;
  config?: any;
  execute: (
    digits: number[],
    position: number,
    ticksToAnalyze: number,
    times: number[],
    ticksData?: TTickData[]
  ) => boolean | null;
  resetDigits?: () => void;
}

export interface CompleteBackTestResult {
  backtest: BackTestResult[];
  management: FinancialResults;
}

export type DataLoaderOptions = {
  symbol: TSymbol,
  date: Date,
  hourRange: HourRange,
  format: "digits" | "ticks",
}


export type StrategyType =
  | "even"
  | "odd"
  | "above"
  | "below"
  | "match"
  | "differ"
  | "between"
  | "multipleOf"
  | "call"
  | "put";

export type TimeframeType =
  | "TICKS"
  | "1M"
  | "2M"
  | "3M"
  | "5M"
  | "10M"
  | "15M"
  | "30M"
  | "1H";

export type TSymbol =
  | "R_10"
  | "R_100"
  | "R_75"
  | "R_50"
  | "R_25"
  | "1HZ250V"
  | "1HZ150V"
  | "1HZ100V"
  | "1HZ75V"
  | "1HZ50V"
  | "1HZ25V"
  | "1HZ10V"
  | "stpRNG"
  | "stpRNG2"
  | "stpRNG3"
  | "stpRNG4"
  | "stpRNG5"
  | "JD10"
  | "JD25"
  | "JD50"
  | "JD75"
  | "JD100"
  | "RDBEAR"
  | "RDBULL"
  | "BOOM300N"
  | "BOOM500"
  | "BOOM600"
  | "BOOM900"
  | "BOOM1000"
  | "CRASH300N"
  | "CRASH500"
  | "CRASH600"
  | "CRASH900"
  | "CRASH1000"
  | "WLDAUD"
  | "WLDEUR"
  | "WLDGBP"
  | "WLDXAU"
  | "WLDUSD"
  | "frxXAUUSD"
  | "frxXPDUSD"
  | "frxXPTUSD"
  | "frxXAGUSD"
  | "cryBTCUSD"
  | "cryETHUSD"
  | "OTC_AS51"
  | "OTC_HSI"
  | "OTC_N225"
  | "OTC_SPC"
  | "OTC_NDX"
  | "OTC_DJI"
  | "OTC_SX5E"
  | "OTC_FCHI"
  | "OTC_GDAXI"
  | "OTC_AEX"
  | "OTC_SSMI"
  | "OTC_FTSE"
  | "frxAUDCAD"
  | "frxAUDCHF"
  | "frxAUDNZD"
  | "frxEURNZD"
  | "frxGBPCAD"
  | "frxGBPCHF"
  | "frxGBPNOK"
  | "frxGBPNZD"
  | "frxNZDJPY"
  | "frxNZDUSD"
  | "frxUSDMXN"
  | "frxUSDPLN"
  | "frxAUDJPY"
  | "frxAUDUSD"
  | "frxEURAUD"
  | "frxEURCAD"
  | "frxEURCHF"
  | "frxEURGBP"
  | "frxEURJPY"
  | "frxEURUSD"
  | "frxGBPAUD"
  | "frxGBPJPY"
  | "frxGBPUSD"
  | "frxUSDCAD"
  | "frxUSDCHF"
  | "frxUSDJPY"
  | "frxUSDNOK"
  | "frxUSDSEK";
