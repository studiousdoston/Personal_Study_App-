import axios, { isAxiosError } from "axios";

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string") {
    return err.response.data.detail;
  }
  return "Something went wrong";
}

export function isNotFoundError(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  const status = err.response?.status;
  return status === 404 || status === 422;
}

export function isForbiddenError(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 403;
}

export function isNotEnoughCardsError(err: unknown): boolean {
  return (
    isAxiosError(err) &&
    err.response?.status === 422 &&
    typeof err.response.data?.detail === "string"
  );
}

export function hasStatus(err: unknown, status: number): boolean {
  return isAxiosError(err) && err.response?.status === status;
}
