// Returns the build ID of the deployment that is live right now.
// Open tabs compare it with the build ID they were loaded with (see UpdateNotifier).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID || null },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
