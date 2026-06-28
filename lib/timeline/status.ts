import { isAfter, isBefore, parseISO } from "date-fns";
import type { SlotStatus } from "@/lib/types/domain";

export function getSlotStatus(startsAt: string, endsAt: string, now = new Date()): SlotStatus {
  const start = parseISO(startsAt);
  const end = parseISO(endsAt);

  if (isAfter(now, start) && isBefore(now, end)) {
    return "running_now";
  }

  if (isBefore(now, start)) {
    return "upcoming";
  }

  return "finished";
}
