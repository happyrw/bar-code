import Link from "next/link";
import { ItemForm } from "@/components/ItemForm";

export default function AddProductPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Add product manually
        </h1>
        <Link
          href="/inventory"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Inventory →
        </Link>
      </div>
      <ItemForm mode="create" initial={{ name: "", quantity: 1 }} />
    </div>
  );
}
