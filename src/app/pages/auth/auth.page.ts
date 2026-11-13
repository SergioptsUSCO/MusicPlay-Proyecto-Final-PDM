import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { UI } from '../../shared/ui';
import { SessionService } from '../../core/session.service';
import { ApiService } from '../../core/api.service';
import { message } from '../../core/models';
import { IonModal } from '@ionic/angular/ion-modal';

@Component({ selector: 'app-auth', host: { class: 'ion-page' }, imports: [...UI, IonModal], templateUrl: './auth.page.html' })
export class AuthPage {
  readonly session = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly register = !!this.route.snapshot.data['register'];
  readonly busy = signal(false);
  readonly termsOpen = signal(false);
  readonly error = signal(this.route.snapshot.queryParamMap.get('oauthError') || new URLSearchParams(window.location.search).get('oauthError') || '');
  showPassword = false;
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', this.register ? Validators.required : []],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.register ? [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&+_=#-]).{8,}$/)] : Validators.required],
    terms: [false, this.register ? Validators.requiredTrue : []]
  });
  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Revisa los campos del formulario.'); return; }
    this.busy.set(true); this.error.set('');
    const { name, email, password } = this.form.getRawValue();
    try {
      if (this.register) {
        await this.api.request('/api/auth/register', 'POST', { usuario_nombre: name.trim(), usuario_correo: email.trim(), usuario_contraseña: password });
        await this.router.navigate(['/login'], { queryParams: { registered: true } });
      } else await this.session.login(email, password);
    } catch (error) { this.error.set(message(error)); }
    finally { this.busy.set(false); }
  }
  get registered(): boolean { return this.route.snapshot.queryParamMap.has('registered'); }
  async google(): Promise<void> { try { await this.session.google(); } catch (error) { this.error.set(message(error)); } }
}
