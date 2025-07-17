type VirtualResult = "W" | "L";

interface VirtualEntryConfig {
  entryDigit: number;
  ticksCount: number;
  expectedType: "DIGITODD" | "DIGITEVEN";
}

export class VirtualEntryManager {
  private config: VirtualEntryConfig;
  private virtualHistory: VirtualResult[] = []; // Histórico das últimas 3 entradas virtuais
  private readyToEnter: boolean = false;
  private waitingForSignal = false;
  private signalIndex: number | null = null;
  private tickIndex: number = 0;
  private isInverted: boolean = false; // Nova propriedade para controlar inversão

  constructor(config: VirtualEntryConfig) {
    this.config = config;
  }

  // Nova função para inverter o sinal
  invertSignal() {
    this.isInverted = !this.isInverted;
    this.reset(); // Reset para aplicar nova lógica
  }

  // Função para verificar se está invertido
  isSignalInverted(): boolean {
    return this.isInverted;
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
    // Adiciona o resultado ao histórico
    this.virtualHistory.push(result);
    
    // Mantém apenas as últimas 3 entradas
    if (this.virtualHistory.length > 3) {
      this.virtualHistory.shift(); // Remove a primeira entrada
    }
    
    // Verifica se temos a sequência "Loss, Win, Win"
    this.checkForEntrySequence();
  }

  private checkForEntrySequence() {
    // Verifica se temos exatamente 3 entradas no histórico
    if (this.virtualHistory.length === 3) {
      const [first, second, third] = this.virtualHistory;
      
      // Verifica a sequência "Loss, Win, Win"
      if (first === "L" && second === "W" && third === "W") {
        this.readyToEnter = true;
      } else {
        this.readyToEnter = false;
      }
    } else {
      // Se não temos 3 entradas ainda, não libera
      this.readyToEnter = false;
    }
  }

  shouldEnter(): boolean {
    return this.readyToEnter;
  }

  reset() {
    this.virtualHistory = [];
    this.readyToEnter = false;
    this.waitingForSignal = false;
    this.signalIndex = null;
    this.tickIndex = 0;
    // Não resetamos isInverted aqui, mantemos o estado de inversão
  }

  onRealEntryResult(result: VirtualResult) {
    // Após uma entrada real, resetamos o histórico
    this.virtualHistory = [];
    this.readyToEnter = false;
  }

  updateConfig(config: VirtualEntryConfig) {
    this.config = config;
  }

  // Função para obter o tipo de contrato invertido
  getInvertedContractType(): "DIGITODD" | "DIGITEVEN" {
    return this.config.expectedType === "DIGITODD" ? "DIGITEVEN" : "DIGITODD";
  }

  // Função para obter o tipo de contrato atual (considerando inversão)
  getCurrentContractType(): "DIGITODD" | "DIGITEVEN" {
    return this.isInverted ? this.getInvertedContractType() : this.config.expectedType;
  }

  // Função para obter o histórico atual (útil para debug)
  getVirtualHistory(): VirtualResult[] {
    return [...this.virtualHistory];
  }
}

