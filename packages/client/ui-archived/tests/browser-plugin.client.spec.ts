// @vitest-environment jsdom
/**
 * ui-archived browser half on the SlotTestRuntime: the plugin registers the
 * `main` cell and the sidebar row that selects it, the row label follows the
 * registered dictionary, and both registrations leave with the plugin fiber
 * (HMR safety). The node half is exercised over the same runtime.
 */
import { describe, expect, it } from 'vitest'
import { afterEach } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { en } from '../src/client/locales.ts'
import { apply as nodeApply } from '../src/index.ts'

const runtimes: SlotTestRuntime[] = []
afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.dispose()
})

async function bench() {
  const runtime = await SlotTestRuntime.create()
  runtimes.push(runtime)
  runtime.ctx.provide('locale', new LocaleRuntime(runtime.ctx))
  await runtime.root.declare({
    main: { kind: 'keyed', scope: 'root' },
    'sidebar.panellist': { kind: 'list', scope: 'root' },
  }, (() => null) as never)
  const handle = await runtime.mount({ inject, apply })
  return { runtime, handle }
}

describe('ui-archived browser plugin', () => {
  it('registers the panel cell and its sidebar row, then drops both on dispose (HMR safety)', async () => {
    const b = await bench()

    expect(b.runtime.slots.entries('main').map(entry => entry.options.key)).toEqual(['archived'])
    expect(b.runtime.slots.entries('sidebar.panellist').map(entry => entry.options.id)).toEqual(['archived'])

    await b.handle.dispose()

    expect(b.runtime.slots.entries('main')).toEqual([])
    expect(b.runtime.slots.entries('sidebar.panellist')).toEqual([])
  })

  it('resolves the sidebar label through the registered dictionary', async () => {
    const b = await bench()

    const entry = b.runtime.slots.entries('sidebar.panellist')[0]
    expect(typeof entry?.options.label).toBe('function')
    // The runtime starts in the default locale, so the thunk reads the English dictionary.
    expect((entry?.options.label as () => string)()).toBe(en['panel.title'])
  })

  it('exposes an inert node half', () => {
    expect(nodeApply()).toBeUndefined()
  })
})
