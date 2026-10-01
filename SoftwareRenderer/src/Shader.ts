import {Vector} from "./Math/Vector.ts";

export type Shader =  (output: Uint8ClampedArray, position: Vector, faceAttributes: Float64Array[], vertexAttributes: Float64Array[], globals: Float64Array[]) => void