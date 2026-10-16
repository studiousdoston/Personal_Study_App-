import type { Stats } from "../types/models";
import { api } from "./client";

export async function getStats(tz: string): Promise<Stats> {
  const res = await api<Stats>("/stats", { params: { tz } });
  return res.data;
}

// GET /stats?tz=Asia/Seoul. params becomes the query string automatically.
