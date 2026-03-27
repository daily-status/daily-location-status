import { apiRequest, buildApiUrl, buildQueryString, type DownloadInfo } from "./base";

export type Report = {
  id: number;
  userId: number;
  locationId: number;
  isStatusOk?: boolean | null;
  occurredAt: string;
  createdAt?: string;
  source?: "ui" | "bot";
};

export type ReportFilters = {
  minDate?: string;
  maxDate?: string;
  date?: string;
  userId?: number;
  locationId?: number;
  status?: string;
};

export type CreateReportPayload = {
  userId: number;
  locationId: number;
  isStatusOk?: boolean;
  occurredAt: string;
  source: "ui" | "bot";
};

export const fetchReports = (filters: ReportFilters = {}) =>
  apiRequest<Report[]>(`/reports${buildQueryString(filters)}`);

export const createReport = (payload: CreateReportPayload) =>
  apiRequest<Report>("/reports", {
    method: "POST",
    data: payload,
  });

export const updateReport = (reportId: number, payload: Partial<CreateReportPayload>) =>
  apiRequest<Report>(`/reports/${reportId}`, {
    method: "PUT",
    data: payload,
  });

export const deleteReport = (reportId: number) =>
  apiRequest(`/reports/${reportId}`, {
    method: "DELETE",
  });

export const exportReportsDownloadInfo = (
  filters: ReportFilters = {},
  filename = "reports.xlsx"
): DownloadInfo => ({
  url: buildApiUrl(`/reports/export${buildQueryString(filters)}`),
  filename,
});

export const exportReports = (filters: ReportFilters = {}) =>
  apiRequest<Blob>(`/reports/export${buildQueryString(filters)}`);
