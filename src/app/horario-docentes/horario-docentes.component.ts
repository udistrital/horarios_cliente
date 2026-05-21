import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { GrupoResumenDTO, FranjaDTO } from '../models/grupo-resumen.model';

interface CeldaDocente {
  asignatura: string;
  grupoCodigo: string;
}

interface FilaDocenteTimetable {
  horaInicio: string;
  horaFin: string;
  celdas: { [dia: number]: CeldaDocente | null };
}

@Component({
  selector: 'app-horario-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './horario-docentes.component.html',
  styleUrl: './horario-docentes.component.scss',
})
export class HorarioDocentesComponent implements OnInit, OnDestroy {
  grupos: GrupoResumenDTO[] = [];
  loading = false;
  error: string | null = null;

  // Filtros
  filtroBusqueda = '';
  soloSinDocente = false;

  // Horario personal del docente seleccionado
  docenteSeleccionado: { id: number; nombre: string } | null = null;
  filasDocenteTimetable: FilaDocenteTimetable[] = [];
  diasDocenteTimetable: number[] = [];

  readonly displayedColumns = ['grupo', 'asignatura', 'docente', 'vinculacion', 'area', 'franjas', 'estado', 'acciones'];

  readonly DIAS: Record<number, string> = {
    1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom'
  };
  readonly DIAS_NOMBRE: Record<number, string> = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
  };

  get totalGrupos()     { return this.grupos.length; }
  get gruposAsignados() { return this.grupos.filter(g => g.docente).length; }
  get gruposSinDocente(){ return this.grupos.filter(g => !g.docente).length; }

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
        this.cargar(id);
      });
  }

  cargar(periodoId: number): void {
    this.loading = true;
    this.error = null;
    this.grupos = [];
    this.docenteSeleccionado = null;
    this.horarioService.getGruposPorPeriodo(periodoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.grupos = r; this.loading = false; },
        error: () => {
          this.error = 'No se pudo conectar con el backend. Verifique que el servidor esté corriendo en localhost:8081.';
          this.loading = false;
        }
      });
  }

  get asignacionesFiltradas(): GrupoResumenDTO[] {
    const q = this.filtroBusqueda.toLowerCase().trim();
    return this.grupos.filter(g => {
      const matchBusqueda = !q ||
        this.docenteNombre(g).toLowerCase().includes(q) ||
        (g.asignatura ?? '').toLowerCase().includes(q) ||
        g.codigo.toLowerCase().includes(q);
      const matchSin = !this.soloSinDocente || !g.docente;
      return matchBusqueda && matchSin;
    });
  }

  verHorarioDocente(item: GrupoResumenDTO): void {
    if (!item.docente) return;
    if (this.docenteSeleccionado?.id === item.docente.id) {
      this.docenteSeleccionado = null;
      return;
    }
    const gruposDocente = this.grupos.filter(g => g.docente?.id === item.docente!.id);
    this.docenteSeleccionado = {
      id: item.docente.id,
      nombre: `${item.docente.nombre} ${item.docente.apellido}`
    };
    this.buildDocenteTimetable(gruposDocente);
  }

  private buildDocenteTimetable(grupos: GrupoResumenDTO[]): void {
    const slotSet = new Map<string, { horaInicio: string; horaFin: string }>();
    const diasSet = new Set<number>();
    for (const g of grupos) {
      for (const f of g.horarios ?? []) {
        slotSet.set(`${f.horaInicio}_${f.horaFin}`, { horaInicio: f.horaInicio, horaFin: f.horaFin });
        diasSet.add(f.dia);
      }
    }
    this.diasDocenteTimetable = Array.from(diasSet).sort((a, b) => a - b);
    const slots = Array.from(slotSet.values()).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    this.filasDocenteTimetable = slots.map(slot => {
      const celdas: { [dia: number]: CeldaDocente | null } = {};
      this.diasDocenteTimetable.forEach(d => (celdas[d] = null));
      for (const g of grupos) {
        for (const f of g.horarios ?? []) {
          if (f.horaInicio === slot.horaInicio && f.horaFin === slot.horaFin) {
            celdas[f.dia] = { asignatura: g.asignatura ?? '—', grupoCodigo: g.codigo };
          }
        }
      }
      return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, celdas };
    });
  }

  franjaLabel(f: FranjaDTO): string {
    return `${this.DIAS[f.dia] ?? 'D' + f.dia} ${f.horaInicio}–${f.horaFin}`;
  }

  docenteNombre(item: GrupoResumenDTO): string {
    if (!item.docente) return 'Sin asignar';
    return `${item.docente.nombre} ${item.docente.apellido}`;
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.soloSinDocente = false;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
