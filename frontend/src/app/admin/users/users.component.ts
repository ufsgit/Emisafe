import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService, AppUser, UserPayload } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);

  public auth = inject(AuthService);

  public users = signal<AppUser[]>([]);
  public totalCount = signal<number>(0);
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public pageSize = 10;
  public search = '';
  public isLoading = signal<boolean>(false);

  // Modal
  public showModal = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalError = signal<string>('');

  // Toggle status confirm
  public showConfirmModal = signal<boolean>(false);
  public selectedUser = signal<AppUser | null>(null);
  public isToggling = signal<boolean>(false);

  public roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'certification_manager', label: 'Certification Manager' },
    { value: 'examiner', label: 'Examiner' },
    { value: 'technical_coordinator', label: 'Technical Coordinator' }
  ];

  public photoPreview = signal<string>('');
  private pendingPhoto: string | null = null;

  public formData: UserPayload & { id?: number } = this.blankForm();

  private searchTimeout: any;

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.toast.error('Administrator access required.');
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.loadUsers();
  }

  private blankForm(): UserPayload & { id?: number } {
    return {
      id: undefined,
      name: '',
      email: '',
      password: '',
      role: 'examiner',
      is_active: 1
    };
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.search
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.users.set(res.rows);
        this.totalCount.set(res.total);
        this.totalPages.set(res.pages);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load users.');
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadUsers();
    }, 300);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadUsers();
    }
  }

  roleLabel(role: string): string {
    return this.roles.find(r => r.value === role)?.label || role || '—';
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.modalError.set('');
    this.formData = this.blankForm();
    this.photoPreview.set('');
    this.pendingPhoto = null;
    this.showModal.set(true);
  }

  openEditModal(user: AppUser): void {
    this.isEditing.set(true);
    this.modalError.set('');
    this.formData = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active ? 1 : 0
    };
    this.photoPreview.set(user.photo || '');
    this.pendingPhoto = null;
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.modalError.set('Photo must be an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.photoPreview.set(dataUrl);
      this.pendingPhoto = dataUrl;
      this.modalError.set('');
    };
    reader.onerror = () => {
      this.modalError.set('Could not read the selected photo file.');
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearPhoto(): void {
    this.photoPreview.set('');
    this.pendingPhoto = null;
  }

  saveUser(): void {
    const payload: UserPayload = {
      name: (this.formData.name || '').trim(),
      email: (this.formData.email || '').trim(),
      role: this.formData.role
    };

    if (!payload.name) {
      this.modalError.set('Name is required.');
      return;
    }
    if (!payload.email) {
      this.modalError.set('Email is required.');
      return;
    }
    if (!this.isEditing() && !(this.formData.password || '').trim()) {
      this.modalError.set('Password is required.');
      return;
    }
    if ((this.formData.password || '').trim()) {
      payload.password = (this.formData.password || '').trim();
    }
    if (this.pendingPhoto !== null) {
      payload.photo = this.pendingPhoto;
    }
    if (this.isEditing()) {
      payload.is_active = this.formData.is_active;
    }

    this.isSaving.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.formData.id) {
      this.userService.updateUser(this.formData.id, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success(res.message || 'User updated successfully.');
          this.loadUsers();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to update user.');
        }
      });
    } else {
      this.userService.createUser(payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success(res.message || 'User created successfully.');
          this.loadUsers();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to create user.');
        }
      });
    }
  }

  confirmToggleStatus(user: AppUser): void {
    // Self-deactivation is not allowed (mirrors the server rule).
    if (user.is_active && user.id === this.auth.currentUser()?.id) {
      this.toast.error('You cannot deactivate your own account.');
      return;
    }
    this.selectedUser.set(user);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    if (this.isToggling()) return;
    this.showConfirmModal.set(false);
    this.selectedUser.set(null);
  }

  executeToggleStatus(): void {
    const user = this.selectedUser();
    if (!user) return;

    if (user.is_active && user.id === this.auth.currentUser()?.id) {
      this.closeConfirmModal();
      this.toast.error('You cannot deactivate your own account.');
      return;
    }

    this.isToggling.set(true);
    this.userService.updateUser(user.id, { is_active: user.is_active ? 0 : 1 }).subscribe({
      next: (res) => {
        this.isToggling.set(false);
        this.closeConfirmModal();
        this.toast.success(res.message || 'User status updated.');
        this.loadUsers();
      },
      error: (err) => {
        this.isToggling.set(false);
        this.closeConfirmModal();
        this.toast.error(err.error?.message || 'Failed to update user status.');
      }
    });
  }
}
