<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Stateless Sanctum personal-access-token auth. Frontend and backend are
 * deployed on different Railway domains, which ruled out cookie/session SPA
 * auth entirely (no shared cookie jar to carry a session id or CSRF token
 * across origins — the source of the "Session store not set on request"
 * and subsequent 419 errors this replaces). Every admin request instead
 * carries an Authorization: Bearer <token> header, verified by the
 * 'sanctum' guard's token lookup (auth:sanctum middleware) — no server-side
 * session is ever created or read here.
 */
class AdminAuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $admin = AdminUser::where('email', $credentials['email'])->first();

        if (! $admin || ! Hash::check($credentials['password'], $admin->password)) {
            // Deliberately generic: never reveal whether the email or the
            // password was the part that didn't match.
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        // A fresh login supersedes any token(s) issued by a previous one —
        // only the token handed back below should work afterward.
        $admin->tokens()->delete();

        $token = $admin->createToken('admin-spa')->plainTextToken;

        return response()->json([
            'data' => [
                'admin' => new AdminUserResource($admin),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Only the token this request authenticated with — an admin may
        // hold tokens for other sessions/devices that must keep working.
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): AdminUserResource
    {
        return new AdminUserResource($request->user());
    }
}
