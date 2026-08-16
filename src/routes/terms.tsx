import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/landing/TermsPage";

const TITLE = "תנאי שימוש | Event OS";
const DESC = "תנאי השימוש של Event OS — מערכת ההפעלה לאירועים ומסעדות.";

export const Route = createFileRoute("/terms")({
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
  component: () => <TermsPage lang="he" />,
});
