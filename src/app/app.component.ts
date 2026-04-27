import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TimetableService } from './services/timetable.service';
import { TimeTable, SolverStatus } from './models/timetable.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  solverStatus: SolverStatus = 'NOT_SOLVING';
  score: string = '';
  solving = false;
  private destroy$ = new Subject<void>();

  constructor(private timetableService: TimetableService) {}

  ngOnInit(): void {
    this.timetableService.getTimeTable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tt => this.updateStatus(tt));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  solve(): void {
    this.solving = true;
    this.timetableService.solve().subscribe(() => {
      this.timetableService.pollUntilSolved()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: tt => this.updateStatus(tt),
          complete: () => (this.solving = false),
        });
    });
  }

  stopSolving(): void {
    this.timetableService.stopSolving()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => (this.solving = false));
  }

  private updateStatus(tt: TimeTable): void {
    this.solverStatus = tt.solverStatus;
    this.solving = tt.solverStatus !== 'NOT_SOLVING';
    if (tt.score) {
      this.score = `Hard: ${tt.score.hardScore} / Soft: ${tt.score.softScore}`;
    }
  }
}
