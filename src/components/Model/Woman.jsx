// ... existing imports and component setup ...

// Inside your component where animations are handled
const setupAnimation = (clip) => {
  if (!clip) return null;
  
  const action = mixer.current.clipAction(clip);
  action.play();
  return action;
};

// Add new animation state management
const [isMoving, setIsMoving] = useState(false);
const velocity = useRef(0);

useEffect(() => {
  const handleMovementChange = (speed) => {
    velocity.current = speed;
    setIsMoving(speed > 0.1);
    
    if (speed > 0.5) {
      prepareCrossFade(currentAction.current, runAction.current, 0.2);
    } else if (speed > 0.1) {
      prepareCrossFade(currentAction.current, walkAction.current, 0.2);
    } else {
      prepareCrossFade(currentAction.current, idleAction.current, 0.2);
    }
  };
  
  // Connect to your character movement system here
}, []);

// In your animation transition logic (likely around line 51)
const fadeOutPrevious = () => {
  if (previousAnimation.current && actions.current[previousAnimation.current]) {
    // Add safety check for existing action
    actions.current[previousAnimation.current].fadeOut(0.5);
  }
  previousAnimation.current = activeAnimation;
};

// In your animation transition logic (likely around line 51)
const prepareCrossFade = (oldAction, newAction, duration) => {
  if (oldAction === newAction) return;
  
  oldAction.fadeOut(duration);
  newAction.reset().fadeIn(duration).play();
  currentAction.current = newAction;
};