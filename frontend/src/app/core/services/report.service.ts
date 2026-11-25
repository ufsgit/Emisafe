import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-url.token';

export interface EmployeeReportRow {
  employee_id: number;
  employee_name: string;
  employee_email: string;
  emirates_id: string;
  job_title: string;
  employee_active: number;
  total_certificates: number;
  valid_certificates: number;
  expired_certificates: number;
  failed_certificates: number;
}

export interface TypeReportRow {
  certificate_type_id: number;
  certificate_type_name: string;
  accreditation_status?: string;
  type_active: number;
  total_issued: number;
  valid_count: number;
  expired_count: number;
  failed_count: number;
}

export interface ReportPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportListResponse<T> {
  success: boolean;
  data: {
    report: T[];
    pagination: ReportPagination;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);

  getEmployeeWiseReport(query?: { page?: number; limit?: number; search?: string }): Observable<ReportListResponse<EmployeeReportRow>> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search?.trim()) params = params.set('search', query.search.trim());

    return this.http.get<ReportListResponse<EmployeeReportRow>>('/api/reports/employee-wise', { params });
  }

  getTypeWiseReport(query?: { page?: number; limit?: number }): Observable<ReportListResponse<TypeReportRow>> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());

    return this.http.get<ReportListResponse<TypeReportRow>>('/api/reports/type-wise', { params });
  }

  downloadEmployeeWiseCsv(search?: string) {
    const searchParam = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
    window.open(`${this.baseUrl}/reports/employee-wise?format=csv${searchParam}`, '_blank');
  }

  downloadTypeWiseCsv() {
    window.open(`${this.baseUrl}/reports/type-wise?format=csv`, '_blank');
  }
}

