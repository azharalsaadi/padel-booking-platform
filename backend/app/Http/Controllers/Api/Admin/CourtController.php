<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourtRequest;
use App\Http\Requests\Admin\UpdateCourtRequest;
use App\Http\Resources\Admin\CourtResource;
use App\Models\Court;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CourtController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        // Working hours deliberately not eager-loaded here — the list view
        // is a summary; show() below loads the full detail.
        $courts = Court::query()->orderBy('sort_order')->orderBy('id')->paginate(20);

        return CourtResource::collection($courts);
    }

    public function store(StoreCourtRequest $request): JsonResponse
    {
        $court = Court::create($request->validated());

        return (new CourtResource($court))->response()->setStatusCode(201);
    }

    public function show(Court $court): CourtResource
    {
        return new CourtResource($court->load('workingHours'));
    }

    public function update(UpdateCourtRequest $request, Court $court): CourtResource
    {
        $court->update($request->validated());

        return new CourtResource($court);
    }

    public function destroy(Court $court): Response
    {
        $court->delete(); // soft delete — historical booking_slots remain valid

        return response()->noContent();
    }
}
