//Date:
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const SLOT_TYPES = [
  { id: "tarde", label: "Tarde" },
  { id: "noche", label: "Noche" },
];

export function getTwoWeekDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);

  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      dateISO: d.toISOString().slice(0, 10),
      dayLabel: DAY_NAMES[d.getDay()],
      shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
      weekIndex: i < 7 ? 0 : 1,
    });
  }
  return days;
}

export function slotId(dateISO, slotType) {
  return `${dateISO}-${slotType}`;
}

export function formatSlotLabel(day, slotType) {
  const slot = SLOT_TYPES.find((s) => s.id === slotType);
  return `${day.dayLabel} ${day.shortDate} - ${slot?.label || slotType}`;
}
