export const debugPerfEnabled =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export const fetcher = async <T>(url: string): Promise<T> => {
  const label = `fetch:${url}`;
  if (debugPerfEnabled) {
    console.time(label);
  }
  const response = await fetch(url);
  if (debugPerfEnabled) {
    console.timeEnd(label);
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json() as Promise<T>;
};
