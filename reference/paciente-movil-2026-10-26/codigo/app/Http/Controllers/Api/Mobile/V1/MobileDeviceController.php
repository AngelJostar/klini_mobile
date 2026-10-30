<?php

namespace App\Http\Controllers\Api\Mobile\V1;

use App\Http\Controllers\Controller;
use App\Models\MobileDeviceRegistration;
use App\Services\Platform\PlatformAuditService;
use App\Support\MobileApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MobileDeviceController extends Controller
{
    public function store(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $validated = $request->validate([
            'push_token' => ['required', 'string', 'max:2048', 'regex:/^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$/'],
            'platform' => ['required', Rule::in(['android', 'ios'])],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);
        $hash = hash('sha256', $validated['push_token']);
        $device = MobileDeviceRegistration::query()->updateOrCreate(
            ['token_hash' => $hash],
            [
                'user_id' => $request->user()->getKey(),
                'personal_access_token_id' => $request->user()->currentAccessToken()?->getKey(),
                'push_token' => $validated['push_token'],
                'platform' => $validated['platform'],
                'device_name' => $validated['device_name'] ?? null,
                'enabled' => true,
                'last_seen_at' => now(),
            ],
        );
        $audit->record($request, 'mobile.device.notifications.enabled', $device, $request->user()->role);

        return MobileApiResponse::success(['enabled' => true], $device->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, PlatformAuditService $audit): JsonResponse
    {
        $validated = $request->validate(['push_token' => ['required', 'string', 'max:2048']]);
        $device = MobileDeviceRegistration::query()
            ->where('user_id', $request->user()->getKey())
            ->where('token_hash', hash('sha256', $validated['push_token']))
            ->first();

        if ($device) {
            $device->update(['enabled' => false, 'last_seen_at' => now()]);
            $audit->record($request, 'mobile.device.notifications.disabled', $device, $request->user()->role);
        }

        return MobileApiResponse::success(['enabled' => false]);
    }
}
