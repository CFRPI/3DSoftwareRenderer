// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Array=} args
     * @param {Object=} opts
     */
    function ccall(ident: any, returnType?: string, argTypes?: any[], args?: any[], opts?: any): any;
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
    function cwrap(ident: any, returnType?: string, argTypes?: any[], opts?: any): any;
    let HEAP8: any;
    let HEAPU8: any;
    let HEAP32: any;
    let HEAPF64: any;
    /**
     * @param {number} ptr
     * @param {string} type
     */
    function getValue(ptr: number, type?: string): any;
    let wasmMemory: any;
}
interface WasmModule {
  _malloc(_0: number): number;
  _free(_0: number): void;
  __Z17clearRenderBuffermdmm(_0: number, _1: number, _2: number, _3: number): void;
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
interface EmbindModule {
  clearRenderBuffer(_0: number, _1: number, _2: number, _3: number): void;
  render(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: number, _7: number, _8: number, _9: number, _10: number, _11: EmbindString): void;
}

export type MainModule = WasmModule & typeof RuntimeExports & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
