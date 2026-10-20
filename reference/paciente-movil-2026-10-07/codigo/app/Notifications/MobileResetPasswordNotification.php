<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MobileResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = 'klini://reset-password?token='.urlencode($this->token).'&email='.urlencode((string) $notifiable->email);

        return (new MailMessage)
            ->subject('Restablece tu contraseña de Klini Mobile')
            ->line('Recibimos una solicitud para restablecer tu contraseña de Klini Mobile.')
            ->action('Restablecer contraseña', $url)
            ->line('Si no realizaste esta solicitud, puedes ignorar este mensaje.');
    }
}
