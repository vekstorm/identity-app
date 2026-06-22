import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-form-modal',
  imports: [FormsModule],
  templateUrl: './user-form-modal.html',
  styleUrl: './user-form-modal.scss',
})
export class UserFormModal {
  user = input<any>(null);
  allRoles = input<any[]>([]);
  close = output<void>();
  save = output<any>();

  username = signal('');
  email = signal('');
  password = signal('');
  name = signal('');
  surname1 = signal('');
  surname2 = signal('');
  phone = signal('');
  disabled = signal(false);
  selectedRoles = signal<Record<string, boolean>>({});

  isEdit = signal(false);

  constructor() {
    effect(() => {
      const u = this.user();
      const roles = this.allRoles();
      const map: Record<string, boolean> = {};
      roles.forEach((r: any) => {
        map[r.name] = false;
      });
      if (u && u.roles) {
        u.roles.forEach((r: string) => {
          if (r in map) map[r] = true;
        });
      }
      this.isEdit.set(u !== null);
      if (u) {
        this.username.set(u.username || '');
        this.email.set(u.email || '');
        this.password.set('');
        this.name.set(u.name || '');
        this.surname1.set(u.surname1 || '');
        this.surname2.set(u.surname2 || '');
        this.phone.set(u.phone || '');
        this.disabled.set(!!u.disabled);
        this.selectedRoles.set(map);
      } else {
        this.username.set('');
        this.email.set('');
        this.password.set('');
        this.name.set('');
        this.surname1.set('');
        this.surname2.set('');
        this.phone.set('');
        this.disabled.set(false);
        this.selectedRoles.set(map);
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }

  toggleRole(role: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedRoles.update((roles) => ({ ...roles, [role]: checked }));
  }

  toggleDisabled(event: Event): void {
    this.disabled.set((event.target as HTMLInputElement).checked);
  }

  onSave(): void {
    const roles = Object.keys(this.selectedRoles()).filter((r) => this.selectedRoles()[r]);
    const payload: any = {
      username: this.username(),
      email: this.email(),
      name: this.name() || null,
      surname1: this.surname1() || null,
      surname2: this.surname2() || null,
      phone: this.phone() || null,
      disabled: this.disabled(),
      roles,
    };

    if (this.password()) {
      payload.password = this.password();
    }

    this.save.emit(payload);
  }
}
