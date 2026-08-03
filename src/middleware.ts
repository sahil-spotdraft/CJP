import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/inbox/:path*",
    "/triage/:path*",
    "/requests/:path*",
    "/orgs/:path*",
    "/roadmap/:path*",
    "/tags/:path*",
    "/settings/:path*",
  ],
};
