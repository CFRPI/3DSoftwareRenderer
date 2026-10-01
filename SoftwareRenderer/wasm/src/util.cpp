#include <math.h>
#include "util.h"

void add(double *a, double *b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
}

void sub(double *a, double *b) {
    a[0] -= b[0];
    a[1] -= b[1];
    a[2] -= b[2];
}

void mul(double *a, double *b) {
    a[0] *= b[0];
    a[1] *= b[1];
    a[2] *= b[2];
}

void div(double *a, double *b) {
    a[0] /= b[0];
    a[1] /= b[1];
    a[2] /= b[2];
}

void addS(double *a, double s) {
    a[0] += s;
    a[1] += s;
    a[2] += s;
}

void subS(double *a, double s) {
    a[0] -= s;
    a[1] -= s;
    a[2] -= s;
}

void mulS(double *a, double s) {
    a[0] *= s;
    a[1] *= s;
    a[2] *= s;
}

void divS(double *a, double s) {
    a[0] /= s;
    a[1] /= s;
    a[2] /= s;
}

double magnitude(double *vec) {
    return sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}

void norm(double *vec) {
    divS(vec, magnitude(vec));
}

double dot(double *a, double *b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}