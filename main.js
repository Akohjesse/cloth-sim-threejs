import './style.css'

import * as THREE from 'three';
import * as CANNON from 'cannon-es'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const camera = new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.set(4, 1, 1);
camera.lookAt(0, 0, 0);

const orbit = new OrbitControls(camera, renderer.domElement);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

orbit.update();

renderer.setClearColor('black');

// new RGBELoader().load('/church.hdr', (texture) => {
//   texture.mapping = THREE.EquirectangularReflectionMapping;
//   // scene.background = texture;
//   scene.environment = texture;
// });

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight)

const spotLight = new THREE.SpotLight(0xffffff, 100, 0, Math.PI / 8, 1);
spotLight.position.set(-3, 3, 10);
spotLight.target.position.set(0, 0, 0);

scene.add(spotLight);

renderer.toneMappingExposure = 3;

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
directionalLight.position.set(0, 0, -10);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight);

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.8, 0)
})


const nx = 15;
const ny = 15;
const mass = 1;
const size = 1;
const dist = size / nx;

const shape = new CANNON.Particle();

const particles = [];

for (let i = 0; i < nx + 1; i++){
  particles.push([]);
  for (let j = 0; j < ny + 1; j++){
    const particle = new CANNON.Body({
      mass: j === ny ? 0 : mass,
      shape,
      position: new CANNON.Vec3((i - nx * 0.5) * dist, (j - ny * 0.5) * dist, 0),
      velocity: new CANNON.Vec3(0, 0, -0.2 * (ny -j) )
    })
    particles[i].push(particle);
    world.addBody(particle);
  }
}

const connect = (i1, j1, i2, j2) => {
  world.addConstraint(new CANNON.DistanceConstraint(
    particles[i1][j1],
    particles[i2][j2],
    dist
   ))
}

for (let i = 0; i < nx + 1; i++){
  for (let j = 0; j < ny + 1; j++){
    if (i < nx) {
      connect(i, j, i + 1, j);
    }
    if (j < ny) {
      connect(i, j, i, j + 1);
    }
  }
}

const loader = new GLTFLoader();
const clothGeometry = new THREE.PlaneGeometry(1, 1, nx, ny);

let textureFromGLTF;
let textureFromGLTF2;
let textureFromGLTF3;
loader.load('/fabric_pattern_05_4k.gltf/fabric_pattern_05_4k.gltf', (texture) => {
  textureFromGLTF2 = texture.scene.children[0].material.map;
})
loader.load('/denim_fabric_4k.gltf/denim_fabric_4k.gltf', (texture) => {
  textureFromGLTF3 = texture.scene.children[0].material.map;
})
loader.load('/fabric_pattern_07_4k.gltf/fabric_pattern_07_4k.gltf', (texture) => {
  textureFromGLTF = texture.scene.children[0].material.map;
  const cloth = new THREE.Mesh(
    clothGeometry,
     new THREE.MeshPhongMaterial({
       side: THREE.DoubleSide,
       map: textureFromGLTF
     })
   )
  scene.add(cloth)
  
  setTimeout(() => {
    cloth.material.wireframe = true;
    cloth.material.color= new THREE.Color('lime')
  }, 5000)
  
  setTimeout(() => {
    cloth.material.wireframe = false;
    cloth.material.color = new THREE.Color('white');
    cloth.material.map = textureFromGLTF2;
  },
    8300)
  
  setTimeout(() => {
    cloth.material.wireframe = false;
    cloth.material.map = textureFromGLTF3;
  },
  11000)
})








const updateParticles = () => {
  for(let i = 0; i < nx + 1; i++){
    for(let j = 0; j < ny + 1; j++){
      const index = j * (nx + 1) + i;

      const positionAttr = clothGeometry.attributes.position;
      const position = particles[i][ny - j].position;

      positionAttr.setXYZ(index, position.x, position.y, position.z);

      positionAttr.needsUpdate = true
    }
  }
}


const sphereSize = 0.13;
const movementRadius = 0.2;

const sphereGeometry = new THREE.SphereGeometry(sphereSize);
const sphereMat = new THREE.MeshStandardMaterial({
  roughness: 0,
  metalness:0.5
});

const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMat);
scene.add(sphereMesh);

const sphereShape = new CANNON.Sphere(sphereSize * 1.5);
const sphereBody = new CANNON.Body({
    shape: sphereShape
});
world.addBody(sphereBody);


let timestep = 1 / 60;

function animate(time) {
  updateParticles()
  world.step(timestep)
  sphereBody.position.set(
    movementRadius * Math.sin(time / 1000),
    0,
    movementRadius * Math.cos(time / 1000)
);
sphereMesh.position.copy(sphereBody.position);
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});