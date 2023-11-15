// Get the canvas element and its WebGL context
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

// If we don't have a GL context, give up now
if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    throw new Error('WebGL not supported');
}

// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);

// More code will go here for shaders, buffers, etc.
const vsSource = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

const fsSource = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // White color
    }
`;

// Define the shaders
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

// Collect all the info needed to use the shader program.
// Look up which attributes our shader program is using.
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    },
};

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // Check if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    // Check for linking errors
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader program failed to link: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    console.log("Shader program linked successfully");
    // After linking, validate the program
    gl.validateProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
        console.error('Error validating shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function initBuffers(gl, geometry) {
    // Create a buffer for the geometry's vertices
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.vertices), gl.STATIC_DRAW);

    // Create a buffer for the indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

    // Create a buffer for the normals
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        vertexCount: geometry.indices.length
    };
}

function createRectangularPrism(width, height, depth) {
    // Each face of the prism is defined by four vertices (corners),
    // and each vertex needs to be defined only once.
    const vertices = [
        // Front face
        -width / 2, -height / 2,  depth / 2,  // Bottom left
         width / 2, -height / 2,  depth / 2,  // Bottom right
         width / 2,  height / 2,  depth / 2,  // Top right
        -width / 2,  height / 2,  depth / 2,  // Top left

        // Back face
        -width / 2, -height / 2, -depth / 2,  // Bottom left
         width / 2, -height / 2, -depth / 2,  // Bottom right
         width / 2,  height / 2, -depth / 2,  // Top right
        -width / 2,  height / 2, -depth / 2,  // Top left
    ];

    // Each face is made of two triangles, each triangle is made of three vertices,
    // and each vertex is referenced by an index.
    const indices = [
        // Front face
        0, 1, 2,   0, 2, 3,
        // Back face
        4, 5, 6,   4, 6, 7,
        // Top face
        3, 2, 6,   3, 6, 7,
        // Bottom face
        0, 1, 5,   0, 5, 4,
        // Right face
        1, 2, 6,   1, 6, 5,
        // Left face
        0, 3, 7,   0, 7, 4
    ];

    // Normals for each vertex. For simplicity, normals are directly aligned with axes.
    const normals = [
        // Front
        0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
        // Back
        0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
        // Top
        0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
        // Bottom
        0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
        // Right
        1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
        // Left
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ];

    return {
        vertices: vertices,
        normals: normals,
        indices: indices
    };
}

function assembleOctopus() {

    var octopusParts = [];

    // Create the head (relatively large for visibility)
    var headSize = 2.0; 
    var head = createRectangularPrism(headSize, headSize, headSize);
    head.transform = glMatrix.mat4.create(); // Identity matrix for the head
    octopusParts.push({ geometry: head, transform: head.transform });

    // Tentacle parameters (proportional to the head)
    var tentacleLength = 3.0; // Longer tentacles
    var tentacleWidth = 0.2; // Slightly thinner tentacles
    var numberOfTentacles = 8;
    var jointsPerTentacle = 3;

    // Create and position tentacles
    for (var i = 0; i < numberOfTentacles; i++) {
        var tentacle = [];

        for (var j = 0; j < jointsPerTentacle; j++) {
            var joint = createRectangularPrism(tentacleWidth, tentacleLength, tentacleWidth);
            joint.transform = glMatrix.mat4.create();

            // Position each joint relative to the previous joint
            if (j > 0) {
                glMatrix.mat4.translate(joint.transform, joint.transform, [0, tentacleLength, 0]);
            }

            tentacle.push({ geometry: joint, transform: joint.transform });
        }

        // Calculate initial position and orientation of each tentacle
        var angle = (2 * Math.PI / numberOfTentacles) * i;
        var distanceFromCenter = headSize / 2 + tentacleLength / 2;
        var x = distanceFromCenter * Math.cos(angle);
        var y = distanceFromCenter * Math.sin(angle);
        var z = 0;

        glMatrix.mat4.translate(tentacle[0].transform, tentacle[0].transform, [x, y, z]);
        glMatrix.mat4.rotate(tentacle[0].transform, tentacle[0].transform, angle, [0, 0, 1]);

        // Add the tentacle to the octopus
        octopusParts.push(tentacle);
    }

    return octopusParts;
}

function drawOctopus(gl, programInfo, octopusParts, viewProjectionMatrix) {
    octopusParts.forEach(part => {
        if (Array.isArray(part)) {
            part.forEach(segment => {
                drawGeometry(gl, programInfo, segment.buffers, segment.transform, viewProjectionMatrix);
            });
        } else {
            drawGeometry(gl, programInfo, part.buffers, part.transform, viewProjectionMatrix);
        }
    });
}

function drawGeometry(gl, programInfo, buffers, modelMatrix, viewProjectionMatrix) {
    gl.useProgram(programInfo.program);
    // Bind the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3, // number of components per vertex attribute (x, y, z)
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Bind the normal buffer if you are using lighting
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexNormal,
        3, // number of components per normal attribute (x, y, z)
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    // Apply the model matrix (transformations) to the geometry
    var modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.multiply(modelViewMatrix, viewProjectionMatrix, modelMatrix);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );

    // Bind the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Draw the geometry
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = glMatrix.mat4.create();

    // Note: glmatrix.js always has the first argument as the destination to receive the result.
    glMatrix.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is the center of the scene.
    const modelViewMatrix = glMatrix.mat4.create();

    // Move the drawing position a bit to where we want to start drawing the square.
    glMatrix.mat4.translate(modelViewMatrix,     // destination matrix
                   modelViewMatrix,     // matrix to translate
                   [-0.0, 0.0, -6.0]);  // amount to translate

    // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
    {
        const numComponents = 3;  // pull out 3 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
                                  // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

const octopusParts = assembleOctopus();

octopusParts.forEach(part => {
    if (Array.isArray(part)) {
        part.forEach(segment => {
            segment.buffers = initBuffers(gl, segment.geometry);
        });
    } else {
        part.buffers = initBuffers(gl, part.geometry);
    }
});

// // Create view projection matrix
// const viewProjectionMatrix = glMatrix.mat4.create();
// glMatrix.mat4.perspective(viewProjectionMatrix, 45 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0);
// glMatrix.mat4.translate(viewProjectionMatrix, viewProjectionMatrix, [0, 0, -6]); // Adjust camera position as needed

// Create view projection matrix
const viewProjectionMatrix = glMatrix.mat4.create();

// Define the field of view, aspect ratio, near and far clipping planes
const fieldOfView = 45 * Math.PI / 180;   // in radians
const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
const zNear = 0.1;
const zFar = 100.0;

glMatrix.mat4.perspective(viewProjectionMatrix, fieldOfView, aspect, zNear, zFar);

// Position the camera
const cameraPosition = [0, 0, 10]; // Move the camera back 10 units
const lookAtPoint = [0, 0, 0]; // Look at the center of the scene
const upDirection = [0, 1, 0]; // "Up" direction in 3D space

glMatrix.mat4.lookAt(viewProjectionMatrix, cameraPosition, lookAtPoint, upDirection);

// Example render loop or main drawing function
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawOctopus(gl, programInfo, octopusParts, viewProjectionMatrix);
    // ... any additional rendering code
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error('WebGL Error:', error);
    }
}

render();
// const buffers = initBuffers(gl);
// drawScene(gl, programInfo, buffers);

// function initTriangleBuffers(gl) {
//     const vertices = new Float32Array([
//         0.0,  1.0,  0.0,  // Vertex 1 (X, Y, Z)
//        -1.0, -1.0,  0.0,  // Vertex 2
//         1.0, -1.0,  0.0   // Vertex 3
//     ]);

//     const vertexBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
//     gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

//     return {
//         vertex: vertexBuffer,
//         vertexCount: 3
//     };
// }
// function drawTriangle(gl, programInfo, buffers) {
//     gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black
//     gl.clearDepth(1.0);                 // Clear everything
//     gl.enable(gl.DEPTH_TEST);           // Enable depth testing
//     gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//     gl.useProgram(programInfo.program);

//     // Set up the vertex buffer
//     gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
//     gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
//     gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

//     // Create a perspective matrix
//     const projectionMatrix = glMatrix.mat4.create();
//     glMatrix.mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100.0);

//     // Set the drawing position to the "identity" point
//     const modelViewMatrix = glMatrix.mat4.create();
//     glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]); // Move back 6 units

//     // Set the shader uniforms
//     gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
//     gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

//     // Draw the triangle
//     gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);
// }
// const triangleBuffers = initTriangleBuffers(gl);
// drawTriangle(gl, programInfo, triangleBuffers);
