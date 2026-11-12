<?php

namespace App\Models;

class PharmacyStoreSetting extends BaseModel
{
    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'shipping_fee' => 'decimal:2'];
    }

    public static function current(): self
    {
        return static::query()->find(1) ?? new static(['id' => 1, 'enabled' => false, 'title' => 'Farmacia digital', 'subtitle' => 'Disponibilidad sujeta a revisión.', 'accent_color' => '#008c95', 'shipping_fee' => 0]);
    }

    public function publicData(): array
    {
        return ['enabled' => (bool) $this->enabled, 'title' => $this->title, 'subtitle' => $this->subtitle,
            'banner_image_url' => $this->banner_image_url, 'accent_color' => $this->accent_color, 'currency' => 'MXN',
            'shipping_fee' => $this->shipping_fee, 'delivery_estimate' => $this->delivery_estimate, 'purchase_terms' => $this->purchase_terms,
            'checkout_available' => false, 'orders_available' => (bool) $this->enabled,
            'notice' => 'Solicitud sin cobro ni reserva de inventario. Sujeta a revisión administrativa y de la receta cuando corresponda.'];
    }
}
