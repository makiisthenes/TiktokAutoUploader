package io.github.makiisthenes.autotok;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads the JSON autotok prints, so the library needs no dependencies.
 *
 * <p>Objects become {@code Map<String, Object>}, arrays {@code List<Object>}, numbers
 * {@code Long} (or {@code Double} if they have a fraction or exponent), and null {@code null}.
 */
final class Json {
    private final String text;
    private int pos;

    private Json(String text) {
        this.text = text;
    }

    static Object parse(String text) {
        Json json = new Json(text);
        json.skipSpace();
        Object value = json.value();
        json.skipSpace();
        if (json.pos != text.length()) {
            throw json.error("unexpected text after the value");
        }
        return value;
    }

    private Object value() {
        if (pos >= text.length()) {
            throw error("unexpected end");
        }
        char c = text.charAt(pos);
        return switch (c) {
            case '{' -> object();
            case '[' -> array();
            case '"' -> string();
            case 't' -> literal("true", Boolean.TRUE);
            case 'f' -> literal("false", Boolean.FALSE);
            case 'n' -> literal("null", null);
            default -> {
                if (c != '-' && (c < '0' || c > '9')) {
                    throw error("unexpected '" + c + "'");
                }
                yield number();
            }
        };
    }

    private Map<String, Object> object() {
        Map<String, Object> map = new LinkedHashMap<>();
        pos++; // {
        skipSpace();
        if (peek() == '}') {
            pos++;
            return map;
        }
        while (true) {
            skipSpace();
            if (peek() != '"') {
                throw error("expected a string key");
            }
            String key = string();
            skipSpace();
            expect(':');
            skipSpace();
            map.put(key, value());
            skipSpace();
            if (peek() == ',') {
                pos++;
            } else {
                expect('}');
                return map;
            }
        }
    }

    private List<Object> array() {
        List<Object> list = new ArrayList<>();
        pos++; // [
        skipSpace();
        if (peek() == ']') {
            pos++;
            return list;
        }
        while (true) {
            skipSpace();
            list.add(value());
            skipSpace();
            if (peek() == ',') {
                pos++;
            } else {
                expect(']');
                return list;
            }
        }
    }

    private String string() {
        StringBuilder sb = new StringBuilder();
        pos++; // "
        while (true) {
            if (pos >= text.length()) {
                throw error("unterminated string");
            }
            char c = text.charAt(pos++);
            if (c == '"') {
                return sb.toString();
            }
            if (c != '\\') {
                sb.append(c);
                continue;
            }
            if (pos >= text.length()) {
                throw error("unterminated string");
            }
            char escaped = text.charAt(pos++);
            switch (escaped) {
                case '"', '\\', '/' -> sb.append(escaped);
                case 'b' -> sb.append('\b');
                case 'f' -> sb.append('\f');
                case 'n' -> sb.append('\n');
                case 'r' -> sb.append('\r');
                case 't' -> sb.append('\t');
                case 'u' -> {
                    if (pos + 4 > text.length()) {
                        throw error("bad \\u escape");
                    }
                    try {
                        sb.append((char) Integer.parseInt(text.substring(pos, pos + 4), 16));
                    } catch (NumberFormatException e) {
                        throw error("bad \\u escape");
                    }
                    pos += 4;
                }
                default -> throw error("bad escape '\\" + escaped + "'");
            }
        }
    }

    private Object number() {
        int start = pos;
        while (pos < text.length() && "+-0123456789.eE".indexOf(text.charAt(pos)) >= 0) {
            pos++;
        }
        String n = text.substring(start, pos);
        try {
            if (n.indexOf('.') < 0 && n.indexOf('e') < 0 && n.indexOf('E') < 0) {
                try {
                    return Long.parseLong(n);
                } catch (NumberFormatException tooBig) {
                    return Double.parseDouble(n);
                }
            }
            return Double.parseDouble(n);
        } catch (NumberFormatException e) {
            throw error("bad number '" + n + "'");
        }
    }

    private Object literal(String word, Object value) {
        if (!text.startsWith(word, pos)) {
            throw error("unexpected text");
        }
        pos += word.length();
        return value;
    }

    private char peek() {
        return pos < text.length() ? text.charAt(pos) : '\0';
    }

    private void expect(char c) {
        if (peek() != c) {
            throw error("expected '" + c + "'");
        }
        pos++;
    }

    private void skipSpace() {
        while (pos < text.length() && " \t\r\n".indexOf(text.charAt(pos)) >= 0) {
            pos++;
        }
    }

    private IllegalArgumentException error(String message) {
        return new IllegalArgumentException("invalid JSON at " + pos + ": " + message);
    }
}
