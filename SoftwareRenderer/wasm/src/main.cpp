#include "main.h"
#include "shaders.h"

using namespace emscripten;

typedef double Vector[3];
typedef void (*shader)(uint8_t *color, double *position, double *faceAttributes, double *vertexAttributes, double *shader);

typedef struct {
    size_t top;
    size_t bottom;
    size_t left;
    size_t right;
} Bounds;

void worldToScreen(Vector vertex, size_t width, size_t height);
void screenToWorld(Vector vertex, size_t width, size_t height);
double edgeFunction(Vector a, Vector b, Vector c);
int iround(double value);
Bounds calculateBoundingBox(Vector vertexA, Vector vertexB, Vector vertexC, double width, double height);
void interpolateVertexAttributes(double **faceVertexAttributes, double *pixelVertexAttributes, double *ws, double z, size_t attributesLength);

std::map<std::string, shader> shaderMap = {
    { "test", &testShader }
};

void registerShader(std::string shaderName, shader shaderFunc) {
    shaderMap[shaderName] = shaderFunc;
}

void render(uintptr_t renderBufferPtr, uintptr_t depthBufferPtr, size_t width, size_t height, uintptr_t worldVerticesPtr, uintptr_t transformedVerticesPtr, uintptr_t faceAttributesDoublePtr, size_t numFaceAttributes, uintptr_t vertexAttributesDoublePtr, size_t vertexAttributesSize, uintptr_t globalsPtr, std::string shaderName) {
    uint8_t *renderBuffer = reinterpret_cast<uint8_t*>(renderBufferPtr);
    double *depthBuffer = reinterpret_cast<double*>(depthBufferPtr);
    double *worldVerticesArray = reinterpret_cast<double*>(worldVerticesPtr);
    double *transformedVerticesArray = reinterpret_cast<double*>(transformedVerticesPtr);
    double *faceAttributes = reinterpret_cast<double*>(faceAttributesDoublePtr);
    double **vertexAttributes = reinterpret_cast<double**>(vertexAttributesDoublePtr);
    double *globals = reinterpret_cast<double*>(globalsPtr);

    double *pixelVertexAttributes = (double*) malloc(sizeof(double) * vertexAttributesSize);

    shader shader = shaderMap[shaderName];

    // the world position of vertices
    Vector worldA = {worldVerticesArray[0], worldVerticesArray[1], worldVerticesArray[2]};
    Vector worldB = {worldVerticesArray[3], worldVerticesArray[4], worldVerticesArray[5]};
    Vector worldC = {worldVerticesArray[6], worldVerticesArray[7], worldVerticesArray[8]};

    const double inverseZA = 1 / worldA[2];
    const double inverseZB = 1 / worldB[2];
    const double inverseZC = 1 / worldC[2];

    // used for interpolating x and y positions per pixel
    Vector interpolateVertexA = {0, 0, 0};
    Vector interpolateVertexB = {0, 0, 0};
    Vector interpolateVertexC = {0, 0, 0};
    interpolateVertexA[0] = worldA[0] / interpolateVertexA[2];
    interpolateVertexA[1] = worldA[1] / interpolateVertexA[2];
    interpolateVertexB[0] = worldB[0] / interpolateVertexB[2];
    interpolateVertexB[1] = worldB[1] / interpolateVertexB[2];
    interpolateVertexC[0] = worldC[0] / interpolateVertexC[2];
    interpolateVertexC[1] = worldC[1] / interpolateVertexC[2];

    // the position of vertices after perspective projection
    Vector vertexA = {transformedVerticesArray[0], transformedVerticesArray[1], transformedVerticesArray[2]};
    Vector vertexB = {transformedVerticesArray[3], transformedVerticesArray[4], transformedVerticesArray[5]};
    Vector vertexC = {transformedVerticesArray[6], transformedVerticesArray[7], transformedVerticesArray[8]};

    Vector screenVertexA = {transformedVerticesArray[0], transformedVerticesArray[1], transformedVerticesArray[2]};
    Vector screenVertexB = {transformedVerticesArray[3], transformedVerticesArray[4], transformedVerticesArray[5]};
    Vector screenVertexC = {transformedVerticesArray[6], transformedVerticesArray[7], transformedVerticesArray[8]};
    worldToScreen(screenVertexA, width, height);
    worldToScreen(screenVertexB, width, height);
    worldToScreen(screenVertexC, width, height);

    // top, bottom, left, right
    Bounds bounds = calculateBoundingBox(screenVertexA, screenVertexB, screenVertexC, width, height);
    size_t top = bounds.top;
    size_t bottom = bounds.bottom;
    size_t left = bounds.left;
    size_t right = bounds.right;

    // logic to check in triangle from https://web.archive.org/web/20050408192410/http://sw-shader.sourceforge.net/rasterizer.html
    const int Y1 = iround(16.0f * screenVertexA[1]);
    const int Y2 = iround(16.0f * screenVertexB[1]);
    const int Y3 = iround(16.0f * screenVertexC[1]);

    const int X1 = iround(16.0f * screenVertexA[0]);
    const int X2 = iround(16.0f * screenVertexB[0]);
    const int X3 = iround(16.0f * screenVertexC[0]);

    // Deltas
    const int DX12 = X1 - X2;
    const int DX23 = X2 - X3;
    const int DX31 = X3 - X1;

    const int DY12 = Y1 - Y2;
    const int DY23 = Y2 - Y3;
    const int DY31 = Y3 - Y1;

    // Fixed-point deltas
    const int FDX12 = DX12 << 4;
    const int FDX23 = DX23 << 4;
    const int FDX31 = DX31 << 4;

    const int FDY12 = DY12 << 4;
    const int FDY23 = DY23 << 4;
    const int FDY31 = DY31 << 4;

    int minx = (std::min(X1, std::min(X2, X3)) + 0xF) >> 4;
    int maxx = (std::max(X1, std::max(X2, X3)) + 0xF) >> 4;
    int miny = (std::min(Y1, std::min(Y2, Y3)) + 0xF) >> 4;
    int maxy = (std::max(Y1, std::max(Y2, Y3)) + 0xF) >> 4;

    // Half-edge constants
    int C1 = DY12 * X1 - DX12 * Y1;
    int C2 = DY23 * X2 - DX23 * Y2;
    int C3 = DY31 * X3 - DX31 * Y3;

    // Correct for fill convention
    if(DY12 < 0 || (DY12 == 0 && DX12 > 0)) C1++;
    if(DY23 < 0 || (DY23 == 0 && DX23 > 0)) C2++;
    if(DY31 < 0 || (DY31 == 0 && DX31 > 0)) C3++;

    int CY1 = C1 + DX12 * (miny << 4) - DY12 * (minx << 4);
    int CY2 = C2 + DX23 * (miny << 4) - DY23 * (minx << 4);
    int CY3 = C3 + DX31 * (miny << 4) - DY31 * (minx << 4);

    double area = abs(edgeFunction(vertexA, vertexB, vertexC));

    for (int y = miny; y < maxy; y++) {
        if (y < 0 || y >= height) {
            CY1 += FDX12;
            CY2 += FDX23;
            CY3 += FDX31;
            continue;
        }

        int CX1 = CY1;
        int CX2 = CY2;
        int CX3 = CY3;
        for (int x = minx; x < maxx; x++) {
            if (x < 0 || x >= width) {
                CX1 -= FDY12;
                CX2 -= FDY23;
                CX3 -= FDY31;
                continue;
            }

            if(CX1 > 0 && CX2 > 0 && CX3 > 0)
            {
                size_t renderBufferIndex = y * width * 4 + x * 4;
                size_t depthBufferIndex = y * width + x;

                Vector worldCoords = {static_cast<double>(x), static_cast<double>(y), 0};
                screenToWorld(worldCoords, width, height);

                const double wa = abs(edgeFunction(vertexB, vertexC, worldCoords)) / area;
                const double wb = abs(edgeFunction(vertexC, vertexA, worldCoords)) / area;
                const double wc = abs(edgeFunction(vertexA, vertexB, worldCoords)) / area;

                const double z = 1 / (wa * inverseZA + wb * inverseZB + wc * inverseZC);
                double depth = depthBuffer[depthBufferIndex];

                double ws[3] = {wa, wb, wc};
                interpolateVertexAttributes(vertexAttributes, pixelVertexAttributes, ws, z, vertexAttributesSize);

                if (z < depth) {
                    depthBuffer[depthBufferIndex] = z;

                    // calculate x and y of pixel
                    double worldX = (interpolateVertexA[0] * wa + interpolateVertexB[0] * wb + interpolateVertexC[0] * wc) * z;
                    double worldY = (interpolateVertexA[1] * wa + interpolateVertexB[1] * wb + interpolateVertexC[1] * wc) * z;
                    double worldCoords[3] = {worldX, worldY, z};

                    uint8_t *color = renderBuffer + renderBufferIndex;
                    color[3] = 255; // full alpha by default
                    (*shader)(color, worldCoords, faceAttributes, pixelVertexAttributes, globals);
                }
            }

            CX1 -= FDY12;
            CX2 -= FDY23;
            CX3 -= FDY31;
        }

        CY1 += FDX12;
        CY2 += FDX23;
        CY3 += FDX31;
    }

    free(pixelVertexAttributes);
}

void interpolateVertexAttributes(double **faceVertexAttributes, double *pixelVertexAttributes, double *ws, double z, size_t attributesLength) {
    for (size_t element = 0; element < attributesLength; element++) {
        pixelVertexAttributes[element] = 0;
        for (size_t vertex = 0; vertex < 3; vertex++) {
            pixelVertexAttributes[element] += faceVertexAttributes[vertex][element] * ws[vertex];
        }
        pixelVertexAttributes[element] *= z;
    }
}

double edgeFunction(Vector a, Vector b, Vector c) {
    return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

int iround(double value) {
    return static_cast<int>(value + 0.5f - (value < 0.0)); // simple rounding
}

EMSCRIPTEN_KEEPALIVE
void clearRenderBuffer(uintptr_t renderBufferPtr, double color, size_t width, size_t height) {
    double *renderBuffer = reinterpret_cast<double*>(renderBufferPtr);
    size_t i = width * height * 4;

    while (--i) {
        renderBuffer[i] = 0;
    }
}

Bounds calculateBoundingBox(Vector vertexA, Vector vertexB, Vector vertexC, double width, double height) {
    double left = vertexA[0];
    double right = vertexA[0];
    double top = vertexA[1];
    double bottom = vertexA[1];

    if (vertexB[0] < left) {
        left = vertexB[0];
    }

    if (vertexB[0] > right) {
        right = vertexB[0];
    }

    if (vertexC[0] < left) {
        left = vertexC[0];
    }

    if (vertexC[0] > right) {
        right = vertexC[0];
    }

    if (vertexB[1] < top) {
        top = vertexB[1];
    }

    if (vertexB[1] > bottom) {
        bottom = vertexB[1];
    }

    if (vertexC[1] < top) {
        top = vertexC[1];
    }

    if (vertexC[1] > bottom) {
        bottom = vertexC[1];
    }

    top = std::max(top, (double) 0);
    left = std::max(left, (double) 0);
    bottom = std::min(bottom, height);
    right = std::min(right, width);

    return Bounds{static_cast<size_t>(top), static_cast<size_t>(bottom), static_cast<size_t>(left), static_cast<size_t>(right)};
}

// converts world to screen coordinates
void worldToScreen(Vector vertex, size_t width, size_t height) {
    vertex[0] = (vertex[0] + 1) / 2 * width;
    vertex[1] = (vertex[1] + 1) / 2 * height;
}

// converts screen to world coordinates
void screenToWorld(Vector vertex, size_t width, size_t height) {
    vertex[0] = vertex[0] / width * 2 - 1;
    vertex[1] = vertex[1] / height * 2 - 1;
}

int main() {

}

EMSCRIPTEN_BINDINGS(render_module) {
    function("render", &render);
    function("clearRenderBuffer", &clearRenderBuffer);
}