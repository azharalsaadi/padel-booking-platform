<?php

namespace App\Services;

use App\Models\CourtClosure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Expands one admin closure request (single/multiple/all courts ×
 * single/multiple dates or one range) into the concrete court_closures
 * rows it represents, sharing one batch_id whenever more than one row
 * results — so the batch can later be edited/removed as a unit.
 */
class ClosureService
{
    /**
     * @param  array{
     *     court_ids: ?array<int, int>,
     *     dates: array{mode: string, values?: array<int, string>, range?: array{start: string, end: string}},
     *     is_full_day: bool,
     *     start_time: ?string,
     *     end_time: ?string,
     *     reason: ?string,
     * }  $data
     * @return Collection<int, CourtClosure>
     */
    public function create(array $data, ?int $createdByAdminId): Collection
    {
        // null (or omitted) court_ids = applies to all courts, represented
        // as a single court_id = null row per date.
        $courtTargets = $data['court_ids'] ?? [null];

        $dateRanges = $data['dates']['mode'] === 'range'
            ? [[$data['dates']['range']['start'], $data['dates']['range']['end']]]
            : array_map(fn (string $date) => [$date, $date], $data['dates']['values']);

        $batchId = (count($courtTargets) * count($dateRanges)) > 1 ? (string) Str::uuid() : null;

        return DB::transaction(function () use ($courtTargets, $dateRanges, $data, $batchId, $createdByAdminId) {
            $created = collect();

            foreach ($courtTargets as $courtId) {
                foreach ($dateRanges as [$start, $end]) {
                    $created->push(CourtClosure::create([
                        'batch_id' => $batchId,
                        'court_id' => $courtId,
                        'date_start' => $start,
                        'date_end' => $end,
                        'is_full_day' => $data['is_full_day'],
                        'start_time' => $data['is_full_day'] ? null : $data['start_time'],
                        'end_time' => $data['is_full_day'] ? null : $data['end_time'],
                        'reason' => $data['reason'] ?? null,
                        'created_by' => $createdByAdminId,
                    ]));
                }
            }

            return $created;
        });
    }

    public function deleteBatch(string $batchId): int
    {
        return CourtClosure::where('batch_id', $batchId)->delete();
    }
}
