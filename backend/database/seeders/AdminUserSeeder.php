<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        AdminUser::updateOrCreate(
            ['email' => 'admin@padel.test'],
            [
                'name' => 'Admin',
                // Hashed automatically via AdminUser's 'password' => 'hashed' cast.
                'password' => 'Password123!',
            ]
        );
    }
}
