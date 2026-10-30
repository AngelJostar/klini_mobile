<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientStory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class PatientStoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $patient = $this->resolveProfile($request);
        $seen = DB::table('patient_story_views')->where('patient_id', $patient->id)->pluck('patient_story_id')->all();
        $groups = PatientStory::query()->active()->with('patient')->orderBy('created_at')->orderBy('id')->get()
            ->groupBy('patient_id')->map(function ($stories) use ($patient, $seen): array {
                $latest = $stories->last();
                $author = $latest->patient;

                return [
                    'id' => (string) $author->id,
                    'name' => $author->full_name,
                    'own' => $author->is($patient),
                    'avatar' => $latest->avatar_path ? route('patient.stories.avatar', $latest) : null,
                    'stories' => $stories->map(fn ($story) => $this->storyData($story) + ['seen' => in_array($story->id, $seen)])->values(),
                ];
            })->sortByDesc(fn ($group) => $group['stories']->last()['createdAt'])->values();

        return response()->json(['profileId' => (string) $patient->id, 'serverTime' => now()->toIso8601String(), 'groups' => $groups])
            ->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $patient = $this->resolveProfile($request);
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=12000,max_height=12000'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $photoPath = $request->file('photo')->store('patient-stories/'.$patient->id, 'local');
        abort_if($photoPath === false, 500, 'No se pudo guardar la historia.');
        $avatarPath = null;
        try {
            if ($request->hasFile('avatar')) {
                $avatarPath = $request->file('avatar')->store('patient-story-avatars/'.$patient->id, 'local');
                abort_if($avatarPath === false, 500, 'No se pudo guardar la foto de perfil.');
            }
            $story = PatientStory::query()->create([
                'patient_id' => $patient->id,
                'created_by' => $request->user()->id,
                'photo_path' => $photoPath,
                'photo_mime' => $request->file('photo')->getMimeType(),
                'avatar_path' => $avatarPath,
                'expires_at' => now()->addHours(24),
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete(array_filter([$photoPath, $avatarPath]));
            throw $exception;
        }

        return response()->json(['story' => $this->storyData($story)], 201);
    }

    public function photo(PatientStory $story): StreamedResponse
    {
        return $this->media($story, $story->photo_path, $story->photo_mime);
    }

    public function avatar(PatientStory $story): StreamedResponse
    {
        abort_unless($story->avatar_path, 404);

        return $this->media($story, $story->avatar_path, Storage::disk('local')->mimeType($story->avatar_path) ?: 'image/jpeg');
    }

    public function destroy(Request $request, PatientStory $story): JsonResponse
    {
        abort_unless($story->patient_id === $this->resolveProfile($request)->id, 403);
        Storage::disk('local')->delete(array_filter([$story->photo_path, $story->avatar_path]));
        $story->delete();

        return response()->json(['deleted' => true]);
    }

    public function seen(Request $request, PatientStory $story): JsonResponse
    {
        $patient = $this->resolveProfile($request);
        abort_unless(PatientStory::query()->active()->whereKey($story->id)->exists(), 404);
        DB::table('patient_story_views')->updateOrInsert(
            ['patient_story_id' => $story->id, 'patient_id' => $patient->id],
            ['viewed_at' => now()]
        );

        return response()->json(['seen' => true]);
    }

    private function media(PatientStory $story, string $path, string $mime): StreamedResponse
    {
        abort_unless(PatientStory::query()->active()->whereKey($story->id)->exists(), 404);
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function storyData(PatientStory $story): array
    {
        return [
            'id' => (string) $story->id,
            'photo' => route('patient.stories.photo', $story),
            'createdAt' => $story->created_at->toIso8601String(),
            'expiresAt' => $story->expires_at->toIso8601String(),
            'deleteUrl' => route('patient.stories.destroy', $story),
            'seenUrl' => route('patient.stories.seen', $story),
        ];
    }

    private function resolveProfile(Request $request): Patient
    {
        $validated = $request->validate(['profile_id' => ['required', 'string', 'max:80']]);
        $profileId = $validated['profile_id'];
        $user = $request->user();
        $patient = Patient::query()->where('platform_number', $profileId)->first();
        if (! $patient && ctype_digit($profileId)) {
            $patient = Patient::query()->find($profileId);
        }
        abort_unless($patient && $patient->status === 'active', 403, 'Este perfil todavía no está disponible para publicar historias.');
        $authorized = (int) $patient->user_id === $user->id || in_array($user->role, ['superadmin', 'admin'], true);
        if (! $authorized) {
            $authorized = $user->accessiblePatientProfileLinks()
                ->where('managed_patient_id', $patient->id)->where('status', 'active')
                ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))
                ->get()->contains(fn ($link) => data_get($link->permissions, 'stories', true) !== false);
        }
        abort_unless($authorized, 403, 'No tienes acceso a las historias de este perfil.');

        return $patient;
    }
}
