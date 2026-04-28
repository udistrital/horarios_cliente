import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocenteAsignacionResult } from '../models/docente-asignacion.model';
import { PreinscripcionSimpleDTO } from '../models/preinscripcion.model';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private readonly base = environment.API_URL;
  private docenteReqs    = new Map<number, Observable<DocenteAsignacionResult>>();
  private estudiantesReqs = new Map<number, Observable<{ [grupoId: number]: string[] }>>();

  constructor(private http: HttpClient) {}

  resolverDocentes(periodoId: number): Observable<DocenteAsignacionResult> {
    if (!this.docenteReqs.has(periodoId)) {
      const req = this.http
        .get<DocenteAsignacionResult>(`${this.base}/solver-docente/resolver/${periodoId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.docenteReqs.set(periodoId, req);
    }
    return this.docenteReqs.get(periodoId)!;
  }

  resultadoEstudiantes(periodoId: number): Observable<{ [grupoId: number]: string[] }> {
    if (!this.estudiantesReqs.has(periodoId)) {
      const req = this.http
        .get<{ [grupoId: number]: string[] }>(`${this.base}/solver/resultado/${periodoId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.estudiantesReqs.set(periodoId, req);
    }
    return this.estudiantesReqs.get(periodoId)!;
  }

  resumenEstudiantes(periodoId: number): Observable<PreinscripcionSimpleDTO[]> {
    return this.http.get<PreinscripcionSimpleDTO[]>(
      `${this.base}/solver/resumen/${periodoId}`
    );
  }

  clearCache(): void {
    this.docenteReqs.clear();
    this.estudiantesReqs.clear();
  }
}
