<?php

namespace App\Http\Middleware;

use App\Services\MockThawaniService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Redundant, request-time re-check alongside routes/api.php's boot-time
 * registration guard — belt and suspenders for "the mock endpoints must
 * work only when THAWANI_MODE=mock". A 404, not a 403: outside mock mode
 * these routes should look like they simply don't exist, the same as any
 * other unmatched URL.
 */
class EnsureThawaniMockActive
{
    public function handle(Request $request, Closure $next)
    {
        if (! MockThawaniService::isActive()) {
            throw new NotFoundHttpException();
        }

        return $next($request);
    }
}
