import {sub, add, mul, Vector, dot} from "../Math/Vector.ts";
import {Matrices, Matrix} from "../Math/Matrix.ts";

interface Plane {
    normal: Vector;
    D: number;
}

interface ClippedScene {
    vertices: Vector[],
    faces: number[][],
    vertexAttributes: Float64Array[][]
    faceAttributes: Float64Array[][]
}

interface ClippedTriangle {
    vertices: Vector[],
    vertexAttributes: Float64Array[][]
}

// contains information about the cameras position and rotation,
// it also transforms vertices accordingly and applies perspective projection
export class Camera {
    rotation: Vector;
    position: Vector;
    near: number;
    far: number;
    fov: number;
    aspect: number;
    projectionMatrix: Matrix;

    constructor(fov: number, aspect: number, near: number, far: number) {
        this.projectionMatrix = Matrices.Zeros();
        this.rotation = [0, 0, 0];
        this.position = [0, 0, 0];

        this.fov = fov;
        this.near = near;
        this.far = far;
        this.aspect = aspect;

        this.recalculateProjectionMatrix();
    }

    /*
    regenerates the projection matrix when its values have changed, must be called manually, does not need to be called
    when the camera is moved or rotated, that is not handled by the projection matrix
     */
    recalculateProjectionMatrix() {
        this.projectionMatrix = Matrices.Perspective(this.fov, this.aspect, this.near, this.far);

    }

    /*
    Transforms points based on camera position and rotation, does not perspective project
     */
    transformVertices(vertices: Vector[]) {
        const translatedVertices = vertices.map(vertex => sub(vertex, this.position) as Vector);

        const rot: Vector = this.rotation;
        const rotationMatrix = Matrices.Rotation(-rot[0], -rot[1], -rot[2]);
        return rotationMatrix.multiplyVectors(translatedVertices);
    }

    // trannsforms direction vectors, does not translate but only rotates direction vectors to match camera
    // assumes all vectors start at the origin
    transformDirectionVectors(vectors: Vector[]) {
        const rot: Vector = this.rotation;
        const rotationMatrix = Matrices.Rotation(-rot[0], -rot[1], -rot[2]);
        return rotationMatrix.multiplyVectors(vectors);
    }

    /*
    Projects points using existing perspective projection matrix, this does not take into account the cameras position
    or rotation, it assumes you have already called transformPoints
     */
    projectVertices(vertices: Vector[]): Vector[] {
        const projectedVertices = this.projectionMatrix.multiplyVectors(vertices);
        return projectedVertices;
    }

    clipVertices(vertices: Vector[], faces: number[][], vertexAttributes: Float64Array[][], faceAttributes: Float64Array[][], fov: number): ClippedScene {
        let verticalSemiFOV = fov / 2 * Math.PI / 180;
        // https://en.wikipedia.org/wiki/Field_of_view_in_video_games
        let horizontalSemiFOV = 2 * Math.atan(Math.tan(verticalSemiFOV) * this.aspect) / 2

        const planes: Plane[] = [
            { // near
                normal: [0, 0, 1],
                D: this.near
            },
            { // left
                normal: [Math.cos(horizontalSemiFOV), 0, Math.sin(horizontalSemiFOV)],
                D: 0
            },
            { // right
                normal: [-Math.cos(horizontalSemiFOV), 0, Math.sin(horizontalSemiFOV)],
                D: 0
            },
            { // bottom
                normal: [0, Math.cos(verticalSemiFOV), Math.sin(verticalSemiFOV)],
                D: 0
            },
            { // left
                normal: [0, -Math.cos(verticalSemiFOV), Math.sin(verticalSemiFOV)],
                D: 0
            }
        ];

        let newVertices: Vector[] = []
        for (let face of faces) {
            newVertices.push(vertices[face[0]], vertices[face[1]], vertices[face[2]]);
        }

        let newVertexAttributes: Float64Array[][] = [];
        for (let attribute of vertexAttributes) {
            newVertexAttributes.push([]);
            for (let face of faces) {
                newVertexAttributes[newVertexAttributes.length - 1].push(this.cloneAttribute(attribute[face[0]]), this.cloneAttribute(attribute[face[1]]), this.cloneAttribute(attribute[face[2]]));
            }
        }

        let newFaceAttributes: Float64Array[][] = [];
        for (let attribute of faceAttributes) {
            newFaceAttributes.push([]);
            for (let face in faces) {
                newFaceAttributes[newFaceAttributes.length - 1].push(this.cloneAttribute(attribute[face]))
            }
        }

        for (let plane of planes) {
            const planeClippedVertices: Vector[] = [];
            const planeClippedVertexAttributes: Float64Array[][] = new Array(vertexAttributes.length);
            const planeClippedFaceAttributes: Float64Array[][] = new Array(faceAttributes.length);
            for (let i = 0; i < vertexAttributes.length; i++) {
                planeClippedVertexAttributes[i] = [];
            }
            for (let i = 0; i < faceAttributes.length; i++) {
                planeClippedFaceAttributes[i] = [];
            }
            let face = 0;
            for (let i = 0; i < newVertices.length; i += 3) {
                let faceVertices = [newVertices[i], newVertices[i + 1], newVertices[i + 2]];
                let faceVertexAttributes: Float64Array[][] = new Array(3);
                for (let vertex = 0; vertex < 3; vertex++) {
                    faceVertexAttributes[vertex] = [];
                    for (let attribute = 0; attribute < vertexAttributes.length; attribute++) {
                        faceVertexAttributes[vertex].push(newVertexAttributes[attribute][i + vertex]);
                    }
                }

                const clippedTriangle = this.clipTriangleAgainstPlane(faceVertices, faceVertexAttributes, plane);
                planeClippedVertices.push(...clippedTriangle.vertices);
                for (let attribute = 0; attribute < vertexAttributes.length; attribute++) {
                    for (let vertex = 0; vertex < clippedTriangle.vertexAttributes.length; vertex++) {
                        planeClippedVertexAttributes[attribute].push(clippedTriangle.vertexAttributes[vertex][attribute]);
                    }
                }

                for (let attribute = 0; attribute < faceAttributes.length; attribute++) {
                    for (let vertex = 0; vertex < clippedTriangle.vertexAttributes.length; vertex += 3) {
                        planeClippedFaceAttributes[attribute].push(this.cloneAttribute(newFaceAttributes[attribute][face]));
                    }
                }

                face++;
            }
            newVertices = planeClippedVertices;
            newVertexAttributes = planeClippedVertexAttributes;
            newFaceAttributes = planeClippedFaceAttributes;
        }

        // generate new indices
        const newIndices: number[][] = [];
        for (let i = 0; i < newVertices.length; i += 3) {
            newIndices.push([i + 0, i + 1, i + 2]);
        }

        return {
            vertices: newVertices,
            faces: newIndices,
            vertexAttributes: newVertexAttributes,
            faceAttributes: newFaceAttributes
        }
    }

    cloneAttribute(vertexAttribute: Float64Array) {
        return vertexAttribute.slice();
    }

    cloneAttributes(vertexAttributes: Float64Array[]) {
        return vertexAttributes.map((vertexAttribute) => vertexAttribute.slice());
    }

    clipTriangleAgainstPlane(faceVertices: Vector[], vertexAttributes: Float64Array[][], plane: Plane): ClippedTriangle {
        const d0 = this.signedDistance(plane, faceVertices[0]);
        const d1 = this.signedDistance(plane, faceVertices[1]);
        const d2 = this.signedDistance(plane, faceVertices[2]);

        const d0Sign = Math.max(Math.sign(d0), 0);
        const d1Sign = Math.max(Math.sign(d1), 0);
        const d2Sign = Math.max(Math.sign(d2), 0);
        const numVerticesPositive = d0Sign + d1Sign + d2Sign;

        if (numVerticesPositive === 3) { // all visible
            return {
                vertices: faceVertices,
                vertexAttributes: vertexAttributes,
            };
        } else if (numVerticesPositive === 0) { // none visible
            return {
                vertices: [],
                vertexAttributes: [],
            };
        } else if (numVerticesPositive === 1) {
            let Aindex: number = -1;
            let Bindex: number = -1;
            let Cindex: number = -1;

            if (d0 > 0) {
                Aindex = 0;
                Bindex = 1;
                Cindex = 2;
            }
            if (d1 > 0) {
                Aindex = 1;
                Bindex = 2;
                Cindex= 0;
            }
            if (d2 > 0) {
                Aindex = 2;
                Bindex = 0;
                Cindex = 1;
            }

            let A: Vector = faceVertices[Aindex];
            let B: Vector = faceVertices[Bindex];
            let C: Vector = faceVertices[Cindex];

            const AVAS = this.cloneAttributes(vertexAttributes[Aindex]);
            const BPrime = this.intersection(A, B, plane);
            const BPrimeVAS = this.interpolateVertexAttributes(vertexAttributes, Aindex, Bindex, A, B, plane);
            const CPrime = this.intersection(A, C, plane);
            const CPrimeVAS = this.interpolateVertexAttributes(vertexAttributes, Aindex, Cindex, A, C, plane);

            return {
                vertices: [A, BPrime, CPrime], 
                vertexAttributes: [
                    this.cloneAttributes(AVAS), 
                    this.cloneAttributes(BPrimeVAS), 
                    this.cloneAttributes(CPrimeVAS)
                ]
            }
        } else {
            let Aindex: number = -1;
            let Bindex: number = -1;
            let Cindex: number = -1;

            if (d0 <= 0) {
                Cindex = 0;
                Aindex = 1;
                Bindex = 2;
            }
            if (d1 <= 0) {
                Cindex = 1;
                Aindex = 2
                Bindex = 0;
            }
            if (d2 <= 0) {
                Cindex = 2;
                Aindex = 0;
                Bindex = 1;
            }


            let A: Vector = faceVertices[Aindex];
            let B: Vector = faceVertices[Bindex];
            let C: Vector = faceVertices[Cindex];

            const AVAS = vertexAttributes[Aindex];
            const BVAS = vertexAttributes[Bindex];
            const APrime = this.intersection(A, C, plane);
            const APrimeVAS = this.interpolateVertexAttributes(vertexAttributes, Aindex, Cindex, A, C, plane);
            const BPrime = this.intersection(B, C, plane);
            const BPrimeVAS = this.interpolateVertexAttributes(vertexAttributes, Bindex, Cindex, B, C, plane);

            return {
                vertices: [A, B, APrime, APrime, B, BPrime],
                vertexAttributes: [ // create shallow copies of each atrribute so we don't modify divide them by z multiple times
                    this.cloneAttributes(AVAS),
                    this.cloneAttributes(BVAS),
                    this.cloneAttributes(APrimeVAS),
                    this.cloneAttributes(APrimeVAS),
                    this.cloneAttributes(BVAS),
                    this.cloneAttributes(BPrimeVAS)
                ]
            };
        }
    }

    signedDistance(plane: Plane, vertex: Vector) {
        const normal = plane.normal;
        return dot(vertex, normal) + plane.D;
    }

    intersection(a: Vector, b: Vector, plane: Plane) {
        const t = (-plane.D - dot(plane.normal, a)) / dot(plane.normal, sub(b, a))
        return add(a, mul(sub(b, a), t));
    }

    interpolateVertexAttributes(vertexAttributes: Float64Array[][], indexA: number, indexB: number, vertexA: Vector, vertexB: Vector, plane: Plane): Float64Array[] {
        const t = (-plane.D - dot(plane.normal, vertexA)) / dot(plane.normal, sub(vertexB, vertexA))

        const interpolatedAttributes: Float64Array[] = [];
        for (let attribute in vertexAttributes[0]) {
            const vertexAttributeA = vertexAttributes[indexA][attribute];
            const vertexAttributeB = vertexAttributes[indexB][attribute];
            const interpolatedVertexAttribute = new Float64Array(vertexAttributeA.length);

            for (let element = 0; element < vertexAttributeA.length; element++) {
                // interpolate
                interpolatedVertexAttribute[element] = vertexAttributeA[element] + t * (vertexAttributeB[element] - vertexAttributeA[element]);
            }

            interpolatedAttributes.push(interpolatedVertexAttribute);
        }

        return interpolatedAttributes;
    }
}