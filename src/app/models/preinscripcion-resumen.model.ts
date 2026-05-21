import { FranjaDTO } from './grupo-resumen.model';

export interface GrupoPrDTO {
  id: number;
  codigo: string;
  horarios: FranjaDTO[];
}

export interface PreinscripcionResumenDTO {
  preinscripcionId: number;
  codigoEstudiante: string;
  nombreEstudiante: string;
  asignatura: string | null;
  asignado: boolean;
  grupo: GrupoPrDTO | null;
}
