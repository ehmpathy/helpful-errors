/**
 * .what = marker symbol for HelpfulError type checks (the brand)
 * .why =
 *   - Symbol.for uses the realm-global registry, so the same symbol is shared across
 *     every copy of helpful-errors in the process — enables cross-copy detection even
 *     when instanceof fails across duplicate installs
 *   - a registered symbol survives minification (unlike class names) and stays out of
 *     enumeration (unlike string keys), so it never pollutes toJSON / Object.keys
 *   - mirrors the ehmpathy identity-marker convention (domain-objects/markers.ts:
 *     MARK_AS_DOMAIN_OBJECT = Symbol.for('domain-objects/DomainObject'))
 * .note = must be Symbol.for (global registry), never Symbol() — a plain symbol is
 *   module-local, so each duplicate copy would mint a different one and the brand would
 *   be invisible across copies
 * .note = key is flat 'helpful-errors' per the wisher; domain-objects namespaces its
 *   key as '{package}/{Type}', so 'helpful-errors/HelpfulError' would match that
 *   convention — the flat key was an explicit wisher decision (2026-07-13)
 * .note = no `: symbol` annotation, so tsc infers the narrower `unique symbol` type —
 *   required to use this as a static computed class-property key (the brand is stamped
 *   as `static readonly [MARK_AS_HELPFUL_ERROR]` on HelpfulError)
 */
export const MARK_AS_HELPFUL_ERROR = Symbol.for('helpful-errors');
