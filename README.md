# 3D Software Renderer

## Running

```
git clone https://github.com/Blank2275/3DSoftwareRenderer/
cd 3DSoftwareRenderer/SoftwareRenderer
bun i
bun dev
```

## What is it?
It is my attempt at replicating (at least part of) the 3d graphics pipeline purely on the cpu, it is not meant for practical use, it is far too slow, it is primarily to help me learn and for fun. It features an alternate renderer written in webassembly for increased performance.

## Resources/Credit
- I relied heavily on [scratchapixel](scratchapixel.com) to learn how to do perspective division, rasterization, and vertex attributes
- - [rasterization](https://www.scratchapixel.com/lessons/3d-basic-rendering/rasterization-practical-implementation/perspective-correct-interpolation-vertex-attributes.html)
  - [perspective projection matrix](https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/building-basic-perspective-projection-matrix.html)
- I used [wikipedia rotation matrices](https://en.wikipedia.org/wiki/Rotation_matrix) to find rotation matrices  
- I recommend [wikipedia barycentric coordinates](https://en.wikipedia.org/wiki/Barycentric_coordinate_system) 
- The current version of Rasterizer class triangleContains is written by claude
  

## Images
Basic Triangle
<img width="1709" alt="Screenshot 2025-01-26 at 11 15 57 AM" src="https://github.com/user-attachments/assets/52ca7f14-9235-47c6-9105-8bde3b624736" />
Cube with point lighting
<img width="1470" height="956" alt="Screenshot 2026-02-24 at 12 40 18 PM" src="https://github.com/user-attachments/assets/693d307a-1d31-49dc-81c4-e262861f1f86" />
