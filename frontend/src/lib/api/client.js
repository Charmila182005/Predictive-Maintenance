const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
class ApiClient {
    baseUrl;
    constructor(baseUrl = API_BASE) {
        this.baseUrl = baseUrl;
    }
    async request(endpoint, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });
        if (!res.ok) {
            let message = `API Error: ${res.status}`;
            try {
                const err = await res.json();
                message = err.detail || message;
            }
            catch {
                // Ignore parse error
            }
            throw new Error(message);
        }
        if (res.status === 204) {
            return undefined;
        }
        return res.json();
    }
    // Assessments
    async predict(input) {
        return this.request("/v1/predict", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }
    async listAssessments(params) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined)
                    searchParams.set(k, String(v));
            });
        }
        return this.request(`/api/v1/assessments?${searchParams.toString()}`);
    }
    async getAssessment(id) {
        return this.request(`/api/v1/assessments/${id}`);
    }
    // Alerts
    async listAlerts(params) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined)
                    searchParams.set(k, String(v));
            });
        }
        return this.request(`/api/v1/alerts?${searchParams.toString()}`);
    }
    async getAlert(id) {
        return this.request(`/api/v1/alerts/${id}`);
    }
    // Machines
    async listMachines() {
        return this.request("/api/v1/machines");
    }
    async getMachine(id) {
        return this.request(`/api/v1/machines/${id}`);
    }
    async createMachine(data) {
        return this.request("/api/v1/machines", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    async updateMachine(id, data) {
        return this.request(`/api/v1/machines/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    }
    async deleteMachine(id) {
        return this.request(`/api/v1/machines/${id}`, { method: "DELETE" });
    }
    // Health
    async healthCheck() {
        return this.request("/api/v1/health");
    }
    async version() {
        return this.request("/api/v1/version");
    }
}
export const api = new ApiClient();
