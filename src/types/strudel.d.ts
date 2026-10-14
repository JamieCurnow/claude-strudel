// Minimal hand-written types for the parts of Strudel we touch. Strudel ships plain .mjs with no types.

declare module '@strudel/core' {
  export interface Fraction {
    valueOf(): number
    n: number
    d: number
  }
  export function Fraction(value: number | string): Fraction

  export class TimeSpan {
    constructor(begin: Fraction, end: Fraction)
    begin: Fraction
    end: Fraction
  }

  export interface Location {
    start: number
    end: number
  }

  export interface Hap {
    whole?: TimeSpan
    part: TimeSpan
    value: any
    context: { locations?: Location[]; [key: string]: unknown }
    hasOnset(): boolean
    duration: Fraction
  }

  export interface State {
    span: TimeSpan
    controls: Record<string, unknown>
    setSpan(span: TimeSpan): State
    setControls(controls: Record<string, unknown>): State
  }

  export class Pattern {
    constructor(query: (state: State) => Hap[])
    query(state: State): Hap[]
    queryArc(begin: number | Fraction, end: number | Fraction, controls?: Record<string, unknown>): Hap[]
    filterHaps(test: (hap: Hap) => boolean): Pattern
    analyze(id: number): Pattern
    [method: string]: any
  }

  export const silence: Pattern
  export function s(value: unknown): Pattern
  export function signal(fn: (t: Fraction, controls: Record<string, unknown>) => unknown): Pattern
  export function register(name: string, fn: (...args: any[]) => any, patternify?: boolean): any
  export function stack(...patterns: Pattern[]): Pattern
  export function isPattern(value: unknown): value is Pattern
  export function evalScope(...modules: unknown[]): Promise<unknown[]>
  export function setTime(fn: () => number): void
  export function logger(message: string, type?: string, data?: unknown): void

  export interface Cyclist {
    cps: number
    started: boolean
    lastBegin: number
    lastEnd: number
    now(): number
    setCps(cps: number): void
    getTime(): number
  }

  export interface ReplState {
    code: string
    activeCode: string
    evalError?: Error
    schedulerError?: Error
    pattern?: Pattern
    started: boolean
    miniLocations: [number, number][]
  }

  export function repl(options: Record<string, unknown>): Repl

  export interface Repl {
    scheduler: Cyclist
    state: ReplState
    evaluate(code: string, autostart?: boolean): Promise<Pattern | undefined>
    setPattern(pattern: Pattern, autostart?: boolean): Promise<Pattern>
    start(): Promise<void>
    stop(): void
    pause(): void
    setCps(cps: number): Pattern
  }
}

declare module '@strudel/mini' {
  export function mini(code: string): import('@strudel/core').Pattern
  export function miniAllStrings(): void
}

declare module '@strudel/tonal' {}

declare module '@strudel/transpiler' {
  export function transpiler(code: string, options?: Record<string, unknown>): { output: string }
  export function evaluate(code: string): Promise<{ pattern: unknown }>
}

declare module '@strudel/webaudio' {
  import type { Repl } from '@strudel/core'
  export function webaudioRepl(options: Record<string, unknown>): Repl
  export function initAudioOnFirstClick(): Promise<void>
  export function initAudio(options?: Record<string, unknown>): Promise<void>
  export function getAudioContext(): AudioContext
  export function registerSynthSounds(): Promise<void>
  export function registerZZFXSounds(): Promise<void>
  export function samples(
    map: string | Record<string, unknown>,
    baseUrl?: string,
    options?: Record<string, unknown>
  ): Promise<void>
  export function aliasBank(pathOrMap: string | Record<string, string | string[]>): Promise<void>
  export const soundMap: {
    get(): Record<
      string,
      { onTrigger: unknown; data: { type?: string; samples?: unknown; [key: string]: unknown } }
    >
  }
  export function getSampleBuffer(
    hapValue: Record<string, unknown>,
    bank: unknown,
    resolveUrl?: unknown
  ): Promise<unknown>
  export function getAnalyserById(id: number, fftSize?: number, smoothing?: number): AnalyserNode
  export function getAnalyzerData(type: 'time' | 'frequency', id?: number): Float32Array
  export const analysers: Record<number, AnalyserNode>
}

declare module '@strudel/draw' {
  import type { Hap } from '@strudel/core'
  export function __pianoroll(options: {
    ctx: CanvasRenderingContext2D
    time: number
    haps: Hap[]
    [key: string]: unknown
  }): void
  export function getDrawOptions(
    drawTime: [number, number],
    options?: Record<string, unknown>
  ): Record<string, unknown>
}

declare module '@strudel/soundfonts' {
  export function registerSoundfonts(): Promise<void>
}

declare module 'hydra-synth' {
  export default class Hydra {
    constructor(options: Record<string, unknown>)
    synth: Record<string, any>
    setResolution(width: number, height: number): void
    hush(): void
  }
}
