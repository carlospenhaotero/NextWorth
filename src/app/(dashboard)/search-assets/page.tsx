import { redirect } from "next/navigation";

// Search and Add Asset were merged into a single flow at /add-asset.
export default function SearchAssetsPage() {
  redirect("/add-asset");
}
