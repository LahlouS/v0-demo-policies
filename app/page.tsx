"use client";

import { PolicyWizard } from "@/components/policy/policy-wizard";

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <PolicyWizard />
    </main>
  );
}
