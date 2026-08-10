import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/ItemForm";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { product: true },
  });

  if (!item) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Edit item</h1>
        <Link
          href="/inventory"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Inventory →
        </Link>
      </div>
      <ItemForm
        mode="edit"
        initial={{
          id: item.id,
          barcode: item.product.barcode,
          name: item.product.name,
          brand: item.product.brand,
          imageUrl: item.product.imageUrl,
          category: item.product.category,
          price: item.product.price === null ? null : Number(item.product.price),
          expirationDate: item.expirationDate.toISOString(),
          quantity: item.quantity,
          location: item.location,
        }}
      />
    </div>
  );
}
