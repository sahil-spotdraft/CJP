import { redirect } from "next/navigation";

/** Deprecated: Feature Requests list now lives on `/`. */
export default function DeprecatedFeatureRequestsPage() {
  redirect("/");
}
