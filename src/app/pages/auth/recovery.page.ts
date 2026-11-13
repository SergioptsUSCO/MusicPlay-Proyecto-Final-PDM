import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UI } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { message } from '../../core/models';

@Component({ selector: 'app-recovery', host: { class: 'ion-page' }, imports: UI, templateUrl: './recovery.page.html' })
export class RecoveryPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  readonly step = signal<'email' | 'code' | 'password' | 'done'>('email');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly status = signal('');
  readonly emailForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly codeForm = this.fb.nonNullable.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  readonly passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)]],
    confirm: ['', Validators.required]
  });
  showPassword = false;
  showConfirm = false;
  async requestCode(): Promise<void> {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    await this.run(async () => {
      await this.api.request('/api/auth/forgot-password', 'POST', { correo: this.emailForm.getRawValue().email.trim() });
      this.codeForm.reset(); this.step.set('code'); this.status.set('Te enviamos un código de 6 dígitos.');
    });
  }
  async verify(): Promise<void> {
    if (this.codeForm.invalid) { this.error.set('El código debe tener 6 dígitos.'); return; }
    await this.run(async () => {
      await this.api.request('/api/auth/verify-reset-code', 'POST', { correo: this.emailForm.getRawValue().email.trim(), codigo: this.codeForm.getRawValue().code });
      this.step.set('password'); this.status.set('Código verificado. Crea tu nueva contraseña.');
    });
  }
  async reset(): Promise<void> {
    const { password, confirm } = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid) { this.error.set('Usa 8 caracteres o más, mayúscula, minúscula, número y un carácter especial (@$!%*?&).'); return; }
    if (password !== confirm) { this.error.set('Las contraseñas no coinciden.'); return; }
    await this.run(async () => {
      await this.api.request('/api/auth/reset-password', 'POST', { correo: this.emailForm.getRawValue().email.trim(), codigo: this.codeForm.getRawValue().code, nuevaContrasena: password });
      this.step.set('done'); this.status.set('Tu contraseña se ha actualizado.'); this.passwordForm.reset();
    });
  }
  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.status.set('');
    try { await action(); } catch (error) { this.error.set(message(error)); } finally { this.busy.set(false); }
  }
}
