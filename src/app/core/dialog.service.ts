import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  async confirm(header: string, message: string): Promise<boolean> {
    const alert = await this.alerts.create({ header, message, buttons: [
      { text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'confirm', cssClass: 'danger' }
    ] });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }
  async toast(message: string): Promise<void> {
    const toast = await this.toasts.create({ message, duration: 3500, position: 'top', buttons: [{ text: 'Cerrar', role: 'cancel' }] });
    await toast.present();
  }
}
