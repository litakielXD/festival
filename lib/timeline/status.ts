import { isAfter, isBefore, parseISO } from "date-fns";
import type { SlotStatus } from "@/lib/types/domain";

export function getSlotStatus(startsAt: string, endsAt: string | null, now = new Date()): SlotStatus {
  const start = parseISO(startsAt);

  if (isBefore(now, start)) {
    return "upcoming";
  }

  if (!endsAt) {
    return "running_now";
  }

  const end = parseISO(endsAt);
  if (isAfter(now, start) && isBefore(now, end)) {
    return "running_now";
  }

  return "finished";
}
