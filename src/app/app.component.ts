import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorarioStateService } from './services/horario-state.service';
import { HorarioService } from './services/horario.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  periodoId = '';

  constructor(
    private horarioState: HorarioStateService,
    private horarioService: HorarioService
  ) {}

  aplicarPeriodo(): void {
    const id = parseInt(this.periodoId, 10);
    if (!isNaN(id) && id > 0) {
      this.horarioService.clearCache();
      this.horarioState.set(id);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.aplicarPeriodo();
  }
}
