// The page under this layout is rendered entirely in the browser, so its HTML shell is the
// same for every id. Build it on the first request and serve it from the CDN afterwards,
// instead of rendering it on a server for every visit.
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export default function LedgerIdLayout({ children }) {
  return children;
}
