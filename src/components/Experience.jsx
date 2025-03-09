import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useCharacterCustomization } from "../contexts/CharacterCustomizationContext";
import { CameraControls } from "./CameraControls";
import Woman from "./Woman";

const Experience = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  const { takeScreenshot, setTakeScreenshot } = useCharacterCustomization();
  useEffect(() => {
    if (takeScreenshot) {
      screenshot();
      setTakeScreenshot(false);
    }
  }, [takeScreenshot]);

  // Initialize collision objects
  useEffect(() => {
    const obstacles = scene.children.filter(child => 
      child.type === 'Mesh' && child !== scene.children.find(c => c.rotation.x === -0.5 * Math.PI)
    );
    window.collisionObjects = obstacles;
  }, [scene]);

  const screenshot = () => {
    const link = document.createElement("a");
    link.setAttribute("download", "screenshot.png");
    link.setAttribute(
      "href",
      gl.domElement
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream")
    );
    link.click();
  };

  return (
    <>
      <CameraControls />
      <ambientLight />
      <directionalLight
        position={[-5, 5, 5]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <group position={[0, -1, 0]}>
        <Woman />
      </group>
      {/* Ground plane */}
      <mesh
        rotation={[-0.5 * Math.PI, 0, 0]}
        position={[0, -1, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#303030" />
      </mesh>
      {/* Simple obstacles */}
      <mesh position={[-5, 0, -5]} castShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[5, 0, -3]} castShadow>
        <boxGeometry args={[2, 4, 2]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[0, 0, -8]} castShadow>
        <boxGeometry args={[4, 1, 4]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </>
  );
};

export default Experience;
