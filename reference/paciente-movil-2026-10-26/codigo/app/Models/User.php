<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable;

    public const CATEGORY_KLINI = 'klini';
    public const CATEGORY_OPERATIONAL = 'operational';

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'module',
        'status',
        'is_demo',
        'passwordless_review',
        'email_verified_at',
        'metadata',
        'account_category',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_demo' => 'boolean',
            'passwordless_review' => 'boolean',
            'metadata' => 'array',
        ];
    }

    protected function roleEnum(): Attribute
    {
        return Attribute::get(fn () => UserRole::tryFrom($this->role));
    }

    public function assignKliniMemberId(): void
    {
        if ($this->account_category === self::CATEGORY_KLINI && ! $this->klini_member_id) {
            $this->klini_member_id = str_pad((string) $this->getKey(), 8, '0', STR_PAD_LEFT);
            $this->save();
        }
    }

    protected function operationalUserNumber(): Attribute
    {
        return Attribute::get(fn () => $this->exists && $this->account_category !== self::CATEGORY_KLINI
            ? 'OP'.str_pad((string) $this->getKey(), 8, '0', STR_PAD_LEFT)
            : null);
    }

    public function institution(): HasOne
    {
        return $this->hasOne(Institution::class, 'owner_user_id');
    }

    public function patient(): HasOne
    {
        return $this->hasOne(Patient::class);
    }

    public function doctor(): HasOne
    {
        return $this->hasOne(Doctor::class);
    }

    public function provider(): HasOne
    {
        return $this->hasOne(Provider::class);
    }

    public function messengerProfile(): HasOne
    {
        return $this->hasOne(MessengerProfile::class);
    }

    public function mobileDeviceRegistrations(): HasMany
    {
        return $this->hasMany(MobileDeviceRegistration::class);
    }

    public function accessiblePatientProfileLinks(): HasMany
    {
        return $this->hasMany(PatientProfileRelationship::class, 'access_user_id');
    }

    public function accessiblePatientProfiles(): BelongsToMany
    {
        return $this->belongsToMany(
            Patient::class,
            'patient_profile_relationships',
            'access_user_id',
            'managed_patient_id'
        )
            ->withPivot(['administrator_patient_id', 'relationship_type_id', 'status', 'starts_at', 'ends_at', 'permissions', 'metadata'])
            ->withTimestamps()
            ->wherePivot('status', 'active');
    }
}
