import Link from "next/link";

interface GroupDayTabsProps {
  hrefBase: string;
  days: Array<{ id: string; label: string; date: string }>;
  selectedDayId?: string;
}

export function GroupDayTabs({ hrefBase, days, selectedDayId }: GroupDayTabsProps) {
  const isAllSelected = !selectedDayId;

  return (
    <nav className="mb-6 flex flex-wrap gap-2 text-sm">
      <Link
        href={hrefBase}
        className={`festival-tab-link festival-button-tactile ${
          isAllSelected ? "festival-tab-link-active" : "festival-tab-link-idle"
        }`}
      >
        Alle Tage
      </Link>
      {days.map((day) => {
        const active = selectedDayId === day.id;
        return (
          <Link
            key={day.id}
            href={`${hrefBase}?day=${day.id}`}
            className={`festival-tab-link festival-button-tactile ${
              active ? "festival-tab-link-active" : "festival-tab-link-idle"
            }`}
          >
            {day.label}
          </Link>
        );
      })}
    </nav>
  );
}
