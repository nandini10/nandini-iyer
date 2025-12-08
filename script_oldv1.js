import * as THREE from 'three';
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
  //
  // const exitElement = document.createElement('div');
  // exitElement.id = `exit-${index}`;
  // exitElement.style.position = 'absolute';
  // exitElement.style.top = `${20 + (index * 30)}px`; // Just an example position, you can adjust this
  // exitElement.style.left = '20px';
  // exitElement.style.fontSize = '24px';
  // exitElement.style.color = '#fff';
  // exitElement.style.backgroundColor = '#333';
  // exitElement.style.padding = '10px';
  // exitElement.style.borderRadius = '5px';
  // exitElement.style.cursor = 'pointer';
  // exitElement.innerHTML = 'Loading...'; // Placeholder text
  // document.body.appendChild(exitElement);
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

  if (event.key === 'ArrowUp') forward = true;console.log(forward);
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

// Raycasting for collision detection
const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();

// Function to move the player and check for collisions
function move() {
  if (rotateLeft) camera.rotation.y += rotateSpeed;
  if (rotateRight) camera.rotation.y -= rotateSpeed;

  // Look up/down only affects camera pitch (vertical direction)
  if (lookUp && camera.rotation.x > -Math.PI / 4) camera.rotation.x -= rotateSpeed;
  if (lookDown && camera.rotation.x < Math.PI / 4) camera.rotation.x += rotateSpeed;

  // Ensure the camera's y position stays constant (stay grounded)
  camera.position.y = 1.6;

  // Handle forward/backward movement with raycasting
  const forwardDirection = new THREE.Vector3();
  camera.getWorldDirection(forwardDirection);  // Get the forward direction of the camera

  const rayOrigin = camera.position.clone().add(new THREE.Vector3(0, 1.6, 0));  // Adjusted for camera height
  const rayLength = 2;  // Adjust ray length as necessary

  raycaster.ray.origin.copy(rayOrigin);
  raycaster.ray.direction.copy(forwardDirection);
  raycaster.ray.far = rayLength;

  const intersects = raycaster.intersectObjects(walls); // Check collisions with walls

  console.log(intersects.length)
  if (intersects.length === 0 && forward) {
    camera.position.addScaledVector(forwardDirection, moveSpeed);
  }

  if (backward) {
    const backwardDirection = forwardDirection.clone().negate();
    camera.position.addScaledVector(backwardDirection, moveSpeed);
  }

  // Handle left/right movement with raycasting for collision
  const rightDirection = new THREE.Vector3();
  camera.getWorldDirection(rightDirection);
  rightDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);  // Right is 90 degrees from forward

  raycaster.ray.origin.copy(rayOrigin);
  raycaster.ray.direction.copy(rightDirection);
  const intersectsRight = raycaster.intersectObjects(walls);

  // Swap left and right checks
  const leftDirection = rightDirection.clone().negate();
  raycaster.ray.direction.copy(leftDirection);
  const intersectsLeft = raycaster.intersectObjects(walls);

  if (intersectsRight.length === 0 && left) {
    camera.position.addScaledVector(leftDirection, moveSpeed); // Move left
  }

  if (intersectsLeft.length === 0 && right) {
    camera.position.addScaledVector(rightDirection, moveSpeed); // Move right
  }
}


function calculateExitDirection(exit) {
  const deltaX = exit.x - camera.position.x;
  const deltaZ = exit.z - camera.position.z;

  if (Math.abs(deltaX) > Math.abs(deltaZ)) {
    return deltaX > 0 ? '→' : '←';  // Left or Right
  } else {
    return deltaZ > 0 ? '↑' : '↓';  // Up or Down
  }
}

// Function to update exit directions every 5 seconds
function updateExitDirections() {
  exitPositions.forEach((exit, index) => {
    const direction = calculateExitDirection(exit);
    const exitElement = document.getElementById(`exit-${index+1}`);
    exitElement.innerHTML = `Exit ${index+1} ${direction}`;  // Update the HTML element with the direction
  });
}

// Set interval to update exit directions every 5 seconds
setInterval(updateExitDirections, 1000);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  move();
  renderer.render(scene, camera);
}

animate();
