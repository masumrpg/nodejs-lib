import {
  Badge,
  Box,
  Button,
  Calendar,
  CalendarProvider,
  Card,
  ExpandableCalendar,
  Text,
  type CalendarDayData,
  type CalendarDayMarking,
  type ExpandableCalendarRef,
} from "@masumdev/rn-ui";
import { useRouter, type Href } from "expo-router";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  MapPin,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Section, type RnUiSectionContext } from "../shared";

interface DemoProps {
  colors: RnUiSectionContext["colors"];
}

const EventsCalendarDemo = React.memo(function EventsCalendarDemo({
  colors,
}: DemoProps) {
  const [eventDate, setEventDate] = useState<string>("2026-08-14");

  const eventDatabase: Record<
    string,
    Array<{
      title: string;
      time: string;
      location: string;
      type: "engineering" | "design" | "marketing" | "review";
      dotColor: string;
    }>
  > = useMemo(
    () => ({
      "2026-08-04": [
        {
          title: "Sprint Retrospective",
          time: "09:30 AM",
          location: "Main Hall A",
          type: "engineering",
          dotColor: colors.primary,
        },
      ],
      "2026-08-08": [
        {
          title: "Mobile Design System Sync",
          time: "11:00 AM",
          location: "Figma Room 3",
          type: "design",
          dotColor: colors.success,
        },
        {
          title: "Iconography Review",
          time: "02:00 PM",
          location: "Virtual Meeting",
          type: "design",
          dotColor: colors.success,
        },
      ],
      "2026-08-14": [
        {
          title: "v0.3.0 Release Candidate",
          time: "10:00 AM",
          location: "CI/CD Pipeline",
          type: "engineering",
          dotColor: colors.primary,
        },
        {
          title: "Changelog Copywriting",
          time: "01:30 PM",
          location: "Marketing Room",
          type: "marketing",
          dotColor: colors.warning,
        },
        {
          title: "Stakeholder Demo",
          time: "04:00 PM",
          location: "Auditorium",
          type: "review",
          dotColor: colors.accent,
        },
      ],
      "2026-08-19": [
        {
          title: "Security & Vulnerability Audit",
          time: "10:00 AM",
          location: "SecOps Lab",
          type: "engineering",
          dotColor: colors.primary,
        },
      ],
      "2026-08-25": [
        {
          title: "Product Roadmap Kickoff",
          time: "09:00 AM",
          location: "Boardroom 1",
          type: "review",
          dotColor: colors.accent,
        },
        {
          title: "RN UI Workshop",
          time: "03:00 PM",
          location: "Training Room B",
          type: "engineering",
          dotColor: colors.primary,
        },
      ],
    }),
    [colors],
  );

  const multiDotMarkings: Record<string, CalendarDayMarking> = useMemo(
    () => ({
      [eventDate]: { selected: true },
      "2026-08-04": {
        dots: [{ key: "sprint", color: colors.primary }],
      },
      "2026-08-08": {
        dots: [
          { key: "design-sync", color: colors.success },
          { key: "icons", color: colors.success },
        ],
      },
      "2026-08-14": {
        selected: eventDate === "2026-08-14",
        dots: [
          { key: "release", color: colors.primary },
          { key: "marketing", color: colors.warning },
          { key: "stakeholder", color: colors.accent },
        ],
      },
      "2026-08-19": {
        dots: [{ key: "security", color: colors.primary }],
      },
      "2026-08-25": {
        dots: [
          { key: "roadmap", color: colors.accent },
          { key: "workshop", color: colors.primary },
        ],
      },
    }),
    [colors, eventDate],
  );

  const activeEvents = eventDatabase[eventDate] || [];

  const handleDayPress = useCallback((day: CalendarDayData) => {
    setEventDate(day.dateString);
  }, []);

  return (
    <Card outlined>
      <Box gap="md">
        <Box
          row
          wrap
          gap="sm"
          style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Box row center gap="xs" style={{ flexShrink: 1 }}>
            <Sparkles color={colors.accent} size={18} />
            <Text weight="700" color="text" style={{ flexShrink: 1 }}>
              Multi-Dot Events & Schedule
            </Text>
          </Box>
          <Badge tone="accent">Multi-Dot</Badge>
        </Box>
        <Text color="textMuted" variant="bodySmall">
          Displays colored event indicators on dates with scheduled events. Tap
          any date to view agenda details.
        </Text>

        <Box row style={{ flexWrap: "wrap", gap: 8 }}>
          <Badge tone="primary" size="sm">
            Engineering
          </Badge>
          <Badge tone="success" size="sm">
            Design & UX
          </Badge>
          <Badge tone="warning" size="sm">
            Marketing
          </Badge>
          <Badge tone="accent" size="sm">
            Review & Demo
          </Badge>
        </Box>

        <Calendar
          current={eventDate}
          markedDates={multiDotMarkings}
          onDayPress={handleDayPress}
          showTodayButton
        />

        <Box
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
          }}
        >
          <Box
            row
            wrap
            gap="sm"
            style={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Box row center gap="xs" style={{ flexShrink: 1 }}>
              <CalendarIcon color={colors.primary} size={15} />
              <Text
                weight="600"
                color="text"
                variant="bodySmall"
                style={{ flexShrink: 1 }}
              >
                Agenda for {eventDate}
              </Text>
            </Box>
            <Badge
              tone={activeEvents.length > 0 ? "primary" : "secondary"}
              variant="outline"
              size="sm"
            >
              {`${activeEvents.length} ${activeEvents.length === 1 ? "Event" : "Events"}`}
            </Badge>
          </Box>

          {activeEvents.length > 0 ? (
            <Box gap="sm">
              {activeEvents.map((evt, idx) => (
                <Box
                  key={idx}
                  row
                  center
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3.5,
                    borderLeftColor: evt.dotColor,
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Box gap="xs" style={{ flex: 1 }}>
                    <Text weight="600" color="text" style={{ fontSize: 13 }}>
                      {evt.title}
                    </Text>
                    <Box row center style={{ gap: 14 }}>
                      <Box row center gap="xs">
                        <Clock color={colors.textMuted} size={13} />
                        <Text color="textMuted" variant="caption">
                          {evt.time}
                        </Text>
                      </Box>
                      <Box row center gap="xs">
                        <MapPin color={colors.textMuted} size={13} />
                        <Text color="textMuted" variant="caption">
                          {evt.location}
                        </Text>
                      </Box>
                    </Box>
                  </Box>

                  <Badge
                    tone={
                      evt.type === "engineering"
                        ? "primary"
                        : evt.type === "design"
                          ? "success"
                          : evt.type === "marketing"
                            ? "warning"
                            : "accent"
                    }
                    size="sm"
                    style={{ alignSelf: "center" }}
                  >
                    {evt.type}
                  </Badge>
                </Box>
              ))}
            </Box>
          ) : (
            <Box row center gap="xs" style={{ paddingVertical: 4 }}>
              <CheckCircle2 color={colors.textMuted} size={14} />
              <Text color="textMuted" variant="caption">
                No scheduled events on this date. Tap Aug 4, 8, 14, 19, or 25 to
                test events!
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
});

const FastMonthYearCalendarDemo = React.memo(
  function FastMonthYearCalendarDemo({ colors }: DemoProps) {
    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const [selectedDate, setSelectedDate] = useState(todayStr);

    const markedEvents: Record<string, CalendarDayMarking> = useMemo(
      () => ({
        [selectedDate]: { selected: true },
        "2026-07-05": { marked: true, dotColor: colors.primary },
        "2026-07-12": {
          dots: [
            { key: "meeting", color: colors.primary },
            { key: "task", color: colors.warning },
          ],
        },
        "2026-07-15": { marked: true, dotColor: colors.success },
        "2026-07-22": {
          dots: [
            { key: "flight", color: colors.accent },
            { key: "hotel", color: colors.success },
          ],
        },
      }),
      [colors, selectedDate],
    );

    const handleDayPress = useCallback((day: CalendarDayData) => {
      setSelectedDate(day.dateString);
    }, []);

    return (
      <Card outlined>
        <Box gap="md">
          <Box
            row
            wrap
            gap="sm"
            style={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Box row center gap="xs" style={{ flexShrink: 1 }}>
              <Layers color={colors.primary} size={18} />
              <Text weight="700" color="text" style={{ flexShrink: 1 }}>
                Fast Month & Year Selector
              </Text>
            </Box>
            <Badge tone="primary">Fast Selector</Badge>
          </Box>
          <Text color="textMuted" variant="bodySmall">
            Tap month or year headers to open fast picker overlays with smooth
            ease-out transitions.
          </Text>

          <Calendar
            current={selectedDate}
            markedDates={markedEvents}
            onDayPress={handleDayPress}
            showTodayButton
          />

          <Box
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 8,
            }}
          >
            <Box
              row
              wrap
              gap="sm"
              style={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Text
                weight="600"
                color="text"
                variant="bodySmall"
                style={{ flexShrink: 1 }}
              >
                Selected: {selectedDate}
              </Text>
              <Badge tone="success" variant="outline">
                ACTIVE
              </Badge>
            </Box>

            <Box row center gap="md">
              <Box row center gap="xs">
                <Clock color={colors.primary} size={14} />
                <Text color="textMuted" variant="caption">
                  10:00 AM - Sprint Planning
                </Text>
              </Box>
              <Box row center gap="xs">
                <MapPin color={colors.warning} size={14} />
                <Text color="textMuted" variant="caption">
                  Room 4B
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>
    );
  },
);

const RangeCalendarDemo = React.memo(function RangeCalendarDemo({
  colors,
}: DemoProps) {
  const [rangeStart, setRangeStart] = useState<string | null>("2026-07-10");
  const [rangeEnd, setRangeEnd] = useState<string | null>("2026-07-18");

  const handleRangePress = useCallback(
    (day: { dateString: string }) => {
      const date = day.dateString;
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(date);
        setRangeEnd(null);
      } else if (rangeStart && !rangeEnd) {
        if (date < rangeStart) {
          setRangeStart(date);
          setRangeEnd(null);
        } else {
          setRangeEnd(date);
        }
      }
    },
    [rangeStart, rangeEnd],
  );

  const rangeMarkedDates = useMemo(() => {
    if (!rangeStart) return {};
    if (!rangeEnd) {
      return {
        [rangeStart]: {
          selected: true,
          startingDay: true,
          endingDay: true,
          color: colors.primary,
        },
      };
    }

    const marked: Record<string, CalendarDayMarking> = {};
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    const curr = new Date(startDate);

    while (curr <= endDate) {
      const dateStr = curr.toISOString().split("T")[0];
      if (dateStr === rangeStart) {
        marked[dateStr] = {
          startingDay: true,
          color: colors.primary,
          textColor: colors.onPrimary,
        };
      } else if (dateStr === rangeEnd) {
        marked[dateStr] = {
          endingDay: true,
          color: colors.primary,
          textColor: colors.onPrimary,
        };
      } else {
        marked[dateStr] = {
          isMiddle: true,
          color: colors.primarySoft,
          textColor: colors.primary,
        };
      }
      curr.setDate(curr.getDate() + 1);
    }

    return marked;
  }, [colors, rangeStart, rangeEnd]);

  return (
    <Card outlined>
      <Box gap="md">
        <Box
          row
          wrap
          gap="sm"
          style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Text weight="700" color="text" style={{ flexShrink: 1 }}>
            Period & Date Range Selection
          </Text>
          <Badge tone="accent" variant="outline">
            Period Range
          </Badge>
        </Box>
        <Text color="textMuted" variant="bodySmall">
          Tap start date and end date to select booking range.
        </Text>

        <Calendar
          current="2026-07-12"
          markedDates={rangeMarkedDates}
          onDayPress={handleRangePress}
        />

        <Box
          row
          center
          style={{
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text color="textMuted" variant="bodySmall">
            Check-in / Check-out
          </Text>
          <Text weight="700" color="primary" variant="bodySmall">
            {rangeStart || "None"} ➔ {rangeEnd || "None"}
          </Text>
        </Box>
      </Box>
    </Card>
  );
});

const ExpandableCalendarDemo = React.memo(function ExpandableCalendarDemo({
  colors,
}: DemoProps) {
  const [expandableDate, setExpandableDate] = useState<string>("2026-08-25");
  const expandableCalendarRef = useRef<ExpandableCalendarRef>(null);

  const markedDates = useMemo(
    () => ({
      [expandableDate]: { selected: true },
      "2026-08-04": { dots: [{ color: colors.primary }] },
      "2026-08-08": { dots: [{ color: colors.success }] },
      "2026-08-14": {
        dots: [
          { color: colors.primary },
          { color: colors.warning },
          { color: colors.accent },
        ],
      },
      "2026-08-19": { dots: [{ color: colors.primary }] },
      "2026-08-25": { dots: [{ color: colors.accent }] },
    }),
    [colors, expandableDate],
  );

  return (
    <Card outlined>
      <Box gap="md">
        <Box
          row
          wrap
          gap="sm"
          style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Box row center gap="xs" style={{ flexShrink: 1 }}>
            <ChevronDown color={colors.primary} size={18} />
            <Text weight="700" color="text" style={{ flexShrink: 1 }}>
              Expandable Week / Month Calendar
            </Text>
          </Box>
          <Badge tone="primary">Expandable</Badge>
        </Box>
        <Text color="textMuted" variant="bodySmall">
          Swipe down the bottom knob to expand to full month view, or swipe up to
          collapse into a single week row.
        </Text>

        <Box
          style={{
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <CalendarProvider
            date={expandableDate}
            onDateChanged={(date: string) => setExpandableDate(date)}
          >
            <ExpandableCalendar
              ref={expandableCalendarRef}
              initialPosition="closed"
              markedDates={markedDates}
              closeOnDayPress={false}
            />
          </CalendarProvider>
        </Box>

        <Box
          row
          center
          style={{
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Box gap="xxs">
            <Text color="textMuted" variant="caption">
              Focused Date
            </Text>
            <Text weight="700" color="primary" variant="bodySmall">
              {expandableDate}
            </Text>
          </Box>

          <Button
            size="sm"
            variant="outline"
            onPress={() =>
              expandableCalendarRef.current?.toggleCalendarPosition()
            }
          >
            Toggle Week / Month
          </Button>
        </Box>
      </Box>
    </Card>
  );
});

const TimelineLauncherDemo = React.memo(function TimelineLauncherDemo({
  colors,
}: DemoProps) {
  const router = useRouter();

  return (
    <Card outlined>
      <Box gap="md">
        <Box
          row
          wrap
          gap="sm"
          style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Box row center gap="xs" style={{ flexShrink: 1 }}>
            <Clock color={colors.accent} size={18} />
            <Text weight="700" color="text" style={{ flexShrink: 1 }}>
              Dedicated Timeline Calendar
            </Text>
          </Box>
          <Badge tone="accent">Heavy / Fullscreen</Badge>
        </Box>
        <Text color="textMuted" variant="bodySmall">
          Full 24-hour daily timeline grid with live now indicator, expandable
          calendar header, and interactive event blocks.
        </Text>

        <Button
          variant="filled"
          tone="primary"
          onPress={() => router.push("/rn-ui/timeline-calendar" as Href)}
        >
          Open Fullscreen Timeline
        </Button>
      </Box>
    </Card>
  );
});

export function CalendarSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Calendar">
      <Box gap="xl">
        <EventsCalendarDemo colors={colors} />
        <FastMonthYearCalendarDemo colors={colors} />
        <RangeCalendarDemo colors={colors} />
        <ExpandableCalendarDemo colors={colors} />
        <TimelineLauncherDemo colors={colors} />
      </Box>
    </Section>
  );
}
