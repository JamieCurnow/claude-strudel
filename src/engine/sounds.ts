import { aliasBank, registerSynthSounds, registerZZFXSounds, samples } from '@strudel/webaudio'
import { registerSoundfonts } from '@strudel/soundfonts'
import { DRUM_MACHINE_ALIASES, SOUND_BANKS } from '#shared/sound-banks'

/** Register every sound bank. Only the maps are fetched here; audio files load on first use (or preload). */
export const loadSoundBanks = async (opts: { onProgress?: (message: string) => void } = {}) => {
  await Promise.all([registerSynthSounds(), registerZZFXSounds(), registerSoundfonts()])
  // Sequential so later banks override earlier ones deterministically (see SOUND_BANKS order).
  for (const bank of SOUND_BANKS) {
    opts.onProgress?.(`Loading ${bank.id}`)
    try {
      await samples(bank.map, bank.base, { prebake: true, tag: bank.tag })
    } catch (err) {
      console.warn({ bank: bank.id, err })
    }
  }
  await aliasBank(DRUM_MACHINE_ALIASES).catch((err: unknown) => console.warn({ aliases: err }))
}
