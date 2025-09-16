const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface Study {
  id: string;
  protocolNumber: string;
  title: string;
  description: string;
  type: string;
  status: string;
  phase?: string;
  principalInvestigatorId: string;
  principalInvestigator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok && response.status === 401) {
      // Token expired, try to refresh
      // For now, just clear tokens and throw
      this.clearTokens();
      throw new Error('Authentication required');
    }

    return response;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.setAccessToken(data.accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  }

  async logout() {
    try {
      await this.fetchWithAuth('/api/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearTokens();
    }
  }

  async getStudies(): Promise<{ data: Study[]; pagination: any }> {
    const response = await this.fetchWithAuth('/api/v1/studies');
    return response.json();
  }

  async getStudy(studyId: string): Promise<Study> {
    const response = await this.fetchWithAuth(`/api/v1/studies/${studyId}`);
    return response.json();
  }

  async createStudy(study: Partial<Study>): Promise<Study> {
    const response = await this.fetchWithAuth('/api/v1/studies', {
      method: 'POST',
      body: JSON.stringify(study),
    });
    return response.json();
  }

  async updateStudy(studyId: string, updates: Partial<Study>): Promise<Study> {
    const response = await this.fetchWithAuth(`/api/v1/studies/${studyId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.json();
  }
}

export const api = new ApiService();