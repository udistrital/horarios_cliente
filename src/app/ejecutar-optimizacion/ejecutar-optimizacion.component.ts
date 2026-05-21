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

type SolverFase = 'idle' | 'calculando' | 'preview' | 'guardando' | 'guardado' | 'error';

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

  // Estado actual del período en BD
  loadingEstado = false;
  gruposActuales: GrupoResumenDTO[] = [];
  preinscripcionesActuales: PreinscripcionResumenDTO[] = [];
  estadoCargado = false;

  get totalGrupos()  { return this.gruposActuales.length; }
  get conDocente()   { return this.gruposActuales.filter(g => g.docente).length; }
  get conSalon()     { return this.gruposActuales.filter(g => g.salon).length; }
  get totalPreins()  { return this.preinscripcionesActuales.length; }
  get conGrupo()     { return this.preinscripcionesActuales.filter(p => p.asignado).length; }

  // Fase y preview por solver
  faseDocentes:    SolverFase = 'idle';
  faseSalones:     SolverFase = 'idle';
  faseEstudiantes: SolverFase = 'idle';

  previewDocentes:    DocenteAsignacionResult | null = null;
  previewSalones:     SalonAsignacionResult   | null = null;
  previewEstudiantes: EstudianteAsignacionResult | null = null;

  errorDocentes:    string | null = null;
  errorSalones:     string | null = null;
  errorEstudiantes: string | null = null;

  get hayPreviewListo(): boolean {
    return this.faseDocentes === 'preview' || this.faseSalones === 'preview' || this.faseEstudiantes === 'preview';
  }

  get algunCalculando(): boolean {
    return this.faseDocentes === 'calculando' || this.faseSalones === 'calculando' || this.faseEstudiantes === 'calculando';
  }

  get algunGuardando(): boolean {
    return this.faseDocentes === 'guardando' || this.faseSalones === 'guardando' || this.faseEstudiantes === 'guardando';
  }

  private destroy$ = new Subject<void>();

  constructor(private horarioService: HorarioService) {}

  ngOnInit(): void {
    this.horarioService.getPeriodos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: ps => { this.periodos = ps; }, error: () => {} });
  }

  onPeriodoCambia(): void {
    if (!this.periodoSeleccionado) return;
    this.resetSolvers();
    this.cargarEstado();
  }

  private resetSolvers(): void {
    this.faseDocentes = this.faseSalones = this.faseEstudiantes = 'idle';
    this.previewDocentes = this.previewSalones = this.previewEstudiantes = null;
    this.errorDocentes = this.errorSalones = this.errorEstudiantes = null;
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

  // ── Paso 1: Calcular (GET /resolver — corre OptaPlanner, no guarda en BD) ──

  calcularTodos(): void {
    this.calcularDocentes();
    this.calcularSalones();
    this.calcularEstudiantes();
  }

  calcularDocentes(): void {
    if (!this.periodoSeleccionado) return;
    this.faseDocentes    = 'calculando';
    this.errorDocentes   = null;
    this.previewDocentes = null;
    this.horarioService.resolverDocentes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.previewDocentes = r; this.faseDocentes = 'preview'; },
        error: () => { this.errorDocentes = 'Error al calcular el solver de docentes. Verifique que el backend esté corriendo.'; this.faseDocentes = 'error'; }
      });
  }

  calcularSalones(): void {
    if (!this.periodoSeleccionado) return;
    this.faseSalones    = 'calculando';
    this.errorSalones   = null;
    this.previewSalones = null;
    this.horarioService.resolverSalones(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.previewSalones = r; this.faseSalones = 'preview'; },
        error: () => { this.errorSalones = 'Error al calcular el solver de salones. Verifique que el backend esté corriendo.'; this.faseSalones = 'error'; }
      });
  }

  calcularEstudiantes(): void {
    if (!this.periodoSeleccionado) return;
    this.faseEstudiantes    = 'calculando';
    this.errorEstudiantes   = null;
    this.previewEstudiantes = null;
    this.horarioService.resolverEstudiantes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.previewEstudiantes = r; this.faseEstudiantes = 'preview'; },
        error: () => { this.errorEstudiantes = 'Error al calcular el solver de estudiantes. Verifique que el backend esté corriendo.'; this.faseEstudiantes = 'error'; }
      });
  }

  // ── Paso 2: Guardar (POST /aplicar — lee caché, persiste en BD) ──────────

  guardarTodos(): void {
    if (this.faseDocentes === 'preview')    this.guardarDocentes();
    if (this.faseSalones === 'preview')     this.guardarSalones();
    if (this.faseEstudiantes === 'preview') this.guardarEstudiantes();
  }

  guardarDocentes(): void {
    if (!this.periodoSeleccionado || this.faseDocentes !== 'preview') return;
    this.faseDocentes = 'guardando';
    this.horarioService.aplicarDocentes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.faseDocentes = 'guardado'; this.cargarEstado(); },
        error: () => { this.errorDocentes = 'Error al guardar los docentes. El cálculo puede haber expirado; vuelva a calcular.'; this.faseDocentes = 'error'; }
      });
  }

  guardarSalones(): void {
    if (!this.periodoSeleccionado || this.faseSalones !== 'preview') return;
    this.faseSalones = 'guardando';
    this.horarioService.aplicarSalones(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.faseSalones = 'guardado'; this.cargarEstado(); },
        error: () => { this.errorSalones = 'Error al guardar los salones. El cálculo puede haber expirado; vuelva a calcular.'; this.faseSalones = 'error'; }
      });
  }

  guardarEstudiantes(): void {
    if (!this.periodoSeleccionado || this.faseEstudiantes !== 'preview') return;
    this.faseEstudiantes = 'guardando';
    this.horarioService.aplicarEstudiantes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.faseEstudiantes = 'guardado'; this.cargarEstado(); },
        error: () => { this.errorEstudiantes = 'Error al guardar los estudiantes. El cálculo puede haber expirado; vuelva a calcular.'; this.faseEstudiantes = 'error'; }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
