import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocenteAsignacionResult } from '../models/docente-asignacion.model';
import { PreinscripcionSimpleDTO } from '../models/preinscripcion.model';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private readonly base = environment.API_URL;
  private docenteReqs = new Map<number, Observable<DocenteAsignacionResult>>();

  constructor(private http: HttpClient) {}

  /**
   * Ejecuta el solver de docentes para el período dado.
   * Resultados se comparten entre suscriptores para evitar múltiples ejecuciones del solver.
   */
  resolverDocentes(periodoId: number): Observable<DocenteAsignacionResult> {
    if (!this.docenteReqs.has(periodoId)) {
      const req = this.http
        .get<DocenteAsignacionResult>(`${this.base}/solver-docente/resolver/${periodoId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.docenteReqs.set(periodoId, req);
    }
    return this.docenteReqs.get(periodoId)!;
  }

  /**
   * Ejecuta el solver de grupos y retorna la asignación de estudiantes por grupo.
   * Respuesta: { grupoId: [codigosEstudiantes] }
   */
  resultadoEstudiantes(periodoId: number): Observable<{ [grupoId: number]: string[] }> {
    return this.http.get<{ [grupoId: number]: string[] }>(
      `${this.base}/solver/resultado/${periodoId}`
    );
  }

  /**
   * Retorna el listado de preinscripciones del período (sin ejecutar solver).
   */
  resumenEstudiantes(periodoId: number): Observable<PreinscripcionSimpleDTO[]> {
    return this.http.get<PreinscripcionSimpleDTO[]>(
      `${this.base}/solver/resumen/${periodoId}`
    );
  }

  clearCache(): void {
    this.docenteReqs.clear();
  }
}
