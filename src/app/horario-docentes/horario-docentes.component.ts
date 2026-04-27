import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, filter } from 'rxjs';
import { HorarioService } from '../services/horario.service';
import { HorarioStateService } from '../services/horario-state.service';
import { DocenteAsignacionResult, AsignacionItem, FranjaDTO } from '../models/docente-asignacion.model';

@Component({
  selector: 'app-horario-docentes',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './horario-docentes.component.html',
  styleUrl: './horario-docentes.component.scss',
})
export class HorarioDocentesComponent implements OnInit, OnDestroy {
  result: DocenteAsignacionResult | null = null;
  loading = false;
  error: string | null = null;

  readonly displayedColumns = ['grupo', 'asignatura', 'docente', 'vinculacion', 'area', 'franjas', 'estado'];

  readonly DIAS: Record<number, string> = {
    1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom'
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
    this.result = null;
    this.horarioService.resolverDocentes(periodoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.result = r; this.loading = false; },
        error: () => {
          this.error = 'No se pudo conectar con el backend. Verifique que el servidor esté corriendo en localhost:8081.';
          this.loading = false;
        }
      });
  }

  franjaLabel(f: FranjaDTO): string {
    return `${this.DIAS[f.dia] ?? 'D' + f.dia} ${f.horaInicio}–${f.horaFin}`;
  }

  docenteNombre(item: AsignacionItem): string {
    if (!item.docente) return 'Sin asignar';
    return `${item.docente.nombre} ${item.docente.apellido}`;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
