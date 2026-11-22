import { LocaleConfig } from "react-native-calendars";

export interface LocaleData {
  monthNames: string[];
  monthNamesShort: string[];
  dayNames: string[];
  dayNamesShort: string[];
  today?: string;
  confirm?: string;
  cancel?: string;
  am?: string;
  pm?: string;
  wheel?: string;
  calendar?: string;
  selectDate?: string;
  selectTime?: string;
  prev?: string;
  next?: string;
}

export type ResolvedLocaleData = Required<LocaleData>;

export type LocaleInput = string | Partial<LocaleData>;

const enLocale: ResolvedLocaleData = {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  dayNames: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
  confirm: "Confirm",
  cancel: "Cancel",
  am: "AM",
  pm: "PM",
  wheel: "Wheel",
  calendar: "Calendar",
  selectDate: "Select Date",
  selectTime: "Select Time",
  prev: "Prev",
  next: "Next",
};

const idLocale: ResolvedLocaleData = {
  monthNames: [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
  dayNames: [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ],
  dayNamesShort: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  today: "Hari Ini",
  confirm: "Konfirmasi",
  cancel: "Batal",
  am: "AM",
  pm: "PM",
  wheel: "Roda",
  calendar: "Kalender",
  selectDate: "Pilih Tanggal",
  selectTime: "Pilih Waktu",
  prev: "Sebelumnya",
  next: "Berikutnya",
};

const frLocale: ResolvedLocaleData = {
  monthNames: [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ],
  monthNamesShort: [
    "Janv.",
    "Févr.",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juil.",
    "Août",
    "Sept.",
    "Oct.",
    "Nov.",
    "Déc.",
  ],
  dayNames: [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ],
  dayNamesShort: ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."],
  today: "Aujourd'hui",
  confirm: "Confirmer",
  cancel: "Annuler",
  am: "AM",
  pm: "PM",
  wheel: "Molette",
  calendar: "Calendrier",
  selectDate: "Sélectionner une date",
  selectTime: "Sélectionner l'heure",
  prev: "Préc.",
  next: "Suiv.",
};

const esLocale: ResolvedLocaleData = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: [
    "Ene.",
    "Feb.",
    "Mar.",
    "Abr.",
    "May.",
    "Jun.",
    "Jul.",
    "Ago.",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dic.",
  ],
  dayNames: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  dayNamesShort: ["Dom.", "Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb."],
  today: "Hoy",
  confirm: "Confirmar",
  cancel: "Cancelar",
  am: "AM",
  pm: "PM",
  wheel: "Selector",
  calendar: "Calendario",
  selectDate: "Seleccionar fecha",
  selectTime: "Seleccionar hora",
  prev: "Ant.",
  next: "Sig.",
};

const localeExtras = new Map<string, ResolvedLocaleData>([
  ["en", enLocale],
  ["id", idLocale],
  ["fr", frLocale],
  ["es", esLocale],
]);

function normalizeLocaleEntry(data?: Partial<LocaleData>): ResolvedLocaleData {
  const monthNames =
    Array.isArray(data?.monthNames) && data.monthNames.length === 12
      ? data.monthNames
      : enLocale.monthNames;
  const monthNamesShort =
    Array.isArray(data?.monthNamesShort) && data.monthNamesShort.length === 12
      ? data.monthNamesShort
      : monthNames.map((m) => m.slice(0, 3));
  const dayNames =
    Array.isArray(data?.dayNames) && data.dayNames.length === 7
      ? data.dayNames
      : enLocale.dayNames;
  const dayNamesShort =
    Array.isArray(data?.dayNamesShort) && data.dayNamesShort.length === 7
      ? data.dayNamesShort
      : dayNames.map((d) => d.slice(0, 3));

  return {
    monthNames,
    monthNamesShort,
    dayNames,
    dayNamesShort,
    today: data?.today || enLocale.today,
    confirm: data?.confirm || enLocale.confirm,
    cancel: data?.cancel || enLocale.cancel,
    am: data?.am || enLocale.am,
    pm: data?.pm || enLocale.pm,
    wheel: data?.wheel || enLocale.wheel,
    calendar: data?.calendar || enLocale.calendar,
    selectDate: data?.selectDate || enLocale.selectDate,
    selectTime: data?.selectTime || enLocale.selectTime,
    prev: data?.prev || enLocale.prev,
    next: data?.next || enLocale.next,
  };
}

// Preserve existing custom locales without overwriting with empty XDate defaults
const existingLocales = { ...(LocaleConfig.locales ?? {}) } as Record<
  string,
  Partial<LocaleData> | undefined
>;
delete existingLocales[""];

LocaleConfig.locales = {
  ...existingLocales,
  "": enLocale,
  en: enLocale,
  id: idLocale,
  fr: frLocale,
  es: esLocale,
};

if (!LocaleConfig.defaultLocale) {
  LocaleConfig.defaultLocale = "en";
}

export function registerLocale(
  name: string,
  data: Partial<LocaleData>,
  setAsDefault = false,
): ResolvedLocaleData {
  const normalizedKey = name.trim();
  const normalized = normalizeLocaleEntry(data);
  localeExtras.set(normalizedKey, normalized);
  localeExtras.set(normalizedKey.toLowerCase(), normalized);
  LocaleConfig.locales[normalizedKey] = normalized;
  if (setAsDefault) {
    LocaleConfig.defaultLocale = normalizedKey;
  }
  return normalized;
}

export function resolveLocaleKey(locale?: string): string {
  const candidate = (
    typeof locale === "string" && locale.trim()
      ? locale.trim()
      : LocaleConfig.defaultLocale || "en"
  );

  if (
    localeExtras.has(candidate) ||
    LocaleConfig.locales[candidate]
  ) {
    return candidate;
  }

  const lower = candidate.toLowerCase();
  if (localeExtras.has(lower) || LocaleConfig.locales[lower]) {
    return lower;
  }

  const baseTag = lower.split(/[-_]/)[0];
  if (baseTag && (localeExtras.has(baseTag) || LocaleConfig.locales[baseTag])) {
    return baseTag;
  }

  return "en";
}

/**
 * Sync LocaleConfig.defaultLocale safely when a component receives an explicit string locale
 */
export function syncCalendarLocale(locale?: LocaleInput): string | undefined {
  if (typeof locale === "string" && locale.trim()) {
    const key = resolveLocaleKey(locale);
    const data = getLocaleData(locale);
    if (!LocaleConfig.locales[key]) {
      LocaleConfig.locales[key] = data;
    }
    return key;
  }
  return undefined;
}

/**
 * Get resolved locale data from string ID, LocaleConfig, or inline object
 */
export function getLocaleData(locale?: LocaleInput): ResolvedLocaleData {
  if (typeof locale === "object" && locale !== null) {
    return normalizeLocaleEntry(locale);
  }

  const key = resolveLocaleKey(locale);
  const extra = localeExtras.get(key) ?? localeExtras.get(key.toLowerCase());
  const wixEntry = LocaleConfig.locales[key] as Partial<LocaleData> | undefined;

  if (wixEntry || extra) {
    return normalizeLocaleEntry({
      ...(extra ?? {}),
      ...(wixEntry ?? {}),
    });
  }

  return enLocale;
}

export { LocaleConfig };
