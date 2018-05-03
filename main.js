// import our three.js reference
const THREE = require('three')
const PP = require('postprocessing')
const Tonal = require("tonal")

'use strict';
const app = {

  init() {
      this.o_trees = [];
      this.n_numOfBranches = 0;

      this.n_spheres = [];
      this.n_spheres_copy = [];

      this.o_colors = ["#ff6666", "#8600b3", "#85e085", "#ffff66", "#66b3ff", "#66b3ff", "#3333cc", "#993366"];
      this.o_frequency = [Tonal.Note.freq("A2"), Tonal.Note.freq("B2"), Tonal.Note.freq("D2"), Tonal.Note.freq("E2"), Tonal.Note.freq("F#2"), Tonal.Note.freq("G#2"), Tonal.Note.freq("A#2"), Tonal.Note.freq("C#2")]

      this.b_parentBranch = false;
      this.n_branch_count = 0;
      this.n_sub_number_branch = 0;
      this.n_trees_count = 0;
      this.c_axion = 'X';
      this.clock = new THREE.Clock();
      this.o_prevBranch = null;
      this.o_objects_holder = null

      this.spheresOnBranch = [];
      this.branchesEqualAndHigher = [];

      this.o_sphere_animating;

      this.s_output = '';
      this.n_iterations = 3;
      this.rotationMatrix = new THREE.Quaternion();
      this.sound_ctx = new AudioContext();
      this.glock = {
        cmRatio: 3.5307,
        index: 1,
        attack: .003,
        decay: 2
      };
      this.audioListener = new THREE.AudioListener();

      this.array_rules = [['X', 'F-[[X]+X]+F[+FX]-X'], ['F', 'FF']];


      this.material = new THREE.LineBasicMaterial({
        color: 0x42332f,
        linewidth: 2,
      });

      var Option = function () {
        this.loopBranch = true;
      }
      
      this.text = new Option();
      var gui = new dat.GUI();
      gui.add(this.text, 'loopBranch')

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf2f2f2);

      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .1, 1000);
      this.camera.position.z = 80;
      this.camera.add(this.audioListener);
      this.createRenderer();

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
      this.controls.dampingFactor = 0.25;
      this.controls.panningMode = THREE.HorizontalPanning; // default is THREE.ScreenSpacePanning
      this.controls.minDistance = -50;
      this.controls.maxDistance = 300;
      this.controls.maxPolarAngle = Math.PI / 2;
      this.createLights();
      this.createFog();
      this.setUp();

      this.render();
      document.addEventListener('mousedown', this.clickObject.bind(this), false);
    },


    setUp() {
      this.n_position = 0;

      this.s_output = this.c_axion;
      // Compute the L-SYSTEM
      for (let i = 0; i < this.n_iterations; i++) {
        this.c_axion = this.checkForRules(this.c_axion);
      }

      this.addTree(new THREE.Vector3(20, 140, 0), new THREE.Vector3(0.5, -0.5, 0), 8, 15, 85, 25);

      // initial starting point

      let geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(this.o_trees[0].pos.x, this.o_trees[0].pos.y + 90, this.o_trees[0].pos.z));
      geometry.vertices.push(new THREE.Vector3(this.o_trees[0].pos.x, this.o_trees[0].pos.y, this.o_trees[0].pos.z));

      // create the new line and add it to the scene
      this.line = new THREE.LineSegments(geometry, this.material);
      this.scene.add(this.line);
      this.clock.start();

      let ambientSound = new THREE.Audio(this.audioListener);
      this.scene.add(ambientSound);

      let loader = new THREE.AudioLoader();

      loader.load(
        // resource URL
        'audio/wind.ogg',

        // onLoad callback
        function (audioBuffer) {
          // set the audio object buffer to the loaded object
          ambientSound.setBuffer(audioBuffer);
          ambientSound.setLoop(true);
          // play the audio
          ambientSound.play();
        });
    },

    clickObject(event) {
      let vector = new THREE.Vector3();
      let raycaster = new THREE.Raycaster();
      raycaster.linePrecision = 2;

      let dir = new THREE.Vector3();
      vector.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5); // z = 0.5 important!

      vector.unproject(this.camera);

      raycaster.set(this.camera.position, vector.sub(this.camera.position).normalize());

      // to hold the spheres and lines from raycast
      let objects = [];

      // get all elements that intersects with raycast
      let intersects = raycaster.intersectObjects(this.scene.children);

      // for each of them, only gather the sphere and linesegment objects (ignore lights and stuff)
      intersects.forEach(function (object) {
        if (object.object.geometry.type == "SphereGeometry" || object.object.geometry.type == "Geometry") {
          objects.push(object);
        }
      });

      // if you did click on either a sphere or a line
      if (objects.length > 0) {

        let holder = this;

        // if the first item in the stack is a sphere (so it's assumed you aimed to click on a sphere)
        if (objects[0].object.geometry.type == "SphereGeometry") {

          // for each existing spheres
          this.n_spheres.forEach(function (sphere) {

            let position = null;

            if ('object' in objects[0]) {
              position = objects[0].object.position;
            } else {
              position = objects[0].position;
            }

            // if the sphere from the array is the same as the sphere from the scene (they have the same position)
            if (sphere.sphere.position === position) {

              // get a random angle for a new branch
              let angle = (Math.random() * 15) + 3;

              // if this sphere has not been interacted with before
              // create a new tree using it's position and direction
              if (!sphere.branch) {
                let random = Math.floor(Math.random() * Math.floor(3)) + 2;
                holder.addTree(sphere.pos, sphere.dir, random, angle, 99, 50);

                // play a note using the frequency attached to sphere
                holder.playNote(sphere, objects[0].distance, objects[0], holder.glock.cmRatio, holder.glock.index, holder.glock.attack, holder.glock.decay, true, null);

              }

              // this sphere is now interacted with
              sphere.branch = true;

              return;
            }
          });

          // else, if the first object you clicked on is a branch (aimed for a branch)
        } else {

          // holder for the branch number the line is attached to
          let branchNumber = objects[0].object.userData.branch;
          // get tree index
          let treeNumber = objects[0].object.userData.tree;
          // what step in branch line is
          let subNumber = objects[0].object.userData.subNum;

          this.spheresOnBranch = [];
          this.branchesEqualAndHigher = [];
          this.b_repeat = !this.b_repeat;

          // go through all existing children on the scene
          // to get all spheres that belongs to this branch number
          this.scene.children.forEach(function (object) {

            // if this object has a geometry attribute (light and such doesn't)
            // and is of type sphere and belong to branch number, then add to array
            if (object.geometry && object.geometry.type == "SphereGeometry") {
              holder.spheresOnBranch.push(object);
            }

            if (object.geometry && object.geometry.type == "Geometry") {
              if (object.userData.branch == branchNumber && object.userData.tree == treeNumber && object.userData.subNum >= subNumber) {
                holder.branchesEqualAndHigher.push(object);
              }

            }

          });

          this.animateBranch(objects[0]);

        }

      }
    },


    async animateBranch(objects) {
      let holder = this;

      for (let i = 0; i < this.branchesEqualAndHigher.length; i++) {
        // write some logic that grabs the next branch segment
        const segment = this.branchesEqualAndHigher[i];

        await this.highlightBranchSegment(segment, objects);


        this.o_trees[segment.userData.tree].spheres.forEach(function (sphere) {

          if (sphere.sphere.userData.id == segment.userData.id) {

            let index = holder.scene.children.indexOf(sphere.sphere);

            // if the sphere from the array is the same as the sphere from the scene
            if (index != -1 && index != undefined) {
              if (sphere.animated) {

                // get a random angle for a new branch
                let angle = (Math.random() * 15) + 3;

                // if this sphere has not been interacted with before
                // create a new tree using it's position and direction
                if (!sphere.branch) {
                  let random = Math.floor(Math.random() * Math.floor(3)) + 2;
                  holder.addTree(sphere.pos, sphere.dir, random, angle, 99, 50);

                  // play a note using the frequency attached to sphere
                  holder.playNote(sphere, objects.distance, holder.scene.children[index], holder.glock.cmRatio, holder.glock.index, holder.glock.attack, holder.glock.decay, true, null);
                }

                // this sphere is now interacted with
                sphere.branch = true;
              }

            }
          }

        });

        // if this is the last segment, then we need to reset the color here instead
        if (i == this.branchesEqualAndHigher.length - 1) {
          let material = this.branchesEqualAndHigher[i].material.clone();
          material.color.setHex(0x42332f);
          this.branchesEqualAndHigher[i].material = material;
        }

      }

      if (this.text.loopBranch) this.animateBranch(objects);
    },

    highlightBranchSegment(branchSegment, objects) {
      const p = new Promise((resolve, reject) => {

        // if this is the first segment, skip
        // else set prev one to original color
        if (this.o_prevBranch != null) {
          let material = branchSegment.material.clone();
          this.o_prevBranch.material = material;
        }

        this.playNote(null, objects.distance, null, this.glock.cmRatio, this.glock.index, this.glock.attack, this.glock.decay, false, branchSegment);
        let material = branchSegment.material.clone();
        material.color.setHex(0xff0000);
        branchSegment.material = material;
        this.o_prevBranch = branchSegment;
        setTimeout(resolve, 400);
      });

      return p;
    },


    playNote(o_sphere, n_dist, object, cmRatio, index, attack, decay, isSphere, segment) {

      let n_amp = 1;

      let value = (n_dist * 100) / 120;
      n_amp = 1 - (value / 100) - 0.04;

      if (n_amp < 0) {
        n_amp = 0.1;
      }

      const delayLine = this.sound_ctx.createDelay();
      delayLine.delayTime.value = .25

      const delayGain = this.sound_ctx.createGain();
      delayGain.gain.value = .65

      delayLine.connect(this.sound_ctx.destination);
      delayLine.connect(delayGain);
      delayGain.connect(delayLine);

      const reverb = this.sound_ctx.createConvolver();
      reverb.connect(this.sound_ctx.destination);

      const reverbInput = this.sound_ctx.createGain();
      reverbInput.gain.value = 1;
      reverbInput.connect(reverb);


      window.fetch('audio/concrete-tunnel.wav').then(
        response => response.arrayBuffer()
      ).then(audioData => {
        this.sound_ctx.decodeAudioData(audioData, buffer => {
          reverb.buffer = buffer;
        })
      })

      const carrier = this.sound_ctx.createOscillator();
      if (isSphere) carrier.frequency.value = o_sphere.freq;
      else {
        carrier.frequency.value = 261.625;
      }

      const mod = this.sound_ctx.createOscillator()
      if (isSphere) mod.frequency.value = o_sphere.freq * cmRatio;
      else {
        carrier.frequency.value = 261.625 * cmRatio;
      }

      const modGain = this.sound_ctx.createGain()
      if (isSphere) modGain.gain.value = o_sphere.freq * index;
      else {
        carrier.frequency.value = 261.625 * index;
      }

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      const envelope = this.sound_ctx.createGain();
      carrier.connect(envelope);
      envelope.connect(this.sound_ctx.destination);
      envelope.connect(delayLine);
      envelope.connect(reverbInput);

      envelope.gain.value = 0
      envelope.gain.linearRampToValueAtTime(n_amp, this.sound_ctx.currentTime + attack);
      envelope.gain.linearRampToValueAtTime(0, this.sound_ctx.currentTime + attack + decay);

      mod.start()
      carrier.start()

      carrier.stop(this.sound_ctx.currentTime + attack + decay);

      carrier.onended = function (e) {
        if (isSphere) {
          o_sphere.isPlaying = false;

          if (object.material != undefined) object.material.color.setHex(0x800000);
          else if (object.object.material != undefined) object.object.material.color.setHex(0x800000);
        }
      }
    },

    createRenderer() {
      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      document.body.appendChild(this.renderer.domElement);

      this.render = this.render.bind(this);
    },

    createLights() {
      this.ambient = new THREE.AmbientLight(0x404040, .15);
      this.scene.add(this.ambient);

      this.pointLight = new THREE.PointLight(0x990000);
      this.pointLight.position.z = 130;
      this.scene.add(this.pointLight);
    },

    createFog() {
      this.scene.fog = new THREE.Fog(0xf2f2f2, 1, 190);
    },

    pop(o_tree) {
      // if true, then add a sphere here on the end of the branch
      if (this.weightedRandom(o_tree.weightedRandom) === 1) this.addSphere(o_tree.pos, o_tree.dir, o_tree, o_tree.branchIDCounter);

      o_tree.pos = o_tree.posArray.pop();
      o_tree.dir = o_tree.dirArray.pop();

      let geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(o_tree.pos.x, o_tree.pos.y, o_tree.pos.z));

      // increment sub branch number within parent branch
      this.n_sub_number_branch++;
      // increment ID of branch to be paired up with a sphere on the tree
      o_tree.branchIDCounter++;

      // create the new line and add it to the scene
      this.line = new THREE.LineSegments(geometry, this.material);

      this.line.userData = {
        branch: this.n_numOfBranches,
        subNum: this.n_sub_number_branch,
        tree: o_tree.index,
        id: o_tree.branchIDCounter,
      };

      this.scene.add(this.line);
    },

    // THIS IS IN RADIANS!!!
    rotate(o_tree, amt) {
      let axis = [new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 1, 1), new THREE.Vector3(1, 1, 0)]

      if (o_tree.buildingBranch) {
        o_tree.dir.applyAxisAngle(axis[Math.floor(Math.random() * axis.length)], THREE.Math.degToRad(amt * 3));
      } else {
        o_tree.dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), THREE.Math.degToRad(amt));
      }
    },

    move(o_tree) {
      let amt = o_tree.n_size;
      let geometry = new THREE.Geometry();

      geometry.vertices.push(new THREE.Vector3(o_tree.pos.x, o_tree.pos.y, o_tree.pos.z));

      let newPos = o_tree.dir.clone();
      newPos.normalize();
      newPos.multiplyScalar(amt);

      o_tree.pos.add(newPos);

      geometry.vertices.push(new THREE.Vector3(o_tree.pos.x, o_tree.pos.y, o_tree.pos.z));

      // increment sub branch number within parent branch
      this.n_sub_number_branch++;
      // increment ID of branch to be paired up with a sphere on the tree
      o_tree.branchIDCounter++;

      // create the new line and add it to the scene
      this.line = new THREE.LineSegments(geometry, this.material);

      // add user data to the line segment
      this.line.userData = {
        branch: this.n_numOfBranches,
        subNum: this.n_sub_number_branch,
        tree: o_tree.index,
        id: o_tree.branchIDCounter,
      };

      this.scene.add(this.line);
    },

    push(o_tree) {
      o_tree.posArray.push(o_tree.pos.clone());
      o_tree.dirArray.push(o_tree.dir.clone());
    },

    render() {
      window.requestAnimationFrame(this.render);

      let holder = this;
      if (this.clock.getElapsedTime() >= 0.02) {
        this.o_trees.forEach(function (o_tree) {

          holder.animateSpheres(o_tree);

          // grow the tree if not done
          if (!o_tree.finished) {
            holder.animate(o_tree);
            o_tree.n_pos++;
          }

          // checks if done
          if (o_tree.n_pos >= holder.c_axion.length - 1) {

            o_tree.finished = true;
            o_tree.growing = false;

            holder.copySpheres(o_tree);
          }
        });

        this.clock = new THREE.Clock();
        this.clock.start();
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    },

    // updat simulation
    animate(o_tree) {
      let k = this.c_axion[o_tree.n_pos];

      if (k === "F" || k === "X" || k == "Y") {
        // move
        this.move(o_tree);

      } else if (k === "+") {
        // turn left
        this.rotate(o_tree, o_tree.n_angle);

      } else if (k === "-") {
        // turn right
        this.rotate(o_tree, o_tree.n_angle * -1);

      } else if (k === "[") {

        // if this is a inner branch within parent branch
        // then increment
        if (this.b_parentBranch) {
          this.n_branch_count++;
        }

        // otherwise, this is the outer parent branch
        if (!this.b_parentBranch) {
          this.b_parentBranch = true;
        }

        // building a branch
        o_tree.buildingBranch = true;
        this.push(o_tree);

      } else if (k === "]") {

        // finished with branch
        o_tree.buildingBranch = false

        // if we finished all the inner branches
        // or if we reach the maximum of a branch bundle
        // then create a new bundle
        if (this.n_branch_count == 0 || this.n_sub_number_branch >= o_tree.maxBranch) {
          this.b_parentBranch = false;
          this.n_numOfBranches = this.n_numOfBranches + 1;
          this.n_sub_number_branch = 0;
        }

        // else, keep decrementing until we reach outer bracket
        if (this.b_parentBranch) {
          this.n_branch_count--;
        }

        this.pop(o_tree);
      }

    },

    animateSpheres(o_tree) {
      // skips if the tree is not done, since there wont't be any clones
      if (o_tree.copy_spheres.length != 0) {

        // if no sphere is currently growing
        // then grab a random one
        if (o_tree.growingSphere == null) {
          let index = Math.floor(Math.random() * o_tree.copy_spheres.length);
          o_tree.growingSphere = o_tree.copy_spheres[index];

          // remove from the array of possible spheres to pick from
          o_tree.copy_spheres.splice(index, 1);
        }

        // the sphere is able to be animated at this scale
        // so that spheres don't begin to grow a tree before it's visible
        // in cases when a branch is clicked
        if (o_tree.growingSphere.sphere.scale.x >= 0.3) {
          let index = this.n_spheres.indexOf(o_tree.growingSphere);
          this.n_spheres[index].animated = true;
        }

        // if the scale is 1, then the sphere is done
        // otherwise, keep on growing it
        if (o_tree.growingSphere.sphere.scale.x >= 1) {
          o_tree.finishedSpheres.push(o_tree.growingSphere);
          o_tree.growingSphere = null;
        } else {
          o_tree.growingSphere.sphere.scale.x += 0.01;
          o_tree.growingSphere.sphere.scale.y += 0.01;
          o_tree.growingSphere.sphere.scale.z += 0.01;
        }
      }
    },

    // ===== HELPER METHODS =====


    copySpheres(o_tree) {
      o_tree.copy_spheres = o_tree.spheres.slice();
    },

    weightedRandom(number) {
      let n = Math.floor(Math.random() * 100);

      if (n < number) {
        return 0;
      } else {
        return 1;
      }
    },

    addTree(pos, dir, stepSize, angle, random, maxBranchNum) {

      this.o_trees.push({
        pos: pos,
        dir: dir,
        done: false,
        posArray: [],
        dirArray: [],
        n_pos: 0,
        n_size: stepSize,
        n_angle: angle,
        finished: false,
        growing: true,
        buildingBranch: false,
        spheres: [],
        copy_spheres: [],
        finishedSpheres: [],
        childBranches: [],
        growingSphere: null,
        weightedRandom: random,
        index: this.n_trees_count,
        maxBranch: maxBranchNum,
        branchIDCounter: 0,
      });

      this.n_trees_count++;

    },

    addSphere(pos, dir, o_tree, id) {

      let branchNum = this.n_numOfBranches;
      let rand = Math.floor(Math.random() * this.o_colors.length);
      let radius = (Math.floor(Math.random() * 1) + 0.8);
      var geometry = new THREE.SphereGeometry(radius, 16, 16);
      var material = new THREE.MeshBasicMaterial({
        color: this.o_colors[rand],
      });
      var sphere = new THREE.Mesh(geometry, material);

      sphere.userData = {
        branch: this.n_numOfBranches,
        tree: o_tree.index,
        id: id,
      };
      this.scene.add(sphere);
      sphere.position.set(pos.x, pos.y, pos.z);
      sphere.scale.x = 0.00001;
      sphere.scale.y = 0.00001;
      sphere.scale.z = 0.00001;
      let sphereObj = ({
        sphere: sphere,
        pos: pos,
        dir: dir,
        o_tree: o_tree,
        color: this.o_colors[rand],
        freq: this.o_frequency[rand],
        isPlaying: false,
        branch: false,
        radius: radius,
        branchNum: branchNum,
        index: o_tree.index,
        animated: false,
        id: id,
      });

      this.n_spheres.push(sphereObj);
      o_tree.spheres.push(sphereObj);
    },

    // interpret an L-system
    checkForRules(a_char) {

      // to be returned
      let s_output = '';

      // iterate through the rules looking for symbol matches:
      for (let i = 0; i < a_char.length; i++) {
        let b_match = false;

        // check depending on number of rules
        for (let j = 0; j < this.array_rules.length; j++) {

          if (a_char[i] === this.array_rules[j][0]) {

            // get the rules
            this.s_output += this.array_rules[j][1];
            b_match = true;
            break;
          }
        }

        // if nothing matches, just copy the symbol over.
        if (b_match === false) this.s_output += a_char[i];
      }

      return this.s_output;
    },

}

window.onload = () => app.init();

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finger swipe

THREE.OrbitControls = function (object, domElement) {

  this.object = object;

  this.domElement = (domElement !== undefined) ? domElement : document;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  this.minAzimuthAngle = -Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.panSpeed = 1.0;
  this.panningMode = THREE.ScreenSpacePanning; // alternate THREE.HorizontalPanning
  this.keyPanSpeed = 7.0; // pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40
  };

  // Mouse buttons
  this.mouseButtons = {
    ORBIT: THREE.MOUSE.LEFT,
    ZOOM: THREE.MOUSE.MIDDLE,
    PAN: THREE.MOUSE.RIGHT
  };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function () {

    return spherical.phi;

  };

  this.getAzimuthalAngle = function () {

    return spherical.theta;

  };

  this.saveState = function () {

    scope.target0.copy(scope.target);
    scope.position0.copy(scope.object.position);
    scope.zoom0 = scope.object.zoom;

  };

  this.reset = function () {

    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);

    scope.update();

    state = STATE.NONE;

  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = function () {

    var offset = new THREE.Vector3();

    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    return function update() {

      var position = scope.object.position;

      offset.copy(position).sub(scope.target);

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion(quat);

      // angle from z-axis around y-axis
      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {

        rotateLeft(getAutoRotationAngle());

      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi;

      // restrict theta to be between desired limits
      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));

      // restrict phi to be between desired limits
      spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

      spherical.makeSafe();


      spherical.radius *= scale;

      // restrict radius to be between desired limits
      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

      // move target to panned location
      scope.target.add(panOffset);

      offset.setFromSpherical(spherical);

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion(quatInverse);

      position.copy(scope.target).add(offset);

      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {

        sphericalDelta.theta *= (1 - scope.dampingFactor);
        sphericalDelta.phi *= (1 - scope.dampingFactor);

        panOffset.multiplyScalar(1 - scope.dampingFactor);

      } else {

        sphericalDelta.set(0, 0, 0);

        panOffset.set(0, 0, 0);

      }

      scale = 1;

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (zoomChanged ||
        lastPosition.distanceToSquared(scope.object.position) > EPS ||
        8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

        scope.dispatchEvent(changeEvent);

        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;

        return true;

      }

      return false;

    };

  }();

  this.dispose = function () {

    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);

    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    window.removeEventListener('keydown', onKeyDown, false);

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  //
  // internals
  //

  var scope = this;

  var changeEvent = {
    type: 'change'
  };
  var startEvent = {
    type: 'start'
  };
  var endEvent = {
    type: 'end'
  };

  var STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY: 4,
    TOUCH_PAN: 5
  };

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();

  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow(0.95, scope.zoomSpeed);

  }

  function rotateLeft(angle) {

    sphericalDelta.theta -= angle;

  }

  function rotateUp(angle) {

    sphericalDelta.phi -= angle;

  }

  var panLeft = function () {

    var v = new THREE.Vector3();

    return function panLeft(distance, objectMatrix) {

      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
      v.multiplyScalar(-distance);

      panOffset.add(v);

    };

  }();

  var panUp = function () {

    var v = new THREE.Vector3();

    return function panUp(distance, objectMatrix) {

      switch (scope.panningMode) {

        case THREE.ScreenSpacePanning:

          v.setFromMatrixColumn(objectMatrix, 1);
          break;

        case THREE.HorizontalPanning:

          v.setFromMatrixColumn(objectMatrix, 0);
          v.crossVectors(scope.object.up, v);
          break;

      }

      v.multiplyScalar(distance);

      panOffset.add(v);

    };

  }();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function () {

    var offset = new THREE.Vector3();

    return function pan(deltaX, deltaY) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if (scope.object.isPerspectiveCamera) {

        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
        panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);

      } else if (scope.object.isOrthographicCamera) {

        // orthographic
        panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
        panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);

      } else {

        // camera neither orthographic nor perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;

      }

    };

  }();

  function dollyIn(dollyScale) {

    if (scope.object.isPerspectiveCamera) {

      scale /= dollyScale;

    } else if (scope.object.isOrthographicCamera) {

      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;

    }

  }

  function dollyOut(dollyScale) {

    if (scope.object.isPerspectiveCamera) {

      scale *= dollyScale;

    } else if (scope.object.isOrthographicCamera) {

      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate(event) {

    //console.log( 'handleMouseDownRotate' );

    rotateStart.set(event.clientX, event.clientY);

  }

  function handleMouseDownDolly(event) {

    //console.log( 'handleMouseDownDolly' );

    dollyStart.set(event.clientX, event.clientY);

  }

  function handleMouseDownPan(event) {

    //console.log( 'handleMouseDownPan' );

    panStart.set(event.clientX, event.clientY);

  }

  function handleMouseMoveRotate(event) {

    //console.log( 'handleMouseMoveRotate' );

    rotateEnd.set(event.clientX, event.clientY);

    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);;

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);

    rotateStart.copy(rotateEnd);

    scope.update();

  }

  function handleMouseMoveDolly(event) {

    //console.log( 'handleMouseMoveDolly' );

    dollyEnd.set(event.clientX, event.clientY);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {

      dollyIn(getZoomScale());

    } else if (dollyDelta.y < 0) {

      dollyOut(getZoomScale());

    }

    dollyStart.copy(dollyEnd);

    scope.update();

  }

  function handleMouseMovePan(event) {

    //console.log( 'handleMouseMovePan' );

    panEnd.set(event.clientX, event.clientY);

    panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();

  }

  function handleMouseUp(event) {

    // console.log( 'handleMouseUp' );

  }

  function handleMouseWheel(event) {

    // console.log( 'handleMouseWheel' );

    if (event.deltaY < 0) {

      dollyOut(getZoomScale());

    } else if (event.deltaY > 0) {

      dollyIn(getZoomScale());

    }

    scope.update();

  }

  function handleKeyDown(event) {

    //console.log( 'handleKeyDown' );

    switch (event.keyCode) {

      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan(0, -scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan(-scope.keyPanSpeed, 0);
        scope.update();
        break;

    }

  }

  function handleTouchStartRotate(event) {

    //console.log( 'handleTouchStartRotate' );

    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  function handleTouchStartDolly(event) {

    //console.log( 'handleTouchStartDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyStart.set(0, distance);

  }

  function handleTouchStartPan(event) {

    //console.log( 'handleTouchStartPan' );

    panStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  function handleTouchMoveRotate(event) {

    //console.log( 'handleTouchMoveRotate' );

    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);

    rotateStart.copy(rotateEnd);

    scope.update();

  }

  function handleTouchMoveDolly(event) {

    //console.log( 'handleTouchMoveDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyEnd.set(0, distance);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {

      dollyOut(getZoomScale());

    } else if (dollyDelta.y < 0) {

      dollyIn(getZoomScale());

    }

    dollyStart.copy(dollyEnd);

    scope.update();

  }

  function handleTouchMovePan(event) {

    //console.log( 'handleTouchMovePan' );

    panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();

  }

  function handleTouchEnd(event) {

    //console.log( 'handleTouchEnd' );

  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onMouseDown(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

    switch (event.button) {

      case scope.mouseButtons.ORBIT:

        if (scope.enableRotate === false) return;

        handleMouseDownRotate(event);

        state = STATE.ROTATE;

        break;

      case scope.mouseButtons.ZOOM:

        if (scope.enableZoom === false) return;

        handleMouseDownDolly(event);

        state = STATE.DOLLY;

        break;

      case scope.mouseButtons.PAN:

        if (scope.enablePan === false) return;

        handleMouseDownPan(event);

        state = STATE.PAN;

        break;

    }

    if (state !== STATE.NONE) {

      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);

      scope.dispatchEvent(startEvent);

    }

  }

  function onMouseMove(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

    switch (state) {

      case STATE.ROTATE:

        if (scope.enableRotate === false) return;

        handleMouseMoveRotate(event);

        break;

      case STATE.DOLLY:

        if (scope.enableZoom === false) return;

        handleMouseMoveDolly(event);

        break;

      case STATE.PAN:

        if (scope.enablePan === false) return;

        handleMouseMovePan(event);

        break;

    }

  }

  function onMouseUp(event) {

    if (scope.enabled === false) return;

    handleMouseUp(event);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;

  }

  function onMouseWheel(event) {

    if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;

    event.preventDefault();
    event.stopPropagation();

    scope.dispatchEvent(startEvent);

    handleMouseWheel(event);

    scope.dispatchEvent(endEvent);

  }

  function onKeyDown(event) {

    if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

    handleKeyDown(event);

  }

  function onTouchStart(event) {

    if (scope.enabled === false) return;

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate

        if (scope.enableRotate === false) return;

        handleTouchStartRotate(event);

        state = STATE.TOUCH_ROTATE;

        break;

      case 2: // two-fingered touch: dolly

        if (scope.enableZoom === false) return;

        handleTouchStartDolly(event);

        state = STATE.TOUCH_DOLLY;

        break;

      case 3: // three-fingered touch: pan

        if (scope.enablePan === false) return;

        handleTouchStartPan(event);

        state = STATE.TOUCH_PAN;

        break;

      default:

        state = STATE.NONE;

    }

    if (state !== STATE.NONE) {

      scope.dispatchEvent(startEvent);

    }

  }

  function onTouchMove(event) {

    if (scope.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate

        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?...

        handleTouchMoveRotate(event);

        break;

      case 2: // two-fingered touch: dolly

        if (scope.enableZoom === false) return;
        if (state !== STATE.TOUCH_DOLLY) return; // is this needed?...

        handleTouchMoveDolly(event);

        break;

      case 3: // three-fingered touch: pan

        if (scope.enablePan === false) return;
        if (state !== STATE.TOUCH_PAN) return; // is this needed?...

        handleTouchMovePan(event);

        break;

      default:

        state = STATE.NONE;

    }

  }

  function onTouchEnd(event) {

    if (scope.enabled === false) return;

    handleTouchEnd(event);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;

  }

  function onContextMenu(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

  }

  //

  scope.domElement.addEventListener('contextmenu', onContextMenu, false);

  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);

  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);

  window.addEventListener('keydown', onKeyDown, false);

  // force an update at start

  this.update();

};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties(THREE.OrbitControls.prototype, {

  center: {

    get: function () {

      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;

    }

  },

  // backward compatibility

  noZoom: {

    get: function () {

      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      return !this.enableZoom;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      this.enableZoom = !value;

    }

  },

  noRotate: {

    get: function () {

      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      return !this.enableRotate;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      this.enableRotate = !value;

    }

  },

  noPan: {

    get: function () {

      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      return !this.enablePan;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      this.enablePan = !value;

    }

  },

  noKeys: {

    get: function () {

      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      return !this.enableKeys;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      this.enableKeys = !value;

    }

  },

  staticMoving: {

    get: function () {

      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      return !this.enableDamping;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      this.enableDamping = !value;

    }

  },

  dynamicDampingFactor: {

    get: function () {

      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      return this.dampingFactor;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      this.dampingFactor = value;

    }

  }

});

THREE.ScreenSpacePanning = 0;
THREE.HorizontalPanning = 1;
