import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Pantry Tracker
      </h1>
      <p className="mt-3 max-w-sm text-sm text-gray-500">
        Scan a barcode, confirm the details, and keep track of what&apos;s
        about to expire.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/scan"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Scan a product
        </Link>
        <Link
          href="/inventory"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-white"
        >
          View inventory
        </Link>
      </div>
    </div>
  );
}
