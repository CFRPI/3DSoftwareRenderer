import {Matrices} from "../Math/Matrix.ts";
import {cross, mul, norm, sub, toF64, Vector} from "../Math/Vector.ts";
import {Camera} from "./Camera.ts";

/*
An abstraction, contains all information needed to render a 3d object with functions to move and rotate it
 */
export class Mesh {
    originalVertices: Vector[];
    vertices: Vector[];
    faces: number[][];
    vertexAttributes: Float64Array[][];
    faceAttributes: Float64Array[][];
    globals: Float64Array[];

    rotation: number[];
    position: number[];

    constructor(vertices: Vector[], faces: number[][]) {
        this.originalVertices = [...vertices];
        this.vertices = [...vertices];
        this.faces = faces;
        this.vertexAttributes = [];
        this.faceAttributes = [];
        this.globals = [];

        this.rotation = [0, 0, 0];
        this.position = [0, 0, 0];

    }

    reset() {
        this.vertices = this.originalVertices;
    }

    // rotates by x y z
    rotate(x: number, y: number, z: number) {
        this.rotation[0] += x;
        this.rotation[1] += y;
        this.rotation[2] += z;

        this.applyTranslations();
    }

    // sets rotation to x y z
    setRotation(x: number, y: number, z: number) {
        this.rotation = [x, y, z];
        this.applyTranslations();
    }

    // translates by x y z
    translate(x: number, y: number, z: number) {
        this.position[0] += x;
        this.position[1] += y;
        this.position[2] += z;

        this.applyTranslations()
    }

    // sets position to x y z
    setPosition(x: number, y: number, z: number) {
        this.position = [x, y, z];
        this.applyTranslations();
    }

    // applies translations on originalVertices so that vertices contain the transformed vectors
    applyTranslations() {
        this.reset()

        const rotation = Matrices.Rotation(this.rotation[0], this.rotation[1], this.rotation[2]);
        this.vertices = rotation.multiplyVectors(this.vertices);

        for (let vertex of this.vertices) {
            vertex[0] += this.position[0];
            vertex[1] += this.position[1];
            vertex[2] += this.position[2];
        }
    }

    /*
     calculates the normal vectors for each face of the current mesh, it does not add them to face attributes, this
     is left up to the user, set invert to true to flip the normal vectors, this is sometimes necessary depending on if
     the triangles are in a clockwise or counterclockwise order

     Normals are relative to camera and will be automatically transformed by the camera
    */
    calculateNormals(invert: boolean): Float64Array[] {
        let normals: Vector[] = [];

        for (let face of this.faces) {
            const vecA = this.vertices[face[0]]
            const vecB = this.vertices[face[1]]
            const vecC = this.vertices[face[2]]

            const AB = sub(vecA, vecB)
            const AC = sub(vecA, vecC)

            let normalVector = norm(cross(AB, AC));
            if (invert) normalVector = mul(normalVector, -1);

            normals.push(normalVector)
        }

        // normals = camera.transformDirectionVectors(normals);

        return normals.map(normal => toF64(normal));
    }

    addVertexAttribute(attribute: Float64Array[]) {
        this.vertexAttributes.push(attribute);
    }

    addFaceAttribute(attribute: Float64Array[]) {
        this.faceAttributes.push(attribute);
    }

    addGlobal(attribute: Float64Array) {
        this.globals.push(attribute)
    }
}