#ifndef MAIN_H
#define MAIN_H
#include <iostream>
#include <algorithm>
#include <emscripten/bind.h>
#include <emscripten.h>
typedef double Vector[3];
typedef void (*shader)(uint8_t *color, double *position, double *faceAttributes, double *vertexAttributes, double *globals);
void registerShader(std::string shaderName, shader shaderFunc);
void render(uintptr_t renderBufferPtr, uintptr_t depthBufferPtr, size_t width, size_t height, uintptr_t worldVerticesPtr, uintptr_t transformedVerticesPtr, uintptr_t faceAttributesDoublePtr, size_t numFaceAttributes, uintptr_t vertexAttributesDoublePtr, size_t vertexAttributesSize, uintptr_t globals, std::string shaderName);
#endif