import { Routes } from '@angular/router';
import { HorarioDocentesComponent } from './horario-docentes/horario-docentes.component';
import { DisponibilidadEspaciosComponent } from './disponibilidad-espacios/disponibilidad-espacios.component';
import { HorarioEstudiantesComponent } from './horario-estudiantes/horario-estudiantes.component';
import { DistribucionGruposComponent } from './distribucion-grupos/distribucion-grupos.component';
import { EjecutarOptimizacionComponent } from './ejecutar-optimizacion/ejecutar-optimizacion.component';

export const routes: Routes = [
  { path: 'horario-docentes',        component: HorarioDocentesComponent },
  { path: 'disponibilidad-espacios', component: DisponibilidadEspaciosComponent },
  { path: 'horario-estudiantes',     component: HorarioEstudiantesComponent },
  { path: 'distribucion-grupos',     component: DistribucionGruposComponent },
  { path: 'ejecutar-optimizacion',   component: EjecutarOptimizacionComponent },
  { path: '', redirectTo: 'horario-docentes', pathMatch: 'full' },
  { path: '**', redirectTo: 'horario-docentes' },
];
