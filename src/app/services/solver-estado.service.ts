import { Injectable } from '@angular/core';
import { DocenteAsignacionResult } from '../models/docente-asignacion.model';
import { SalonAsignacionResult } from '../models/salon-asignacion.model';
import { EstudianteAsignacionResult } from '../models/estudiante-asignacion.model';

export type SolverFase = 'idle' | 'calculando' | 'preview' | 'guardando' | 'guardado' | 'error';

@Injectable({ providedIn: 'root' })
export class SolverEstadoService {
  periodoId: number | null = null;

  faseDocentes:    SolverFase = 'idle';
  faseSalones:     SolverFase = 'idle';
  faseEstudiantes: SolverFase = 'idle';

  previewDocentes:    DocenteAsignacionResult    | null = null;
  previewSalones:     SalonAsignacionResult      | null = null;
  previewEstudiantes: EstudianteAsignacionResult | null = null;

  errorDocentes:    string | null = null;
  errorSalones:     string | null = null;
  errorEstudiantes: string | null = null;

  resetSolvers(): void {
    this.faseDocentes = this.faseSalones = this.faseEstudiantes = 'idle';
    this.previewDocentes = this.previewSalones = this.previewEstudiantes = null;
    this.errorDocentes = this.errorSalones = this.errorEstudiantes = null;
  }
}
