"use client";

import { useTransition } from "react";
import { deleteInventoryItem } from "@/app/actions";

export function DeleteItemButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Remove this item from your inventory?")) return;
    startTransition(() => {
      deleteInventoryItem(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 underline underline-offset-2 hover:text-red-800 disabled:opacity-50"
    >
      {isPending ? "Removing…" : "Delete"}
    </button>
  );
}
