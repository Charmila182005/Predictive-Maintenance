import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAppStore } from "@/lib/store";
import { probeConnection } from "@/lib/api/provider";

export function AppShell() {
  const probe = useAppStore((s) => s.probe);
  useEffect(() => {
    void probe(probeConnection);
  }, [probe]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-canvas">
      <div aria-hidden className="stage-aurora pointer-events-none absolute inset-0" />
      <div aria-hidden className="stage-grid pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
      <Sidebar />
      <Sidebar mobile />
      <div className="relative lg:pl-56">
        <Topbar />
        <main className="mx-auto w-full max-w-[1360px] px-4 pt-7 pb-16 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}