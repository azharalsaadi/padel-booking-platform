<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePricingRuleRequest;
use App\Http\Requests\Admin\UpdatePricingRuleRequest;
use App\Http\Resources\Admin\PricingRuleResource;
use App\Models\PricingRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PricingRuleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $rules = PricingRule::query()->orderBy('hours_from')->get();

        return PricingRuleResource::collection($rules);
    }

    public function store(StorePricingRuleRequest $request): JsonResponse
    {
        $rule = PricingRule::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return (new PricingRuleResource($rule))->response()->setStatusCode(201);
    }

    public function update(UpdatePricingRuleRequest $request, PricingRule $pricingRule): PricingRuleResource
    {
        $pricingRule->update($request->validated());

        return new PricingRuleResource($pricingRule);
    }

    public function destroy(PricingRule $pricingRule): Response
    {
        $pricingRule->delete();

        return response()->noContent();
    }
}
