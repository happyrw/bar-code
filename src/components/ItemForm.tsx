"use client";

import { useState, useTransition } from "react";
import { createInventoryItem, updateInventoryItem } from "@/app/actions";
import { STORAGE_LOCATIONS } from "@/lib/schemas";

export type ItemFormValues = {
  id?: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  expirationDate?: string | null;
  quantity?: number;
  location?: string | null;
};

type ItemFormProps = {
  mode: "create" | "edit";
  initial: ItemFormValues;
  onCancel?: () => void;
};

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ItemForm({ mode, initial, onCancel }: ItemFormProps) {
  const [barcode] = useState(initial.barcode ?? "");
  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand ?? "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [expirationDate, setExpirationDate] = useState(
    toDateInputValue(initial.expirationDate)
  );
  const [quantity, setQuantity] = useState(initial.quantity ?? 1);
  const [location, setLocation] = useState(initial.location ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload = {
      barcode,
      name,
      brand,
      imageUrl,
      category,
      expirationDate,
      quantity,
      location,
    };

    startTransition(async () => {
      try {
        if (mode === "edit" && initial.id) {
          await updateInventoryItem({ id: initial.id, ...payload });
        } else {
          await createInventoryItem(payload);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "NEXT_REDIRECT") {
          setErrors({ form: err.message });
        } else if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        } else {
          setErrors({ form: "Something went wrong. Please try again." });
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </p>
      )}

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name || "Product"}
          className="h-32 w-32 rounded-xl object-cover"
        />
      )}

      {barcode && (
        <div className="text-xs text-gray-500">
          Barcode: <span className="font-mono">{barcode}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Name<span className="text-red-500"> *</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="Product name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Brand
          </label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Image URL
        </label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Expiration date<span className="text-red-500"> *</span>
          </label>
          <input
            required
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Storage location
        </label>
        <input
          list="storage-locations"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="e.g. fridge, pantry, bathroom"
        />
        <datalist id="storage-locations">
          {STORAGE_LOCATIONS.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending
            ? "Saving…"
            : mode === "edit"
            ? "Save changes"
            : "Add to inventory"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
