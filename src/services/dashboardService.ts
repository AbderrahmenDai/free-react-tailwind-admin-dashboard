import api from "./api";

export interface ShiftStat {
  name: string;
  range: string;
  production: number;
  objective: number;
  efficiency: number;
}

export interface LineStat {
  name: string;
  production: number;
  objective: number;
}

export interface DashboardStats {
  shifts: ShiftStat[];
  lines: LineStat[];
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get("/dashboard/stats");
    return response.data;
  },
};
