import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, filter } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { DocenteAsignacionResult } from '../models/docente-asignacion.model';

interface GrupoEnFranja {
  codigo: string;
  asignatura: string;
  docente: string;
}

interface FilaHora {
  horaInicio: string;
  horaFin: string;
  celdas: { [dia: number]: GrupoEnFranja[] };
}

@Component({
  selector: 'app-disponibilidad-espacios',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './disponibilidad-espacios.component.html',
  styleUrl: './disponibilidad-espacios.component.scss',
})
export class DisponibilidadEspaciosComponent implements OnInit, OnDestroy {
  filas: FilaHora[] = [];
  dias: number[] = [];
  loading = false;
  error: string | null = null;
  hasData = false;

  readonly DIAS_NOMBRE: Record<number, string> = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private horarioService: HorarioService,
    private horarioState: HorarioStateService
  ) {}

  ngOnInit(): void {
    this.horarioState.changes()
      .pipe(
        filter((id): id is number => id !== null),
        takeUntil(this.destroy$)
      )
      .subscribe(id => this.cargar(id));
  }

  cargar(periodoId: number): void {
    this.loading = true;
    this.error = null;
    this.hasData = false;
    this.horarioService.resolverDocentes(periodoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.buildGrid(r); this.loading = false; this.hasData = true; },
        error: () => {
          this.error = 'No se pudo conectar con el backend. Verifique que el servidor esté corriendo en localhost:8081.';
          this.loading = false;
        }
      });
  }

  private buildGrid(result: DocenteAsignacionResult): void {
    const slotSet = new Map<string, { horaInicio: string; horaFin: string }>();
    const diasSet = new Set<number>();

    for (const asig of result.asignaciones) {
      for (const f of asig.horarios ?? []) {
        slotSet.set(`${f.horaInicio}_${f.horaFin}`, { horaInicio: f.horaInicio, horaFin: f.horaFin });
        diasSet.add(f.dia);
      }
    }

    this.dias = Array.from(diasSet).sort((a, b) => a - b);

    const sortedSlots = Array.from(slotSet.values())
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    this.filas = sortedSlots.map(slot => {
      const celdas: { [dia: number]: GrupoEnFranja[] } = {};
      this.dias.forEach(d => (celdas[d] = []));

      for (const asig of result.asignaciones) {
        for (const f of asig.horarios ?? []) {
          if (f.horaInicio === slot.horaInicio && f.horaFin === slot.horaFin) {
            if (!celdas[f.dia]) celdas[f.dia] = [];
            celdas[f.dia].push({
              codigo: asig.grupoCodigo,
              asignatura: asig.asignatura ?? '—',
              docente: asig.docente
                ? `${asig.docente.nombre} ${asig.docente.apellido}`
                : 'Sin docente'
            });
          }
        }
      }

      return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, celdas };
    });
  }

  isOcupada(fila: FilaHora, dia: number): boolean {
    return (fila.celdas[dia]?.length ?? 0) > 0;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
