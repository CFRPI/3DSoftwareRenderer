wasm:
	em++ -std=c++17 -O3 -c src/main.cpp -o build/main.o
	em++ -std=c++17 -O3 -c src/shaders.cpp -o build/shaders.o
	em++ -std=c++17 -O3 -c src/util.cpp -o build/util.o
	emar rcs build/renderer.a build/main.o build/shaders.o build/util.o
	em++ build/renderer.a -o ../src/WasmBindings/renderer.wasm -s WASM=1 --bind -s ALLOW_MEMORY_GROWTH=0 -O3 -s EXPORTED_RUNTIME_METHODS="ccall,cwrap,HEAP8,HEAPU8,HEAP32,HEAPF64,getValue,wasmMemory" -s EXPORTED_FUNCTIONS="['_malloc','_free']" 
	em++ build/*.o build/renderer.a -o ../src/WasmBindings/renderer.mjs -Wl --whole-archive --bind -lembind -s MODULARIZE=1 -s EXPORT_ES6=1 -s 'EXPORT_NAME="RendererModule"' -s ALLOW_MEMORY_GROWTH=0 -O3 --emit-tsd renderer.d.ts -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAP8","HEAPU8","HEAP32","HEAPF64","getValue","wasmMemory"]' -s EXPORTED_FUNCTIONS='["_malloc","_free"]' -s EXPORT_ALL=1