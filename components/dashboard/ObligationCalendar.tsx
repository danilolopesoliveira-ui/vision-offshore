"use client";

import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DatesSetArg, EventSourceFuncArg } from "@fullcalendar/core";
import { ObligationDrawer, type ObligationEvent } from "./ObligationDrawer";

export function ObligationCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<ObligationEvent | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchEvents = useCallback(
    async (info: EventSourceFuncArg) => {
      const params = new URLSearchParams({
        start: info.startStr,
        end: info.endStr,
      });
      const res = await fetch(`/api/obligations/calendar?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  function handleEventClick(arg: EventClickArg) {
    setSelectedEvent({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.startStr,
      extendedProps: arg.event.extendedProps as ObligationEvent["extendedProps"],
    });
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 [&_.fc-toolbar-title]:text-base [&_.fc-toolbar-title]:font-semibold [&_.fc-button]:text-xs [&_.fc-button]:capitalize [&_.fc-button-primary]:bg-primary [&_.fc-button-primary]:border-primary [&_.fc-button-primary:hover]:bg-primary/90 [&_.fc-daygrid-event]:text-xs [&_.fc-daygrid-event]:rounded [&_.fc-daygrid-event]:px-1 [&_.fc-event-title]:truncate">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="pt-br"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana" }}
          events={fetchEvents}
          eventClick={handleEventClick}
          eventDisplay="block"
          height="auto"
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} mais`}
        />
      </div>

      <ObligationDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onMutate={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
