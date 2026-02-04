import { api } from "./client";
import type { Session } from "../types/session";
import type { RawSession } from "../types/rawSession";

export async function fetchSessions(): Promise<Session[]> {
  const response = await api.get("/sessions");
  return response.data;
}


export async function fetchSessionById(id: string): Promise<RawSession> {
  const response = await api.get(`/sessions/${id}`);
  return response.data;
}

