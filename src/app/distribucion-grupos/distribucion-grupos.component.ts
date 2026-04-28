import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { AsignacionItem, FranjaDTO } from '../models/docente-asignacion.model';

interface GrupoConEstudiantes {
  grupoId: number;
  grupoCodigo: string;
  asignatura: string;
  docente: string;
  franjas: FranjaDTO[];
  estudiantes: string[];
}

@Component({
  selector: 'app-distribucion-grupos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatProgressSpinnerModule, MatExpansionModule],
  templateUrl: './distribucion-grupos.component.html',
  styleUrl: './distribucion-grupos.component.scss',
})
export class DistribucionGruposComponent implements OnInit, OnDestroy {
  grupos: GrupoConEstudiantes[] = [];
  loading = false;
  error: string | null = null;
  hasData = false;
  totalEstudiantes = 0;

  filtroAsignatura = '';
  filtroEstudiante = '';

  get gruposFiltrados(): GrupoConEstudiantes[] {
    const qa = this.filtroAsignatura.toLowerCase().trim();
    const qe = this.filtroEstudiante.toLowerCase().trim();
    return this.grupos.filter(g => {
      const matchA = !qa || g.asignatura.toLowerCase().includes(qa) || g.grupoCodigo.toLowerCase().includes(qa);
      const matchE = !qe || g.estudiantes.some(c => c.toLowerCase().includes(qe));
      return matchA && matchE;
    });
  }

  readonly DIAS: Record<number, string> = {
    1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom'
  };

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
    this.hasData = false;
    forkJoin({
      docentes: this.horarioService.resolverDocentes(periodoId),
      estudiantes: this.horarioService.resultadoEstudiantes(periodoId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ docentes, estudiantes }) => {
          this.grupos = docentes.asignaciones.map((a: AsignacionItem) => ({
            grupoId: a.grupoId,
            grupoCodigo: a.grupoCodigo,
            asignatura: a.asignatura ?? '—',
            docente: a.docente ? `${a.docente.nombre} ${a.docente.apellido}` : 'Sin docente asignado',
            franjas: a.horarios ?? [],
            estudiantes: estudiantes[a.grupoId] ?? []
          }));
          this.totalEstudiantes = this.grupos.reduce((s, g) => s + g.estudiantes.length, 0);
          this.loading = false;
          this.hasData = true;
        },
        error: () => {
          this.error = 'No se pudo conectar con el backend. Verifique que el servidor esté corriendo en localhost:8081.';
          this.loading = false;
        }
      });
  }

  limpiarFiltros(): void {
    this.filtroAsignatura = '';
    this.filtroEstudiante = '';
  }

  franjaLabel(f: FranjaDTO): string {
    return `${this.DIAS[f.dia] ?? 'D' + f.dia} ${f.horaInicio}–${f.horaFin}`;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
