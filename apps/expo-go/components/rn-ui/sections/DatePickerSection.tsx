import {
  Box,
  Button,
  DatePicker,
  DatePickerCard,
  DatePickerDialog,
  DatePickerInput,
  Divider,
  formatTime,
  Text,
} from "@masumdev/rn-ui";
import React, { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  Section,
  type RnUiSectionContext,
} from "../shared";

const BirthdayWheelDemo = React.memo(function BirthdayWheelDemo() {
  const [birthday, setBirthday] = useState<Date>(new Date(1998, 5, 24)); // 24 June 1998

  return (
    <DemoCard
      title="Birthday Wheel Roller Card"
      badge='variant="wheel"'
      badgeTone="primary"
      description="Cupertino wheel rollers with smooth momentum snap and animated flush capsule switcher."
    >
      <DatePickerCard
        title="SET BIRTHDAY"
        variant="wheel"
        value={birthday}
        onChange={setBirthday}
        onConfirm={(d) => setBirthday(d)}
        confirmText="SUBMIT"
      />

      <DemoReadout
        label="Selected Birthday"
        value={birthday.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      />
    </DemoCard>
  );
});

const GridCalendarDemo = React.memo(function GridCalendarDemo() {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  return (
    <DemoCard
      title="Grid Calendar Picker Card"
      badge='variant="calendar"'
      badgeTone="secondary"
      description="Full monthly calendar grid picker integrated with active theme stepping and continuous corners."
    >
      <DatePickerCard
        title="SELECT DATE"
        variant="calendar"
        value={calendarDate}
        onChange={setCalendarDate}
        onConfirm={(d) => setCalendarDate(d)}
        confirmText="CONFIRM DATE"
      />

      <DemoReadout
        label="Selected Reservation Date"
        value={calendarDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      />
    </DemoCard>
  );
});

const FormInputsDemo = React.memo(function FormInputsDemo() {
  const [birthday, setBirthday] = useState<Date>(new Date(1998, 5, 24));
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [appointmentTime, setAppointmentTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(14, 30, 0, 0);
    return d;
  });
  const [scheduleDateTime, setScheduleDateTime] = useState<Date>(new Date());

  return (
    <DemoCard
      title="Form Trigger Inputs"
      badge="DatePickerInput"
      badgeTone="success"
      description="Pressable modal dialog triggers with theme input contrast and continuous rounded corners."
    >
      <Box gap="sm">
        <Text variant="caption" weight="600" color="text">
          Date of Birth (Wheel Dialog)
        </Text>
        <DatePickerInput
          variant="wheel"
          title="SET BIRTHDAY"
          value={birthday}
          onChange={setBirthday}
          placeholder="Select date of birth"
          mode="date"
        />
      </Box>

      <Box gap="sm">
        <Text variant="caption" weight="600" color="text">
          Reservation Date (Calendar Dialog)
        </Text>
        <DatePickerInput
          variant="calendar"
          title="SELECT RESERVATION"
          value={calendarDate}
          onChange={setCalendarDate}
          placeholder="Select reservation date"
          mode="date"
        />
      </Box>

      <Box gap="sm">
        <Text variant="caption" weight="600" color="text">
          Appointment Time (Time Wheel)
        </Text>
        <DatePickerInput
          variant="wheel"
          title="SET TIME"
          value={appointmentTime}
          onChange={setAppointmentTime}
          placeholder="Select time"
          mode="time"
        />
      </Box>

      <Box gap="sm">
        <Text variant="caption" weight="600" color="text">
          Event Schedule (Calendar + Time Dialog)
        </Text>
        <DatePickerInput
          variant="calendar"
          title="SET EVENT SCHEDULE"
          value={scheduleDateTime}
          onChange={setScheduleDateTime}
          placeholder="Select date & time"
          mode="datetime"
        />
      </Box>
    </DemoCard>
  );
});

const LocalePickerDemo = React.memo(function LocalePickerDemo() {
  const [localizedDate, setLocalizedDate] = useState<Date>(new Date());
  const [selectedLocale, setSelectedLocale] = useState<string>("en");

  return (
    <DemoCard
      title="Multi-Language Localization"
      badge='locale="id" | "fr" | "es" | "en"'
      badgeTone="accent"
      description="Customizable localization for day and month names, compatible with LocaleConfig."
    >
      <Box row gap="xs">
        {(["en", "id", "fr", "es"] as const).map((loc) => {
          const isSelected = selectedLocale === loc;
          return (
            <Button
              key={loc}
              size="sm"
              variant={isSelected ? "filled" : "outline"}
              tone={isSelected ? "primary" : "secondary"}
              onPress={() => setSelectedLocale(loc)}
            >
              {loc.toUpperCase()}
            </Button>
          );
        })}
      </Box>

      <DatePickerInput
        locale={selectedLocale}
        title="SELECT DATE"
        placeholder="Select date"
        value={localizedDate}
        onChange={setLocalizedDate}
        monthFormat="full"
        showDayOfWeek
      />
    </DemoCard>
  );
});

const TimePickerDemo = React.memo(function TimePickerDemo() {
  const [is24HourTime, setIs24HourTime] = useState<boolean>(false);
  const [appointmentTime, setAppointmentTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(14, 30, 0, 0);
    return d;
  });

  return (
    <DemoCard
      title="Time Picker (24H & 12H AM/PM)"
      badge={is24HourTime ? "24-Hour" : "12-Hour AM/PM"}
      badgeTone="primary"
      description="Smooth wheel time picker supporting military 24-hour format and standard 12-hour AM/PM."
    >
      <Box row gap="xs">
        <Button
          size="sm"
          variant={is24HourTime ? "filled" : "outline"}
          tone={is24HourTime ? "primary" : "secondary"}
          onPress={() => setIs24HourTime(true)}
        >
          24-Hour (00-23)
        </Button>
        <Button
          size="sm"
          variant={!is24HourTime ? "filled" : "outline"}
          tone={!is24HourTime ? "primary" : "secondary"}
          onPress={() => setIs24HourTime(false)}
        >
          12-Hour (AM/PM)
        </Button>
      </Box>

      <Box gap="xs">
        <Text variant="caption" color="textMuted">
          Time Picker Input Field
        </Text>
        <DatePickerInput
          mode="time"
          is24Hour={is24HourTime}
          title="SELECT TIME"
          placeholder="Select time"
          value={appointmentTime}
          onChange={setAppointmentTime}
        />
      </Box>

      <Divider style={{ marginVertical: 4 }} />

      <Box gap="xs">
        <Text variant="caption" color="textMuted">
          Inline Roller: {formatTime(appointmentTime, is24HourTime)}
        </Text>
        <DatePicker
          mode="time"
          is24Hour={is24HourTime}
          value={appointmentTime}
          onChange={setAppointmentTime}
          minuteInterval={5}
        />
      </Box>
    </DemoCard>
  );
});

const MonthYearDemo = React.memo(function MonthYearDemo() {
  const [monthYear, setMonthYear] = useState<Date>(new Date());

  return (
    <DemoCard
      title="Month - Year Expiration Picker"
      badge='mode="month-year"'
      badgeTone="accent"
      description="Embeddable inline wheels for payment cards and document expiration dates."
    >
      <DatePicker
        mode="month-year"
        value={monthYear}
        onChange={setMonthYear}
        monthFormat="full"
      />
    </DemoCard>
  );
});

const CustomDialogsDemo = React.memo(function CustomDialogsDemo() {
  const [wheelModalOpen, setWheelModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [birthday, setBirthday] = useState<Date>(new Date(1998, 5, 24));
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  return (
    <DemoCard
      title="Custom Dialog Triggers"
      badge="DatePickerDialog"
      badgeTone="warning"
      description="Imperatively trigger wheel or calendar modal dialogs from custom buttons."
    >
      <Box row gap="md">
        <Button
          variant="filled"
          tone="primary"
          style={{ flex: 1 }}
          onPress={() => setWheelModalOpen(true)}
        >
          Open Wheel Dialog
        </Button>
        <Button
          variant="outline"
          tone="secondary"
          style={{ flex: 1 }}
          onPress={() => setCalendarModalOpen(true)}
        >
          Open Calendar Dialog
        </Button>
      </Box>

      <DatePickerDialog
        visible={wheelModalOpen}
        variant="wheel"
        title="SET BIRTHDAY"
        value={birthday}
        onClose={() => setWheelModalOpen(false)}
        onConfirm={(d) => {
          setBirthday(d);
          setWheelModalOpen(false);
        }}
      />

      <DatePickerDialog
        visible={calendarModalOpen}
        variant="calendar"
        title="SELECT DATE"
        value={calendarDate}
        onClose={() => setCalendarModalOpen(false)}
        onConfirm={(d) => {
          setCalendarDate(d);
          setCalendarModalOpen(false);
        }}
      />
    </DemoCard>
  );
});

export function DatePickerSection(_props?: { ctx?: RnUiSectionContext }) {
  return (
    <Section title="DatePicker & Wheel Picker">
      <Box gap="lg">
        <BirthdayWheelDemo />
        <GridCalendarDemo />
        <FormInputsDemo />
        <LocalePickerDemo />
        <TimePickerDemo />
        <MonthYearDemo />
        <CustomDialogsDemo />
      </Box>
    </Section>
  );
}
