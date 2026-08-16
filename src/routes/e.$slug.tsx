import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/e/$slug")({
  component: () => <Outlet />,
});