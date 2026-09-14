import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "relative min-h-[100dvh] overflow-hidden bg-canvas", children: [_jsx("div", { "aria-hidden": true, className: "stage-aurora pointer-events-none absolute inset-0" }), _jsx("div", { "aria-hidden": true, className: "stage-grid pointer-events-none absolute inset-x-0 top-0 h-[640px]" }), _jsx(Sidebar, {}), _jsx(Sidebar, { mobile: true }), _jsxs("div", { className: "relative lg:pl-56", children: [_jsx(Topbar, {}), _jsx("main", { className: "mx-auto w-full max-w-[1360px] px-4 pt-7 pb-16 sm:px-6 lg:px-10", children: _jsx(Outlet, {}) })] })] }));
}
