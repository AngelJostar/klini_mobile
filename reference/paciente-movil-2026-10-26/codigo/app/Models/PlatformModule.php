<?php

namespace App\Models;

class PlatformModule extends BaseModel
{
    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'roles' => 'array',
            'settings' => 'array',
        ];
    }
}

