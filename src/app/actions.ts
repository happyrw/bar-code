"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lookupProductByBarcode, type LookedUpProduct } from "@/lib/productLookup";
import {
  saveItemSchema,
  updateItemSchema,
  type SaveItemInput,
  type UpdateItemInput,
} from "@/lib/schemas";

export type LookupResult =
  | { found: true; product: LookedUpProduct }
  | { found: false; barcode: string };

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const trimmed = barcode.trim();
  const product = await lookupProductByBarcode(trimmed);
  if (product) return { found: true, product };
  return { found: false, barcode: trimmed };
}

export async function createInventoryItem(input: SaveItemInput) {
  const parsed = saveItemSchema.parse(input);

  const productData = {
    name: parsed.name,
    brand: parsed.brand ?? null,
    imageUrl: parsed.imageUrl ?? null,
    category: parsed.category ?? null,
  };

  const product = parsed.barcode
    ? await prisma.product.upsert({
        where: { barcode: parsed.barcode },
        update: productData,
        create: { ...productData, barcode: parsed.barcode },
      })
    : await prisma.product.create({ data: productData });

  await prisma.inventoryItem.create({
    data: {
      productId: product.id,
      expirationDate: new Date(parsed.expirationDate),
      quantity: parsed.quantity,
      location: parsed.location ?? null,
    },
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateInventoryItem(input: UpdateItemInput) {
  const parsed = updateItemSchema.parse(input);

  const item = await prisma.inventoryItem.findUnique({
    where: { id: parsed.id },
    select: { productId: true },
  });
  if (!item) throw new Error("Inventory item not found");

  await prisma.product.update({
    where: { id: item.productId },
    data: {
      name: parsed.name,
      brand: parsed.brand ?? null,
      imageUrl: parsed.imageUrl ?? null,
      category: parsed.category ?? null,
      barcode: parsed.barcode ?? null,
    },
  });

  await prisma.inventoryItem.update({
    where: { id: parsed.id },
    data: {
      expirationDate: new Date(parsed.expirationDate),
      quantity: parsed.quantity,
      location: parsed.location ?? null,
    },
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function deleteInventoryItem(id: string) {
  await prisma.inventoryItem.delete({ where: { id } });
  revalidatePath("/inventory");
}
