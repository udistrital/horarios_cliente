export interface FranjaDTO {
  dia: number;
  horaInicio: string;
  horaFin: string;
}

export interface DocenteDTO {
  id: number;
  nombre: string;
  apellido: string;
  tipoVinculacion: string | null;
  areaConocimiento: string | null;
}

export interface AsignacionItem {
  grupoId: number;
  grupoCodigo: string;
  asignatura: string | null;
  horarios: FranjaDTO[];
  docente: DocenteDTO | null;
  asignado: boolean;
}

export interface DocenteAsignacionResult {
  score: string | null;
  totalGrupos: number;
  gruposAsignados: number;
  gruposSinDocente: number;
  asignaciones: AsignacionItem[];
}
