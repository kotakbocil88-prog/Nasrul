import { storage } from "@/src/utils/storage";

const PREFIX = "qc_draft_";

export type Draft = {
  step: "header" | "samples" | "signature";
  header: Record<string, string>;
  samples: any[];
  sigPemeriksa: string | null;
  sigMengetahui: string | null;
  updatedAt: number;
};

export async function saveDraft(formType: string, data: Draft): Promise<void> {
  await storage.setItem(PREFIX + formType, JSON.stringify(data));
}

export async function loadDraft(formType: string): Promise<Draft | null> {
  const raw = await storage.getItem<string>(PREFIX + formType, "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export async function clearDraft(formType: string): Promise<void> {
  await storage.removeItem(PREFIX + formType);
}

export async function draftMap(keys: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(
    keys.map(async (k) => {
      const d = await loadDraft(k);
      out[k] = !!d;
    }),
  );
  return out;
}
