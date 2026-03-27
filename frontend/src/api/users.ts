import { apiRequest, uploadFile } from "./base";

export type User = {
  id: number;
  fullName: string;
  phone?: string;
};

export type UpdateUserPayload = {
  id: number;
  fullName?: string;
  phone?: string;
};

export type CreateUserPayload = {
  fullName: string;
  phone: string;
};

export const fetchUsers = () => apiRequest<User[]>("/users");

export const fetchUserById = (userId: number) =>
  apiRequest<User>(`/users/${userId}`);

export const updateUser = (userId: number, payload: UpdateUserPayload) =>
  apiRequest(`/users/${userId}`, {
    method: "PUT",
    data: payload,
  });

export const deleteUser = (userId: number) =>
  apiRequest(`/users/${userId}`, {
    method: "DELETE",
  });

export const createUser = (payload: CreateUserPayload) =>
  apiRequest<User>("/users", {
    method: "POST",
    data: payload,
  });

export const importUsersFromExcel = (file: File) =>
  uploadFile("/users/excel", file);
