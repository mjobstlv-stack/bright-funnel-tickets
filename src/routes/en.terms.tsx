import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/landing/TermsPage";

const TITLE = "Terms of Service | Event OS";
const DESC = "Event OS terms of service — the operating system for events and restaurants.";

export const Route = createFileRoute("/en/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
  component: () => <TermsPage lang="en" />,
});
