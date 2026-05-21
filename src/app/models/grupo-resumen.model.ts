export interface FranjaDTO {
  dia: number;
  horaInicio: string;
  horaFin: string;
}

export interface DocenteResumenDTO {
  id: number;
  nombre: string;
  apellido: string;
  tipoVinculacion: string | null;
  areaConocimiento?: string | null;
}

export interface SalonResumenDTO {
  id: number;
  codigo: string;
  capacidad: number;
}

export interface GrupoResumenDTO {
  id: number;
  codigo: string;
  asignatura: string | null;
  cantidadEstudiantes: number;
  capacidadMaxima: number;
  docente: DocenteResumenDTO | null;
  salon: SalonResumenDTO | null;
  horarios: FranjaDTO[];
}
