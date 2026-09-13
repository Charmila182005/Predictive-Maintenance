import { Navigate, Route, Routes } from "react-router-dom";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/deck/EmptyState";
import { Overview } from "@/pages/Overview";
import { Analyze } from "@/pages/Analyze";
import { MachineHealth } from "@/pages/MachineHealth";
import { HistoryPage } from "@/pages/History";
import { Insights } from "@/pages/Insights";

function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      eyebrow="404"
      title="Route not found"
      description="The path you followed is off the chart. Choose a destination from the navigation."
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/machines" element={<MachineHealth />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
