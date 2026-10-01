import {Buffer, Float64Buffer} from "../Buffer.ts";
import {Shader} from "../Shader.ts";
import {Mesh} from "./Mesh.ts";
import {Vector} from "../Math/Vector.ts";
import {Camera} from "./Camera.ts";
import createModule from "../WasmBindings/renderer.mjs";
import type {EmbindModule, MainModule} from "../WasmBindings/renderer.d.ts"
import MainModuleFactory from "../WasmBindings/renderer.mjs";

export class Rasterizer {
    width: number
    height: number
    renderBuffer: Buffer
    depthBuffer: Float64Buffer
    renderBufferPointer: number | null = null;
    depthBufferPointer: number | null = null;
    module: MainModule | null

    constructor(width: number, height: number) {
        this.width = width
        this.height = height

        this.renderBuffer = new Buffer(width, height, 4)
        this.depthBuffer = new Float64Buffer(width, height, 1)

        this.module = null // only gets a value when webassembly is initialized
    }

    renderWasm(mesh: Mesh, camera: Camera, globals: Float64Array[]) {
        if (!this.module) {
            throw new Error("You must call initializeWasm before renderWasm");
        }

        if (!this.renderBufferPointer) {
            throw new Error("You must call createBufferPointers before renderWasm");
        }

        // same setup as normal render
        let vertices = camera.transformVertices(mesh.vertices);
        const faces = mesh.faces;
        let vertexAttributes = mesh.vertexAttributes;
        let meshFaceAttributes: Float64Array[][] = mesh.faceAttributes;

        const clippedScene = camera.clipVertices(vertices, faces, vertexAttributes, meshFaceAttributes, camera.fov);
        const clippedVertices = clippedScene.vertices;
        const clippedFaces = clippedScene.faces;
        vertexAttributes = clippedScene.vertexAttributes;
        meshFaceAttributes = clippedScene.faceAttributes;
        const transformedVertices = camera.projectVertices(clippedVertices);

        if (!clippedVertices.length) {
            return; // nothing to render
        }

        for (let a in vertexAttributes) {
            for (let v in clippedVertices) {
                const vertex = clippedVertices[v]

                let attribute = vertexAttributes[a][v];
                for (let element = 0; element < attribute.length; element++) {
                    attribute[element] /= vertex[2];
                }
            }
        }

        for (let i in clippedFaces) { 
            const face = clippedFaces[i];

            const worldVertices: Float64Array = new Float64Array([
                ...clippedVertices[face[0]],
                ...clippedVertices[face[1]],
                ...clippedVertices[face[2]],
            ]);

            const faceTransformedVertices = new Float64Array([
                ...transformedVertices[face[0]],
                ...transformedVertices[face[1]],
                ...transformedVertices[face[2]],
            ])

            let faceVertexAttributes: Float64Array[] = new Array(3);
            // flatten vertex attributes into a list of all attributes one after another per vertex
            for (let vertex = 0; vertex < 3; vertex++) {
                let attributeList: number[] = [];
                for (let attribute of vertexAttributes) {
                    attributeList.push(...attribute[face[vertex]]);
                }
                faceVertexAttributes[vertex] = new Float64Array(attributeList);
            }

            let faceVertexAttributesPointers = new Int32Array(3);
            for (let vertex in faceVertexAttributes) {
                faceVertexAttributesPointers[vertex] = this.float64ArrayToPointer(faceVertexAttributes[vertex]);
            }

            // let elements: number[] = [];
            // for (let global of globals) {
            //     elements.push(...global);
            // }
            // let globalAttributesPointer = this.float64ArrayToPointer(new Float64Array(elements));

            let faceAttributesForFace: Float64Array;
            let elements = []
            for (let attribute in meshFaceAttributes) {
                elements.push(...meshFaceAttributes[attribute][i])
            }
            faceAttributesForFace = new Float64Array(elements);

            const worldVerticesPtr = this.float64ArrayToPointer(worldVertices); // always has 9 entries xyz for each vertex
            const faceTransformedVerticesPtr = this.float64ArrayToPointer(faceTransformedVertices); // always has 9 entries xyz for each vertex
            const faceAttributesPtr = this.float64ArrayToPointer(faceAttributesForFace);
            const faceVertexAttributesDoublePtr =  this.int32ArrayToPointer(faceVertexAttributesPointers);

            const numFaceAttributes = meshFaceAttributes.length; // we don't care about the size, that should be known by the developer in the shader so we only pass the number of attributes
            const vertexAttributeSize = faceVertexAttributes[0].length; // 2d array alway has 3 rows so we only need column sizes

            let shaderName = "test";
            this.module!.render(
                this.renderBufferPointer!,
                this.depthBufferPointer!, 
                this.width, 
                this.height,
                worldVerticesPtr,
                faceTransformedVerticesPtr,
                faceAttributesPtr,
                numFaceAttributes,
                faceVertexAttributesDoublePtr,
                vertexAttributeSize,
                0,
                shaderName
            )

            this.renderBuffer.values = this.pointerToUint8ClampedArray(this.renderBufferPointer, this.renderBuffer.values.length);
            this.depthBuffer.values = this.pointerToFloat64Array(this.depthBufferPointer!, this.depthBuffer.values.length);

            // free memory we have allocated to avoid memory leak
            this.freePointer(worldVerticesPtr);
            this.freePointer(faceTransformedVerticesPtr);
            this.freePointer(faceAttributesPtr);
            for (let vertex in faceVertexAttributes) {
                this.freePointer(faceVertexAttributesPointers[vertex]);
            }
            // this.freePointer(globalAttributesPointer);
            this.freePointer(faceVertexAttributesDoublePtr);
        }
    }

    /*
    * ### renders a mesh to renderBuffer with the provided shader
    * does not write to the screen, only the buffer being passed in
     */
    render(mesh: Mesh, camera: Camera, shader: Shader) {
        let vertices = camera.transformVertices(mesh.vertices);
        const faces = mesh.faces;
        let vertexAttributes = mesh.vertexAttributes;
        let meshFaceAttributes: Float64Array[][] = mesh.faceAttributes;

        // converts world to screen coordinates
        const worldToScreen = (vertex: Vector): Vector => {
            let res: Vector = [0, 0, 0];
            res[0] = (vertex[0] + 1) / 2 * this.width;
            res[1] = (vertex[1] + 1) / 2 * this.height;

            return res;
        }

        // converts screen to world coordinates
        const screenToWorld = (vertex: Vector) => {
            vertex[0] = vertex[0] / this.width * 2 - 1;
            vertex[1] = vertex[1] / this.height * 2 - 1;
        }

        const clippedScene = camera.clipVertices(vertices, faces, vertexAttributes, meshFaceAttributes, camera.fov);
        const clippedVertices = clippedScene.vertices;
        const clippedFaces = clippedScene.faces;
        vertexAttributes = clippedScene.vertexAttributes;
        meshFaceAttributes = clippedScene.faceAttributes;
        const transformedVertices = camera.projectVertices(clippedVertices);

        for (let a in vertexAttributes) {
            for (let v in clippedVertices) {
                const vertex = clippedVertices[v]

                let attribute = vertexAttributes[a][v];
                for (let element = 0; element < attribute.length; element++) {
                    attribute[element] /= vertex[2];
                }
            }
        }

        for (let i in clippedFaces) {
            const face: Vector = clippedFaces[i] as Vector;
            let faceAttributes: Float64Array[] = [];

            // the world position of vertices
            const worldA = clippedVertices[face[0]];
            const worldB = clippedVertices[face[1]];
            const worldC = clippedVertices[face[2]];

            // used for interpolating x and y positions per pixel
            const interpolateVertexA = [...worldA]
            const interpolateVertexB = [...worldB]
            const interpolateVertexC = [...worldC]
            interpolateVertexA[0] /= interpolateVertexA[2]
            interpolateVertexA[1] /= interpolateVertexA[2]
            interpolateVertexB[0] /= interpolateVertexB[2]
            interpolateVertexB[1] /= interpolateVertexB[2]
            interpolateVertexC[0] /= interpolateVertexC[2]
            interpolateVertexC[1] /= interpolateVertexC[2]

            // the position of vertices after perspective projection
            const vertexA = transformedVertices[face[0]];
            const vertexB = transformedVertices[face[1]];
            const vertexC = transformedVertices[face[2]];

            // used for interpolating z per pixel, pre-computed out here for performance
            let inverseZA = 1 / worldA[2];
            let inverseZB = 1 / worldB[2];
            let inverseZC = 1 / worldC[2];

            // the screen position of vertices
            const screenVertexA = worldToScreen(vertexA);
            const screenVertexB = worldToScreen(vertexB);
            const screenVertexC = worldToScreen(vertexC);

            const [tl, br] = this.calculateBoundingBox(screenVertexA, screenVertexB, screenVertexC);

            // the area of the projected triangle, useful for vertex attributes and z
            const area = Math.abs(this.edgeFunction(vertexA, vertexB, vertexC));

            let color = new Uint8ClampedArray(4); // also created here for performance
            let pixelVertexAttributes: Float64Array[] = [];

            // [vertexAttribute][vertex]
            let faceVertexAttributes: Float64Array[][] = []
            for (let attribute of vertexAttributes) {
                faceVertexAttributes.push([attribute[face[0]], attribute[face[1]], attribute[face[2]]])
            }

            for (let attribute of meshFaceAttributes) {
                faceAttributes.push(attribute[i])
            }

            // create empty Float64Arrays to store pixel vertex attributes without creating this class per pixel for performance
            if (vertexAttributes.length) {
                for (let va of vertexAttributes) {
                    let length = va[0].length;
                    pixelVertexAttributes.push(new Float64Array(length));
                }
            }

            tl[0] = Math.max(tl[0], 0);
            tl[1] = Math.max(tl[1], 0);
            br[0] = Math.min(br[0], this.width);
            br[1] = Math.min(br[1], this.height);

            let depth: Float64Array = new Float64Array([0]);
            let ws = [0, 0, 0];
            let shaderCoordinates: Vector = [0, 0, 0];
            let worldCoords: Vector = [0, 0, 0]

            for (let y = tl[1]; y < br[1]; y++) {
                for (let x = tl[0]; x < br[0]; x++) {
                    worldCoords[0] = x;
                    worldCoords[1] = y;
                    screenToWorld(worldCoords)
                    if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
                    if (!this.triangleContains(worldCoords, vertexA, vertexB, vertexC)) continue;

                    // each of these is the area between two of the vertices and the current pixel, it is used as
                    // a measure of how much a given vertex effects the z or a vertex attribute
                    let wa = this.edgeFunction(vertexB, vertexC, worldCoords);
                    let wb = this.edgeFunction(vertexC, vertexA, worldCoords);
                    let wc = this.edgeFunction(vertexA, vertexB, worldCoords);
                    wa /= area; // normalize them so they add to one
                    wb /= area;
                    wc /= area;

                    wa = Math.abs(wa); // depending if the triangle is counter clockwise or clockwise it may be negative
                    wb = Math.abs(wb); // so we make it positive or else we get strange results
                    wc = Math.abs(wc);

                    const z = 1 / (wa * inverseZA + wb * inverseZB + wc * inverseZC); // interpolate z
                    this.depthBuffer.getSingleElement(x, y, depth);

                    // if the current pixel is obscured by a closer pixel, don't render it
                    if (z > depth[0] || z < 0) continue;
                    depth[0] = z;
                    this.depthBuffer.setSingleElement(x, y, depth[0])

                    // apply perspective to vertex attributes
                    ws[0] = wa;
                    ws[1] = wb;
                    ws[2] = wc;
                    this.interpolateVertexAttributes(faceVertexAttributes, pixelVertexAttributes, ws, z);

                    // calculate x and y of pixel
                    const worldX = (interpolateVertexA[0] * wa + interpolateVertexB[0] * wb + interpolateVertexC[0] * wc) * z;
                    const worldY = (interpolateVertexA[1] * wa + interpolateVertexB[1] * wb + interpolateVertexC[1] * wc) * z;

                    shaderCoordinates[0] = worldX;
                    shaderCoordinates[1] = worldY;
                    shaderCoordinates[2] = z;
                    shader(color, shaderCoordinates, faceAttributes, pixelVertexAttributes, mesh.globals);
                    this.renderBuffer.setElement(x, y, color);
                }
            }
        }
    }

    // takes all the face vertex attributes, interpolates between them based off pixel location (ws) and z and writes it to pixelVertexAttributes
    interpolateVertexAttributes(faceVertexAttributes: Float64Array[][], pixelVertexAttributes: Float64Array[], ws: number[], z: number) {
        let numPixelVertexAttributes = pixelVertexAttributes.length;
        for (let i = 0; i < numPixelVertexAttributes; i++) {
            let attribute = pixelVertexAttributes[i]

            const numElements = attribute.length;

            for (let element = 0; element < numElements; element++) {
                attribute[element] = 0;
                for (let vertex = 0; vertex < 3; vertex++) {
                    attribute[element] += faceVertexAttributes[i][vertex][element] * ws[vertex] * z;
                }
            }
        }
    }

    // used so we dont have to render each triangle to the entire screen, we only check pixels that could be in the triangle
    calculateBoundingBox(vertexA: Vector, vertexB: Vector, vertexC: Vector): Vector[] {
        let tl: Vector = [...vertexA];
        let br: Vector = [...vertexA];

        if (vertexB[0] < tl[0]) {
            tl[0] = vertexB[0];
        }

        if (vertexB[0] > br[0]) {
            br[0] = vertexB[0];
        }

        if (vertexB[1] < tl[1]) {
            tl[1] = vertexB[1];
        }

        if (vertexB[1] > br[1]) {
            br[1] = vertexB[1];
        }

        if (vertexC[0] < tl[0]) {
            tl[0] = vertexC[0];
        }

        if (vertexC[0] > br[0]) {
            br[0] = vertexC[0];
        }

        if (vertexC[1] < tl[1]) {
            tl[1] = vertexC[1];
        }

        if (vertexC[1] > br[1]) {
            br[1] = vertexC[1];
        }

        tl[0] = Math.floor(tl[0]);
        tl[1] = Math.floor(tl[1]);
        br[0] = Math.ceil(br[0]);
        br[1] = Math.ceil(br[1]);

        return [tl, br]
    }

    // written by claude
    triangleContains(p: Vector, v0: Vector, v1: Vector, v2: Vector): boolean {
        const denominator = ((v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1]));

        const a = ((v1[1] - v2[1]) * (p[0] - v2[0]) + (v2[0] - v1[0]) * (p[1] - v2[1])) / denominator;
        const b = ((v2[1] - v0[1]) * (p[0] - v2[0]) + (v0[0] - v2[0]) * (p[1] - v2[1])) / denominator;
        const c = 1 - a - b;

        return a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1;
    }

    // used for interpolating z and vertex attriubutes
    edgeFunction(a: Vector, b: Vector, c: Vector): number {
        return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
    }

    /*
    Clears the render buffer to 0s and the depth buffer to -1
     */
    clear() {
        this.renderBuffer.clear(30)
        this.depthBuffer.clear(255)
    }

    float64ArrayToPointer(arr: Float64Array) {
        const ptr = this.module!._malloc(arr.length * arr.BYTES_PER_ELEMENT);
        this.module!.HEAPF64.set(arr, ptr / 8);
        return ptr;
    }

    uint8ArrayToPointer(arr: Uint8ClampedArray) {
        const ptr = this.module!._malloc(arr.length * arr.BYTES_PER_ELEMENT);
        this.module!.HEAPU8.set(arr, ptr);
        return ptr;
    }

    int32ArrayToPointer(arr: Int32Array) {
        const ptr = this.module!._malloc(arr.length * arr.BYTES_PER_ELEMENT);
        this.module!.HEAP32.set(arr, ptr / 4);
        return ptr;
    }

    pointerToUint8ClampedArray(ptr: number, length: number) {
        const memoryBuffer = this.module!.HEAPU8.buffer;
        return new Uint8ClampedArray(memoryBuffer, ptr, length);
    }

    pointerToFloat64Array(ptr: number, length: number) {
        const memoryBuffer = this.module!.HEAPF64.buffer;
        const bufferAsFloatArray = new Float64Array(memoryBuffer, ptr, length);
        return bufferAsFloatArray;
    }

    freePointer(ptr: number) {
        this.module!._free(ptr);
    } 

    createBufferPointers() {
        this.renderBufferPointer = this.uint8ArrayToPointer(this.renderBuffer.values);
        this.depthBufferPointer = this.float64ArrayToPointer(this.depthBuffer.values);
    }

    clearRenderBufferWasm() {
        if (!this.renderBufferPointer) return;
        this.module!.clearRenderBuffer(this.renderBufferPointer!, 0, this.width, this.height);
    }

    initializeWasm(): Promise<void> {
        return new Promise((resolve, reject) => {
            const moduleArgs = {
                onRuntimeInitialized: () => {
                    console.log("wasm initialized")
                },
                print: (text: any) => {
                    console.log('c++: ' + text);
                },
                // Add other configurations like canvas, wasmBinary, etc. as needed
                // canvas: document.getElementById('my-canvas')
            };

            MainModuleFactory(moduleArgs).then((Module: any) => {
                this.module = Module;
                resolve();
            });
        });
    }
}