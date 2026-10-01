#include "shaders.h"

void testShader(uint8_t *color, double *position, double *faceAttributes, double *vertexAttributes, double *globals) {
    double textureX = vertexAttributes[0] + 1 / 2;
    double textureY = vertexAttributes[1] + 1 / 2;
    bool checkerboardX = abs(std::fmod(textureX, 1)) > 0.5;
    bool checkerboardY = abs(std::fmod(textureY, 1)) > 0.5;
    bool checkerboard = checkerboardY ^ checkerboardX;

    double lightDirection[3] = {1, -1, 1};
    norm(lightDirection);
    double brightness = (dot(lightDirection, faceAttributes) + 1) / 2;
    brightness = (brightness + 0.4) / 1.4;

    color[0] = checkerboard ? (vertexAttributes[0] + 1) / 2 * 255 : 255;
    color[1] = checkerboard ? (vertexAttributes[1] + 1) / 2 * 255 : 255;
    color[2] = checkerboard ? (vertexAttributes[2] + 1) / 2 * 255 : 255;

    color[0] *= brightness;
    color[1] *= brightness;
    color[2] *= brightness;
}