import { useState, useEffect, useRef } from "react";

export function useSplitter(initialPercent = 68) {
  const [gridWidthPercent, setGridWidthPercent] = useState(initialPercent);
  const isResizingRef = useRef(false);
  const workspaceRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current || !workspaceRef.current) return;
      const workspaceRect = workspaceRef.current.getBoundingClientRect();
      const currentXInsideWorkspace = e.clientX - workspaceRect.left;
      let newPercent = (currentXInsideWorkspace / workspaceRect.width) * 100;
      
      if (newPercent < 25) newPercent = 25;
      if (newPercent > 85) newPercent = 85;
      
      setGridWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.userSelect = "unset";
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const initiateResize = () => {
    isResizingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  return { gridWidthPercent, workspaceRef, initiateResize, isResizingRef };
}