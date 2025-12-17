import { api } from "./client";
import type { Session } from "../types/session";


export async function fetchSessions(): Promise<Session[]> {
  const response = await api.get("/sessions");
  return response.data;
}
