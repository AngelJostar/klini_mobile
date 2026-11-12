<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\DeliveryRoute;
use App\Models\MessengerProfile;
use App\Models\MedicalUnit;
use App\Models\OperationalProfile;
use App\Models\PatientOrder;
use App\Models\Provider;
use App\Models\ProviderRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StateTransitionTest extends TestCase
{
    use RefreshDatabase;

    public function test_terminal_order_cannot_return_to_preparing(): void
    {
        $user = $this->user('operational', 'digital_pharmacy');
        $order = PatientOrder::query()->create([
            'order_number' => 'TERMINAL-ORDER',
            'status' => 'delivered',
            'subtotal' => 10,
            'total' => 10,
            'ordered_at' => now(),
        ]);

        $this->actingAs($user)
            ->from(route('pharmacy.dashboard'))
            ->patch(route('pharmacy.orders.status', $order), ['status' => 'preparing'])
            ->assertRedirect(route('pharmacy.dashboard'))
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('patient_orders', ['id' => $order->id, 'status' => 'delivered']);
    }

    public function test_terminal_provider_request_cannot_be_reopened(): void
    {
        $user = $this->user('provider', 'provider_npt');
        $provider = Provider::query()->create([
            'user_id' => $user->id,
            'name' => 'Proveedor terminal',
            'provider_type' => 'npt',
            'status' => 'active',
        ]);
        $providerRequest = ProviderRequest::query()->create([
            'provider_id' => $provider->id,
            'request_type' => 'npt',
            'status' => 'delivered',
            'requested_at' => now(),
        ]);

        $this->actingAs($user)
            ->from(route('provider.npt.dashboard'))
            ->patch(route('provider.requests.status', ['npt', $providerRequest]), ['status' => 'accepted'])
            ->assertRedirect(route('provider.npt.dashboard'))
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('provider_requests', ['id' => $providerRequest->id, 'status' => 'delivered']);
    }

    public function test_completed_appointment_cannot_return_to_scheduled(): void
    {
        $user = $this->user('operational', 'operational_outpatient');
        $unit = MedicalUnit::create(['name' => 'Unidad de transición', 'status' => 'active']);
        OperationalProfile::create(['user_id' => $user->id, 'medical_unit_id' => $unit->id, 'status' => 'active']);
        $appointment = Appointment::query()->create([
            'medical_unit_id' => $unit->id,
            'status' => 'completed',
            'starts_at' => now()->subHour(),
        ]);

        $this->actingAs($user)
            ->from(route('outpatient.dashboard'))
            ->patch(route('outpatient.appointments.update', $appointment), ['status' => 'scheduled'])
            ->assertRedirect(route('outpatient.dashboard'))
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'completed']);
    }

    public function test_delivered_route_cannot_return_to_assigned(): void
    {
        $user = $this->user('messenger', 'messenger');
        $profile = MessengerProfile::query()->create(['user_id' => $user->id, 'status' => 'active']);
        $route = DeliveryRoute::query()->create([
            'messenger_profile_id' => $profile->id,
            'route_code' => 'TERMINAL-ROUTE',
            'status' => 'delivered',
            'scheduled_at' => now(),
        ]);

        $this->actingAs($user)
            ->from(route('messenger.dashboard'))
            ->patch(route('messenger.routes.status', $route), ['status' => 'assigned'])
            ->assertRedirect(route('messenger.dashboard'))
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('delivery_routes', ['id' => $route->id, 'status' => 'delivered']);
    }

    private function user(string $role, string $module): User
    {
        return User::query()->create([
            'name' => "Usuario {$role}",
            'username' => "{$role}.transition",
            'role' => $role,
            'module' => $module,
            'status' => 'active',
        ]);
    }
}
