export type AppRole = "admin" | "member";
export type NoteVisibility = "private" | "group";
export type SlotStatus = "running_now" | "upcoming" | "finished";

export interface Group {
  id: string;
  name: string;
  created_by: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: AppRole;
}

export interface Band {
  id: string;
  group_id: string;
  name: string;
  genre: string | null;
  created_by: string;
}

export interface FestivalDay {
  id: string;
  group_id: string;
  date: string;
  label: string;
}

export interface BandSlot {
  id: string;
  band_id: string;
  festival_day_id: string;
  stage: string | null;
  starts_at: string;
  ends_at: string | null;
}

export interface BandNote {
  id: string;
  band_id: string;
  author_id: string;
  content: string;
  visibility: NoteVisibility;
}
