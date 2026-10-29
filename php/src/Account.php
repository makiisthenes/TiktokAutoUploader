<?php

declare(strict_types=1);

namespace Autotok;

/** A saved account, as `autotok accounts list` shows it. */
final class Account
{
    public function __construct(
        public readonly string $name,
        /** Whether a TikTok session is saved (`checkSession()` asks TikTok if it still works). */
        public readonly bool $hasSession,
        /** The account's proxy with its password hidden, or null for a direct connection. */
        public readonly ?string $proxy = null,
        /** Why the account file couldn't be read, if it couldn't. */
        public readonly ?string $error = null,
    ) {
    }
}
