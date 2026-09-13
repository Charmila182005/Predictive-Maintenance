import type { AssessInput, Assessment, Alert } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
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
      } catch {
        // Ignore parse error
      }
      throw new Error(message);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  // Assessments
  async predict(input: AssessInput): Promise<Assessment> {
    return this.request<Assessment>("/v1/predict", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listAssessments(params?: {
    page?: number;
    page_size?: number;
    machine_id?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
    }
    return this.request<{ items: Assessment[]; total: number; page: number; page_size: number }>(
      `/api/v1/assessments?${searchParams.toString()}`
    );
  }

  async getAssessment(id: string) {
    return this.request<Assessment>(`/api/v1/assessments/${id}`);
  }

  // Alerts
  async listAlerts(params?: {
    page?: number;
    page_size?: number;
    severity?: string;
    machine_id?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
    }
    return this.request<{ items: Alert[]; total: number; page: number; page_size: number }>(
      `/api/v1/alerts?${searchParams.toString()}`
    );
  }

  async getAlert(id: string) {
    return this.request<Alert>(`/api/v1/alerts/${id}`);
  }

  // Machines
  async listMachines() {
    return this.request<any>("/api/v1/machines");
  }

  async getMachine(id: string) {
    return this.request<any>(`/api/v1/machines/${id}`);
  }

  async createMachine(data: {
    machine_id: string;
    name: string;
    type?: string;
    location?: string;
  }) {
    return this.request<any>("/api/v1/machines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateMachine(id: string, data: {
    sensor_values?: Record<string, number>;
    name?: string;
    type?: string;
    location?: string;
  }) {
    return this.request<any>(`/api/v1/machines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteMachine(id: string) {
    return this.request<void>(`/api/v1/machines/${id}`, { method: "DELETE" });
  }

  // Health
  async healthCheck() {
    return this.request<any>("/api/v1/health");
  }

  async version() {
    return this.request<any>("/api/v1/version");
  }
}

export const api = new ApiClient();

