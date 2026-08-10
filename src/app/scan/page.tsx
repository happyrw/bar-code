"use client";

import { useState } from "react";
import Link from "next/link";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import {
  lookupBarcode,
  recordOutflow,
  type BatchSummary,
  type OutflowResult,
} from "@/app/actions";

type Stage = "scan" | "looking-up" | "choose" | "confirm" | "removed";

export default function ScanPage() {
  const [stage, setStage] = useState<Stage>("scan");
  const [values, setValues] = useState<ItemFormValues | null>(null);
  const [existingBatches, setExistingBatches] = useState<BatchSummary[]>([]);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [outflowResult, setOutflowResult] = useState<OutflowResult | null>(
    null
  );
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleDetect(barcode: string) {
    setStage("looking-up");
    setLookupError(null);

    try {
      const result = await lookupBarcode(barcode);
      if (result.found) {
        setValues({
          barcode: result.product.barcode,
          name: result.product.name,
          brand: result.product.brand,
          imageUrl: result.product.imageUrl,
          category: result.product.category,
          price: result.product.price,
          quantity: 1,
        });
        setExistingBatches(result.existingBatches);
        setNotFoundBarcode(null);
        setStage(result.existingBatches.length > 0 ? "choose" : "confirm");
      } else {
        setValues({ barcode: result.barcode, name: "", quantity: 1 });
        setExistingBatches([]);
        setNotFoundBarcode(result.barcode);
        setStage("confirm");
      }
    } catch {
      setValues({ barcode, name: "", quantity: 1 });
      setExistingBatches([]);
      setLookupError("Lookup failed. You can still enter details manually.");
      setStage("confirm");
    }
  }

  async function handleRemoveOne() {
    if (!values?.barcode) return;
    setIsRemoving(true);
    try {
      const result = await recordOutflow(values.barcode);
      setOutflowResult(result);
      setStage("removed");
    } finally {
      setIsRemoving(false);
    }
  }

  function reset() {
    setStage("scan");
    setValues(null);
    setExistingBatches([]);
    setNotFoundBarcode(null);
    setLookupError(null);
    setOutflowResult(null);
  }

  const totalOnHand = existingBatches.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Scan a product
        </h1>
        <Link
          href="/inventory"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Inventory →
        </Link>
      </div>

      {stage === "scan" && (
        <>
          <BarcodeScanner active={stage === "scan"} onDetect={handleDetect} />
          <p className="mt-4 text-center text-sm text-gray-500">
            Point your camera at a UPC or EAN barcode.
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/add"
              className="text-sm font-medium text-gray-700 underline underline-offset-2"
            >
              No barcode? Add manually
            </Link>
          </div>
        </>
      )}

      {stage === "looking-up" && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="text-sm text-gray-500">Looking up product…</p>
        </div>
      )}

      {stage === "choose" && values && (
        <div>
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-3">
            {values.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.imageUrl}
                alt={values.name}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                No image
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {values.name}
              </p>
              {values.brand && (
                <p className="truncate text-xs text-gray-500">
                  {values.brand}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {totalOnHand} already in your inventory
              </p>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5 text-xs text-gray-500">
            {existingBatches.map((batch) => (
              <li
                key={batch.id}
                className="flex justify-between rounded-lg bg-gray-100 px-3 py-2"
              >
                <span>
                  Qty {batch.quantity}
                  {batch.location ? ` · ${batch.location}` : ""}
                </span>
                <span>
                  expires{" "}
                  {new Date(batch.expirationDate).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setStage("confirm")}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add more stock
            </button>
            <button
              type="button"
              onClick={handleRemoveOne}
              disabled={isRemoving}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isRemoving ? "Removing…" : "Use / remove one"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={isRemoving}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "removed" && outflowResult && (
        <div className="space-y-4">
          {outflowResult.success ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Removed 1 {outflowResult.productName} from the batch expiring{" "}
              {new Date(outflowResult.batchExpirationDate).toLocaleDateString()}
              .{" "}
              {outflowResult.batchCleared
                ? "That batch is now empty and was cleared."
                : `${outflowResult.remainingInBatch} left in that batch.`}
            </p>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {outflowResult.reason === "no-stock"
                ? "This product has no stock left to remove."
                : "This product isn't in your inventory yet."}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Scan another
            </button>
            <Link
              href="/inventory"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Inventory
            </Link>
          </div>
        </div>
      )}

      {stage === "confirm" && values && (
        <div>
          {notFoundBarcode && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No match found for barcode {notFoundBarcode}. Fill in the
              details below.
            </p>
          )}
          {lookupError && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {lookupError}
            </p>
          )}
          <ItemForm mode="create" initial={values} onCancel={reset} />
        </div>
      )}
    </div>
  );
}
