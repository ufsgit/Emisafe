import { Component, inject, OnInit, OnDestroy, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { VerificationService, PublicVerificationResult } from '../../core/services/verification.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.scss']
})
export class VerifyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificationService = inject(VerificationService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private platformId = inject(PLATFORM_ID);
  public theme = inject(ThemeService);

  public searchQuery = '';
  public searchedCertificateNumber = signal<string>('');
  public isLoading = signal<boolean>(false);
  public hasSearched = signal<boolean>(false);
  public notFound = signal<boolean>(false);
  public apiError = signal<boolean>(false);
  public inputError = signal<string>('');
  public result = signal<PublicVerificationResult | null>(null);

  // QR Code Generation & Scanning State
  public qrCodeDataUrl = signal<string>('');
  public currentVerifyUrl = signal<string>('');
  public showScanner = signal<boolean>(false);
  public scannerError = signal<string>('');
  private scannerInstance: any = null;

  public currentYear = new Date().getFullYear();

  /**
   * Colour coding for the certification status:
   * Pass is green, Fail / Withdrawn / Withheld are red.
   */
  certStatusClass(status?: string): string {
    return status === 'Pass' ? 'is-pass' : 'is-alert';
  }

  ngOnInit(): void {
    this.setTitleAndMeta('EmiSafe | Verify a Certificate', 'Official EmiSafe public portal to verify candidate workplace safety certificates and credentials.');

    // Support shareable links via hash query parameter: /#/?certificate=CERT-NUMBER
    // (also falls back to window.location.search for any legacy /?certificate= QR codes)
    this.route.queryParamMap.subscribe(params => {
      let certParam = params.get('certificate');
      if (!certParam && isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
        certParam = new URLSearchParams(window.location.search).get('certificate');
      }
      if (certParam && certParam.trim()) {
        const cleanParam = certParam.trim();
        this.searchQuery = cleanParam;
        this.executeVerification(cleanParam);
      } else {
        this.result.set(null);
        this.qrCodeDataUrl.set('');
        this.currentVerifyUrl.set('');
        this.hasSearched.set(false);
        this.notFound.set(false);
        this.apiError.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopQrScan();
  }

  onSearch(): void {
    const trimmed = this.searchQuery.trim();
    if (!trimmed) {
      this.inputError.set('Please enter a certificate number to verify.');
      return;
    }

    this.inputError.set('');
    // Update URL query parameter so shareable link is updated
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { certificate: trimmed },
      queryParamsHandling: 'merge'
    });
  }

  setSample(certNum: string): void {
    this.searchQuery = certNum;
    this.onSearch();
  }

  public async startQrScan(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.showScanner.set(true);
    this.scannerError.set('');

    setTimeout(async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        this.scannerInstance = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
          },
          false
        );

        this.scannerInstance.render(
          (decodedText: string) => {
            this.handleScannedCode(decodedText);
          },
          (errorMessage: any) => {
            // Normal scan noise per frame, ignored
          }
        );
      } catch (err: any) {
        console.error('Failed to initialize QR scanner:', err);
        this.scannerError.set(err?.message || 'Unable to access camera. Please ensure camera permissions are allowed.');
      }
    }, 150);
  }

  public stopQrScan(): void {
    if (this.scannerInstance) {
      try {
        this.scannerInstance.clear();
      } catch (err) {
        console.warn('Error clearing QR scanner:', err);
      }
      this.scannerInstance = null;
    }
    this.showScanner.set(false);
    this.scannerError.set('');
  }

  private handleScannedCode(decodedText: string): void {
    let certNum = decodedText.trim();
    if (certNum.includes('certificate=')) {
      const match = certNum.match(/certificate=([^&]+)/);
      if (match) {
        certNum = decodeURIComponent(match[1]);
      }
    }

    this.stopQrScan();
    this.searchQuery = certNum;
    this.onSearch();
  }

  private generateQrCode(certNumber: string): void {
    const origin = isPlatformBrowser(this.platformId) && typeof window !== 'undefined'
      ? window.location.origin
      : '';
    const verifyUrl = `${origin}/#/?certificate=${encodeURIComponent(certNumber)}`;
    this.currentVerifyUrl.set(verifyUrl);

    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toDataURL(verifyUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#183E5D', // EmiSafe Primary Navy
          light: '#FFFFFF'
        }
      }).then(url => {
        this.qrCodeDataUrl.set(url);
      }).catch(err => {
        console.error('QR code generation failed:', err);
      });
    }).catch(err => {
      console.error('Error loading QR code library:', err);
    });
  }

  private executeVerification(certNumber: string): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);
    this.notFound.set(false);
    this.apiError.set(false);
    this.searchedCertificateNumber.set(certNumber);

    this.verificationService.verifyCertificate(certNumber).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.result.set(res.data);
          this.notFound.set(false);
          this.generateQrCode(res.data.certificate.certificate_number);
          this.setTitleAndMeta(
            `EmiSafe | Verified: ${res.data.certificate.certificate_number} - ${res.data.employee.name}`,
            `Verified ${res.data.certificate.scope_name || res.data.certificate.certificate_type} for ${res.data.employee.name}. Current Status: ${res.data.certificate.validity_status}.`
          );
        } else {
          this.result.set(null);
          this.qrCodeDataUrl.set('');
          this.currentVerifyUrl.set('');
          this.notFound.set(true);
          this.setTitleAndMeta('EmiSafe | Certificate Not Found', 'No certificate matches the query.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.result.set(null);
        this.qrCodeDataUrl.set('');
        this.currentVerifyUrl.set('');
        if (err.status === 404) {
          this.notFound.set(true);
          this.apiError.set(false);
          this.setTitleAndMeta('EmiSafe | Certificate Not Found', 'No certificate matches the query.');
        } else {
          this.notFound.set(false);
          this.apiError.set(true);
        }
      }
    });
  }

  private setTitleAndMeta(title: string, desc: string): void {
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: desc });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: desc });
  }
}

