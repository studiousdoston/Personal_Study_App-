import { api } from "./client";
import type { RegistrationStatus, TokenResponse, User } from "../types/models";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", { email, password });
  return res.data;
}

export async function register(email: string, password: string): Promise<User> {
  const res = await api.post<User>("/auth/register", { email, password });
  return res.data;
}

export async function getRegistrationStatus(): Promise<RegistrationStatus> {
  const res = await api.get<RegistrationStatus>("/auth/registration");
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>("/auth/me");
  return res.data;
}
