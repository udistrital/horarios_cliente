import { Timeslot } from './timeslot.model';
import { Room } from './room.model';

export interface Lesson {
  id: number;
  subject: string;
  teacher: string;
  studentGroup: string;
  timeslot: Timeslot | null;
  room: Room | null;
}
