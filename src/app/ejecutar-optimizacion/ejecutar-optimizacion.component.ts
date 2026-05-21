import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { PeriodoAcademico } from '../models/periodo-academico.model';
import { GrupoResumenDTO } from '../models/grupo-resumen.model';
import { PreinscripcionResumenDTO } from '../models/preinscripcion-resumen.model';
import { DocenteAsignacionResult } from '../models/docente-asignacion.model';
import { SalonAsignacionResult } from '../models/salon-asignacion.model';
import { EstudianteAsignacionResult } from '../models/estudiante-asignacion.model';

@Component({
  selector: 'app-ejecutar-optimizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  templateUrl: './ejecutar-optimizacion.component.html',
  styleUrl: './ejecutar-optimizacion.component.scss',
})
export class EjecutarOptimizacionComponent implements OnInit, OnDestroy {
  periodos: PeriodoAcademico[] = [];
  periodoSeleccionado: number | null = null;

  // Estado actual del período (qué hay ya en BD)
  loadingEstado = false;
  gruposActuales: GrupoResumenDTO[] = [];
  preinscripcionesActuales: PreinscripcionResumenDTO[] = [];
  estadoCargado = false;

  get totalGrupos()  { return this.gruposActuales.length; }
  get conDocente()   { return this.gruposActuales.filter(g => g.docente).length; }
  get sinDocente()   { return this.gruposActuales.filter(g => !g.docente).length; }
  get conSalon()     { return this.gruposActuales.filter(g => g.salon).length; }
  get sinSalon()     { return this.gruposActuales.filter(g => !g.salon).length; }
  get totalPreins()  { return this.preinscripcionesActuales.length; }
  get conGrupo()     { return this.preinscripcionesActuales.filter(p => p.asignado).length; }
  get sinGrupo()     { return this.preinscripcionesActuales.filter(p => !p.asignado).length; }

  // Estado de ejecución por solver
  loadingDocentes   = false;
  loadingSalones    = false;
  loadingEstudiantes = false;

  errorDocentes:    string | null = null;
  errorSalones:     string | null = null;
  errorEstudiantes: string | null = null;

  resultadoDocentes:    DocenteAsignacionResult | null = null;
  resultadoSalones:     SalonAsignacionResult   | null = null;
  resultadoEstudiantes: EstudianteAsignacionResult | null = null;

  private destroy$ = new Subject<void>();

  constructor(private horarioService: HorarioService) {}

  ngOnInit(): void {
    this.horarioService.getPeriodos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ps => { this.periodos = ps; },
        error: () => {}
      });
  }

  onPeriodoCambia(): void {
    if (!this.periodoSeleccionado) return;
    this.resultadoDocentes    = null;
    this.resultadoSalones     = null;
    this.resultadoEstudiantes = null;
    this.errorDocentes        = null;
    this.errorSalones         = null;
    this.errorEstudiantes     = null;
    this.cargarEstado();
  }

  cargarEstado(): void {
    if (!this.periodoSeleccionado) return;
    this.loadingEstado = true;
    this.estadoCargado = false;
    this.horarioService.clearCache();

    forkJoin({
      grupos: this.horarioService.getGruposPorPeriodo(this.periodoSeleccionado),
      preinscripciones: this.horarioService.getPreinscripcionesPorPeriodo(this.periodoSeleccionado)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ grupos, preinscripciones }) => {
          this.gruposActuales           = grupos;
          this.preinscripcionesActuales = preinscripciones;
          this.loadingEstado            = false;
          this.estadoCargado            = true;
        },
        error: () => { this.loadingEstado = false; }
      });
  }

  ejecutarDocentes(): void {
    if (!this.periodoSeleccionado) return;
    this.loadingDocentes  = true;
    this.errorDocentes    = null;
    this.resultadoDocentes = null;

    this.horarioService.resolverYAplicarDocentes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.resultadoDocentes = r;
          this.loadingDocentes   = false;
          this.cargarEstado();
        },
        error: () => {
          this.errorDocentes   = 'Error al ejecutar el solver de docentes. Verifique que el backend esté corriendo.';
          this.loadingDocentes = false;
        }
      });
  }

  ejecutarSalones(): void {
    if (!this.periodoSeleccionado) return;
    this.loadingSalones  = true;
    this.errorSalones    = null;
    this.resultadoSalones = null;

    this.horarioService.resolverYAplicarSalones(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.resultadoSalones = r;
          this.loadingSalones   = false;
          this.cargarEstado();
        },
        error: () => {
          this.errorSalones   = 'Error al ejecutar el solver de salones. Verifique que el backend esté corriendo.';
          this.loadingSalones = false;
        }
      });
  }

  ejecutarEstudiantes(): void {
    if (!this.periodoSeleccionado) return;
    this.loadingEstudiantes  = true;
    this.errorEstudiantes    = null;
    this.resultadoEstudiantes = null;

    this.horarioService.resolverYAplicarEstudiantes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.resultadoEstudiantes = r;
          this.loadingEstudiantes   = false;
          this.cargarEstado();
        },
        error: () => {
          this.errorEstudiantes   = 'Error al ejecutar el solver de estudiantes. Verifique que el backend esté corriendo.';
          this.loadingEstudiantes = false;
        }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
