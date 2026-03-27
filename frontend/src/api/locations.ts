import { apiRequest, uploadFile } from "./base";

export type Location = {
  id: number;
  name: string;
};

export const fetchLocations = () => apiRequest<Location[]>("/locations");

export const fetchLocationById = (locationId: number) =>
  apiRequest<Location>(`/locations/${locationId}`);

export const createLocation = (name: string) =>
  apiRequest<Location>("/locations", {
    method: "POST",
    data: { name },
  });

export const deleteLocation = (locationId: number) =>
  apiRequest(`/locations/${locationId}`, {
    method: "DELETE",
  });

export const importLocationsFromExcel = (file: File) =>
  uploadFile("/locations/excel", file);
