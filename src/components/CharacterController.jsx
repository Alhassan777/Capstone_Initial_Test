import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCharacterAnimations } from '../contexts/CharacterAnimations';
import * as THREE from 'three';

const CharacterController = ({ model, animations }) => {
  const mixer = useRef();
  const actions = useRef({});
  const [animationState, setAnimationState] = useState('idle');
  const [movementState, setMovementState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false
  });
  
  // Movement and rotation
  const characterRef = useRef(new THREE.Vector3());
  const rotationRef = useRef(new THREE.Euler());
  const walkDirection = useRef(new THREE.Vector3());
  const rotateAngle = useRef(new THREE.Vector3(0, 1, 0));
  const rotateQuarternion = useRef(new THREE.Quaternion());
  const cameraTarget = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const collisionObjects = useRef([]);
  const cameraOffset = useRef(new THREE.Vector3(0, 2, 5));
  
  // Constants
  const walkSpeed = 2;
  const runSpeed = 4;
  const rotationSpeed = 7;
  const cameraLerpFactor = 0.1;
  const collisionDistance = 0.5;
  
  // Animation states
  const idleAction = useRef();
  const walkAction = useRef();
  const runAction = useRef();
  
  useEffect(() => {
    if (!model) return;
    
    // Setup animation mixer
    mixer.current = new THREE.AnimationMixer(model);
    
    // Setup actions
    idleAction.current = mixer.current.clipAction(animations[0]); // Idle animation
    walkAction.current = mixer.current.clipAction(animations[3]); // Walk animation
    runAction.current = mixer.current.clipAction(animations[1]); // Run animation
    
    actions.current = {
      idle: idleAction.current,
      walk: walkAction.current,
      run: runAction.current
    };
    
    // Start with idle animation
    idleAction.current.play();

    // Initialize collision objects
    if (window.collisionObjects) {
      collisionObjects.current = window.collisionObjects;
    }
    
    // Setup keyboard controls
    const handleKeyDown = (event) => {
      switch(event.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovementState(prev => ({ ...prev, forward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovementState(prev => ({ ...prev, backward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovementState(prev => ({ ...prev, left: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovementState(prev => ({ ...prev, right: true }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMovementState(prev => ({ ...prev, shift: true }));
          break;
      }
    };

    const handleKeyUp = (event) => {
      switch(event.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovementState(prev => ({ ...prev, forward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovementState(prev => ({ ...prev, backward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovementState(prev => ({ ...prev, left: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovementState(prev => ({ ...prev, right: false }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMovementState(prev => ({ ...prev, shift: false }));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      // Cleanup
      mixer.current.stopAllAction();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [model, animations]);
  
  // Handle animation transitions
  const prepareCrossFade = (startAction, endAction, duration = 0.5) => {
    // Ensure the end action has full weight
    endAction.enabled = true;
    endAction.setEffectiveTimeScale(1);
    endAction.setEffectiveWeight(1);
    
    // Crossfade with warping
    startAction.crossFadeTo(endAction, duration, true);
  };
  
  // Animation state machine
  const transitionTo = (newState) => {
    const currentAction = actions.current[animationState];
    const nextAction = actions.current[newState];
    
    if (currentAction === nextAction) return;
    
    prepareCrossFade(currentAction, nextAction);
    setAnimationState(newState);
  };
  
  // Update animation mixer and handle movement
  useFrame((state, delta) => {
    if (!model || !mixer.current) return;

    mixer.current.update(delta);

    // Handle movement
    const isMoving = movementState.forward || movementState.backward || movementState.left || movementState.right;
    const isRunning = movementState.shift;

    // Calculate current velocity
    const currentSpeed = isMoving ? (isRunning ? runSpeed : walkSpeed) : 0;

    // Update animation state based on velocity
    if (currentSpeed === 0) {
      if (animationState !== 'idle') transitionTo('idle');
    } else if (currentSpeed === runSpeed) {
      if (animationState !== 'run') transitionTo('run');
    } else {
      if (animationState !== 'walk') transitionTo('walk');
    }

    // Calculate movement direction
    const speed = isRunning ? runSpeed : walkSpeed;
    const angleYCameraDirection = Math.atan2(
      (state.camera.position.x - model.position.x),
      (state.camera.position.z - model.position.z)
    );

    // Rotate model
    let directionOffset = 0;

    if (movementState.forward) {
      if (movementState.left) directionOffset = Math.PI / 4;
      else if (movementState.right) directionOffset = -Math.PI / 4;
    } else if (movementState.backward) {
      if (movementState.left) directionOffset = Math.PI / 4 + Math.PI / 2;
      else if (movementState.right) directionOffset = -Math.PI / 4 - Math.PI / 2;
      else directionOffset = Math.PI;
    } else if (movementState.left) directionOffset = Math.PI / 2;
    else if (movementState.right) directionOffset = -Math.PI / 2;

    if (isMoving) {
      // Calculate rotation
      rotateQuarternion.current.setFromAxisAngle(
        rotateAngle.current,
        angleYCameraDirection + directionOffset
      );
      model.quaternion.rotateTowards(rotateQuarternion.current, delta * rotationSpeed);

      // Calculate movement
      const moveX = Math.sin(angleYCameraDirection + directionOffset) * speed * delta;
      const moveZ = Math.cos(angleYCameraDirection + directionOffset) * speed * delta;

      // Check for collisions
      const nextPosition = new THREE.Vector3(
        model.position.x + moveX,
        model.position.y,
        model.position.z + moveZ
      );

      raycaster.current.set(nextPosition, new THREE.Vector3(0, -1, 0));
      const intersects = raycaster.current.intersectObjects(collisionObjects.current);
      const canMove = intersects.length === 0 || intersects[0].distance > collisionDistance;

      if (canMove) {
        model.position.copy(nextPosition);
      }

      // Update camera position with smooth follow
      const idealOffset = cameraOffset.current.clone().applyQuaternion(model.quaternion);
      const idealPosition = model.position.clone().add(idealOffset);
      state.camera.position.lerp(idealPosition, cameraLerpFactor);

      // Update camera target with smooth follow
      cameraTarget.current.x = model.position.x;
      cameraTarget.current.y = model.position.y + 1;
      cameraTarget.current.z = model.position.z;
      state.camera.lookAt(cameraTarget.current);
    }
  });
  
  return null;
};

export default CharacterController;