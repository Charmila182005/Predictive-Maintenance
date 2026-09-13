import { useCallback, useState } from "react";
import { runAssessment } from "@/lib/api/provider";
import { useAppStore } from "@/lib/store";
export const DEFAULTS = {
    productType: "M",
    airTemp: 298.1,
    processTemp: 308.6,
    speed: 1425,
    torque: 41.3,
    toolWear: 208,
    machineId: "MM-0001",
    state: "RUNNING",
};
export function useAnalyze() {
    const [status, setStatus] = useState("idle");
    const [assessment, setAssessment] = useState(null);
    const [connection, setConnection] = useState(null);
    const [error, setError] = useState(null);
    const addAssessment = useAppStore((s) => s.addAssessment);
    const setStoreConnection = useAppStore((s) => s.setConnection);
    const run = useCallback(async (input) => {
        setStatus("running");
        setError(null);
        setAssessment(null);
        try {
            const res = await runAssessment(input);
            setAssessment(res.assessment);
            setConnection(res.connection ?? null);
            setStoreConnection(res.connection);
            setStatus(res.connection.status === "offline" ? "error" : "done");
            addAssessment(res.assessment);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Assessment failed");
            setStatus("error");
        }
    }, [addAssessment, setStoreConnection]);
    const reset = useCallback(() => {
        setStatus("idle");
        setAssessment(null);
        setConnection(null);
        setError(null);
    }, []);
    return { status, assessment, connection, error, run, reset };
}
