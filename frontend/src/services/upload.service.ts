import type { Upload } from "../types/models";
import { api } from "./client";

export async function uploadImage(file: File): Promise<Upload> {
  const body = new FormData();
  body.append("file", file);
  const res = await api.post<Upload>("/uploads", body);
  return res.data;
}
