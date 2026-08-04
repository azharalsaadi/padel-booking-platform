<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * No customer `users` table: customers book as guests. No
     * `password_reset_tokens`: this project has no password-reset feature —
     * only the documented demo admin credentials. Admin auth uses the
     * dedicated `admin_users` table (see its own migration) as the sole
     * authenticatable identity.
     *
     * `sessions` is kept: Sanctum's SPA (cookie-session) authentication mode
     * needs it. `user_id` here is a plain, unconstrained column (Laravel's
     * own DatabaseSessionHandler convention) — it holds admin_users.id when
     * an admin is logged in (config('auth.defaults.guard') = 'admin') and
     * is never subject to any foreign key, so it has no dependency on a
     * `users` table that no longer exists.
     */
    public function up(): void
    {
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
    }
};
