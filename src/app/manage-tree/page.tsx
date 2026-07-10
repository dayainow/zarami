import { Suspense } from "react";
import { ManageTreeClient } from "@/components/manage-tree/ManageTreeClient";

export default function ManageTreePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <ManageTreeClient />
    </Suspense>
  );
}
