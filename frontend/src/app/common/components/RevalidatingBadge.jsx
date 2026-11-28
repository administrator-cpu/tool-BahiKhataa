export default function RevalidatingBadge({ show }) {
  if (!show) return null;
  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 rounded-full bg-[#101014] px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      Updating to latest figures…
    </div>
  );
}
