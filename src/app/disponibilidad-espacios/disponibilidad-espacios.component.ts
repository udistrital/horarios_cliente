import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { SalonAsignacionResult } from '../models/salon-asignacion.model';

interface FranjaOcupada {
  horaInicio: string;
  horaFin: string;
  grupoCodigo: string;
  asignatura: string;
  cantidadEstudiantes: number;
}

interface FilaSalon {
  salonId: number;
  salonCodigo: string;
  salonCapacidad: number;
  salonTipo: string | null;
  salonFacultad: string | null;
  celdas: { [dia: number]: FranjaOcupada[] };
  totalFranjas: number;
}

@Component({
  selector: 'app-disponibilidad-espacios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './disponibilidad-espacios.component.html',
  styleUrl: './disponibilidad-espacios.component.scss',
})
export class DisponibilidadEspaciosComponent implements OnInit, OnDestroy {
  salones: FilaSalon[] = [];
  dias: number[] = [];
  loading = false;
  error: string | null = null;
  hasData = false;

  totalGrupos = 0;
  gruposAsignados = 0;
  gruposSinSalon = 0;

  filtroSalon = '';
  filtroAsignatura = '';
  diasSeleccionados = new Set<number>();

  readonly DIAS_NOMBRE: Record<number, string> = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
  };

  get diasFiltrados(): number[] {
    return this.diasSeleccionados.size === 0
      ? this.dias
      : this.dias.filter(d => this.diasSeleccionados.has(d));
  }

  get salonesFiltrados(): FilaSalon[] {
    const termSalon = this.filtroSalon.toLowerCase().trim();
    const termAsig  = this.filtroAsignatura.toLowerCase().trim();

    return this.salones.filter(s => {
      if (termSalon && !s.salonCodigo.toLowerCase().includes(termSalon)) return false;
      if (!termAsig) return true;
      return Object.values(s.celdas).some(franjas =>
        franjas.some(f => f.asignatura.toLowerCase().includes(termAsig))
      );
    });
  }

  getCelda(salon: FilaSalon, dia: number): FranjaOcupada[] {
    const franjas = salon.celdas[dia] ?? [];
    const termAsig = this.filtroAsignatura.toLowerCase().trim();
    if (!termAsig) return franjas;
    return franjas.filter(f => f.asignatura.toLowerCase().includes(termAsig));
  }

  toggleDia(dia: number): void {
    if (this.diasSeleccionados.has(dia)) {
      this.diasSeleccionados.delete(dia);
    } else {
      this.diasSeleccionados.add(dia);
    }
    this.diasSeleccionados = new Set(this.diasSeleccionados);
  }

  limpiarFiltros(): void {
    this.filtroSalon = '';
    this.filtroAsignatura = '';
    this.diasSeleccionados = new Set<number>();
  }

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
    this.horarioService.resolverSalones(periodoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.totalGrupos     = r.totalGrupos;
          this.gruposAsignados = r.gruposAsignados;
          this.gruposSinSalon  = r.gruposSinSalon;
          this.limpiarFiltros();
          this.buildGridPorSalon(r);
          this.loading = false;
          this.hasData = true;
        },
        error: () => {
          this.error = 'No se pudo conectar con el backend. Verifique que el servidor esté corriendo en localhost:8081.';
          this.loading = false;
        }
      });
  }

  private buildGridPorSalon(result: SalonAsignacionResult): void {
    const salonMap = new Map<number, FilaSalon>();
    const diasSet  = new Set<number>();

    for (const asig of result.asignaciones) {
      if (!asig.asignado || !asig.salon) continue;

      if (!salonMap.has(asig.salon.id)) {
        salonMap.set(asig.salon.id, {
          salonId:       asig.salon.id,
          salonCodigo:   asig.salon.codigo,
          salonCapacidad: asig.salon.capacidad,
          salonTipo:     asig.salon.tipoSalon,
          salonFacultad: asig.salon.facultad,
          celdas:        {},
          totalFranjas:  0
        });
      }

      const fila = salonMap.get(asig.salon.id)!;

      for (const f of asig.horarios ?? []) {
        diasSet.add(f.dia);
        if (!fila.celdas[f.dia]) fila.celdas[f.dia] = [];
        fila.celdas[f.dia].push({
          horaInicio:          f.horaInicio,
          horaFin:             f.horaFin,
          grupoCodigo:         asig.grupoCodigo,
          asignatura:          asig.asignatura ?? '—',
          cantidadEstudiantes: asig.cantidadEstudiantes
        });
        fila.totalFranjas++;
      }
    }

    this.dias    = Array.from(diasSet).sort((a, b) => a - b);
    this.salones = Array.from(salonMap.values())
      .sort((a, b) => a.salonCodigo.localeCompare(b.salonCodigo));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
