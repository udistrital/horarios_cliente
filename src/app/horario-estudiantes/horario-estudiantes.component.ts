import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { TimetableService } from '../services/timetable.service';
import { Lesson } from '../models/lesson.model';
import { Timeslot } from '../models/timeslot.model';

interface GroupRow {
  studentGroup: string;
  slots: { [key: string]: Lesson | null };
}

@Component({
  selector: 'app-horario-estudiantes',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './horario-estudiantes.component.html',
  styleUrl: './horario-estudiantes.component.scss',
})
export class HorarioEstudiantesComponent implements OnInit, OnDestroy {
  timeslots: Timeslot[] = [];
  groupRows: GroupRow[] = [];
  displayedColumns: string[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private timetableService: TimetableService) {}

  ngOnInit(): void {
    this.timetableService.getTimeTable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tt => {
        this.timeslots = tt.timeslotList;
        this.buildGrid(tt.lessonList);
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  slotKey(ts: Timeslot): string {
    return `${ts.dayOfWeek}_${ts.startTime}`;
  }

  private buildGrid(lessons: Lesson[]): void {
    const groupMap = new Map<string, GroupRow>();

    for (const lesson of lessons) {
      if (!groupMap.has(lesson.studentGroup)) {
        groupMap.set(lesson.studentGroup, { studentGroup: lesson.studentGroup, slots: {} });
      }
      if (lesson.timeslot) {
        groupMap.get(lesson.studentGroup)!.slots[this.slotKey(lesson.timeslot)] = lesson;
      }
    }

    this.groupRows = Array.from(groupMap.values()).sort((a, b) => a.studentGroup.localeCompare(b.studentGroup));
    this.displayedColumns = ['studentGroup', ...this.timeslots.map(ts => this.slotKey(ts))];
  }
}
