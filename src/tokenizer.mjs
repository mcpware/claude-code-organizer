/**
 * tokenizer.mjs — Token counting for Context Budget feature.
 *
 * Uses ai-tokenizer (optional dependency) for 99.79% accuracy on Claude models.
 * Falls back to bytes/4 estimation if ai-tokenizer is not installed.
 *
 * Every result includes a `confidence` field:
 *   "measured"  — ai-tokenizer was used
 *   "estimated" — bytes/4 fallback
 */

let _tokenizer = null;
let _method = "estimated"; // "measured" if ai-tokenizer loaded

/**
 * Lazily initialize the tokenizer.
 * Called once on first use — keeps startup fast when feature isn't used.
 */
async function init() {
  if (_tokenizer !== null) return;
  try {
    const [{ default: Tokenizer }, encoding] = await Promise.all([
      import("ai-tokenizer"),
      import("ai-tokenizer/encoding"),
    ]);
    _tokenizer = new Tokenizer(encoding.claude);
    _method = "measured";
  } catch {
    // ai-tokenizer not installed — use fallback
    _tokenizer = {
      count(text) {
        // bytes/4 is ~75-85% accurate for English text
        return Math.ceil(Buffer.byteLength(text, "utf-8") / 4);
      },
    };
    _method = "estimated";
  }
}

/**
 * Count tokens in a string.
 * @param {string} text
 * @returns {Promise<{ tokens: number, confidence: "measured"|"estimated" }>}
 */
export async function countTokens(text) {
  await init();
  if (!text) return { tokens: 0, confidence: _method };
  return { tokens: _tokenizer.count(text), confidence: _method };
}

/**
 * Which method is active?
 * @returns {Promise<"measured"|"estimated">}
 */
export async function getMethod() {
  await init();
  return _method;
}
