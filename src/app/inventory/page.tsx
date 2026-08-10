import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteItemButton } from "@/components/DeleteItemButton";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getStatus(expirationDate: Date) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDays = Math.round(
    (expirationDate.getTime() - startOfToday.getTime()) / MS_PER_DAY
  );

  if (diffDays < 0) {
    return { label: "Expired", tone: "expired" as const };
  }
  if (diffDays <= 7) {
    return {
      label: diffDays === 0 ? "Expires today" : `Expires in ${diffDays}d`,
      tone: "soon" as const,
    };
  }
  return { label: null, tone: "ok" as const };
}

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    include: { product: true },
    orderBy: { expirationDate: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
        <div className="flex gap-4 text-sm">
          <Link
            href="/scan"
            className="font-medium text-gray-900 underline underline-offset-2"
          >
            Scan
          </Link>
          <Link href="/add" className="text-gray-500 hover:text-gray-900">
            Add manually
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
          Nothing in your inventory yet. Scan a product to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = getStatus(item.expirationDate);
            return (
              <li
                key={item.id}
                className={`flex items-center gap-4 rounded-xl border p-3 ${
                  status.tone === "expired"
                    ? "border-red-200 bg-red-50"
                    : status.tone === "soon"
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {item.product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                    No image
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.product.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[item.product.brand, item.location]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Expires {item.expirationDate.toLocaleDateString()} · Qty{" "}
                    {item.quantity}
                    {item.product.price !== null &&
                      ` · ${Number(item.product.price).toFixed(2)} each`}
                  </p>
                </div>

                {status.label && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium text-white ${
                      status.tone === "expired" ? "bg-red-600" : "bg-amber-500"
                    }`}
                  >
                    {status.label}
                  </span>
                )}

                <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  <Link
                    href={`/inventory/${item.id}/edit`}
                    className="text-gray-600 underline underline-offset-2 hover:text-gray-900"
                  >
                    Edit
                  </Link>
                  <DeleteItemButton id={item.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
