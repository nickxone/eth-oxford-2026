"use client";

import * as React from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type RiskRow = {
  flight: string;
  departure: string;
  locked: string;
  status: "Active" | "Resolving";
};

export function ActiveRiskTable({ data }: { data: RiskRow[] }) {
  const [query, setQuery] = React.useState("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      return (
        row.flight.toLowerCase().includes(q) ||
        row.departure.toLowerCase().includes(q) ||
        row.locked.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  const parseDeparture = (value: string) => {
    const parsed = Date.parse(`2026 ${value}`);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const sorted = React.useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const aTime = parseDeparture(a.departure);
      const bTime = parseDeparture(b.departure);
      return sortDir === "asc" ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [filtered, sortDir]);

  if (!data.length) {
    return (
      <div className="rounded-xl bg-white/70 px-4 py-6 text-center text-sm text-[#3f4a59]">
        Capital is fully liquid (no active risks).
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl bg-white/70 p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}  
          placeholder="Search flight, status, or amount"
          className="h-10 w-full rounded-lg bg-transparent px-3 text-sm text-[#0c1018] outline-none transition focus:border-[#5fe3ff] sm:max-w-xs"
        />
      </div>
      <Table>
        <TableHeader className="bg-transparent">
          <TableRow className="border-transparent">
            <TableHead className="px-4 text-xs text-[#6b7482]">
              Flight
            </TableHead>
            <TableHead className="px-4 text-xs text-[#6b7482]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-[#6b7482]"
                onClick={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
              >
                Departure
                {sortDir === "asc" ? (
                  <IconChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <IconChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead className="px-4 text-xs text-[#6b7482]">
              Locked
            </TableHead>
            <TableHead className="px-4 text-xs text-[#6b7482]">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-sm">
          {sorted.map((risk) => (
            <TableRow key={`${risk.flight}-${risk.departure}`} className="border-transparent">
              <TableCell className="px-4 py-3 font-semibold">
                {risk.flight}
              </TableCell>
              <TableCell className="px-4 py-3 text-[#3f4a59]">
                {risk.departure}
              </TableCell>
              <TableCell className="px-4 py-3 font-medium">{risk.locked}</TableCell>
              <TableCell className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-2 py-1 text-xs",
                    risk.status === "Active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  )}
                >
                  {risk.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {!sorted.length ? (
            <TableRow className="border-transparent">
              <TableCell
                colSpan={4}
                className="px-4 py-6 text-center text-sm text-[#3f4a59]"
              >
                No matches found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
