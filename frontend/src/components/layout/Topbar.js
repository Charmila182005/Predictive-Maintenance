import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, Menu, Search, SearchX, Sun, Moon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/context/ThemeContext";
import { StatusDot } from "@/components/deck/StatusDot";
import { NAV_ITEMS } from "@/lib/nav";
import { fmtTs } from "@/lib/derived";
function useUtcClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}
const CONNECTION_META = {
    live: { label: "Live", tone: "live", pulse: true },
    checking: { label: "Connecting", tone: "neutral", pulse: true },
    simulated: { label: "Simulated", tone: "elevated", pulse: false },
    offline: { label: "Offline", tone: "critical", pulse: false },
};
function CommandSearch({ navigate, onClose }) {
    const [q, setQ] = useState("");
    const boxRef = useRef(null);
    const matches = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t)
            return [];
        return NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(t) || n.index.includes(t) || n.to.includes(t)).slice(0, 5);
    }, [q]);
    useEffect(() => {
        const handler = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target))
                setQ("");
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    return (_jsxs("div", { ref: boxRef, className: "relative hidden w-56 md:block lg:w-64", children: [_jsx("div", { className: "pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3", children: _jsx(Search, { className: "h-3.5 w-3.5", strokeWidth: 1.6 }) }), _jsx("input", { value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => {
                    if (e.key === "Enter" && matches.length) {
                        navigate(matches[0].to);
                        setQ("");
                        onClose();
                    }
                    if (e.key === "Escape")
                        setQ("");
                }, placeholder: "Search module\u2026", className: "h-9 w-full rounded-lg border border-hairline bg-overlay/70 pl-8.5 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-signal/50", "aria-label": "Search modules" }), q.trim() && (_jsx("div", { className: "absolute inset-x-0 top-full mt-1.5 overflow-hidden rounded-lg border border-hairline bg-surface shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]", children: matches.length ? (matches.map((n) => (_jsxs(Link, { to: n.to, onClick: () => {
                        setQ("");
                        onClose();
                    }, className: "flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-white/5 hover:text-ink", children: [_jsx(n.icon, { className: "h-3.5 w-3.5 shrink-0 text-ink-3", strokeWidth: 1.6 }), n.label, _jsx(ArrowRight, { className: "ml-auto h-3 w-3 text-ink-3", strokeWidth: 1.6 })] }, n.to)))) : (_jsxs("div", { className: "flex items-center gap-2.5 px-3 py-3 text-[12px] text-ink-3", children: [_jsx(SearchX, { className: "h-3.5 w-3.5", strokeWidth: 1.6 }), "No module matches \"", q, "\""] })) }))] }));
}
function NotificationsBell() {
    const notifications = useAppStore((s) => s.notifications);
    const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    const unread = notifications.filter((n) => !n.read).length;
    useEffect(() => {
        const handler = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    return (_jsxs("div", { ref: boxRef, className: "relative", children: [_jsxs("button", { onClick: () => {
                    setOpen((o) => !o);
                    if (!open && unread)
                        markNotificationsRead();
                }, "aria-label": `Notifications, ${unread} unread`, className: "relative flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-overlay/70 text-ink-2 transition-colors hover:border-hairline-strong hover:text-ink", children: [_jsx(BellRing, { className: "h-4 w-4", strokeWidth: 1.6 }), unread > 0 && (_jsx("span", { className: "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 font-mono text-[9px] font-semibold text-white", children: unread }))] }), open && (_jsxs("div", { className: "absolute right-0 top-full mt-1.5 w-80 overflow-hidden rounded-xl border border-hairline bg-surface shadow-[0_18px_50px_-18px_rgba(0,0,0,0.85)]", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-hairline px-4 py-2.5", children: [_jsx("p", { className: "font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3", children: "Notifications" }), _jsx("span", { className: "font-mono text-[10px] tabular-nums text-ink-3", children: notifications.length })] }), _jsx("ul", { className: "max-h-80 overflow-y-auto", children: notifications.length ? (notifications.slice(0, 10).map((n) => (_jsxs("li", { className: "border-b border-hairline/60 px-4 py-2.5 last:border-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(StatusDot, { tone: n.severity === "Critical" ? "critical" : n.severity === "High" ? "elevated" : "info", size: "sm" }), _jsx("p", { className: "text-[12px] font-medium text-ink", children: n.title })] }), _jsx("p", { className: "mt-0.5 pl-4 text-[11.5px] leading-relaxed text-ink-2", children: n.body }), _jsx("p", { className: "mt-0.5 pl-4 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3", children: fmtTs(n.ts, { seconds: true }) })] }, n.id)))) : (_jsx("li", { className: "px-4 py-6 text-center text-[12px] text-ink-3", children: "No notifications yet." })) })] }))] }));
}
function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (_jsx("button", { onClick: toggleTheme, "aria-label": `Switch to ${theme === "dark" ? "light" : "dark"} mode`, className: "flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-overlay/70 text-ink-2 transition-colors hover:border-hairline-strong hover:text-ink", children: theme === "dark" ? _jsx(Sun, { className: "h-4 w-4" }) : _jsx(Moon, { className: "h-4 w-4" }) }));
}
export function Topbar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const connection = useAppStore((s) => s.connection);
    const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
    const now = useUtcClock();
    const current = useMemo(() => NAV_ITEMS.find((n) => pathname.startsWith(n.to)) ?? NAV_ITEMS[0], [pathname]);
    const meta = CONNECTION_META[connection.status];
    const clock = now.toISOString().slice(11, 19);
    return (_jsx("header", { className: "sticky top-0 z-20 border-b border-hairline bg-canvas/80 backdrop-blur-md", children: _jsxs("div", { className: "mx-auto flex h-16 w-full max-w-[1340px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [_jsx("button", { onClick: () => setSidebarOpen(true), "aria-label": "Open navigation", className: "rounded-lg p-2 text-ink-3 transition-colors hover:bg-white/5 hover:text-ink lg:hidden", children: _jsx(Menu, { className: "h-4.5 w-4.5" }) }), _jsx(CommandSearch, { navigate: navigate, onClose: () => setSidebarOpen(false) })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2.5 sm:gap-3", children: [_jsxs("span", { className: "hidden font-mono text-xs tabular-nums text-ink-3 lg:inline", children: [clock, " UTC"] }), _jsxs("div", { role: "status", className: "flex h-8 items-center gap-2 rounded-full border border-hairline bg-overlay/70 px-3", title: connection.message, children: [_jsx(StatusDot, { tone: meta.tone, pulse: meta.pulse, size: "sm" }), _jsx("span", { className: "font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-2", children: meta.label })] }), _jsx(ThemeToggle, {}), _jsx(NotificationsBell, {})] })] }) }));
}
