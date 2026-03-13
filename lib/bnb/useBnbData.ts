"use client";

import { useEffect, useState } from "react";
import type { BnbData } from "@/lib/bnb/types";
import { loadData, saveData, seedExampleIfEmpty } from "@/lib/bnb/storage";

export function useBnbData(): {
  data: BnbData;
  setData: (next: BnbData) => void;
  loaded: boolean;
} {
  const [data, setData] = useState<BnbData>(() => seedExampleIfEmpty(loadData()));
  const loaded = true;

  useEffect(() => {
    saveData(data);
  }, [data]);

  return { data, setData, loaded };
}

