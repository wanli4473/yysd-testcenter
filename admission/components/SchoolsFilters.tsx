"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  FIELDS,
  FIELD_LABELS,
} from "@/lib/catalog-labels";

export function SchoolsFilters({
  country,
  field,
  q,
}: {
  country: string;
  field: string;
  q: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const push = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (!v) next.delete(k);
        else next.set(k, v);
      }
      router.push(`/schools?${next.toString()}`);
    },
    [params, router]
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-sm">
        <span className="text-stone-600">国家</span>
        <select
          className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
          value={country}
          onChange={(e) => push({ country: e.target.value })}
        >
          <option value="">全部</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-stone-600">学科</span>
        <select
          className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
          value={field}
          onChange={(e) => push({ field: e.target.value })}
        >
          <option value="">全部</option>
          {FIELDS.map((f) => (
            <option key={f} value={f}>
              {FIELD_LABELS[f]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-stone-600">搜索</span>
        <Input
          defaultValue={q}
          placeholder="校名 / 项目"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              push({ q: (e.target as HTMLInputElement).value.trim() });
            }
          }}
          onBlur={(e) => push({ q: e.target.value.trim() })}
        />
      </label>
    </div>
  );
}
