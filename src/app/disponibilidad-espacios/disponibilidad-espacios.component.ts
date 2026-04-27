import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { TimetableService } from '../services/timetable.service';
import { Timeslot } from '../models/timeslot.model';
import { Room } from '../models/room.model';
import { Lesson } from '../models/lesson.model';

interface SlotRow {
  timeslot: Timeslot;
  cells: { [roomId: number]: Lesson | null };
}

@Component({
  selector: 'app-disponibilidad-espacios',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatBadgeModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './disponibilidad-espacios.component.html',
  styleUrl: './disponibilidad-espacios.component.scss',
})
export class DisponibilidadEspaciosComponent implements OnInit, OnDestroy {
  rooms: Room[] = [];
  slotRows: SlotRow[] = [];
  displayedColumns: string[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private timetableService: TimetableService) {}

  ngOnInit(): void {
    this.timetableService.getTimeTable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tt => {
        this.rooms = tt.roomList;
        this.buildGrid(tt.timeslotList, tt.lessonList);
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isAvailable(row: SlotRow, roomId: number): boolean {
    return row.cells[roomId] === null || row.cells[roomId] === undefined;
  }

  slotLabel(ts: Timeslot): string {
    return `${ts.dayOfWeek.substring(0, 3)} ${ts.startTime}–${ts.endTime}`;
  }

  private buildGrid(timeslots: Timeslot[], lessons: Lesson[]): void {
    this.slotRows = timeslots.map(ts => {
      const cells: { [roomId: number]: Lesson | null } = {};
      this.rooms.forEach(r => (cells[r.id] = null));
      lessons.forEach(l => {
        if (l.timeslot?.id === ts.id && l.room) {
          cells[l.room.id] = l;
        }
      });
      return { timeslot: ts, cells };
    });
    this.displayedColumns = ['timeslot', ...this.rooms.map(r => String(r.id))];
  }
}
