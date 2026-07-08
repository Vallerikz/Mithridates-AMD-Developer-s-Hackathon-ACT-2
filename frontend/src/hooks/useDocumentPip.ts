"use client";

import { useState, useCallback } from "react";

// Experimental API declaration for TypeScript
interface DocumentPictureInPicture {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

/**
 * Custom hook to manage the experimental Document Picture-in-Picture (PiP) API.
 * Handles window creation, CSS stylesheet cloning, and state management.
 */
export function useDocumentPip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  /**
   * Requests a new Document PiP window and clones the host document's stylesheets.
   */
  const openPipOverlay = useCallback(async () => {
    if (!("documentPictureInPicture" in window)) {
      alert("Your browser does not support Document Picture-in-Picture. Please use Google Chrome Desktop.");
      return;
    }

    try {
      const pip = await window.documentPictureInPicture!.requestWindow({
        width: 450,
        height: 600,
      });

      // Clone Tailwind CSS into the new window to maintain UI consistency
      Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((node) => {
        pip.document.head.appendChild(node.cloneNode(true));
      });

      pip.document.body.className = "bg-white overflow-y-auto";

      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(pip);
    } catch (err) {
      console.error("Failed to open PiP window:", err);
    }
  }, []);

  /**
   * Closes the active Document PiP window if it exists.
   */
  const closePipOverlay = useCallback(() => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  }, [pipWindow]);

  return {
    pipWindow,
    openPipOverlay,
    closePipOverlay,
  };
}
