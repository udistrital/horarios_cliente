export interface SalonDTO {
  id: number;
  codigo: string;
  capacidad: number;
  tipoSalon: string | null;
  facultad: string | null;
}

export interface FranjaSalonDTO {
  dia: number;
  horaInicio: string;
  horaFin: string;
}

export interface SalonAsignacionItem {
  grupoId: number;
  grupoCodigo: string;
  asignatura: string | null;
  cantidadEstudiantes: number;
  horarios: FranjaSalonDTO[];
  salon: SalonDTO | null;
  asignado: boolean;
}

export interface SalonAsignacionResult {
  score: string | null;
  totalGrupos: number;
  gruposAsignados: number;
  gruposSinSalon: number;
  asignaciones: SalonAsignacionItem[];
}
