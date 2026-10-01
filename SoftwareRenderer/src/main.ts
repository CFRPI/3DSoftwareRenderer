import './style.css'
import {Buffer} from "./Buffer.ts";
import {Rasterizer} from "./Rasterizer/Rasterizer.ts";
import {Mesh} from "./Rasterizer/Mesh.ts";
import {add, mul, dot, fromF64, norm, sub, Vector} from "./Math/Vector.ts";
import {Camera} from "./Rasterizer/Camera.ts";
import { stone } from "./textures.ts";

// sets color to the first face attribute and applies some simple lighting from above and to the right
function testShader(output: Float64Array, position: Vector, faceAttriubutes: Float64Array[], _vertexAttributes: Float64Array[], globals: Float64Array[]) {
    const normal = fromF64(faceAttriubutes[1])

    const pointLights = globals[0];
    const ambient = globals[1];
    const lighting = [0, 0, 0];

    // point lights
    for (let i = 0; i < pointLights.length; i += 6) {
        const lightPosition: Vector = [pointLights[i + 0], pointLights[i + 1], pointLights[i + 2]];
        const direction = norm(sub(lightPosition, position));
        const brightness = Math.max(dot(normal, direction), 0);
        const color = [pointLights[i + 3], pointLights[i + 4], pointLights[i + 5]];

        lighting[0] += color[0] * brightness;
        lighting[1] += color[1] * brightness;
        lighting[2] += color[2] * brightness;
    }

    lighting[0] += ambient[0];
    lighting[1] += ambient[1];
    lighting[2] += ambient[2];

    const color = faceAttriubutes[0]
    let r = color[0] * lighting[0];
    let g = color[1] * lighting[1];
    let b = color[2] * lighting[2];

    // uncomment to see normals as a color
    // r = (normal[0] + 1) / 2;
    // g = (normal[1] + 1) / 2;
    // b = (normal[2] + 1) / 2;

    output[0] = r
    output[1] = g
    output[2] = b
    output[3] = 1
}

function vertexColorShader(output: Float64Array, position: Vector, faceAttriubutes: Float64Array[], vertexAttributes: Float64Array[], globals: Float64Array[]) {
    const color = vertexAttributes[0];

    output[0] = color[0];
    output[1] = color[1];
    output[2] = color[2];
    output[3] = 1;
}

function normalsShader(output: Float64Array, position: Vector, faceAttriubutes: Float64Array[], vertexAttributes: Float64Array[], globals: Float64Array[]) {
    let normal = faceAttriubutes[0];
    output[0] = (normal[0] + 1) / 2;
    output[1] = (normal[1] + 1) / 2;
    output[2] = (normal[2] + 1) / 2;
    output[3] = 1;
}

function colorLerp(colorA: Vector, colorB: Vector, amount: number, output: Vector) {
    if (amount < 0) amount = 0;
    if (amount > 1) amount = 1;
    output[0] = (colorB[0] - colorA[0]) * amount + colorA[0];
    output[1] = (colorB[1] - colorA[1]) * amount + colorA[1];
    output[0] = (colorB[2] - colorA[2]) * amount + colorA[2];
}

const blue: Vector = [0.1, 0.3, 0.95];
const red: Vector = [0.85, 0.1, 0.35];
const green: Vector = [0.05, 1, 0.25]

function texturesShader(output: Uint8ClampedArray, position: Vector, faceAttriubutes: Float64Array[], vertexAttributes: Float64Array[], globals: Float64Array[]) {
    const textureCoord = vertexAttributes[0];
    const normal = fromF64(faceAttriubutes[0]);
    sampleTexture(stone, 512, 512, textureCoord[0], textureCoord[1], output);

    const lightDirection: Vector = [0, 1, -1];
    let brightness = (dot(lightDirection, normal) + 1) / 2;
    brightness = (brightness + 0.6) / 1.6;


    output[0] *= brightness;
    output[1] *= brightness;
    output[2] *= brightness;
    // output[3] = 255;
}

function sampleTexture(texture: Float64Array, width: number, height: number, x: number, y: number, output: Uint8ClampedArray) {
    x = Math.floor(x * width);
    y = Math.floor(y * height);

    // loop them between 0-1
    x = Math.abs(x % width);
    y = Math.abs(y % height);

    let index = y * width * 4 + x * 4;
    output[0] = texture[index] * 255;
    output[1] = texture[index + 1] * 255;
    output[2] = texture[index + 2] * 255;
    output[3] = 255;
}

// renders a buffer with dims = 4 to a canvas context
function renderBuffer(buffer: Buffer, context: CanvasRenderingContext2D) {
    const imageData = context.getImageData(0, 0, buffer.width, buffer.height);

    // const dataLength = imageData.data.length;
    // for (let i = 0; i < dataLength; i++) {
    //     imageData.data[i] = Math.max(Math.min(buffer.values[i] * 255, 255), 0);
    // }
    imageData.data.set(buffer.values)

    context.putImageData(imageData, 0, 0);
}

//
function createPointLights(camera: Camera, locations: Vector[], colors: number[][]) {
    locations = camera.transformVertices(locations); // account for camera position

    const lights: Float64Array = new Float64Array(locations.length * 6); //  number of lights times size of light (3 numbers for position 3 for color)
    for(let light = 0; light < locations.length; light++) {
        lights[light * 6 + 0] = locations[light][0]
        lights[light * 6 + 1] = locations[light][1]
        lights[light * 6 + 2] = locations[light][2]
        lights[light * 6 + 3] = colors[light][0]
        lights[light * 6 + 4] = colors[light][1]
        lights[light * 6 + 5] = colors[light][2]
    }

    return lights;
}

function generateMovementVector(theta: number, movementSpeed: number): Vector {
    const vec: Vector = [0, 0, 0];
    vec[0] = Math.sin(-theta) * movementSpeed;
    vec[2] = Math.cos(-theta) * movementSpeed;
    return vec;
}

// credit to https://dbaron.org/log/20100309-faster-timeouts
(function() {
    var timeouts: (() => void)[] = [];
    var messageName = "zero-timeout-message";

    // Like setTimeout, but only takes a function argument.  There's
    // no time argument (always zero) and no arguments (you have to
    // use a closure).
    function setZeroTimeout(fn: () => void) {
        timeouts.push(fn);
        window.postMessage(messageName, "*");
    }

    function handleMessage(event: MessageEvent) {
        if (event.source == window && event.data == messageName) {
            event.stopPropagation();
            if (timeouts.length > 0) {
                var fn = timeouts.shift()!;
                fn();
            }
        }
    }

    window.addEventListener("message", handleMessage, true);

    // Add the one thing we want added to the window object.
    // @ts-ignore
    window.setZeroTimeout = setZeroTimeout;
})();

window.onload = async function () {
    let canvas: HTMLCanvasElement | null = document.getElementById("canvas") as (HTMLCanvasElement | null);
    if (!canvas) return;

    const width = 600;
    const height = 400;

    canvas.width = width;
    canvas.height = height;

    let ctx = canvas.getContext("2d", {
        willReadFrequently: true,
    });
    if (!ctx) return;

    const keys: {[key: string]: boolean} = {}

    const rasterizer = new Rasterizer(width, height);
    await rasterizer.initializeWasm();
    rasterizer.createBufferPointers();

    const loopContext = {
        ctx,
        lastRunTime: new Date().getTime(),
        fpsDisplay: document.getElementById("fps"),
        rasterizer: rasterizer,
        camera: new Camera(85, width / height, 0.1, 1000),
        renderBuffer: new Buffer(width, height, 4),
        position: [0, 0, -10],
        rotation: [0, 0, 0],
        rotationSpeed: 0.003,
        movementSpeed: 0.01,
        lastRun: performance.now(),
        animate: function () {
            ctx.clearRect(0, 0, width, height);
            this.rasterizer.clear();

            const pyramidVertices: Vector[] = [
                [-1, 0, -1],
                [ 1, 0, -1],
                [ 1, 0,  1],
                [-1, 0,  1],
                [ 0, 2,  0],
                [ 0, 2,  0],
                [ 0, 2,  0],
                [ 0, 2,  0]
            ]

            const pyramidFaces: number[][] = [
                [3, 1, 0], // bottom
                [2, 1, 3],
                [0, 1, 4], // back
                [1, 2, 5], // right
                [2, 3, 6], // front
                [3, 0, 7], // left
            ]

            const vertexTextureCoords: Float64Array[] = [
                new Float64Array([0, 0]),
                new Float64Array([2, 0]),
                new Float64Array([2, 2]),
                new Float64Array([0, 2]),
                new Float64Array([1, 2]), // back
                new Float64Array([0, 1]), // right
                new Float64Array([1, 0]), // front
                new Float64Array([2, 1]), // left
            ]

            const pyramidMesh = new Mesh(pyramidVertices, pyramidFaces);
            pyramidMesh.addFaceAttribute(pyramidMesh.calculateNormals(false));
            pyramidMesh.addVertexAttribute(vertexTextureCoords);
            pyramidMesh.translate(-1, -2, 5)

            // this.rasterizer.render(pyramidMesh, this.camera, texturesShader);
            this.rasterizer.renderWasm(pyramidMesh, this.camera);
            renderBuffer(this.rasterizer.renderBuffer, this.ctx);


            // framerate calculation and display code
            if (!this.fpsDisplay) return;

            const now = performance.now();
            const delta = now - this.lastRunTime;
            const fps = 1000 / delta
            this.fpsDisplay.innerHTML = `FPS: ${Math.round(fps)}`
            this.lastRunTime = now;

            // movement
            if (keys["ArrowLeft"]) {
                this.rotation[1] += this.rotationSpeed * delta;
            }

            if (keys["ArrowRight"]) {
                this.rotation[1] -= this.rotationSpeed * delta;
            }

            if (keys["KeyW"]) {
                const movementVector = generateMovementVector(this.rotation[1], this.movementSpeed);
                this.position = add(this.position as Vector, mul(movementVector, delta));
            }

            if (keys["KeyS"]) {
                const movementVector = generateMovementVector(this.rotation[1] + Math.PI, this.movementSpeed);
                this.position = add(this.position as Vector, mul(movementVector, delta));
            }

            if (keys["KeyA"]) {
                const movementVector = generateMovementVector(this.rotation[1] + Math.PI / 2, this.movementSpeed);
                this.position = add(this.position as Vector, mul(movementVector, delta));
            }

            if (keys["KeyD"]) {
                const movementVector = generateMovementVector(this.rotation[1] + Math.PI * 3 / 2, this.movementSpeed);
                this.position = add(this.position as Vector, mul(movementVector, delta));
            }

            if (keys["Space"]) {
                this.position[1] += this.movementSpeed * delta
            }

            if (keys["ShiftLeft"]) {
                this.position[1] -= this.movementSpeed * delta;
            }

            this.rotation[0] = Math.max(Math.min(this.rotation[0], Math.PI / 2), -Math.PI / 2)

            this.camera.position = this.position as Vector;
            this.camera.rotation = this.rotation as Vector;

            // @ts-ignore
            window.setZeroTimeout(loopContext.animate.bind(loopContext));
        }
    };

    loopContext.animate();

    // movement
    document.body.addEventListener("keydown", (e) => {
        keys[e.code] = true;
    })

    document.body.addEventListener("keyup", (e) => {
        keys[e.code] = false;
    })
}

