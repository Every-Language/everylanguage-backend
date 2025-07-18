// Minimal Deno types for shared utilities used in tests
declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
}
