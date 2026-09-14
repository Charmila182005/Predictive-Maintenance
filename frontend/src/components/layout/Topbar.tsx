import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, Menu, Search, SearchX, Sun, Moon } from "lucide-react";
import { useAppStore, type ConnectionStatus } from "@/lib/store";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils/cn";
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

const CONNECTION_META: Record<ConnectionStatus, { label: string; tone: "live" | "healthy" | "elevated" | "critical" | "neutral"; pulse: boolean }> = {
  live: { label: "Live", tone: "live", pulse: true },
  checking: { label: "Connecting", tone: "neutral", pulse: true },
  simulated: { label: "Simulated", tone: "elevated", pulse: false },
  offline: { label: "Offline", tone: "critical", pulse: false },
};

function CommandSearch({ navigate, onClose }: { navigate: ReturnType<typeof useNavigate>; onClose: () => void }) {
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return NAV_ITEMS.filter(
      (n) => n.label.toLowerCase().includes(t) || n.index.includes(t) || n.to.includes(t),
    ).slice(0, 5);
  }, [q]);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setQ("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={boxRef} className="relative hidden w-56 md:block lg:w-64">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">
        <Search className="h-3.5 w-3.5" strokeWidth={1.6} />
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches.length) {
            navigate(matches[0].to);
            setQ("");
            onClose();
          }
          if (e.key === "Escape") setQ("");
        }}
        placeholder="Search module…"
        className="h-9 w-full rounded-lg border border-hairline bg-overlay/70 pl-8.5 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-signal/50"
        aria-label="Search modules"
      />
      {q.trim() && (
        <div className="absolute inset-x-0 top-full mt-1.5 overflow-hidden rounded-lg border border-hairline bg-surface shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]">
          {matches.length ? (
            matches.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => {
                  setQ("");
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-white/5 hover:text-ink"
              >
                <n.icon className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.6} />
                {n.label}
                <ArrowRight className="ml-auto h-3 w-3 text-ink-3" strokeWidth={1.6} />
              </Link>
            ))
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-3 text-[12px] text-ink-3">
              <SearchX className="h-3.5 w-3.5" strokeWidth={1.6} />
              No module matches "{q}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsBell() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) markNotificationsRead();
        }}
        aria-label={`Notifications, ${unread} unread`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-overlay/70 text-ink-2 transition-colors hover:border-hairline-strong hover:text-ink"
      >
        <BellRing className="h-4 w-4" strokeWidth={1.6} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 font-mono text-[9px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 overflow-hidden rounded-xl border border-hairline bg-surface shadow-[0_18px_50px_-18px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Notifications</p>
            <span className="font-mono text-[10px] tabular-nums text-ink-3">{notifications.length}</span>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length ? (
              notifications.slice(0, 10).map((n) => (
                <li key={n.id} className="border-b border-hairline/60 px-4 py-2.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <StatusDot
                      tone={n.severity === "Critical" ? "critical" : n.severity === "High" ? "elevated" : "info"}
                      size="sm"
                    />
                    <p className="text-[12px] font-medium text-ink">{n.title}</p>
                  </div>
                  <p className="mt-0.5 pl-4 text-[11.5px] leading-relaxed text-ink-2">{n.body}</p>
                  <p className="mt-0.5 pl-4 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">{fmtTs(n.ts, { seconds: true })}</p>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-[12px] text-ink-3">No notifications yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-overlay/70 text-ink-2 transition-colors hover:border-hairline-strong hover:text-ink"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
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

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1340px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-white/5 hover:text-ink lg:hidden"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <CommandSearch navigate={navigate} onClose={() => setSidebarOpen(false)} />
        </div>

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <span className="hidden font-mono text-xs tabular-nums text-ink-3 lg:inline">{clock} UTC</span>
          <div
            role="status"
            className="flex h-8 items-center gap-2 rounded-full border border-hairline bg-overlay/70 px-3"
            title={connection.message}
          >
            <StatusDot tone={meta.tone} pulse={meta.pulse} size="sm" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-2">{meta.label}</span>
          </div>
          <ThemeToggle />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
