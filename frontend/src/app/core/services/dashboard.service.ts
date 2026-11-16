import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalCertificates: number;
  passCount: number;
  failCount: number;
  otherStatusCount?: number;
  validCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  pendingApprovalCount?: number;
}

export interface ExpiringSoonCertificate {
  id: number;
  certificate_number: string;
  expiry_date: string;
  employee_name: string;
  employee_emirates_id: string;
  certificate_type_name?: string;
  scope_name?: string;
  days_remaining: number;
}

/** Certificates waiting for a certification manager's approval. */
export interface PendingApprovalCertificate {
  id: number;
  certificate_number: string;
  employee_name?: string;
  employee_emirates_id?: string;
  certificate_type_name?: string;
  scope_name?: string;
  company_name?: string | null;
}

export interface TrendStat {
  label: string;
  issued: number;
}

export interface TypeStat {
  name: string;
  total: number;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    summary: DashboardSummary;
    trend: TrendStat[];
    byType: TypeStat[];
    expiringSoon: ExpiringSoonCertificate[];
    pendingApproval?: PendingApprovalCertificate[];
    pendingApprovals?: PendingApprovalCertificate[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);

  getDashboardData(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>('/api/dashboard');
  }
}

