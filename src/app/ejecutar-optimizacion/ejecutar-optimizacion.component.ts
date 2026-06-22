import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { SolverEstadoService } from '../services/solver-estado.service';
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

  // Estado actual del período en BD (se recarga al volver al componente)
  loadingEstado = false;
  gruposActuales: GrupoResumenDTO[] = [];
  preinscripcionesActuales: PreinscripcionResumenDTO[] = [];
  estadoCargado = false;

  get totalGrupos() { return this.gruposActuales.length; }
  get conDocente()  { return this.gruposActuales.filter(g => g.docente).length; }
  get conSalon()    { return this.gruposActuales.filter(g => g.salon).length; }
  get totalPreins() { return this.preinscripcionesActuales.length; }
  get conGrupo()    { return this.preinscripcionesActuales.filter(p => p.asignado).length; }

  // ── Estado de los solvers delegado al servicio singleton ──────────────────
  // Persiste aunque el componente sea destruido al cambiar de pestaña.

  get faseDocentes()       { return this.se.faseDocentes; }
  set faseDocentes(v)      { this.se.faseDocentes = v; }
  get faseSalones()        { return this.se.faseSalones; }
  set faseSalones(v)       { this.se.faseSalones = v; }
  get faseEstudiantes()    { return this.se.faseEstudiantes; }
  set faseEstudiantes(v)   { this.se.faseEstudiantes = v; }

  get previewDocentes()    { return this.se.previewDocentes; }
  set previewDocentes(v)   { this.se.previewDocentes = v; }
  get previewSalones()     { return this.se.previewSalones; }
  set previewSalones(v)    { this.se.previewSalones = v; }
  get previewEstudiantes() { return this.se.previewEstudiantes; }
  set previewEstudiantes(v){ this.se.previewEstudiantes = v; }

  get errorDocentes()      { return this.se.errorDocentes; }
  set errorDocentes(v)     { this.se.errorDocentes = v; }
  get errorSalones()       { return this.se.errorSalones; }
  set errorSalones(v)      { this.se.errorSalones = v; }
  get errorEstudiantes()   { return this.se.errorEstudiantes; }
  set errorEstudiantes(v)  { this.se.errorEstudiantes = v; }

  // ─────────────────────────────────────────────────────────────────────────

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

  constructor(private horarioService: HorarioService, private se: SolverEstadoService) {}

  ngOnInit(): void {
    // Restaurar el período y el estado de solvers del servicio
    this.periodoSeleccionado = this.se.periodoId;
    if (this.periodoSeleccionado) {
      this.cargarEstado();
    }

    this.horarioService.getPeriodos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: ps => { this.periodos = ps; }, error: () => {} });
  }

  onPeriodoCambia(): void {
    if (!this.periodoSeleccionado) return;
    if (this.periodoSeleccionado !== this.se.periodoId) {
      // Cambiaron de período — el estado anterior no aplica
      this.se.resetSolvers();
    }
    this.se.periodoId = this.periodoSeleccionado;
    this.cargarEstado();
  }

  cargarEstado(): void {
    if (!this.periodoSeleccionado) return;
    this.loadingEstado = true;
    this.estadoCargado = false;

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
        next: () => { this.faseDocentes = 'guardado'; this.horarioService.clearCache(); this.cargarEstado(); },
        error: () => { this.errorDocentes = 'Error al guardar los docentes. El cálculo puede haber expirado; vuelva a calcular.'; this.faseDocentes = 'error'; }
      });
  }

  guardarSalones(): void {
    if (!this.periodoSeleccionado || this.faseSalones !== 'preview') return;
    this.faseSalones = 'guardando';
    this.horarioService.aplicarSalones(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.faseSalones = 'guardado'; this.horarioService.clearCache(); this.cargarEstado(); },
        error: () => { this.errorSalones = 'Error al guardar los salones. El cálculo puede haber expirado; vuelva a calcular.'; this.faseSalones = 'error'; }
      });
  }

  guardarEstudiantes(): void {
    if (!this.periodoSeleccionado || this.faseEstudiantes !== 'preview') return;
    this.faseEstudiantes = 'guardando';
    this.horarioService.aplicarEstudiantes(this.periodoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.faseEstudiantes = 'guardado'; this.horarioService.clearCache(); this.cargarEstado(); },
        error: () => { this.errorEstudiantes = 'Error al guardar los estudiantes. El cálculo puede haber expirado; vuelva a calcular.'; this.faseEstudiantes = 'error'; }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
