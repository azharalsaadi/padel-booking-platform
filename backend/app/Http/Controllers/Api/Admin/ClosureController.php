<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreClosureRequest;
use App\Http\Resources\Admin\CourtClosureResource;
use App\Models\CourtClosure;
use App\Services\ClosureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ClosureController extends Controller
{
    public function __construct(private readonly ClosureService $closureService) {}

    public function index(): AnonymousResourceCollection
    {
        $closures = CourtClosure::query()
            ->with('court')
            ->orderByDesc('date_start')
            ->paginate(20);

        return CourtClosureResource::collection($closures);
    }

    public function store(StoreClosureRequest $request): JsonResponse
    {
        $created = $this->closureService->create($request->validated(), $request->user()->id);

        return CourtClosureResource::collection($created)->response()->setStatusCode(201);
    }

    public function destroy(CourtClosure $closure): Response
    {
        $closure->delete();

        return response()->noContent();
    }

    public function destroyBatch(string $batchId): JsonResponse
    {
        $deleted = $this->closureService->deleteBatch($batchId);

        return response()->json(['message' => 'Closure batch removed.', 'deleted_count' => $deleted]);
    }
}
