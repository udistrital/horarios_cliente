import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, filter, forkJoin } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { DocenteAsignacionResult, AsignacionItem, FranjaDTO } from '../models/docente-asignacion.model';

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
  // Estado de carga
  loading = false;
  error: string | null = null;
  datosListos = false;

  // Búsqueda
  codigoInput = '';
  codigoBuscado = '';

  // Resultados del estudiante
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

  // Datos crudos de los solvers (para filtrar sin re-llamar)
  private docenteResult: DocenteAsignacionResult | null = null;
  private estudiantesResult: { [grupoId: number]: string[] } | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private horarioService: HorarioService,
    private horarioState: HorarioStateService
  ) {}

  ngOnInit(): void {
    this.horarioState.changes()
      .pipe(filter((id): id is number => id !== null), takeUntil(this.destroy$))
      .subscribe(id => this.cargarSolvers(id));
  }

  cargarSolvers(periodoId: number): void {
    this.loading = true;
    this.error = null;
    this.datosListos = false;
    this.limpiarResultados();

    forkJoin({
      docentes: this.horarioService.resolverDocentes(periodoId),
      estudiantes: this.horarioService.resultadoEstudiantes(periodoId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ docentes, estudiantes }) => {
          this.docenteResult = docentes;
          this.estudiantesResult = estudiantes;
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
    if (!codigo || !this.docenteResult || !this.estudiantesResult) return;

    this.codigoBuscado = codigo;
    this.limpiarResultados();

    // Encontrar en qué grupos está el estudiante
    const gruposDelEstudiante: number[] = Object.entries(this.estudiantesResult)
      .filter(([, codigos]) => codigos.includes(codigo))
      .map(([grupoId]) => Number(grupoId));

    if (gruposDelEstudiante.length === 0) {
      this.estudianteEncontrado = false;
      return;
    }

    this.estudianteEncontrado = true;

    // Obtener detalle de cada grupo desde el resultado del solver de docentes
    const asignaciones: AsignacionItem[] = this.docenteResult.asignaciones
      .filter(a => gruposDelEstudiante.includes(a.grupoId));

    this.materias = asignaciones.map(a => ({
      asignatura: a.asignatura ?? '—',
      grupoCodigo: a.grupoCodigo,
      docente: a.docente ? `${a.docente.nombre} ${a.docente.apellido}` : 'Sin docente asignado',
      franjas: a.horarios ?? []
    }));

    this.buildTimetable(asignaciones);
  }

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscar();
  }

  private buildTimetable(asignaciones: AsignacionItem[]): void {
    const slotSet = new Map<string, { horaInicio: string; horaFin: string }>();
    const diasSet = new Set<number>();

    for (const a of asignaciones) {
      for (const f of a.horarios ?? []) {
        slotSet.set(`${f.horaInicio}_${f.horaFin}`, { horaInicio: f.horaInicio, horaFin: f.horaFin });
        diasSet.add(f.dia);
      }
    }

    this.dias = Array.from(diasSet).sort((a, b) => a - b);
    const slots = Array.from(slotSet.values()).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    this.filasTimetable = slots.map(slot => {
      const celdas: { [dia: number]: CeldaHorario | null } = {};
      this.dias.forEach(d => (celdas[d] = null));

      for (const a of asignaciones) {
        for (const f of a.horarios ?? []) {
          if (f.horaInicio === slot.horaInicio && f.horaFin === slot.horaFin) {
            celdas[f.dia] = {
              asignatura: a.asignatura ?? '—',
              docente: a.docente ? `${a.docente.nombre} ${a.docente.apellido}` : 'Sin docente',
              grupoCodigo: a.grupoCodigo
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
