import moment from "moment";

// Convert backend ISO timestamp into friendly Hebrew date-time.
export const formatTimestamp = (value?: string | null): string => {
  if (!value) {
    return "-";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return value;
  }

  return parsed.locale("he").format("DD/MM/YYYY, HH:mm");
};

// Convert a date value into the datetime-local input format expected by the browser.
export const toLocalDateTimeInput = (value?: string | Date): string => {
  const parsed = value ? moment(value) : moment();
  if (!parsed.isValid()) {
    return "";
  }

  return parsed.format("YYYY-MM-DDTHH:mm");
};

// Convert a local datetime-local input value into a UTC ISO string for the backend.
export const toUtcIsoFromLocalInput = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return undefined;
  }

  return parsed.toISOString();
};
