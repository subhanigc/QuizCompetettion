const API_BASE = '/api';

export class ApiClient {
  public static getAdminToken(): string | null {
    return localStorage.getItem('techquiz_admin_token');
  }

  public static setAdminToken(token: string): void {
    localStorage.setItem('techquiz_admin_token', token);
  }

  public static clearAdminToken(): void {
    localStorage.removeItem('techquiz_admin_token');
  }

  public static getJudgeCode(): string | null {
    return localStorage.getItem('techquiz_judge_code');
  }

  public static setJudgeCode(code: string): void {
    localStorage.setItem('techquiz_judge_code', code);
  }

  public static clearJudgeCode(): void {
    localStorage.removeItem('techquiz_judge_code');
  }

  public static getTeamToken(): string | null {
    return localStorage.getItem('techquiz_team_token');
  }

  public static setTeamToken(token: string): void {
    localStorage.setItem('techquiz_team_token', token);
  }

  public static clearTeamToken(): void {
    localStorage.removeItem('techquiz_team_token');
    localStorage.removeItem('techquiz_team_name');
    localStorage.removeItem('techquiz_session_id');
  }

  public static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});

    const adminToken = this.getAdminToken();
    if (adminToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${adminToken}`);
    }

    const judgeCode = this.getJudgeCode();
    if (judgeCode && !headers.has('x-judge-code')) {
      headers.set('x-judge-code', judgeCode);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.error || errorMsg;
      } catch {
        // Not JSON
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }
}
