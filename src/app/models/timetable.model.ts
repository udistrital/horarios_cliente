import { Timeslot } from './timeslot.model';
import { Room } from './room.model';
import { Lesson } from './lesson.model';

export type SolverStatus = 'NOT_SOLVING' | 'SOLVING_SCHEDULED' | 'SOLVING_ACTIVE';

export interface Score {
  hardScore: number;
  softScore: number;
}

export interface TimeTable {
  timeslotList: Timeslot[];
  roomList: Room[];
  lessonList: Lesson[];
  score: Score | null;
  solverStatus: SolverStatus;
}
