declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
    function set(key: string, value: string): void;
    function has(key: string): boolean;
    function toObject(): Record<string, string>;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}
