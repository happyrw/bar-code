"use client";

import { useState } from "react";
import Link from "next/link";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { lookupBarcode } from "@/app/actions";

type Stage = "scan" | "looking-up" | "confirm";

export default function ScanPage() {
  const [stage, setStage] = useState<Stage>("scan");
  const [values, setValues] = useState<ItemFormValues | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

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
          quantity: 1,
        });
        setNotFoundBarcode(null);
      } else {
        setValues({ barcode: result.barcode, name: "", quantity: 1 });
        setNotFoundBarcode(result.barcode);
      }
    } catch {
      setValues({ barcode, name: "", quantity: 1 });
      setLookupError("Lookup failed. You can still enter details manually.");
    } finally {
      setStage("confirm");
    }
  }

  function reset() {
    setStage("scan");
    setValues(null);
    setNotFoundBarcode(null);
    setLookupError(null);
  }

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
