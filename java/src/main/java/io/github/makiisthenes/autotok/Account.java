package io.github.makiisthenes.autotok;

import java.util.Optional;

/**
 * A saved account, as {@code autotok accounts list} shows it.
 *
 * @param name the account's name
 * @param hasSession whether a TikTok session is saved ({@link Autotok#checkSession} asks TikTok
 *     whether it still works)
 * @param proxy the account's proxy with its password hidden, or empty for a direct connection
 * @param error why the account file couldn't be read, if it couldn't
 */
public record Account(String name, boolean hasSession, Optional<String> proxy, Optional<String> error) {}
