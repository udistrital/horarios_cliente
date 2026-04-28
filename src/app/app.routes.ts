import { Routes } from '@angular/router';
import { HorarioDocentesComponent } from './horario-docentes/horario-docentes.component';
import { DisponibilidadEspaciosComponent } from './disponibilidad-espacios/disponibilidad-espacios.component';
import { HorarioEstudiantesComponent } from './horario-estudiantes/horario-estudiantes.component';
import { DistribucionGruposComponent } from './distribucion-grupos/distribucion-grupos.component';

export const routes: Routes = [
  { path: 'horario-docentes',       component: HorarioDocentesComponent },
  { path: 'disponibilidad-espacios', component: DisponibilidadEspaciosComponent },
  { path: 'horario-estudiantes',    component: HorarioEstudiantesComponent },
  { path: 'distribucion-grupos',    component: DistribucionGruposComponent },
  { path: '', redirectTo: 'horario-docentes', pathMatch: 'full' },
  { path: '**', redirectTo: 'horario-docentes' },
];
