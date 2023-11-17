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

// No lighting
// const vsSource = `
//     attribute vec4 aVertexPosition;
//     uniform mat4 uModelViewMatrix;
//     uniform mat4 uProjectionMatrix;

//     void main() {
//       gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
//     }
// `;

// const fsSource = `
//     void main() {
//       gl_FragColor = vec4(0.8, 0.0, 0.2, 1.0); // Red color
//     }
// `;

// Ambient + Point + Directional Light
const vsSource = `
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

uniform vec3 uAmbientLight; // Ambient light color
uniform vec3 uDirectionalLightColor; // Directional light color
uniform vec3 uDirectionalLightDirection; // Directional light direction

uniform vec3 uPointLightColor; // Point light color
uniform vec3 uPointLightPosition; // Point light position

varying highp vec3 vLighting;
varying highp vec2 vTextureCoord;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

    // Normal transformation
    highp vec3 transformedNormal = normalize(vec3(uNormalMatrix * vec4(aVertexNormal, 0.0)));

    vTextureCoord = aTextureCoord;

    // Ambient light
    highp vec3 ambient = uAmbientLight;

    // Directional light
    highp float directional = max(dot(transformedNormal, uDirectionalLightDirection), 0.2);
    highp vec3 directionalLight = uDirectionalLightColor * directional;

    // Point light
    highp vec3 lightDirection = normalize(uPointLightPosition - vec3(uModelViewMatrix * aVertexPosition));
    highp float pointLightIntensity = max(dot(transformedNormal, lightDirection), 0.2);
    highp vec3 pointLight = uPointLightColor * pointLightIntensity;

    // Combine the lighting components
    vLighting = ambient + directionalLight + pointLight;
}
`;

// gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * vec4(vLighting, 1.0);
// const fsSource = `
// varying highp vec3 vLighting;

// void main() {
//     gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0) * vec4(vLighting, 1.0); // Red color with lighting applied
// }
// `;

// With texture
const fsSource = `
varying highp vec3 vLighting;
varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;
void main() {
    highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
    gl_FragColor = texelColor * vec4(vLighting, 1.0);
}
`;

// Loading and setting up the texture
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then, put a single pixel in the texture so we can
    // use it immediately.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                      srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
           // Yes, it's a power of 2. Generate mips.
           gl.generateMipmap(gl.TEXTURE_2D);
        } else {
           // No, it's not a power of 2. Turn off mips and set
           // wrapping to clamp to edge
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        // octopusParts = assembleOctopus();
        render();
    };
    // image.src = url;
    image.src = url + "?time=" + new Date().getTime(); // Add this line
    // render();
    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

// Example usage
const texture = loadTexture(gl, 'texture.jpg');

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

function setupLightingUniforms() {
    // Set up ambient light
    gl.uniform3f(programInfo.uniformLocations.ambientLight, 0.2, 0.2, 0.2);

    // Set up directional light
    gl.uniform3f(programInfo.uniformLocations.directionalLightColor, 1.0, 1.0, 1.0);
    gl.uniform3f(programInfo.uniformLocations.directionalLightDirection, -0.5, -0.75, -0.5);

    // Set up point light
    gl.uniform3f(programInfo.uniformLocations.pointLightColor, 1.0, 1.0, 1.0);
    gl.uniform3f(programInfo.uniformLocations.pointLightPosition, 5.0, 5.0, 5.0);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
}

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        ambientLight: gl.getUniformLocation(shaderProgram, 'uAmbientLight'),
        directionalLightColor: gl.getUniformLocation(shaderProgram, 'uDirectionalLightColor'),
        directionalLightDirection: gl.getUniformLocation(shaderProgram, 'uDirectionalLightDirection'),
        pointLightColor: gl.getUniformLocation(shaderProgram, 'uPointLightColor'),
        pointLightPosition: gl.getUniformLocation(shaderProgram, 'uPointLightPosition'),
    },
};

setupLightingUniforms();

// Function to initialize buffers for a given geometry
function initBuffers(gl, geometry) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.vertices), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.textureCoordinates), gl.STATIC_DRAW);

    return {
        vertex: vertexBuffer,
        indices: indexBuffer,
        vertexCount: geometry.indices.length,
        textureCoord: textureCoordBuffer
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
    // Texture coordinates for each vertex
    const textureCoordinates = [
        // Front face
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // Back face
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // Top face
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // Bottom face
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // Right face
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // Left face
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
    ];
    return {
        vertices: vertices,
        normals: normals,
        indices: indices,
        textureCoordinates: textureCoordinates
    };
}

const bodyRotationSlider = document.getElementById('bodyRotation');
var bodyRotationAngle = 0; // Initial angle in degrees
bodyRotationSlider.addEventListener('input', function() {
    bodyRotationAngle = parseFloat(this.value);
    // console.log(bodyRotationAngle);
    octopusParts = assembleOctopus();
    render(); // Update the scene with the new rotation
});

function assembleOctopus() {
    var octopusParts = [];

    var headSize = 4.0;
    var head = {
        geometry: createRectangularPrism(headSize, headSize, headSize),
        transform: glMatrix.mat4.create(),
        child: null, // Will be set to the first tentacle
        sibling: null
    };

    // First, apply translation to move the head to its correct position
    var headTranslationY = -headSize / 2; // Adjust this as needed
    glMatrix.mat4.translate(head.transform, head.transform, [0, headTranslationY, 0]);

    // Then, rotate the head around the Y-axis
    // console.log(bodyRotationAngle);
    glMatrix.mat4.rotateY(head.transform, head.transform, glMatrix.glMatrix.toRadian(bodyRotationAngle));

    // Add other transformations here if needed

    head.buffers = initBuffers(gl, head.geometry);
    octopusParts.push(head);

    // Tentacle parameters
    var tentacleBaseLength = 5.0;
    var tentacleMidLength = 5.0;
    var tentacleTipLength = 5.0;
    var tentacleBaseWidth = 0.4;
    var tentacleMidWidth = 0.3;
    var tentacleTipWidth = 0.2;
    var numberOfTentacles = 8;
    var distanceFromCenter = headSize / 2;

    var lastTentacleBase = null;
    var angleStep = (2 * Math.PI / numberOfTentacles);

    for (var i = 0; i < numberOfTentacles; i++) {
        var angle = angleStep * i;

        // Adjust the tentacle's position to be underneath the head
        var x = distanceFromCenter * Math.cos(angle);
        var y = - headSize ; // Position at the bottom of the head
        var z = distanceFromCenter * Math.sin(angle);

        // Use angles for tentacle joints
        var baseAngle = tentacleJointAngles[i].base;
        var midAngle = tentacleJointAngles[i].mid;
        var tipAngle = tentacleJointAngles[i].tip;

        // Create base of the tentacle with adjusted position and rotation
        var tentacleBase = {
            geometry: createRectangularPrism(tentacleBaseWidth, tentacleBaseLength, tentacleBaseWidth),
            transform: glMatrix.mat4.create(),
            child: null, // Will be set to the mid segment
            sibling: null
        };
        glMatrix.mat4.translate(tentacleBase.transform, tentacleBase.transform, [x, y, z]);
        glMatrix.mat4.translate(tentacleBase.transform, tentacleBase.transform, [0, tentacleBaseLength / 2, 0]);
        glMatrix.mat4.rotate(tentacleBase.transform, tentacleBase.transform, glMatrix.glMatrix.toRadian(baseAngle), [0, 0, 1]);
        glMatrix.mat4.translate(tentacleBase.transform, tentacleBase.transform, [0, -tentacleBaseLength / 2, 0]);
        
        // glMatrix.mat4.rotate(tentacleBase.transform, tentacleBase.transform, glMatrix.glMatrix.toRadian(baseAngle), [0, 0, 1]);
        tentacleBase.buffers = initBuffers(gl, tentacleBase.geometry);

        // Create mid segment of the tentacle
        var tentacleMid = {
            geometry: createRectangularPrism(tentacleMidWidth, tentacleMidLength, tentacleMidWidth),
            transform: glMatrix.mat4.create(), // Start with an identity matrix
            child: null,
            sibling: null
        };
        // Position the mid segment at the end of the base segment
        glMatrix.mat4.translate(tentacleMid.transform, tentacleMid.transform, [0, -tentacleBaseLength, 0]);
        glMatrix.mat4.translate(tentacleMid.transform, tentacleMid.transform, [0, tentacleMidLength / 2, 0]);
        glMatrix.mat4.rotate(tentacleMid.transform, tentacleMid.transform, glMatrix.glMatrix.toRadian(midAngle), [0, 0, 1]);
        glMatrix.mat4.translate(tentacleMid.transform, tentacleMid.transform, [0, -tentacleMidLength / 2, 0]);

        tentacleMid.buffers = initBuffers(gl, tentacleMid.geometry);
    
        // Create tip segment of the tentacle
        var tentacleTip = {
            geometry: createRectangularPrism(tentacleTipWidth, tentacleTipLength, tentacleTipWidth),
            transform: glMatrix.mat4.create(), // Start with an identity matrix
            child: null,
            sibling: null
        };
        // Position the tip segment at the end of the mid segment
        glMatrix.mat4.translate(tentacleTip.transform, tentacleTip.transform, [0, -tentacleMidLength, 0]);
        glMatrix.mat4.translate(tentacleTip.transform, tentacleTip.transform, [0, tentacleTipLength / 2, 0]);
        glMatrix.mat4.rotate(tentacleTip.transform, tentacleTip.transform, glMatrix.glMatrix.toRadian(tipAngle), [0, 0, 1]);
        glMatrix.mat4.translate(tentacleTip.transform, tentacleTip.transform, [0, -tentacleTipLength / 2, 0]);        
        
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
var octopusParts = assembleOctopus();

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

    // Bind the texture coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

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

// Loop through each tentacle
for (let i = 1; i <= 8; i++) {
    // Attach event listener to each joint of the tentacle
    ['base', 'mid', 'tip'].forEach(joint => {
        const controlID = `tentacle${i}${joint.charAt(0).toUpperCase() + joint.slice(1)}`;
        const control = document.getElementById(controlID);
        if (control) {
            control.addEventListener('input', function() {
                updateTentacleAngle(i, joint, parseFloat(this.value));
            });
        }
    });
}

// ... Add event listeners for other tentacle controls ...

function updateTentacleAngle(tentacleNumber, joint, angle) {
    // Update the angle for the specified tentacle joint
    tentacleJointAngles[tentacleNumber - 1][joint] = parseFloat(angle);
    // Reassemble the octopus with updated angles
    octopusParts = assembleOctopus();
    render();
}

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

// Camera control
const cameraAngle = document.getElementById('cameraAngle');
cameraAngle.addEventListener('input', function() {
    // Update the camera angle based on slider value
    // Replace 'updateCameraAngle' with your function to update the camera
    updateCameraAngle(this.value);
});

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

// ... Rest of your WebGL rendering and animation logic ...

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programInfo.program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // Set up the light uniforms
    setupLightingUniforms();

    // Combine the updated projection and view matrix
    glMatrix.mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    // Start the traversal from the head with an identity matrix
    var identityMatrix = glMatrix.mat4.create();
    traverseAndDraw(octopusParts[0], identityMatrix);

    if (isAnimating) {
        updateAnimation();
        requestAnimationFrame(render); // Continue the animation loop
    }
}

let keyframes = [];
let currentKeyframe = { timestamp: 0, angles: deepCopy(tentacleJointAngles) };

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function saveKeyframe() {
    let currentAngles = [];
    for (let i = 0; i < 8; i++) {
        currentAngles.push({ ...tentacleJointAngles[i] });
    }
    keyframes.push({ timestamp: Date.now(), jointAngles: currentAngles });
}

let isAnimating = false;
let animationStartTime = null;

function saveCurrentAnimation() {
    const animationData = JSON.stringify(keyframes);
    const blob = new Blob([animationData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Animation saved!');
}

document.getElementById('recordKeyframe').addEventListener('click', recordCurrentKeyframe);
document.getElementById('playAnimation').addEventListener('click', playAnimation);
document.getElementById('stopAnimation').addEventListener('click', stopAnimation);
document.getElementById('saveAnimation').addEventListener('click', saveCurrentAnimation);
document.getElementById('loadAnimation').addEventListener('click', loadAnimationFromFile);
document.getElementById('fileInput').addEventListener('change', loadAnimation);

function recordCurrentKeyframe() {
    keyframes.push({ timestamp: Date.now(), angles: deepCopy(tentacleJointAngles) });
    alert('Keyframe recorded');
}

function loadAnimationFromFile() {
    document.getElementById('fileInput').click();
}

function loadAnimation() {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let loadedKeyframes = JSON.parse(e.target.result);
                // Perform validation on loadedKeyframes if necessary
                keyframes = loadedKeyframes;
                alert('Animation loaded!');
            } catch (error) {
                alert('Failed to load animation: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

function playAnimation() {
    if (keyframes.length > 1) {
        isAnimating = true;
        animationStartTime = Date.now();
        render();  // Start the rendering loop
    } else {
        alert('Not enough keyframes to play animation.');
    }
}

function stopAnimation() {
    isAnimating = false;
    animationStartTime = null;
    render();
}

function interpolateAngle(startAngle, endAngle, factor) {
    return startAngle + (endAngle - startAngle) * factor;
}

let animationSpeed = 5; // Speed factor; 2 means twice as fast

// function updateAnimation() {
//     if (!isAnimating) return;

//     let currentTime = Date.now();
//     let elapsedTime = (currentTime - animationStartTime) * animationSpeed; // Speed up the animation

//     // Map elapsedTime to keyframes timeline
//     let totalAnimationDuration = keyframes[keyframes.length - 1].timestamp - keyframes[0].timestamp;
//     let animationProgressTime = (elapsedTime % totalAnimationDuration) + keyframes[0].timestamp;

//     interpolateKeyframes(animationProgressTime);

//     // Reassemble the octopus parts with the new joint angles
//     octopusParts = assembleOctopus();
// }

// function interpolateKeyframes(timestamp) {
//     // Find the two keyframes surrounding the current timestamp
//     let prevKeyframe = null;
//     let nextKeyframe = null;
//     for (let keyframe of keyframes) {
//         if (keyframe.timestamp <= timestamp) prevKeyframe = keyframe;
//         if (keyframe.timestamp >= timestamp && !nextKeyframe) nextKeyframe = keyframe;
//         if (prevKeyframe && nextKeyframe) break;
//     }

//     if (!prevKeyframe || !nextKeyframe) return; // No interpolation if keyframes are not set

//     // Calculate interpolation factor
//     let factor = (timestamp - prevKeyframe.timestamp) / (nextKeyframe.timestamp - prevKeyframe.timestamp);

//     // Interpolate each joint angle
//     for (let i = 0; i < tentacleJointAngles.length; i++) {
//         for (let joint of ['base', 'mid', 'tip']) {
//             tentacleJointAngles[i][joint] = interpolateAngle(prevKeyframe.angles[i][joint], nextKeyframe.angles[i][joint], factor);
//         }
//     }
// }

function updateAnimation() {
    if (!isAnimating || keyframes.length < 2) return;

    let currentTime = Date.now();
    let elapsedTime = (currentTime - animationStartTime) * animationSpeed; // Speed up the animation

    // Uniform duration for each keyframe
    let uniformKeyframeDuration = (keyframes[keyframes.length - 1].timestamp - keyframes[0].timestamp) / (keyframes.length - 1);

    // Determine the current position in the animation cycle
    let animationCycleTime = elapsedTime % (uniformKeyframeDuration * (keyframes.length - 1));
    
    // Determine the current keyframe index
    let keyframeIndex = Math.floor(animationCycleTime / uniformKeyframeDuration);
    keyframeIndex = Math.min(keyframeIndex, keyframes.length - 2); // Ensure index is within bounds

    // Calculate the interpolation factor between the current and next keyframe
    let factor = (animationCycleTime % uniformKeyframeDuration) / uniformKeyframeDuration;

    // Interpolate between the current keyframe and the next
    interpolateKeyframes(factor, keyframes[keyframeIndex], keyframes[keyframeIndex + 1]);

    // Reassemble the octopus parts with the new joint angles
    octopusParts = assembleOctopus();
}

function interpolateKeyframes(factor, keyframe1, keyframe2) {
    // Interpolate each joint angle using the factor
    for (let i = 0; i < tentacleJointAngles.length; i++) {
        for (let joint of ['base', 'mid', 'tip']) {
            tentacleJointAngles[i][joint] = interpolateAngle(keyframe1.angles[i][joint], keyframe2.angles[i][joint], factor);
        }
    }
}

octopusParts = assembleOctopus();
render();

