import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5 text-sm text-ink">
        <p className="font-display text-base text-ink">Where to upload images</p>
        <p className="mt-2 text-ink-muted">
          There is no separate media library page. Open{" "}
          <span className="font-medium text-ink">Categories</span>,{" "}
          <span className="font-medium text-ink">Subcategories</span>, or{" "}
          <span className="font-medium text-ink">Products</span> — each form has an{" "}
          <span className="font-medium text-ink">Upload</span> control (plus optional URL fields).
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
      <Link
        href="/admin/products"
        className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm hover:border-accent"
      >
        <h2 className="font-display text-lg text-ink">Products</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create catalog items. Use <span className="font-medium text-ink">Upload product images</span>{" "}
          on the form (or paste comma-separated URLs).
        </p>
      </Link>
      <Link
        href="/admin/categories"
        className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm hover:border-accent"
      >
        <h2 className="font-display text-lg text-ink">Categories</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Top-level departments. <span className="font-medium text-ink">Upload category image</span>{" "}
          on the new-category form.
        </p>
      </Link>
      <Link
        href="/admin/subcategories"
        className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm hover:border-accent"
      >
        <h2 className="font-display text-lg text-ink">Subcategories</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Groups under each category. Optional{" "}
          <span className="font-medium text-ink">Upload subcategory image</span> on the form.
        </p>
      </Link>
      <Link
        href="/admin/orders"
        className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm hover:border-accent"
      >
        <h2 className="font-display text-lg text-ink">Orders</h2>
        <p className="mt-2 text-sm text-ink-muted">Track payment and fulfillment status.</p>
      </Link>
      <Link
        href="/admin/users"
        className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm hover:border-accent"
      >
        <h2 className="font-display text-lg text-ink">Users</h2>
        <p className="mt-2 text-sm text-ink-muted">View registered customers and admins.</p>
      </Link>
      </div>
    </div>
  );
}
