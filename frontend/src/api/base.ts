import axios, { type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./consts";
import { getApiErrorMessage } from "./errors";

type JsonObject = Record<string, unknown>;
type JsonValue = JsonObject | unknown[] | string | number | boolean | null;

type RequestOptions = Omit<AxiosRequestConfig, "url" | "method" | "data"> & {
  method?: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
};

export type DownloadInfo = {
  url: string;
  filename: string;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const buildApiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const apiRequest = async <T = JsonValue>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  try {
    const response = await apiClient.request<T>({
      url: path,
      method: options.method ?? "GET",
      ...options,
    });

    return (response.data ?? {}) as T;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
};

export const uploadFile = async <T = JsonValue>(
  path: string,
  file: File,
  fieldName = "file"
): Promise<T> => {
  const formData = new FormData();
  formData.append(fieldName, file);

  try {
    const response = await apiClient.request<T>({
      url: path,
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return (response.data ?? {}) as T;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
};
