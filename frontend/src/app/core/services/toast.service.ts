import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  public toasts = signal<ToastMessage[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'info', durationMs = 4000) {
    const id = this.nextId++;
    const toast: ToastMessage = { id, type, message };
    this.toasts.update(list => [...list, toast]);

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  success(message: string, durationMs = 4000) {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 5000) {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 4000) {
    this.show(message, 'info', durationMs);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

