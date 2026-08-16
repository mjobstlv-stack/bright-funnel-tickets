import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/Landing";

const TITLE = "Event OS — The operating system for live events";
const DESC = "Ticketing, restaurant reservations, staff scheduling, time clock, inventory, POS and live P&L — one workspace for events and venues.";

export const Route = createFileRoute("/en")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
  component: () => <Landing lang="en" />,
});