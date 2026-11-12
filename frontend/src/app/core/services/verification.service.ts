import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicVerificationResult {
  employee: {
    name: string;
    emirates_id_masked: string;
    job_title: string;
  };
  certificate: {
    certificate_number: string;
    certificate_type: string;
    issue_date: string;
    expiry_date: string;
    certificate_status: 'Pass' | 'Fail';
    description: string;
    scope: string;
    validity_status: 'Valid' | 'Expiring Soon' | 'Expired' | 'Fail';
    is_valid: boolean;
    days_remaining: number;
  };
}

export interface VerificationApiResponse {
  success: boolean;
  message?: string;
  data?: PublicVerificationResult;
}

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private http = inject(HttpClient);

  verifyCertificate(certificateNumber: string): Observable<VerificationApiResponse> {
    const encoded = encodeURIComponent(certificateNumber.trim());
    return this.http.get<VerificationApiResponse>(`/api/public/verify/${encoded}`);
  }
}

