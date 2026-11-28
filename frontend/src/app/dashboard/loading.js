import DashboardLayout from "@/app/common/layout/DashboardLayout";
import LedgerPageSkeleton from "@/app/common/components/LedgerPageSkeleton";

// Shown instantly on navigation while the next dashboard page's code loads
export default function Loading() {
  return (
    <DashboardLayout>
      <LedgerPageSkeleton />
    </DashboardLayout>
  );
}
