import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalCertificates: number;
  passCount: number;
  failCount: number;
  validCount: number;
  expiredCount: number;
  expiringSoonCount: number;
}

export interface ExpiringSoonCertificate {
  id: number;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  status: 'Pass' | 'Fail';
  employee_name: string;
  employee_emirates_id: string;
  certificate_type_name: string;
  validity_status: string;
  days_remaining: number;
}

export interface TrendStat {
  key: string;
  label: string;
  issued: number;
  pass: number;
  fail: number;
  valid: number;
  expired: number;
  newEmployees: number;
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

