import axios from "axios";

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string") {
    return err.response.data.detail;
  }
  return "Something went wrong";
}


