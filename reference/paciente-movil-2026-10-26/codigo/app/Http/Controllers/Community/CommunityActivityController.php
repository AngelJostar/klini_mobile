<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Services\Platform\DashboardRegistry;
use App\Services\Wallet\TokenWallet;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CommunityActivityController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless(app(DashboardRegistry::class)->modulesFor($request->user())->contains('key', 'community_admin'), 403);
    }

    public function index(Request $request)
    {
        $admin = $request->boolean('manage');
        if ($admin) {
            $this->authorizeAdmin($request);
        }
        $query = DB::table('community_activities');
        if ($admin) {
            $query->where('user_id', $request->user()->id);
        } else {
            $query->where(function ($query) use ($request) {
                $query->where('published', true)->orWhereIn('id', DB::table('community_activity_reservations')->select('activity_id')->where('user_id', $request->user()->id));
            });
        }
        // The feed shows newest publications first; management keeps its schedule order.
        $items = ($admin ? $query->orderBy('starts_at') : $query->orderByDesc('created_at')->orderByDesc('id'))->limit(500)->get();
        $reserved = DB::table('community_activity_reservations')->where('user_id', $request->user()->id)->pluck('activity_id')->all();
        $counts = DB::table('community_activity_reservations')->whereIn('activity_id', $items->pluck('id'))->selectRaw('activity_id, count(*) as total')->groupBy('activity_id')->pluck('total', 'activity_id');
        foreach ($items as $item) {
            $item->image = $this->imageUrl($item);
            unset($item->user_id);
            $item->published = (bool) $item->published;
            $item->reserved = in_array($item->id, $reserved);
            $item->reservations = (int) ($counts[$item->id] ?? 0);

            $item->starts_at_utc = CarbonImmutable::parse($item->starts_at, 'UTC')->toIso8601String();
            $item->starts_at = CarbonImmutable::parse($item->starts_at, 'UTC')->setTimezone($item->timezone)->format('Y-m-d\TH:i');
        }

        return response()->json(['activities' => $items]);
    }

    public function attendees(Request $request, int $activity)
    {
        $this->authorizeAdmin($request);
        $item = DB::table('community_activities')->find($activity);
        abort_unless($item, 404);
        abort_unless((int) $item->user_id === (int) $request->user()->id, 403);

        $people = DB::table('community_activity_reservations as reservations')
            ->join('users', 'users.id', '=', 'reservations.user_id')
            ->where('reservations.activity_id', $activity)
            ->orderByDesc('reservations.created_at')->orderByDesc('reservations.id')
            ->paginate(50, ['users.name', 'users.username', 'reservations.created_at as reserved_at']);
        $people->getCollection()->transform(function ($person) {
            $person->reserved_at = CarbonImmutable::parse($person->reserved_at, 'UTC')->toIso8601String();

            return $person;
        });

        return response()->json([
            'attendees' => $people->items(), 'total' => $people->total(),
            'page' => $people->currentPage(), 'last_page' => $people->lastPage(),
            'capacity' => $item->capacity,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, TokenWallet $wallet)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'source_key' => ['nullable', 'string', 'max:255', 'regex:/^event-[0-9]+-[a-zA-Z0-9]+$/'],
            'community_key' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'community_name' => ['required', 'string', 'max:255'],
            'kind' => ['required', Rule::in(['class', 'event', 'workshop', 'podcast', 'live'])],
            'title' => ['required', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:5000'],
            'image' => ['nullable', 'string', 'max:2048', 'regex:~^(?:/images/[^\s<>"\x27]+|https://[^\s<>"\x27]+)$~'],
            'image_file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'starts_at' => ['required', 'date_format:Y-m-d\TH:i'], 'timezone' => ['required', 'timezone'],
            'cost' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000000'], 'published' => ['required', 'boolean'],
        ]);
        unset($data['image_file']);
        $uploaded = null;
        try {
            [$item, $created] = DB::transaction(function () use ($request, $data, $wallet, &$uploaded) {
                $userId = $request->user()->id;
                // Concurrent retries from this account share one event and one reward.
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();
                if (! empty($data['source_key'])) {
                    $existing = DB::table('community_activities')->where('user_id', $userId)->where('source_key', $data['source_key'])->first();
                    if ($existing) {
                        return [$existing, false];
                    }
                }
                $start = CarbonImmutable::parse($data['starts_at'], $data['timezone']);
                if ($start->isPast() && empty($data['source_key'])) {
                    throw ValidationException::withMessages(['starts_at' => 'Elige una fecha futura.']);
                }
                $data['starts_at'] = $start->utc()->format('Y-m-d H:i:s');
                $uploaded = $request->file('image_file')?->store('community-activities', 'local');
                if ($uploaded) {
                    $data['image'] = $uploaded;
                }
                $id = DB::table('community_activities')->insertGetId($data + ['user_id' => $userId, 'created_at' => now(), 'updated_at' => now()]);
                if ($data['kind'] === 'event') {
                    $wallet->creditEvent($userId, $id, $data['title']);
                }

                return [DB::table('community_activities')->find($id), true];
            });
        } catch (\Throwable $error) {
            if ($uploaded) {
                Storage::disk('local')->delete($uploaded);
            }
            throw $error;
        }

        $tokens = (int) DB::table('wallet_token_entries')->where('activity_id', $item->id)->sum('amount');

        return response()->json([
            'id' => $item->id, 'image' => $this->imageUrl($item),
            'reward' => ['tokens' => $tokens, 'credited' => $created && $tokens > 0, 'balance' => $wallet->balance($request->user()->id)],
        ], $created ? 201 : 200);
    }

    private function imageUrl(object $item): ?string
    {
        return str_starts_with($item->image ?? '', 'community-activities/')
            ? route('community.activities.image', ['activity' => $item->id], false)
            : $item->image;
    }

    public function image(Request $request, int $activity)
    {
        $item = DB::table('community_activities')->where('id', $activity)->first();
        abort_unless($item && ($item->published || (int) $item->user_id === $request->user()->id), 404);
        abort_unless(str_starts_with($item->image ?? '', 'community-activities/') && Storage::disk('local')->exists($item->image), 404);

        return response()->file(Storage::disk('local')->path($item->image), ['Cache-Control' => 'private, no-cache']);
    }

    public function publish(Request $request, int $activity)
    {
        $this->authorizeAdmin($request);
        $item = DB::table('community_activities')->where('id', $activity)->first();
        abort_unless($item, 404);
        abort_unless($item->user_id === $request->user()->id, 403);
        $data = $request->validate(['published' => ['required', 'boolean']]);
        DB::table('community_activities')->where('id', $activity)->update($data + ['updated_at' => now()]);

        return response()->json(['published' => (bool) $data['published']]);
    }

    public function reserve(Request $request, int $activity)
    {
        return DB::transaction(function () use ($request, $activity) {
            $item = DB::table('community_activities')->where('id', $activity)->lockForUpdate()->first();
            abort_unless($item && $item->published, 404);
            abort_if(CarbonImmutable::parse($item->starts_at, 'UTC')->isPast(), 422, 'La actividad ya comenzó.');
            $booking = DB::table('community_activity_reservations')->where('activity_id', $activity)->where('user_id', $request->user()->id);
            if (! $booking->exists()) {
                abort_if($item->capacity && DB::table('community_activity_reservations')->where('activity_id', $activity)->count() >= $item->capacity, 409, 'No hay lugares disponibles.');
                DB::table('community_activity_reservations')->insert(['activity_id' => $activity, 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            }

            return response()->json(['reserved' => true]);
        });
    }

    public function cancel(Request $request, int $activity)
    {
        DB::table('community_activity_reservations')->where('activity_id', $activity)->where('user_id', $request->user()->id)->delete();

        return response()->json(['reserved' => false]);
    }
}
