import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/Landing";

const TITLE = "Event OS — מערכת ההפעלה לאירועים";
const DESC =
  "כרטוס, שמירת מקום במסעדה, סידור עבודה, שעון נוכחות, מלאי, קופה ו-P&L חי — מערכת אחת לניהול אירועים ומסעדות.";

export const Route = createFileRoute("/")({
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
  component: () => <Landing lang="he" />,
});
