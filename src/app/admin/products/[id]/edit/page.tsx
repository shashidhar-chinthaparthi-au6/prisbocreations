import { ProductWizardClient } from "@/components/admin/product-wizard/ProductWizardClient";

export const metadata = { title: "Edit product · Admin" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductWizardClient editProductId={id} />;
}
