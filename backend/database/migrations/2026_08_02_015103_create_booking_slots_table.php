<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            // Preserve historical integrity: courts are soft-deleted, never hard-deleted
            // while referenced, so this restricts physical deletion.
            $table->foreignId('court_id')->constrained('courts')->restrictOnDelete();
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('price_baisa');
            // Denormalized copy of the parent booking's status, kept in sync in the
            // same transaction, so lock_key below can be indexed without a join.
            $table->enum('status', ['pending_payment', 'confirmed', 'cancelled', 'expired']);
            $table->timestamps();

            $table->index(['court_id', 'date', 'start_time']);
            $table->index('date');
        });

        // Generated column: uniquely represents (court_id, date, start_time) only while
        // the slot is active (pending_payment/confirmed). NULL once cancelled/expired,
        // which frees the same court/time for re-booking since MySQL unique indexes
        // allow unlimited NULLs. This is the database-level double-booking backstop
        // behind the transactional random allocation logic.
        DB::statement(<<<'SQL'
            ALTER TABLE booking_slots
            ADD COLUMN lock_key VARCHAR(191)
            GENERATED ALWAYS AS (
                CASE
                    WHEN status IN ('pending_payment', 'confirmed')
                        THEN CONCAT(court_id, '|', date, '|', start_time)
                    ELSE NULL
                END
            ) STORED
        SQL);

        Schema::table('booking_slots', function (Blueprint $table) {
            $table->unique('lock_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_slots');
    }
};
