<?php

namespace Tests\Unit\Services;

use App\Exceptions\Pricing\InvalidSlotSelectionException;
use App\Exceptions\Pricing\NoMatchingPricingRuleException;
use App\Models\PricingRule;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    private PricingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PricingService();
    }

    /** Seeds the standard 1hr/2hr/3+hr tiers used throughout these tests. */
    private function seedStandardTiers(): void
    {
        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 2, 'hours_to' => 2, 'price_per_hour_baisa' => 8000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 3, 'hours_to' => null, 'price_per_hour_baisa' => 7000, 'is_active' => true]);
    }

    private function slot(string $date, string $start, string $end): array
    {
        return ['date' => $date, 'start_time' => $start, 'end_time' => $end];
    }

    public function test_one_hour_rule_applies_no_discount(): void
    {
        $this->seedStandardTiers();

        $quote = $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
        ]);

        $this->assertSame(1, $quote['total_hours']);
        $this->assertSame(10000, $quote['standard_subtotal_baisa']);
        $this->assertSame(10000, $quote['total_price_baisa']);
        $this->assertSame(0, $quote['discount_baisa']);
        $this->assertSame(1, $quote['applied_rule']['hours_from']);
        $this->assertSame(1, $quote['applied_rule']['hours_to']);
        $this->assertSame(10000, $quote['applied_rule']['price_per_hour_baisa']);
    }

    public function test_two_hour_rule_applies_the_discounted_rate(): void
    {
        $this->seedStandardTiers();

        $quote = $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
            $this->slot('2026-08-10', '19:00', '20:00'),
        ]);

        $this->assertSame(2, $quote['total_hours']);
        $this->assertSame(20000, $quote['standard_subtotal_baisa']); // 2 x base 10000
        $this->assertSame(16000, $quote['total_price_baisa']); // 2 x 8000
        $this->assertSame(4000, $quote['discount_baisa']);
        $this->assertSame(2, $quote['applied_rule']['hours_from']);
    }

    public function test_three_or_more_hour_rule_applies_the_open_ended_tier(): void
    {
        $this->seedStandardTiers();

        $quote = $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
            $this->slot('2026-08-10', '19:00', '20:00'),
            $this->slot('2026-08-10', '20:00', '21:00'),
            $this->slot('2026-08-10', '21:00', '22:00'),
        ]);

        $this->assertSame(4, $quote['total_hours']);
        $this->assertSame(40000, $quote['standard_subtotal_baisa']);
        $this->assertSame(28000, $quote['total_price_baisa']); // 4 x 7000
        $this->assertSame(12000, $quote['discount_baisa']);
        $this->assertSame(3, $quote['applied_rule']['hours_from']);
        $this->assertNull($quote['applied_rule']['hours_to']);
    }

    public function test_multi_day_hours_use_one_global_tier_not_per_day_tiers(): void
    {
        $this->seedStandardTiers();

        // 1 hour on each of two different dates -> 2 total hours -> the
        // 2-hour tier applies to BOTH, not two separate 1-hour charges.
        $quote = $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
            $this->slot('2026-08-11', '20:00', '21:00'),
        ]);

        $this->assertSame(2, $quote['total_hours']);
        $this->assertSame(2, $quote['applied_rule']['hours_from']);
        $this->assertSame(16000, $quote['total_price_baisa']);
        $this->assertEqualsCanonicalizing(
            [['date' => '2026-08-10', 'hours' => 1], ['date' => '2026-08-11', 'hours' => 1]],
            $quote['days']
        );
    }

    public function test_inactive_rules_are_ignored(): void
    {
        // An inactive rule that would otherwise match 1 hour more cheaply.
        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 1, 'is_active' => false]);
        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000, 'is_active' => true]);

        $quote = $this->service->quote([$this->slot('2026-08-10', '18:00', '19:00')]);

        $this->assertSame(10000, $quote['applied_rule']['price_per_hour_baisa']);
    }

    public function test_missing_matching_rule_throws_a_clear_error(): void
    {
        // No rules seeded at all.
        $this->expectException(NoMatchingPricingRuleException::class);

        $this->service->quote([$this->slot('2026-08-10', '18:00', '19:00')]);
    }

    public function test_ambiguous_overlapping_rules_resolve_deterministically_by_specificity(): void
    {
        // Two active rules both cover 2 hours (bad admin data). The more
        // specific one (higher hours_from) must win per the documented
        // tie-break, not an arbitrary DB-order pick.
        $broad = PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => null, 'price_per_hour_baisa' => 5000, 'is_active' => true]);
        $specific = PricingRule::factory()->create(['hours_from' => 2, 'hours_to' => 3, 'price_per_hour_baisa' => 9000, 'is_active' => true]);

        $quote = $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
            $this->slot('2026-08-10', '19:00', '20:00'),
        ]);

        $this->assertSame($specific->price_per_hour_baisa, $quote['applied_rule']['price_per_hour_baisa']);
        $this->assertSame(2, $quote['applied_rule']['hours_from']);
        $this->assertNotSame($broad->price_per_hour_baisa, $quote['applied_rule']['price_per_hour_baisa']);
    }

    public function test_tie_break_falls_back_to_lowest_id_when_specificity_is_equal(): void
    {
        // Two active rules with the IDENTICAL range (hours_from equal) —
        // specificity can't distinguish them, so the earliest-created
        // (lowest id) must win, deterministically.
        $first = PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 10000, 'is_active' => true]);
        PricingRule::factory()->create(['hours_from' => 1, 'hours_to' => 1, 'price_per_hour_baisa' => 20000, 'is_active' => true]);

        $quote = $this->service->quote([$this->slot('2026-08-10', '18:00', '19:00')]);

        $this->assertSame($first->price_per_hour_baisa, $quote['applied_rule']['price_per_hour_baisa']);
    }

    public function test_all_money_values_are_integers_never_floats(): void
    {
        $this->seedStandardTiers();

        $quote = $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
            $this->slot('2026-08-10', '19:00', '20:00'),
        ]);

        $this->assertIsInt($quote['standard_subtotal_baisa']);
        $this->assertIsInt($quote['total_price_baisa']);
        $this->assertIsInt($quote['discount_baisa']);
        $this->assertIsInt($quote['applied_rule']['price_per_hour_baisa']);
    }

    public function test_duplicate_slots_are_rejected(): void
    {
        $this->seedStandardTiers();

        $this->expectException(InvalidSlotSelectionException::class);

        $this->service->quote([
            $this->slot('2026-08-10', '18:00', '19:00'),
            $this->slot('2026-08-10', '18:00', '19:00'),
        ]);
    }

    public function test_partial_hour_slot_is_rejected(): void
    {
        $this->seedStandardTiers();

        $this->expectException(InvalidSlotSelectionException::class);

        $this->service->quote([$this->slot('2026-08-10', '18:00', '18:30')]);
    }

    public function test_empty_slot_list_is_rejected(): void
    {
        $this->expectException(InvalidSlotSelectionException::class);

        $this->service->quote([]);
    }

    public function test_exceptions_render_with_the_approved_error_envelope(): void
    {
        $request = \Illuminate\Http\Request::create('/api/bookings/quote', 'POST');

        $exception = new NoMatchingPricingRuleException('No active pricing rule matches 5 hour(s).');
        $response = $exception->render($request);

        $this->assertSame(409, $response->getStatusCode());
        $this->assertSame('NO_MATCHING_PRICING_RULE', $response->getData(true)['error_code']);

        $exception = new InvalidSlotSelectionException('Duplicate slot selected.');
        $response = $exception->render($request);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('INVALID_SLOT_SELECTION', $response->getData(true)['error_code']);
    }
}
