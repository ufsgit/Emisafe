import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EmployeeService, Employee, EmployeeDocument } from '../../core/services/employee.service';
import { ToastService } from '../../core/services/toast.service';

interface CertificateGroup {
  company: string;
  title: string;
  items: any[];
}

@Component({
  selector: 'app-candidate-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe],
  templateUrl: './candidate-detail.component.html',
  styleUrls: ['./candidate-detail.component.scss']
})
export class CandidateDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private employeeService = inject(EmployeeService);
  private toast = inject(ToastService);

  public candidate = signal<Employee | null>(null);
  public certificates = signal<any[]>([]);
  public documents = signal<EmployeeDocument[]>([]);
  public isLoading = signal<boolean>(true);

  // Document upload state
  public docTypes = ['Passport', 'Emirates ID', 'Photo', 'Other'];
  public docType = 'Passport';
  public pendingFiles = signal<File[]>([]);
  public isUploading = signal<boolean>(false);

  // Document delete state
  public showDocDeleteModal = signal<boolean>(false);
  public selectedDoc = signal<EmployeeDocument | null>(null);
  public isDeletingDoc = signal<boolean>(false);

  /** Certificates grouped by company, current company first (previous company stays visible). */
  public certGroups = computed<CertificateGroup[]>(() => {
    const emp = this.candidate();
    const currentCompany = (emp?.company || '').trim();
    const map = new Map<string, any[]>();

    for (const cert of this.certificates()) {
      const company = (cert.company_name || '').trim() || currentCompany;
      if (!map.has(company)) map.set(company, []);
      map.get(company)!.push(cert);
    }

    const groups: CertificateGroup[] = Array.from(map.entries()).map(([company, items]) => ({
      company,
      title: company ? `${company} — ${items.length} certificates` : `Certificates (${items.length})`,
      items
    }));

    groups.sort((a, b) => {
      if (a.company === currentCompany) return -1;
      if (b.company === currentCompany) return 1;
      return a.company.localeCompare(b.company);
    });

    return groups;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCandidate(parseInt(id, 10));
    }
  }

  loadCandidate(id: number): void {
    this.isLoading.set(true);
    this.employeeService.getEmployee(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.candidate.set(res.data.employee);
          this.certificates.set(res.data.certificates || []);
        }
        this.loadDocuments(id);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load candidate details.');
      }
    });
  }

  private loadDocuments(id: number): void {
    this.employeeService.getDocuments(id).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.isLoading.set(false);
      },
      error: () => {
        this.documents.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /** Multi-file input — collects the chosen files until Upload is pressed. */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.pendingFiles.set(Array.from(input.files));
    input.value = '';
  }

  removePendingFile(index: number): void {
    this.pendingFiles.update(files => files.filter((_, i) => i !== index));
  }

  uploadDocuments(): void {
    const emp = this.candidate();
    const files = this.pendingFiles();
    if (!emp || !files.length || this.isUploading()) return;

    this.isUploading.set(true);

    Promise.all(files.map(file => this.toBase64(file)))
      .then(payload => {
        const body = payload.map((dataBase64, i) => ({
          doc_type: this.docType,
          file_name: files[i].name,
          dataBase64
        }));

        this.employeeService.uploadDocuments(emp.id, body).subscribe({
          next: () => {
            this.isUploading.set(false);
            this.pendingFiles.set([]);
            this.toast.success(`${body.length} document${body.length > 1 ? 's' : ''} uploaded.`);
            this.loadDocuments(emp.id);
          },
          error: (err) => {
            this.isUploading.set(false);
            this.toast.error(err.error?.message || 'Failed to upload documents.');
          }
        });
      })
      .catch(() => {
        this.isUploading.set(false);
        this.toast.error('Could not read one of the selected files.');
      });
  }

  confirmDeleteDoc(doc: EmployeeDocument): void {
    this.selectedDoc.set(doc);
    this.showDocDeleteModal.set(true);
  }

  closeDocDeleteModal(): void {
    if (this.isDeletingDoc()) return;
    this.showDocDeleteModal.set(false);
    this.selectedDoc.set(null);
  }

  executeDeleteDoc(): void {
    const emp = this.candidate();
    const doc = this.selectedDoc();
    if (!emp || !doc || this.isDeletingDoc()) return;

    this.isDeletingDoc.set(true);
    this.employeeService.deleteDocument(emp.id, doc.id).subscribe({
      next: () => {
        this.isDeletingDoc.set(false);
        this.showDocDeleteModal.set(false);
        this.selectedDoc.set(null);
        this.toast.success('Document deleted.');
        this.loadDocuments(emp.id);
      },
      error: (err) => {
        this.isDeletingDoc.set(false);
        this.toast.error(err.error?.message || 'Failed to delete document.');
      }
    });
  }

  /** Absolute URL for an uploaded file (paths are stored relative to the API origin). */
  docUrl(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
    return '/' + path;
  }

  docIcon(docType: string): string {
    switch ((docType || '').toLowerCase()) {
      case 'passport': return 'passport';
      case 'emirates id': return 'badge';
      case 'photo': return 'photo_camera';
      default: return 'description';
    }
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
