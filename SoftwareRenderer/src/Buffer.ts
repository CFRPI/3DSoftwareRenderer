
export class Float64Buffer {
    width: number;
    height: number;
    dims: number;
    values: Float64Array;

    constructor(width: number, height: number, dims: number) {
        this.width = width;
        this.height = height;
        this.dims = dims;
        this.values = new Float64Array(width * height * dims);
    }

    /*
    Returns the index for the first dim at the given coordinate
     */
    indexForElement(x: number, y: number) {
        return y * this.width * this.dims + x * this.dims;
    }

    /*
    Sets the value at a given coordinate to a Float64Array
     */
    setElement(x: number, y: number, vals: Float64Array) {
        let startIndex = this.indexForElement(x, y);

        for (let i = 0; i < this.dims; i++) {
            this.values[startIndex + i] = vals[i]
        }
    }

    setSingleElement(x: number, y: number, val: number) {
        this.values[y * this.width + x] = val;
    }

    /*
    Gets the value at a given coordinate as a Float64Array
     */
    getElement(x: number, y: number, output: Float64Array) {
        let startIndex = this.indexForElement(x, y);

        for (let i = 0; i < this.dims; i++) {
            output[i] = this.values[startIndex + i];
        }
    }

    getSingleElement(x: number, y: number, output: Float64Array) {
        output[0] = this.values[y * this.width + x];
    }

    /*
    Clears all elements of the buffer to a value
     */
    clear(to: number) {
        let i = this.values.length - 1;
        this.values[0] = to;
        while (--i) {
            this.values[i] = to;
        }
    }
}
export class Buffer {
    width: number;
    height: number;
    dims: number;
    values: Uint8ClampedArray; // [colors][columns][rows]

    constructor(width: number, height: number, dims: number) {
        this.width = width;
        this.height = height;
        this.dims = dims;
        this.values = new Uint8ClampedArray(width * height * dims);
    }

    /*
    Returns the index for the first dim at the given coordinate
     */
    indexForElement(x: number, y: number) {
        return y * this.width * this.dims + x * this.dims;
    }

    /*
    Sets the value at a given coordinate to a Float64Array
     */
    setElement(x: number, y: number, vals: Uint8ClampedArray) {
        let startIndex = this.indexForElement(x, y);

        for (let i = 0; i < this.dims; i++) {
            this.values[startIndex + i] = vals[i]
        }
    }

    setSingleElement(x: number, y: number, val: number) {
        this.values[y * this.width + x] = val;
    }

    /*
    Gets the value at a given coordinate as a Float64Array
     */
    getElement(x: number, y: number, output: Uint8ClampedArray) {
        let startIndex = this.indexForElement(x, y);

        for (let i = 0; i < this.dims; i++) {
            output[i] = this.values[startIndex + i];
        }
    }

    getSingleElement(x: number, y: number, output: Uint8ClampedArray) {
        output[0] = this.values[y * this.width + x];
    }

    /*
    Clears all elements of the buffer to a value
     */
    clear(to: number) {
        let i = this.values.length - 1;
        this.values[0] = to;
        while (--i) {
            this.values[i] = to;
        }
    }
}