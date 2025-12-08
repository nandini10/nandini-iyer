import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js'; // Capsule class for collision detection
import { Octree } from 'three/examples/jsm/math/Octree.js'; // Octree for spatial partitioning
import { OrbitControls } from 'https://unpkg.com/three@0.171.0/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Light blue sky background

// Camera setup (First-person perspective)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0); // Starting at the center of the maze (height 1.6m)
camera.rotation.set(0, Math.PI, 0); // Initially facing straight ahead, with no tilt

// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// Player's capsule collider
const playerCollider = new Capsule(
  new THREE.Vector3(0, 0.5, 0), // Bottom of the capsule
  new THREE.Vector3(0, 1.5, 0), // Top of the capsule
  0.3 // Radius
);

const worldOctree = new Octree();

// Maze parameters
const mazeWidth = 21;
const mazeHeight = 21;
const maze = generateMaze(mazeWidth, mazeHeight);

// Maze wall material with texture
const wallTexture = new THREE.TextureLoader().load('wall_texture.jpg');
const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });
const pathMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB });

// Create walls and exits
const walls = [];
const exits = [];
const exitPositions = [
  { x: 10, z: 1, direction: '↑' }, // Exit 1
  { x: 1, z: 10, direction: '→' }, // Exit 2
  { x: 10, z: 19, direction: '↓' }, // Exit 3
  { x: 19, z: 10, direction: '←' }  // Exit 4
];

// Create maze structure
for (let z = 0; z < mazeHeight; z++) {
  for (let x = 0; x < mazeWidth; x++) {
    if (maze[z][x] === 1) {
      // Wall
      const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(x - mazeWidth / 2, 1, -(z - mazeHeight / 2)); // Centering the maze
      scene.add(wall);
      walls.push(wall);
    } else {
      // Path
      const pathGeometry = new THREE.BoxGeometry(1, 0.1, 1);
      const path = new THREE.Mesh(pathGeometry, pathMaterial);
      path.position.set(x - mazeWidth / 2, 0, -(z - mazeHeight / 2));
      scene.add(path);
    }
  }
}

// Create exits in the maze
exitPositions.forEach((exit, index) => {
  const exitGeometry = new THREE.BoxGeometry(1, 2, 1);
  const exitColor = new THREE.Color(Math.random(), Math.random(), Math.random()); // Random colors for exits
  const exitMaterial = new THREE.MeshBasicMaterial({ color: exitColor });
  const exitMesh = new THREE.Mesh(exitGeometry, exitMaterial);
  exitMesh.position.set(exit.x - mazeWidth / 2, 1, -(exit.z - mazeHeight / 2));
  scene.add(exitMesh);
  exits.push({ ...exit, color: exitColor });
});

// Generate maze (simple random wall placement)
function generateMaze(width, height) {
  const maze = Array.from({ length: height }, () => Array(width).fill(1)); // Start with all walls

  // Simple maze generator (for demonstration purposes)
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      if (Math.random() < 0.3) maze[z][x] = 0;
    }
  }

  return maze;
}

// Player controls and movement logic
const moveSpeed = 0.1;
const rotateSpeed = 0.05;
let forward = false, backward = false, left = false, right = false;
let rotateLeft = false, rotateRight = false, lookUp = false, lookDown = false;

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') forward = true;
  if (event.key === 'ArrowDown') backward = true;
  if (event.key === 'ArrowLeft') left = true;
  if (event.key === 'ArrowRight') right = true;
  if (event.key === 'a') rotateLeft = true;
  if (event.key === 'd') rotateRight = true;
  if (event.key === 'w') lookUp = true;
  if (event.key === 's') lookDown = true;
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowUp') forward = false;
  if (event.key === 'ArrowDown') backward = false;
  if (event.key === 'ArrowLeft') left = false;
  if (event.key === 'ArrowRight') right = false;
  if (event.key === 'a') rotateLeft = false;
  if (event.key === 'd') rotateRight = false;
  if (event.key === 'w') lookUp = false;
  if (event.key === 's') lookDown = false;
});

function checkAABBCollision(player, wall) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    const playerBox = new THREE.Box3().setFromObject(player); // Player's current bounding box
    return playerBox.intersectsBox(wallBox); // Return true if there is an intersection
}

// Function to move the player with AABB collision detection
const playerSize = new THREE.BoxGeometry(0.5, 2, 0.5); // Example player size (0.5m x 2m)
const playerMesh = new THREE.Mesh(playerSize, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
scene.add(playerMesh);  // Add it to the scene for collision detection

// function move() {
//     const forwardDirection = new THREE.Vector3();
//     camera.getWorldDirection(forwardDirection);  // Get forward direction of the camera
//     forwardDirection.normalize();  // Normalize it to ensure consistent speed regardless of direction
//
//     // Handle turning (rotation)
//     if (rotateLeft) {
//         camera.rotation.y += rotateSpeed; // Turn left
//     }
//
//     if (rotateRight) {
//         camera.rotation.y -= rotateSpeed; // Turn right
//     }
//
//     // Handle forward movement with AABB collision detection
//     if (forward) {
//         const newPosition = camera.position.clone().addScaledVector(forwardDirection, moveSpeed); // Calculate where the player would go
//         let canMoveForward = true;  // Assume movement is possible
//
//         // Check each wall to see if the player's new position will cause a collision
//         for (const wall of walls) {
//             if (checkAABBCollision(camera, wall)) {
//                 console.log('cant move')
//                 canMoveForward = false;  // If any wall collides, prevent movement
//                 break;
//             }
//         }
//
//         // If no collisions detected, move the player forward
//         if (canMoveForward) {
//             camera.position.addScaledVector(forwardDirection, moveSpeed);
//         }
//     }
//
//     // Handle backward movement (same principle as forward)
//     if (backward) {
//         const backwardDirection = forwardDirection.clone().negate();  // Reverse the forward direction
//         const newPosition = camera.position.clone().addScaledVector(backwardDirection, moveSpeed);
//         let canMoveBackward = true;
//
//         // Check for collisions when moving backward
//         for (const wall of walls) {
//             if (checkAABBCollision(camera, wall)) {
//                 canMoveBackward = false;
//                 break;
//             }
//         }
//
//         if (canMoveBackward) {
//             camera.position.addScaledVector(backwardDirection, moveSpeed);  // Move the player backward
//         }
//     }
//
//     // Handle left/right movement with AABB collision
//     if (left) {
//         const rightDirection = new THREE.Vector3();
//         camera.getWorldDirection(rightDirection);
//         rightDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);  // Right direction is 90 degrees from forward
//
//         let canMoveLeft = true;
//
//         // Check for collisions when moving left
//         for (const wall of walls) {
//             if (checkAABBCollision(camera, wall)) {
//                 canMoveLeft = false;
//                 break;
//             }
//         }
//
//         if (canMoveLeft) {
//             camera.position.addScaledVector(rightDirection, moveSpeed);
//         }
//     }
//
//     if (right) {
//         const leftDirection = new THREE.Vector3();
//         camera.getWorldDirection(leftDirection);
//         leftDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);  // Left direction is -90 degrees from forward
//
//         let canMoveRight = true;
//
//         // Check for collisions when moving right
//         for (const wall of walls) {
//             if (checkAABBCollision(camera, wall)) {
//                 canMoveRight = false;
//                 break;
//             }
//         }
//
//         if (canMoveRight) {
//             camera.position.addScaledVector(leftDirection, moveSpeed);
//         }
//     }
// }
function move() {
  const forwardDirection = new THREE.Vector3();
  camera.getWorldDirection(forwardDirection);
  forwardDirection.normalize();

  // Rotate camera
  if (left) {
    camera.rotation.y += rotateSpeed;
  }
  if (right) {
    camera.rotation.y -= rotateSpeed;
  }

  // Calculate movement vector
  const movement = new THREE.Vector3();
  if (forward) movement.add(forwardDirection);
  if (backward) movement.add(forwardDirection.negate());
  movement.normalize().multiplyScalar(moveSpeed);

  // Update the capsule's position
  playerCollider.translate(movement);

  // Check for collisions with the octree
  const result = worldOctree.capsuleIntersect(playerCollider);
  if (result) {
    // Push the capsule out of the collision
    playerCollider.translate(result.normal.multiplyScalar(result.depth));
  }

  // Update camera position to follow the capsule
  camera.position.copy(playerCollider.end);
}



function animate() {
  requestAnimationFrame(animate);
  move();
  renderer.render(scene, camera);
}

animate();
