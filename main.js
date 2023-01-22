'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let point; 
let userPointCoord; 
let userScl;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;
    this.iTextureBuffer = gl.createBuffer();
    this.countText = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (points) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

        this.countText = points.length / 2;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }

    this.DrawPoint = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

function CreateSphereSurface(r = 0.05) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceData(r, lon, lat);
            let v2 = sphereSurfaceData(r, lon+0.1, lat);
            let v3 = sphereSurfaceData(r, lon, lat+0.5);
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            lat += 0.1;
        }
        lat = -Math.PI * 0.5
        lon += 0.5;
    }
    return vertexList;
}

function sphereSurfaceData(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iUserPoint = -1;
    this.iScale = 1.0;
    this.iUP = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform1f(shProgram.iScale, userScl);
    surface.Draw();
    let loc = getFunc(map(userPointCoord.x, 0, 1, 0, Math.PI * 2), map(userPointCoord.y, 0, 1, 0, Math.PI * 2))
    gl.uniform3fv(shProgram.iUP, [loc[0], loc[1], loc[2]])
    gl.uniform1f(shProgram.iScale, -1.0);
    point.DrawPoint();
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function getFunc(t, v) {
    let k = 5;
    let a = 1.5;
    let b = 3;
    let c = 2;
    let d = 4;
    let f = a * b / Math.sqrt(a ** 2 * Math.sin(v) ** 2 + b ** 2 * Math.cos(v) ** 2)
    let x = 0.5 * (f * (1 + Math.cos(t)) + (d ** 2 - c ** 2) * (1 - Math.cos(t)) / f) * Math.cos(v)
    let y = 0.5 * (f * (1 + Math.cos(t)) + (d ** 2 - c ** 2) * (1 - Math.cos(t)) / f) * Math.sin(v)
    let z = 0.5 * (f - (d ** 2 - c ** 2) / f) * Math.sin(t)
    return [x / k, y / k, z / k];
}

function CreateSurfaceData() {
    let vertexList = [];

    let tStep = Math.PI * 5 / 45;
    let vStep = Math.PI * 5 / 45;
    let size = Math.PI * 2


    for (let t = 0; t <= size; t += tStep) {

        for (let v = 0; v <= size; v += vStep) {
            let vA = getFunc(t, v);
            let vB = getFunc(t + tStep, v);
            let vC = getFunc(t, v + vStep);
            let vD = getFunc(t + tStep, v + vStep);
            vertexList = vertexList.concat(vA);
            vertexList = vertexList.concat(vB);
            vertexList = vertexList.concat(vC);

            vertexList = vertexList.concat(vB);
            vertexList = vertexList.concat(vD);
            vertexList = vertexList.concat(vC);
        }
    }
    return vertexList;
}

function CreateTextureData() {
    let vertexList = [];

    let tStep = Math.PI * 5 / 45;
    let vStep = Math.PI * 5 / 45;
    let size = Math.PI * 2
    for (let t = 0; t <= size; t += tStep) {

        for (let v = 0; v <= size; v += vStep) {
            let u1 = map(t, 0, size, 0, 1)
            let v1 = map(v, 0, size, 0, 1)
            vertexList.push(u1,v1)
            u1 = map(t+tStep, 0, size, 0, 1)
            vertexList.push(u1,v1)
            u1 = map(t, 0, size, 0, 1)
            v1 = map(v+vStep, 0, size, 0, 1)
            vertexList.push(u1,v1)
            u1 = map(t+tStep, 0, size, 0, 1)
            v1 = map(v, 0, size, 0, 1)
            vertexList.push(u1,v1)
            v1 = map(v+vStep, 0, size, 0, 1)
            vertexList.push(u1,v1)
            u1 = map(t, 0, size, 0, 1)
            v1 = map(v+vStep, 0, size, 0, 1)
            vertexList.push(u1,v1)
        }
    }
    return vertexList;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');
    shProgram.iScale = gl.getUniformLocation(prog, 'scl');
    shProgram.iUP = gl.getUniformLocation(prog, 'translateUP');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    LoadTexture()
    surface.TextureBufferData(CreateTextureData());
    point = new Model('Point');
    console.log(CreateSphereSurface())
    point.BufferData(CreateSphereSurface())

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    userPointCoord = { x: 0.0, y: 0.0}
    userScl = 1.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://user-images.githubusercontent.com/121056279/213940546-346f9abb-4761-43aa-90f0-6fd57de95307.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}

