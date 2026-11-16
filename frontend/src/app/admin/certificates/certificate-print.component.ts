import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CertificateService, CertificateFormatItem } from '../../core/services/certificate.service';
import {
  CertificateDocument,
  buildVerifyUrl,
  makeVerifyQrDataUrl,
  toCertificateDocument
} from '../../core/utils/certificate-document';

@Component({
  selector: 'app-certificate-print',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './certificate-print.component.html',
  styleUrls: ['./certificate-print.component.scss']
})
export class CertificatePrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private certService = inject(CertificateService);
  private platformId = inject(PLATFORM_ID);

  public doc = signal<CertificateDocument | null>(null);
  public isLoading = signal<boolean>(true);
  public loadError = signal<string>('');
  public qrDataUrl = signal<string>('');
  public verifyUrl = signal<string>('');
  public activeFormat = signal<CertificateFormatItem | null>(null);
  public today = new Date();

  ngOnInit(): void {
    this.certService.getCertificateFormat().subscribe({
      next: (res) => {
        if (res.success) {
          this.activeFormat.set(res.data?.format || null);
        }
      },
      error: () => {}
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCertificate(parseInt(id, 10));
    } else {
      this.isLoading.set(false);
      this.loadError.set('Certificate not found.');
    }
  }

  loadCertificate(id: number): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.certService.getCertificate(id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const doc = toCertificateDocument(res);
        if (doc) {
          this.doc.set(doc);
          this.generateQr(doc.number);
        } else {
          this.loadError.set('Certificate not found.');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Failed to load certificate.');
      }
    });
  }

  private generateQr(certNumber: string): void {
    if (!certNumber) return;
    this.verifyUrl.set(buildVerifyUrl(certNumber));
    if (!isPlatformBrowser(this.platformId)) return;

    makeVerifyQrDataUrl(certNumber)
      .then(url => this.qrDataUrl.set(url))
      .catch(err => console.error('QR code generation failed:', err));
  }

  print(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}
