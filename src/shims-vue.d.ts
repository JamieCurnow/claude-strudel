// Lets the oxlint type-aware pass (tsgolint) resolve .vue imports. vue-tsc resolves the real SFC types.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
