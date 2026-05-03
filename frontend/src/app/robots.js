export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  return {
    rules: {
      userAgent: '*', // Applies to all search engines (Googlebot, Bingbot, etc.)
      allow: '/',
      disallow: [
        '/dashboard/', // Prevent indexing of the logged-in app area
        '/api/',       // Prevent indexing of API endpoints
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`, // Points bots to your sitemap
  };
}