
export enum OrderStatus {
  PLANNED = 'Planejado',
  CUTTING = 'Em Corte',
  SEWING = 'Na Costura', // Represents that at least one part is in sewing
  FINISHED = 'Finalizado', // Represents that ALL parts are finished
}

export type GridType = 'STANDARD' | 'PLUS' | 'CUSTOM';

// Superset of all possible sizes
export interface SizeDistribution {
  P?: number;
  M?: number;
  G?: number;
  GG?: number;
  G1?: number;
  G2?: number;
  G3?: number;
  [key: string]: number | undefined;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductReference {
  id: string;
  code: string; 
  description: string; 
  defaultFabric: string; 
  defaultColors: ProductColor[]; 
  defaultGrid: GridType;
  estimatedPiecesPerRoll?: number; // New field for automation
}

export interface Seamstress {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  active: boolean;
  address?: string; // New field
  city?: string;    // New field
}

export interface Fabric {
  id: string;
  name: string; // Ex: Viscose, Linho
  color: string; // Ex: Azul Bebê
  colorHex: string;
  stockRolls: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// New Interface for items inside an order
export interface ProductionOrderItem {
  color: string;
  colorHex?: string; // Optional for backward compatibility, but preferred for UI
  rollsUsed: number;
  piecesPerSizeEst: number; // Estimate per size entered by user
  estimatedPieces: number; // Total Estimate
  actualPieces: number; // Confirmed after cut
  sizes: SizeDistribution; // The actual distribution
}

// Represents a packet sent to a seamstress
export interface OrderSplit {
  id: string;
  seamstressId: string;
  seamstressName: string;
  status: OrderStatus; // SEWING or FINISHED
  items: ProductionOrderItem[];
  createdAt: string;
  finishedAt?: string;
}

export interface ProductionOrder {
  id: string;
  referenceId: string;
  referenceCode: string;
  description: string;
  fabric: string;
  
  // The Total Confirmed Cut (The "Mother" Record)
  items: ProductionOrderItem[];

  // What is currently sitting in the cutting room waiting to be distributed
  activeCuttingItems: ProductionOrderItem[];

  // What has been sent to seamstresses
  splits: OrderSplit[];

  gridType: GridType;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string; // Date when the entire order was finished/delivered
  notes?: string;
  
  // Legacy field support (optional now)
  seamstressId?: string; 
}

export interface DashboardStats {
  totalOrders: number;
  inCutting: number;
  inSewing: number;
  finished: number;
  totalPiecesProduced: number;
}
