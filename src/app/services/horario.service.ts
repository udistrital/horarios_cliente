import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocenteAsignacionResult } from '../models/docente-asignacion.model';
import { SalonAsignacionResult } from '../models/salon-asignacion.model';
import { EstudianteAsignacionResult } from '../models/estudiante-asignacion.model';
import { GrupoResumenDTO } from '../models/grupo-resumen.model';
import { PreinscripcionResumenDTO } from '../models/preinscripcion-resumen.model';
import { PeriodoAcademico } from '../models/periodo-academico.model';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private readonly base = environment.API_URL;

  private gruposReqs           = new Map<number, Observable<GrupoResumenDTO[]>>();
  private preinscripcionesReqs = new Map<number, Observable<PreinscripcionResumenDTO[]>>();
  private periodosReq: Observable<PeriodoAcademico[]> | null = null;

  constructor(private http: HttpClient) {}

  // ─── Consulta (leen la BD ya calculada) ──────────────────────────────────

  getGruposPorPeriodo(periodoId: number): Observable<GrupoResumenDTO[]> {
    if (!this.gruposReqs.has(periodoId)) {
      const req = this.http
        .get<GrupoResumenDTO[]>(`${this.base}/grupos/periodo/${periodoId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.gruposReqs.set(periodoId, req);
    }
    return this.gruposReqs.get(periodoId)!;
  }

  getPreinscripcionesPorPeriodo(periodoId: number): Observable<PreinscripcionResumenDTO[]> {
    if (!this.preinscripcionesReqs.has(periodoId)) {
      const req = this.http
        .get<PreinscripcionResumenDTO[]>(`${this.base}/preinscripciones/periodo/${periodoId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.preinscripcionesReqs.set(periodoId, req);
    }
    return this.preinscripcionesReqs.get(periodoId)!;
  }

  getPeriodos(): Observable<PeriodoAcademico[]> {
    if (!this.periodosReq) {
      this.periodosReq = this.http
        .get<PeriodoAcademico[]>(`${this.base}/periodos`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.periodosReq;
  }

  // ─── Ejecución de solvers (resolver → aplicar en secuencia) ─────────────

  resolverYAplicarDocentes(periodoId: number): Observable<DocenteAsignacionResult> {
    return this.http
      .get<DocenteAsignacionResult>(`${this.base}/solver-docente/resolver/${periodoId}`)
      .pipe(
        switchMap(() =>
          this.http.post<DocenteAsignacionResult>(
            `${this.base}/solver-docente/aplicar/${periodoId}`, {}
          )
        )
      );
  }

  resolverYAplicarSalones(periodoId: number): Observable<SalonAsignacionResult> {
    return this.http
      .get<SalonAsignacionResult>(`${this.base}/solver-salon/resolver/${periodoId}`)
      .pipe(
        switchMap(() =>
          this.http.post<SalonAsignacionResult>(
            `${this.base}/solver-salon/aplicar/${periodoId}`, {}
          )
        )
      );
  }

  resolverYAplicarEstudiantes(periodoId: number): Observable<EstudianteAsignacionResult> {
    return this.http
      .get<EstudianteAsignacionResult>(`${this.base}/solver/resolver/${periodoId}`)
      .pipe(
        switchMap(() =>
          this.http.post<EstudianteAsignacionResult>(
            `${this.base}/solver/aplicar/${periodoId}`, {}
          )
        )
      );
  }

  clearCache(): void {
    this.gruposReqs.clear();
    this.preinscripcionesReqs.clear();
    this.periodosReq = null;
  }
}
