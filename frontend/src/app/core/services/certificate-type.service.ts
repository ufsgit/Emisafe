import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CertificateType {
  id: number;
  name: string;
  accreditation_status: 'EIAC' | 'Non-EIAC';
  is_active: number | boolean;
}

export interface CertificateTypeListResponse {
  success: boolean;
  data: {
    certificateTypes: CertificateType[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class CertificateTypeService {
  private http = inject(HttpClient);

  getCertificateTypes(query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    active?: number | boolean;
  }): Observable<CertificateTypeListResponse> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);
    if (query?.status) params = params.set('status', query.status);
    if (query?.active !== undefined && query?.active !== null) {
      params = params.set('active', query.active ? '1' : '0');
    }

    return this.http.get<CertificateTypeListResponse>('/api/certificate-types', { params });
  }

  /** Active scopes for the Issue Certificate / scope dropdowns. */
  getActiveScopes(limit = 200): Observable<CertificateTypeListResponse> {
    return this.getCertificateTypes({ limit, active: 1 });
  }

  getCertificateType(id: number): Observable<{ success: boolean; data: { certificateType: CertificateType } }> {
    return this.http.get<{ success: boolean; data: { certificateType: CertificateType } }>(`/api/certificate-types/${id}`);
  }

  createCertificateType(data: Partial<CertificateType>): Observable<{ success: boolean; message: string; data: { certificateType: CertificateType } }> {
    return this.http.post<{ success: boolean; message: string; data: { certificateType: CertificateType } }>('/api/certificate-types', data);
  }

  updateCertificateType(id: number, data: Partial<CertificateType>): Observable<{ success: boolean; message: string; data: { certificateType: CertificateType } }> {
    return this.http.put<{ success: boolean; message: string; data: { certificateType: CertificateType } }>(`/api/certificate-types/${id}`, data);
  }

  toggleStatus(id: number): Observable<{ success: boolean; message: string; data: { id: number; is_active: number } }> {
    return this.http.patch<{ success: boolean; message: string; data: { id: number; is_active: number } }>(`/api/certificate-types/${id}/toggle-status`, {});
  }
}

