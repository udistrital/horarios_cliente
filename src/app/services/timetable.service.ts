import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TimeTable } from '../models/timetable.model';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private readonly base = `${environment.API_URL}/timeTable`;

  constructor(private http: HttpClient) {}

  getTimeTable(): Observable<TimeTable> {
    return this.http.get<TimeTable>(this.base);
  }

  solve(): Observable<void> {
    return this.http.post<void>(`${this.base}/solve`, {});
  }

  stopSolving(): Observable<void> {
    return this.http.post<void>(`${this.base}/stopSolving`, {});
  }

  /**
   * Emite el TimeTable cada 2 segundos mientras el solver esté activo.
   * Se completa automáticamente cuando solverStatus === 'NOT_SOLVING'.
   */
  pollUntilSolved(): Observable<TimeTable> {
    return interval(2000).pipe(
      switchMap(() => this.getTimeTable()),
      takeWhile(tt => tt.solverStatus !== 'NOT_SOLVING', true)
    );
  }
}
