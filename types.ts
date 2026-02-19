
export type CarModel = 'EQE' | 'SA2' | 'HA2';

export type Area = 
  | 'Linha OK' 
  | 'Linha de Teste' 
  | 'Teste de Estrada' 
  | 'Teste de Chuva' 
  | 'Inspeção OffLine';

export interface DefectRecord {
  id: string;
  timestamp: number;
  model: CarModel;
  area: Area;
  vin: string;
  defectType: string;
  quantity: number;
  employeeId: string;
  timeSlot: string;
  atuacao?: string;
  liberado?: string;
  isReinspection?: boolean;
}

export interface OKCarRecord {
  id: string;
  timestamp: number;
  model: CarModel;
  area: Area;
  vin: string; 
  quantity: number;
  employeeId: string;
  timeSlot: string;
  atuacao?: string;
  liberado?: string;
  isReinspection?: boolean;
}

export interface DowntimeRecord {
  id: string;
  timestamp: number;
  area: Area;
  startTime: string; // Formato HH:mm
  endTime: string;   // Formato HH:mm
  durationMinutes: number;
  reason: string;
  employeeId?: string;
}

export type ViewRole = 'OPERATOR' | 'MANAGER';
