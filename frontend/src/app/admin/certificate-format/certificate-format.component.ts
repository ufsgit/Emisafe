import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CertificateService, CertificateFormatItem } from '../../core/services/certificate.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-certificate-format',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './certificate-format.component.html',
  styleUrls: ['./certificate-format.component.scss']
})
export class CertificateFormatComponent implements OnInit {
  private certService = inject(CertificateService);
  private toast = inject(ToastService);

  public auth = inject(AuthService);

  public formats = signal<CertificateFormatItem[]>([]);
  public isLoading = signal<boolean>(true);
  public isUploading = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);
  public selectedFileName = signal<string>('');
  public error = signal<string>('');

  public readonly maxFileSizeMb = 15;

  ngOnInit(): void {
    this.loadFormats();
  }

  loadFormats(): void {
    this.isLoading.set(true);
    this.certService.getCertificateFormats().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.formats.set(res.data?.formats || []);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Failed to load the certificate format.');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.error.set('');
    this.selectedFileName.set(file.name);

    if (file.size > this.maxFileSizeMb * 1024 * 1024) {
      this.error.set(`Format file must be ${this.maxFileSizeMb} MB or smaller.`);
      input.value = '';
      this.selectedFileName.set('');
      return;
    }

    const reader = new FileReader();
    this.isUploading.set(true);
    reader.onload = () => {
      const dataBase64 = typeof reader.result === 'string' ? reader.result : '';
      this.certService
        .uploadCertificateFormatFile({
          file_name: file.name,
          mime_type: file.type || undefined,
          dataBase64
        })
        .subscribe({
          next: (res) => {
            this.isUploading.set(false);
            input.value = '';
            this.selectedFileName.set('');
            this.toast.success(res.message || 'Raw certificate format uploaded.');
            this.loadFormats();
          },
          error: (err) => {
            this.isUploading.set(false);
            input.value = '';
            this.selectedFileName.set('');
            this.error.set(err.error?.message || 'Failed to upload certificate format.');
            this.toast.error(err.error?.message || 'Failed to upload certificate format.');
          }
        });
    };
    reader.onerror = () => {
      this.isUploading.set(false);
      input.value = '';
      this.selectedFileName.set('');
      this.error.set('Could not read the selected file.');
    };
    reader.readAsDataURL(file);
  }

  deleteFormat(format: CertificateFormatItem): void {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    this.certService.deleteCertificateFormatFile(format.id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.toast.success(res.message || 'Certificate format deleted.');
        this.loadFormats();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.error.set(err.error?.message || 'Failed to delete certificate format.');
        this.toast.error(err.error?.message || 'Failed to delete certificate format.');
      }
    });
  }

  /** Human readable file size. */
  formatSize(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  isImage(format: CertificateFormatItem): boolean {
    return !!format.mime_type && format.mime_type.startsWith('image/');
  }
}
