import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HorarioStateService {
  private periodoId$ = new BehaviorSubject<number | null>(null);

  get current(): number | null {
    return this.periodoId$.getValue();
  }

  set(id: number): void {
    this.periodoId$.next(id);
  }

  changes(): Observable<number | null> {
    return this.periodoId$.asObservable();
  }
}
