import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorarioStateService } from './services/horario-state.service';
import { HorarioService } from './services/horario.service';
import { PeriodoAcademico } from './models/periodo-academico.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  periodos: PeriodoAcademico[] = [];
  periodoId: number | null = null;

  constructor(
    private horarioState: HorarioStateService,
    private horarioService: HorarioService
  ) {}

  ngOnInit(): void {
    this.horarioService.getPeriodos().subscribe({
      next: ps => {
        this.periodos = ps;
        const activo = ps.find(p => p.activo);
        if (activo) {
          this.periodoId = activo.id;
          this.aplicarPeriodo();
        }
      },
      error: () => {}
    });
  }

  aplicarPeriodo(): void {
    if (!this.periodoId) return;
    this.horarioService.clearCache();
    this.horarioState.reset();
    this.horarioState.set(this.periodoId);
  }
}
