import * as THREE from 'three';
import { Capsule } from 'https://unpkg.com/three@0.171.0/examples/jsm/math/Capsule.js';
import { Octree } from 'https://unpkg.com/three@0.171.0/examples/jsm/math/Octree.js';
import { OrbitControls } from 'https://unpkg.com/three@0.171.0/examples/jsm/controls/OrbitControls.js';
// import { PointerLockControls } from 'https://unpkg.com/three@0.171.0/examples/jsm/controls/PointerLockControls.js';


// Scene setup
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x87CEEB); // Light blue sky background

// Camera setup (First-person perspective)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0); // Starting at the center of the maze (height 1.6m)
camera.rotation.set(0, Math.PI, 0); // Initially facing straight ahead, with no tilt

// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Maze parameters
const mazeWidth = 21;
const mazeHeight = 21;
// const exitPositions = [
//   { x: Math.floor(mazeWidth / 2), z: 0, url: "endpoints/publications.html" },               // Top edge (publication)
//   { x: mazeWidth - 1, z: Math.floor(mazeHeight / 2), url: "endpoints/cv.html" },          // Right edge (CV)
//   { x: Math.floor(mazeWidth / 2), z: mazeHeight - 1, url: "endpoints/projects.html" },     // Bottom edge (projects)
//   { x: 0, z: Math.floor(mazeHeight / 2), url: "endpoints/contact.html" }                  // Left edge (contact or any other page)
// ];
const exitPositions = [
  { x: Math.floor(mazeWidth / 2), z: 0, url: "https://www.youtube.com/watch?v=ow5XgHDkPOQ" },               // Top edge (publication)
  { x: mazeWidth - 1, z: Math.floor(mazeHeight / 2), url: "https://www.youtube.com/watch?v=ow5XgHDkPOQ" },          // Right edge (CV)
  { x: Math.floor(mazeWidth / 2), z: mazeHeight - 1, url: "https://www.youtube.com/watch?v=ow5XgHDkPOQn" },     // Bottom edge (projects)
  { x: 0, z: Math.floor(mazeHeight / 2), url: "https://www.youtube.com/watch?v=ow5XgHDkPOQ" }                  // Left edge (contact or any other page)
];


// Generate a logical maze
const maze = generateLogicalMaze(mazeWidth, mazeHeight, exitPositions);

// Octree for walls
const worldOctree = new Octree();

// Maze wall material with texture
const wallTexture = new THREE.TextureLoader().load('wall_texture.jpg');
const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });
const floorTexture = new THREE.TextureLoader().load('floor_texture.jpg');
const floorGeometry = new THREE.CircleGeometry(50, 64); // Large circle with 50 units radius
const floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
const skyTexture = new THREE.TextureLoader().load('sky_texture.jpg');
const skyGeometry = new THREE.SphereGeometry(500, 64, 64); // Large sphere
const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeometry, skyMaterial);

floor.rotation.x = -Math.PI / 2; // Rotate the floor to lie flat
floor.position.set(0, -0.1, 0); // Position just slightly below the maze

// Add the floor to the scene
scene.add(floor);
scene.add(sky);


const walls = [];


for (let z = 0; z < mazeHeight; z++) {
  for (let x = 0; x < mazeWidth; x++) {
    if (maze[z][x] === 1) {
      // Wall
      const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(x - mazeWidth / 2, 1, -(z - mazeHeight / 2)); // Center the maze
      wall.updateMatrixWorld(true); // Ensure the wall's world matrix is up to date
      scene.add(wall);
      walls.push(wall);

      // Add wall to the world octree
      worldOctree.fromGraphNode(wall);
    } else {
      // Path
      const pathGeometry = new THREE.BoxGeometry(1, 0.1, 1);
      const path = new THREE.Mesh(pathGeometry, floorMaterial);
      path.position.set(x - mazeWidth / 2, 0, -(z - mazeHeight / 2));
      scene.add(path);
    }
  }
}

// Player's capsule collider
const playerCapsule = new Capsule(
  new THREE.Vector3(0, 0.5, 0), // Bottom of the capsule
  new THREE.Vector3(0, 1.5, 0), // Top of the capsule
  0.3 // Radius
);

const lookUpSpeed = 0.05; // Speed of looking up
const lookDownSpeed = 0.05; // Speed of looking down
const maxPitch = Math.PI / 2;  // Maximum vertical look-up angle (90 degrees)
const minPitch = -Math.PI / 2; // Maximum vertical look-down angle (-90 degrees)

const moveSpeed = 0.1;
const rotateSpeed = 0.05;
let forward = false, backward = false, rotateLeft = false, rotateRight = false, lookUp = false, lookDown = false;

// Track the player's current angle and vertical tilt
let playerYaw = Math.PI; // Yaw rotation (horizontal turning, A/D keys)
let playerPitch = 0;     // Pitch rotation (vertical tilt, W/S keys)
const euler = new THREE.Euler(0, 0, 0, 'YXZ');



//********** MINI MAP ******
// Mini-map setup
const miniMapCanvas = document.getElementById('minimap');
const miniMapCtx = miniMapCanvas.getContext('2d');

// Set the size of the mini-map (adjust as needed)
const miniMapSize = 200;
miniMapCanvas.width = miniMapSize;
miniMapCanvas.height = miniMapSize;

// Scale to fit the maze
const miniMapScaleX = miniMapSize / mazeWidth;
const miniMapScaleY = miniMapSize / mazeHeight;

function drawMiniMap(playerCapsule) {
  // Clear the canvas
  miniMapCtx.clearRect(0, 0, miniMapSize, miniMapSize);

  // Draw the maze walls
  for (let z = 0; z < mazeHeight; z++) {
    for (let x = 0; x < mazeWidth; x++) {
      if (maze[z][x] === 1) {
        miniMapCtx.fillStyle = '#000'; // Wall colour (black)
        miniMapCtx.fillRect(
          (mazeWidth - 1 - x) * miniMapScaleX,
          z * miniMapScaleY,
          miniMapScaleX,
          miniMapScaleY
        );
      }
    }
  }

  // Draw the exits
  miniMapCtx.fillStyle = '#00ff00'; // Green for exits
  exitPositions.forEach((exit) => {
    miniMapCtx.fillRect(
      (mazeWidth - 1 - exit.x) * miniMapScaleX,
      exit.z * miniMapScaleY,
      miniMapScaleX,
      miniMapScaleY
    );
  });

  // Get player position
  const playerPosition = playerCapsule.start; // Player's 3D world position

  // Convert player position to mini-map coordinates
  // Map the player position from world space to mini-map space

  const playerMinimapX = (mazeWidth-1-(playerPosition.x + mazeWidth / 2) )* miniMapScaleX;
  const playerMinimapZ = (mazeHeight / 2 - playerPosition.z) * miniMapScaleY;

  // Debugging: Log the mini-map coordinates to check scaling
  // console.log("Player Position (Mini-map Space):", playerMinimapX, playerMinimapZ);

  // Draw the player (red dot)
  miniMapCtx.fillStyle = '#ff0000'; // Red for player
  miniMapCtx.beginPath();
  miniMapCtx.arc(
    playerMinimapX, // X position on mini-map
    playerMinimapZ+2, // Z position on mini-map
    miniMapScaleX / 2, // Radius of the player marker
    0,
    Math.PI * 2
  );
  miniMapCtx.fill();

  // Debugging: Print the player position and mini-map position for verification
  // console.log('Mini-map Player Position:', playerMinimapX, playerMinimapZ);
}





// Handle keyboard input
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'w') forward = true;
  if (event.key === 'ArrowDown' || event.key === 's') backward = true;
  if (event.key === 'ArrowLeft' || event.key === 'a') rotateLeft = true;
  if (event.key === 'ArrowRight' || event.key === 'd') rotateRight = true;
  if (event.key === 'q') lookUp = true;
  if (event.key === 'e') lookDown = true;

});

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'w') forward = false;
  if (event.key === 'ArrowDown' || event.key === 's') backward = false;
  if (event.key === 'ArrowLeft' || event.key === 'a') rotateLeft = false;
  if (event.key === 'ArrowRight' || event.key === 'd') rotateRight = false;
  if (event.key === 'q') lookUp = false;
  if (event.key === 'e') lookDown = false;

});


function movePlayer(playerCapsule) {
  // Handle rotation
  if (rotateLeft) playerYaw += rotateSpeed;
  if (rotateRight) playerYaw -= rotateSpeed;


  // Reset pitch when moving forward or backward
  if (forward || backward) {
    playerPitch = THREE.MathUtils.lerp(playerPitch, 0, 0.1);
  }

  if (lookUp) playerPitch += rotateSpeed;
  if (lookDown) playerPitch -= rotateSpeed;

  // Constrain the pitch between -90° (down) and 90° (up)
  playerPitch = Math.min(Math.max(playerPitch, -Math.PI / 2), Math.PI / 2);

  // Apply the yaw (rotation around Y-axis) and pitch (rotation around X-axis)
  euler.set(playerPitch, playerYaw, 0, 'YXZ');

  // Update the camera quaternion from the Euler angles
  camera.quaternion.setFromEuler(euler);

  // Update camera rotation
  // camera.rotation.set(playerPitch, playerYaw, 0);

  // Calculate forward direction
  // const forwardDirection = new THREE.Vector3(Math.sin(playerYaw), 0, Math.cos(playerYaw)).normalize();
  const forwardDirection = new THREE.Vector3();
  camera.getWorldDirection(forwardDirection);
  forwardDirection.y = 0;  // To prevent vertical movement (optional)
  forwardDirection.normalize();  // Make sure the vector is normalized
  // Move player forward or backward
  if (forward) {
    const movement = forwardDirection.clone().multiplyScalar(moveSpeed);
    playerCapsule.translate(movement);
  }
  if (backward) {
    const movement = forwardDirection.clone().negate().multiplyScalar(moveSpeed);
    playerCapsule.translate(movement);
  }

  // Update camera position
  camera.position.copy(playerCapsule.start);
}

// Handle collisions
function handlePlayerCollisions(playerCapsule) {
  const result = worldOctree.capsuleIntersect(playerCapsule);
  if (result) {
    playerCapsule.translate(result.normal.multiplyScalar(result.depth));
  }

  for (let exit of exitPositions) {
    const playerPosition = playerCapsule.start;

    // Check if player is within a certain distance of the exit
    const distance = playerPosition.distanceTo(new THREE.Vector3(exit.x - mazeWidth / 2, playerPosition.y, -(exit.z - mazeHeight / 2)));

    // If the player is near the exit, redirect to the respective URL
    if (distance < 0.5) {  // You can adjust the threshold (2) for proximity
      window.history.replaceState(null, '', window.location.href);
      window.location.href = exit.url;
      return;  // Exit after the redirection to prevent multiple triggers
    }
  }
}


// Animation loop
function animate() {
  requestAnimationFrame(animate);

  movePlayer(playerCapsule);
  handlePlayerCollisions(playerCapsule);

  drawMiniMap(playerCapsule);
  // Render the scene
  renderer.render(scene, camera);
}

animate();


function generateLogicalMaze(width, height, exits) {
  // Maze grid: 1 for walls, 0 for paths
  const maze = Array.from({ length: height }, () => Array(width).fill(1));
  const directions = [
    { dx: 0, dz: -1 }, // Up
    { dx: 1, dz: 0 },  // Right
    { dx: 0, dz: 1 },  // Down
    { dx: -1, dz: 0 }  // Left
  ];

  function isInBounds(x, z) {
    return x > 0 && x < width - 1 && z > 0 && z < height - 1;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function carvePassages(x, z) {
    maze[z][x] = 0; // Mark current cell as a path
    shuffle(directions); // Randomise direction order

    for (const { dx, dz } of directions) {
      const nx = x + dx * 2;
      const nz = z + dz * 2;

      if (isInBounds(nx, nz) && maze[nz][nx] === 1) {
        maze[z + dz][x + dx] = 0; // Carve path between cells
        carvePassages(nx, nz);    // Recursively carve the next cell
      }
    }
  }

  // Start carving maze from the middle
  const startX = Math.floor(width / 2);
  const startZ = Math.floor(height / 2);
  carvePassages(startX, startZ);

  // Ensure exits are open
  exits.forEach(exit => {
    const { x, z } = exit;
    maze[z][x] = 0; // Clear exit cell
    if (x === 0) maze[z][1] = 0;                // Open path next to left exit
    else if (x === width - 1) maze[z][width - 2] = 0; // Open path next to right exit
    else if (z === 0) maze[1][x] = 0;           // Open path next to top exit
    else if (z === height - 1) maze[height - 2][x] = 0; // Open path next to bottom exit
  });

  return maze;
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  render()
}

window.addEventListener("pageshow", function (e) {
    // Reload the page
    var historyTraversal = event.persisted ||
                         ( typeof window.performance != "undefined" &&
                              window.performance.navigation.type === 2 );
    if (historyTraversal) {
        // If it's the YouTube page (or other exit page), force a reload of index.html
        window.location.reload();
    }
  });
