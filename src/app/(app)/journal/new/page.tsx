"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JournalForm } from "@/components/journal";
import { PageHeader } from "@/components/ui";
import { LumiBubble } from "@/components/Lumi";
import { isValidYmd } from "@/lib/dates";

function NewJournal() {
  const params = useSearchParams();
  const d = params.get("date");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New Journal" sub="Ruang aman untuk ceritamu hari ini." />
      <div className="mb-5">
        <LumiBubble expression="happy" message="I'm listening, Alya. Tell me anything — big or small. 🌿" size={60} />
      </div>
      <JournalForm initial={isValidYmd(d) ? { entryDate: d } : undefined} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <NewJournal />
    </Suspense>
  );
}
