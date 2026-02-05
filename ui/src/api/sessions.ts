import axios from "axios";
import type { Session } from "../types/session";
import type { RawSession } from "../types/rawSession";

const API_BASE = "http://localhost:8000";

export async function fetchSessions(): Promise<Session[]> {
  const res = await axios.get(`${API_BASE}/sessions`);
  return res.data;
}

export async function fetchSessionById(
  id: number | string
): Promise<RawSession> {
  const res = await axios.get(`${API_BASE}/sessions/${id}`);
  return res.data;
}
