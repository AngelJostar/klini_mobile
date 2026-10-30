<?php

namespace App\Http\Requests\Api\Mobile\V1;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'device_name' => ['required', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'login.required' => 'El usuario o correo es obligatorio.',
            'password.required' => 'La contraseña es obligatoria.',
            'device_name.required' => 'El nombre del dispositivo es obligatorio.',
        ];
    }
}
