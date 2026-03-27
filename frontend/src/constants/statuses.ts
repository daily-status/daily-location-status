// Central status values used across the frontend.
export const DAILY_STATUS_OK: string = "תקין";
export const DAILY_STATUS_BAD: string = "לא תקין";
export const DAILY_STATUS_MISSING: string = "לא הוזן";

// Map daily/self status value to chip color class.
export const getDailyStatusChipClass = (status: string) => {
  if (status === DAILY_STATUS_OK) {
    return "chip-status-ok";
  }
  if (status === DAILY_STATUS_BAD) {
    return "chip-status-bad";
  }
  return "chip-status-missing";
};
