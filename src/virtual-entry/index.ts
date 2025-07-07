type VirtualResult = "W" | "L";

interface VirtualEntryConfig {
  entryDigit: number;
  ticksCount: number;
  expectedType: "DIGITODD" | "DIGITEVEN";
}

export class VirtualEntryManager {
  private config: VirtualEntryConfig;
  private lastVirtualResult: VirtualResult | null = null;
  private readyToEnter: boolean = false;
  private waitingForSignal = false;
  private signalIndex: number | null = null;
  private tickIndex: number = 0;

  constructor(config: VirtualEntryConfig) {
    this.config = config;
  }

  onTick(digit: number) {
    if(this.readyToEnter) return;
    
    if(this.waitingForSignal) {
      this.tickIndex++;
      if(this.tickIndex === this.config.ticksCount) {
        this.waitingForSignal = false;
        this.signalIndex = null;
        const isEven = digit % 2 === 0;
        const isWin = 
          (this.config.expectedType === "DIGITODD" && !isEven) ||
          (this.config.expectedType === "DIGITEVEN" && isEven);

        if(isWin) {
          this.onVirtualResult("W");
        } else {
          this.onVirtualResult("L");
        }
        this.tickIndex = 0;
        return;
      }
    }

    // Se não estamos esperando, verifica se é o sinal
    if (!this.waitingForSignal && digit === this.config.entryDigit) {
      this.waitingForSignal = true;
      this.signalIndex = this.tickIndex;
    }
  }

  onVirtualResult(result: VirtualResult) {
    if (this.lastVirtualResult === "L" && result === "W") {
      this.readyToEnter = true;
    } else {
      this.readyToEnter = false;
    }
    this.lastVirtualResult = result;
  }

  shouldEnter(): boolean {
    return this.readyToEnter;
  }

  reset() {
    this.lastVirtualResult = null;
    this.readyToEnter = false;
    this.waitingForSignal = false;
    this.signalIndex = null;
    this.tickIndex = 0;
  }

  onRealEntryResult(result: VirtualResult) {
    if (result === "L") {
      this.lastVirtualResult = "L";
    } else {
      this.lastVirtualResult = null;
    }
    this.readyToEnter = false;
  }

  updateConfig(config: VirtualEntryConfig) {
    this.config = config;
  }
}

