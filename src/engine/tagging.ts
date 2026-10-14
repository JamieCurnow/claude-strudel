import { Pattern } from '@strudel/core'

/**
 * Make every event remember which labelled block (`hats: ...`) produced it, as `value._block`. Lets the
 * validator report per-block event counts, the UI highlight blocks, and voice commands target blocks.
 * Call from the repl's `beforeEval` hook: it runs after the repl installs its own `.p()` for labels.
 */
export const tagBlocks = () => {
  const proto = Pattern.prototype as unknown as { p: (this: Pattern, id: unknown) => Pattern }
  const original = proto.p
  if ((original as { _tagged?: boolean })._tagged) return
  const tagged = function (this: Pattern, id: unknown) {
    if (typeof id !== 'string' || id.includes('$')) return original.call(this, id)
    const block = id.replace(/^[_S]+|_+$/g, '')
    const withBlock = this.fmap((value: unknown) =>
      value && typeof value === 'object' ? { ...value, _block: block } : value
    ) as Pattern
    return original.call(withBlock, id)
  }
  ;(tagged as { _tagged?: boolean })._tagged = true
  proto.p = tagged
}
