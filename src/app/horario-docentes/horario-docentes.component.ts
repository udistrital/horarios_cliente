import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { TimetableService } from '../services/timetable.service';
import { Lesson } from '../models/lesson.model';
import { Timeslot } from '../models/timeslot.model';

interface TeacherRow {
  teacher: string;
  slots: { [key: string]: Lesson | null };
}

@Component({
  selector: 'app-horario-docentes',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule],
  templateUrl: './horario-docentes.component.html',
  styleUrl: './horario-docentes.component.scss',
})
export class HorarioDocentesComponent implements OnInit, OnDestroy {
  timeslots: Timeslot[] = [];
  teacherRows: TeacherRow[] = [];
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
    const teacherMap = new Map<string, TeacherRow>();

    for (const lesson of lessons) {
      if (!teacherMap.has(lesson.teacher)) {
        teacherMap.set(lesson.teacher, { teacher: lesson.teacher, slots: {} });
      }
      if (lesson.timeslot) {
        teacherMap.get(lesson.teacher)!.slots[this.slotKey(lesson.timeslot)] = lesson;
      }
    }

    this.teacherRows = Array.from(teacherMap.values()).sort((a, b) => a.teacher.localeCompare(b.teacher));
    this.displayedColumns = ['teacher', ...this.timeslots.map(ts => this.slotKey(ts))];
  }
}
