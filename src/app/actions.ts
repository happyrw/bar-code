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

export type BatchSummary = {
  id: string;
  quantity: number;
  expirationDate: string;
  location: string | null;
};

export type LookupResult =
  | { found: true; product: LookedUpProduct; existingBatches: BatchSummary[] }
  | { found: false; barcode: string };

function toBatchSummary(item: {
  id: string;
  quantity: number;
  expirationDate: Date;
  location: string | null;
}): BatchSummary {
  return {
    id: item.id,
    quantity: item.quantity,
    expirationDate: item.expirationDate.toISOString(),
    location: item.location,
  };
}

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const trimmed = barcode.trim();

  const existing = await prisma.product.findUnique({
    where: { barcode: trimmed },
    include: { items: { orderBy: { expirationDate: "asc" } } },
  });

  if (existing) {
    return {
      found: true,
      product: {
        barcode: trimmed,
        name: existing.name,
        brand: existing.brand,
        imageUrl: existing.imageUrl,
        category: existing.category,
        price: existing.price === null ? null : Number(existing.price),
        source: "local",
      },
      existingBatches: existing.items.map(toBatchSummary),
    };
  }

  const product = await lookupProductByBarcode(trimmed);
  if (product) return { found: true, product, existingBatches: [] };
  return { found: false, barcode: trimmed };
}

export async function createInventoryItem(input: SaveItemInput) {
  const parsed = saveItemSchema.parse(input);

  const productData = {
    name: parsed.name,
    brand: parsed.brand ?? null,
    imageUrl: parsed.imageUrl ?? null,
    category: parsed.category ?? null,
    price: parsed.price ?? null,
  };

  const product = parsed.barcode
    ? await prisma.product.upsert({
        where: { barcode: parsed.barcode },
        update: productData,
        create: { ...productData, barcode: parsed.barcode },
      })
    : await prisma.product.create({ data: productData });

  const expirationDate = new Date(parsed.expirationDate);
  const location = parsed.location ?? null;

  // Same product + same expiration date + same location is the same
  // physical batch — merge into it instead of fragmenting into a
  // duplicate row.
  const existingBatch = await prisma.inventoryItem.findFirst({
    where: { productId: product.id, expirationDate, location },
  });

  if (existingBatch) {
    await prisma.inventoryItem.update({
      where: { id: existingBatch.id },
      data: { quantity: { increment: parsed.quantity } },
    });
  } else {
    await prisma.inventoryItem.create({
      data: {
        productId: product.id,
        expirationDate,
        quantity: parsed.quantity,
        location,
      },
    });
  }

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
      price: parsed.price ?? null,
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

export type OutflowResult =
  | {
      success: true;
      productName: string;
      batchExpirationDate: string;
      batchCleared: boolean;
      remainingInBatch: number;
    }
  | { success: false; reason: "product-not-found" | "no-stock" };

/**
 * Records outflow (use/consumption) of one unit for a scanned barcode,
 * removing from the soonest-expiring batch first (FIFO) since that's
 * how items actually get used out of a fridge or pantry.
 */
export async function recordOutflow(barcode: string): Promise<OutflowResult> {
  const product = await prisma.product.findUnique({
    where: { barcode: barcode.trim() },
  });
  if (!product) return { success: false, reason: "product-not-found" };

  const batch = await prisma.inventoryItem.findFirst({
    where: { productId: product.id },
    orderBy: { expirationDate: "asc" },
  });
  if (!batch) return { success: false, reason: "no-stock" };

  const batchCleared = batch.quantity <= 1;

  if (batchCleared) {
    await prisma.inventoryItem.delete({ where: { id: batch.id } });
  } else {
    await prisma.inventoryItem.update({
      where: { id: batch.id },
      data: { quantity: { decrement: 1 } },
    });
  }

  revalidatePath("/inventory");

  return {
    success: true,
    productName: product.name,
    batchExpirationDate: batch.expirationDate.toISOString(),
    batchCleared,
    remainingInBatch: batchCleared ? 0 : batch.quantity - 1,
  };
}
