import axios from "axios";

type ApiErrorPayload = {
  detail?: string;
};

const DEFAULT_API_ERROR_MESSAGE = "שגיאה בתקשורת עם השרת";

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (
      detail &&
      typeof detail === "object" &&
      "detail" in detail &&
      typeof (detail as ApiErrorPayload).detail === "string" &&
      (detail as ApiErrorPayload).detail?.trim()
    ) {
      return (detail as ApiErrorPayload).detail as string;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return DEFAULT_API_ERROR_MESSAGE;
};
