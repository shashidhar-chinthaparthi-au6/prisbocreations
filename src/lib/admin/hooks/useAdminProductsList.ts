import useSWR from "swr";
import { adminFetchJson } from "@/lib/admin/admin-fetch";

export type AdminProductListResponse = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export function useAdminProductsList(key: string | null) {
  return useSWR<AdminProductListResponse>(
    key,
    (url) => adminFetchJson<AdminProductListResponse>(url),
    { revalidateOnFocus: false },
  );
}
