import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { GrupoResumenDTO, FranjaDTO } from '../models/grupo-resumen.model';
import { PreinscripcionResumenDTO } from '../models/preinscripcion-resumen.model';

interface CeldaHorario {
  asignatura: string;
  docente: string;
  grupoCodigo: string;
}

interface FilaTimetable {
  horaInicio: string;
  horaFin: string;
  celdas: { [dia: number]: CeldaHorario | null };
}

interface MateriaResumen {
  asignatura: string;
  grupoCodigo: string;
  docente: string;
  franjas: FranjaDTO[];
}

@Component({
  selector: 'app-horario-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './horario-estudiantes.component.html',
  styleUrl: './horario-estudiantes.component.scss',
})
export class HorarioEstudiantesComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  datosListos = false;

  codigoInput = '';
  codigoBuscado = '';

  materias: MateriaResumen[] = [];
  filasTimetable: FilaTimetable[] = [];
  dias: number[] = [];
  estudianteEncontrado: boolean | null = null;

  readonly DIAS_NOMBRE: Record<number, string> = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
  };
  readonly DIAS_CORTO: Record<number, string> = {
    1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom'
  };

  private preinscripciones: PreinscripcionResumenDTO[] = [];
  private gruposMap = new Map<number, GrupoResumenDTO>();

  private periodoActual: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private horarioService: HorarioService,
    private horarioState: HorarioStateService
  ) {}

  ngOnInit(): void {
    this.horarioState.changes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id === null) { this.periodoActual = null; return; }
        if (id === this.periodoActual) return;
        this.periodoActual = id;
        this.cargarDatos(id);
      });
  }

  cargarDatos(periodoId: number): void {
    this.loading = true;
    this.error = null;
    this.datosListos = false;
    this.limpiarResultados();

    forkJoin({
      preinscripciones: this.horarioService.getPreinscripcionesPorPeriodo(periodoId),
      grupos:           this.horarioService.getGruposPorPeriodo(periodoId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ preinscripciones, grupos }) => {
          this.preinscripciones = preinscripciones;
          this.gruposMap = new Map(grupos.map(g => [g.id, g]));
          this.loading = false;
          this.datosListos = true;
        },
        error: () => {
          this.error = 'No se pudo conectar con el backend. Verifique que el servidor esté corriendo en localhost:8081.';
          this.loading = false;
        }
      });
  }

  buscar(): void {
    const codigo = this.codigoInput.trim();
    if (!codigo || !this.datosListos) return;

    this.codigoBuscado = codigo;
    this.limpiarResultados();

    const preinscripcionesEstudiante = this.preinscripciones.filter(
      p => p.codigoEstudiante === codigo && p.asignado && p.grupo
    );

    if (preinscripcionesEstudiante.length === 0) {
      this.estudianteEncontrado = false;
      return;
    }

    this.estudianteEncontrado = true;

    this.materias = preinscripcionesEstudiante.map(p => {
      const grupo = this.gruposMap.get(p.grupo!.id);
      const docente = grupo?.docente
        ? `${grupo.docente.nombre} ${grupo.docente.apellido}`
        : 'Sin docente asignado';
      return {
        asignatura:  p.asignatura ?? '—',
        grupoCodigo: p.grupo!.codigo,
        docente,
        franjas:     p.grupo!.horarios ?? []
      };
    });

    this.buildTimetable(preinscripcionesEstudiante);
  }

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscar();
  }

  private buildTimetable(preinscripciones: PreinscripcionResumenDTO[]): void {
    const slotSet = new Map<string, { horaInicio: string; horaFin: string }>();
    const diasSet = new Set<number>();

    for (const p of preinscripciones) {
      for (const f of p.grupo?.horarios ?? []) {
        slotSet.set(`${f.horaInicio}_${f.horaFin}`, { horaInicio: f.horaInicio, horaFin: f.horaFin });
        diasSet.add(f.dia);
      }
    }

    this.dias = Array.from(diasSet).sort((a, b) => a - b);
    const slots = Array.from(slotSet.values()).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    this.filasTimetable = slots.map(slot => {
      const celdas: { [dia: number]: CeldaHorario | null } = {};
      this.dias.forEach(d => (celdas[d] = null));

      for (const p of preinscripciones) {
        for (const f of p.grupo?.horarios ?? []) {
          if (f.horaInicio === slot.horaInicio && f.horaFin === slot.horaFin) {
            const grupo = this.gruposMap.get(p.grupo!.id);
            celdas[f.dia] = {
              asignatura:  p.asignatura ?? '—',
              docente:     grupo?.docente
                             ? `${grupo.docente.nombre} ${grupo.docente.apellido}`
                             : 'Sin docente',
              grupoCodigo: p.grupo!.codigo
            };
          }
        }
      }

      return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, celdas };
    });
  }

  private limpiarResultados(): void {
    this.materias = [];
    this.filasTimetable = [];
    this.dias = [];
    this.estudianteEncontrado = null;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
