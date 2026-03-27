import moment from "moment";

export const getTodayString = (): string => moment().format("YYYY-MM-DD");
