import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import { DemoNavbar } from "@/widgets/demo-layout";

export const Route = createFileRoute("/demo")({
  component: DemoRoot,
});

function DemoRoot() {
  return (
    <NuqsAdapter>
      <DemoNavbar />
      <main className="container my-4 pb-[calc(env(safe-area-inset-bottom)+92px)] md:pb-0">
        <Outlet />
      </main>
    </NuqsAdapter>
  );
}
