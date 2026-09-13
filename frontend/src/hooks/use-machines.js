import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
export function useMachines() {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.listMachines();
            setMachines(data.items ?? data);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch machines");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetch();
    }, [fetch]);
    return { machines, loading, error, refetch: fetch };
}
export function useAssessments(params) {
    const [assessments, setAssessments] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.listAssessments(params);
            setAssessments(data.items);
            setTotal(data.total);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch assessments");
        }
        finally {
            setLoading(false);
        }
    }, [params?.machine_id, params?.page, params?.page_size]);
    useEffect(() => {
        fetch();
    }, [fetch]);
    return { assessments, total, loading, error, refetch: fetch };
}
export function useAlerts(params) {
    const [alerts, setAlerts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.listAlerts(params);
            setAlerts(data.items);
            setTotal(data.total);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch alerts");
        }
        finally {
            setLoading(false);
        }
    }, [params?.machine_id, params?.severity, params?.page, params?.page_size]);
    useEffect(() => {
        fetch();
    }, [fetch]);
    return { alerts, total, loading, error, refetch: fetch };
}
