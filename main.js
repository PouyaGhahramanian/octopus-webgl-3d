// Get the canvas element and its WebGL context
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

// If we don't have a GL context, give up now
if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    throw new Error('WebGL not supported');
}

// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 0.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);

// Define joint angles for each tentacle, assuming 8 tentacles with 3 joints each
var tentacleJointAngles = Array(8).fill(null).map(() => ({ base: 0, mid: 0, tip: 0 }));

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
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
    }
`;

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

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

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

// Function to initialize buffers for a given geometry
function initBuffers(gl, geometry) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.vertices), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        indices: indexBuffer,
        vertexCount: geometry.indices.length
    };
}

function createCube(size) {
    var halfSize = size / 2;
    const vertices = [
        // Front face
        -halfSize, -halfSize,  halfSize,
         halfSize, -halfSize,  halfSize,
         halfSize,  halfSize,  halfSize,
        -halfSize,  halfSize,  halfSize,

        // Back face
        -halfSize, -halfSize, -halfSize,
        -halfSize,  halfSize, -halfSize,
         halfSize,  halfSize, -halfSize,
         halfSize, -halfSize, -halfSize,

        // Top face
        -halfSize,  halfSize, -halfSize,
        -halfSize,  halfSize,  halfSize,
         halfSize,  halfSize,  halfSize,
         halfSize,  halfSize, -halfSize,

        // Bottom face
        -halfSize, -halfSize, -halfSize,
         halfSize, -halfSize, -halfSize,
         halfSize, -halfSize,  halfSize,
        -halfSize, -halfSize,  halfSize,

        // Right face
         halfSize, -halfSize, -halfSize,
         halfSize,  halfSize, -halfSize,
         halfSize,  halfSize,  halfSize,
         halfSize, -halfSize,  halfSize,

        // Left face
        -halfSize, -halfSize, -halfSize,
        -halfSize, -halfSize,  halfSize,
        -halfSize,  halfSize,  halfSize,
        -halfSize,  halfSize, -halfSize,
    ];

    const indices = [
        0, 1, 2,      0, 2, 3,    // front
        4, 5, 6,      4, 6, 7,    // back
        8, 9, 10,     8, 10, 11,  // top
        12, 13, 14,   12, 14, 15, // bottom
        16, 17, 18,   16, 18, 19, // right
        20, 21, 22,   20, 22, 23, // left
    ];

    return {
        vertices: vertices,
        indices: indices
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

    // Create the head
    var headSize = 4.0;
    var head = {
        geometry: createRectangularPrism(headSize, headSize, headSize),
        transform: glMatrix.mat4.create(),
        child: null, // Will be set to the first tentacle
        sibling: null
    };
    head.buffers = initBuffers(gl, head.geometry);
    octopusParts.push(head);

    // Tentacle parameters
    var tentacleBaseLength = 5.0;
    var tentacleMidLength = 5.0;
    var tentacleTipLength = 5.0;
    var tentacleWidth = 0.2;
    var numberOfTentacles = 8;
    var distanceFromCenter = headSize /2;

    var lastTentacleBase = null;
    var angleStep = (2 * Math.PI / numberOfTentacles);

    for (var i = 0; i < numberOfTentacles; i++) {
        var angle = angleStep * i;

        // Adjust the tentacle's position to be underneath the head
        var x = distanceFromCenter * Math.cos(angle);
        var y = - headSize / 2 ; // Position at the bottom of the head
        var z = distanceFromCenter * Math.sin(angle);

        // Create base of the tentacle with adjusted position and rotation
        var tentacleBase = {
            geometry: createRectangularPrism(tentacleWidth, tentacleBaseLength, tentacleWidth),
            transform: glMatrix.mat4.create(),
            child: null, // Will be set to the mid segment
            sibling: null
        };
        glMatrix.mat4.translate(tentacleBase.transform, tentacleBase.transform, [x, y, z]);
        glMatrix.mat4.rotate(tentacleBase.transform, tentacleBase.transform, angle, [0, 1, 0]);
        tentacleBase.buffers = initBuffers(gl, tentacleBase.geometry);

        // Create mid segment of the tentacle
        var tentacleMid = {
            geometry: createRectangularPrism(tentacleWidth, tentacleMidLength, tentacleWidth),
            transform: glMatrix.mat4.create(), // Start with an identity matrix
            child: null,
            sibling: null
        };
        // Position the mid segment at the end of the base segment
        glMatrix.mat4.translate(tentacleMid.transform, tentacleMid.transform, [0, -tentacleBaseLength, 0]);
        tentacleMid.buffers = initBuffers(gl, tentacleMid.geometry);
    
        // Create tip segment of the tentacle
        var tentacleTip = {
            geometry: createRectangularPrism(tentacleWidth, tentacleTipLength, tentacleWidth),
            transform: glMatrix.mat4.create(), // Start with an identity matrix
            child: null,
            sibling: null
        };
        // Position the tip segment at the end of the mid segment
        glMatrix.mat4.translate(tentacleTip.transform, tentacleTip.transform, [0, -tentacleMidLength, 0]);
        tentacleTip.buffers = initBuffers(gl, tentacleTip.geometry);

        // Set child references to create the hierarchy
        tentacleBase.child = tentacleMid;
        tentacleMid.child = tentacleTip;

        // Linking the tentacle base in the sibling chain
        if (lastTentacleBase) {
            lastTentacleBase.sibling = tentacleBase;
        } else {
            head.child = tentacleBase;
        }
        lastTentacleBase = tentacleBase;
    }

    return octopusParts;
}

// Initialize octopus parts
const octopusParts = assembleOctopus();

// Initialize buffers for each part of the octopus
octopusParts.forEach(part => {
    if (Array.isArray(part)) {
        part.forEach(segment => {
            segment.buffers = initBuffers(gl, segment.geometry);
        });
    } else {
        part.buffers = initBuffers(gl, part.geometry);
    }
});

function traverseAndDraw(part, parentTransform) {
    if (!part) return;

    // Combine the parent transform with the current part's transform
    var combinedTransform = glMatrix.mat4.create();
    glMatrix.mat4.multiply(combinedTransform, parentTransform, part.transform);

    // Draw the current part with the combined transform
    drawPart(gl, programInfo, part.buffers, combinedTransform);

    // Recursively draw the child with the updated transform
    traverseAndDraw(part.child, combinedTransform);

    // Siblings maintain the parent's transform
    traverseAndDraw(part.sibling, parentTransform);
}

function drawPart(gl, programInfo, buffers, transformMatrix) {
    // Bind the appropriate buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3, // number of components per vertex attribute
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Create a model view matrix from the provided transform matrix
    const modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.multiply(modelViewMatrix, viewProjectionMatrix, transformMatrix);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        viewProjectionMatrix
    );

    // Draw the part
    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

const tentacle1Base = document.getElementById('tentacle1Base');
tentacle1Base.addEventListener('input', function() {
    // Update the tentacle joint angle based on slider value
    // Replace 'updateTentacleAngle' with your function to update the model
    updateTentacleAngle(1, 'base', this.value);
});

// ... Add event listeners for other tentacle controls ...

function updateCameraAngle(angle) {
    // Convert angle to radians
    var radAngle = angle * Math.PI / 180;

    // Update the camera position to rotate around the Y-axis
    var distance = Math.sqrt(cameraPosition[0] * cameraPosition[0] + cameraPosition[2] * cameraPosition[2]);
    cameraPosition[0] = distance * Math.sin(radAngle);
    cameraPosition[2] = -distance * Math.cos(radAngle);

    // Update the view matrix
    glMatrix.mat4.lookAt(viewMatrix, cameraPosition, lookAtPoint, upDirection);

    // Update viewProjectionMatrix in the render loop
    render();
}

function updateTentacleAngle(tentacleNumber, joint, angle) {
    // Update the angle for the specified tentacle joint
    tentacleJointAngles[tentacleNumber - 1][joint] = parseFloat(angle);

    // Reassemble the octopus with updated angles
    octopusParts = assembleOctopus();
    render();
}


// Camera control
const cameraAngle = document.getElementById('cameraAngle');
cameraAngle.addEventListener('input', function() {
    // Update the camera angle based on slider value
    // Replace 'updateCameraAngle' with your function to update the camera
    updateCameraAngle(this.value);
});

// ... Rest of your WebGL rendering and animation logic ...

function updateTentacleAngle(tentacleNumber, joint, angle) {
    // Implement logic to update the specific tentacle joint angle
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programInfo.program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Combine the updated projection and view matrix
    glMatrix.mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    // Start the traversal from the head with an identity matrix
    var identityMatrix = glMatrix.mat4.create();
    traverseAndDraw(octopusParts[0], identityMatrix);

    requestAnimationFrame(render);
}

// Initialize camera position
var cameraPosition = [0, 0, -10];
var lookAtPoint = [0, 0, 0];
var upDirection = [0, 1, 0];

var viewMatrix = glMatrix.mat4.create();
glMatrix.mat4.lookAt(viewMatrix, cameraPosition, lookAtPoint, upDirection);

// Initialize projection matrix
var fieldOfView = 45 * Math.PI / 180; // in radians
var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
var zNear = 0.1;
var zFar = 100.0;
var projectionMatrix = glMatrix.mat4.create();
glMatrix.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

// Initialize viewProjectionMatrix
var viewProjectionMatrix = glMatrix.mat4.create();
glMatrix.mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
gl.viewport(0, 0, canvas.width, canvas.height)

render();

