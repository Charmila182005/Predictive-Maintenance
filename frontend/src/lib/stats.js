export function machineSummaries(assessments) {
    const byMachine = new Map();
    for (const a of assessments) {
        const list = byMachine.get(a.inputs.machineId) ?? [];
        list.push(a);
        byMachine.set(a.inputs.machineId, list);
    }
    const out = [];
    for (const [machineId, list] of byMachine) {
        const byTs = [...list].sort((a, b) => a.ts.localeCompare(b.ts));
        out.push({
            machineId,
            latest: byTs[byTs.length - 1],
            count: list.length,
            firstTs: byTs[0].ts,
            lastTs: byTs[byTs.length - 1].ts,
            trend: byTs,
        });
    }
    return out.sort((a, b) => b.latest.ts.localeCompare(a.latest.ts));
}
export function countByHealth(assessments) {
    const out = { Normal: 0, Warning: 0, "High Risk": 0, Critical: 0 };
    for (const a of assessments)
        out[a.healthStatus] = (out[a.healthStatus] ?? 0) + 1;
    return out;
}
export function countByRisk(assessments) {
    const out = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    for (const a of assessments)
        out[a.riskLevel] = (out[a.riskLevel] ?? 0) + 1;
    return out;
}
export function trendSeries(assessments) {
    return [...assessments]
        .sort((a, b) => a.ts.localeCompare(b.ts))
        .map((a) => ({ ts: a.ts, probability: a.failureProbability }));
}
export function meanProbability(assessments) {
    if (!assessments.length)
        return 0;
    return assessments.reduce((acc, a) => acc + a.failureProbability, 0) / assessments.length;
}
export function atRisk(assessments, threshold) {
    return assessments.filter((a) => a.failureProbability >= threshold);
}
