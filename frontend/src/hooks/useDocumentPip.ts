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
  // Lazy initializer: computed once on mount, never during SSR (`window` doesn't
  // exist there). Safe from hydration mismatches because this flag only gates UI
  // that appears after the user starts a stream, never the initial render.
  const [isPipSupported] = useState(
    () => typeof window !== "undefined" && "documentPictureInPicture" in window
  );

  /**
   * Requests a new Document PiP window and clones the host document's stylesheets.
   * Resolves to `true` once the overlay is open, and `false` when the caller must
   * fall back to rendering the feed inline.
   */
  const openPipOverlay = useCallback(async (): Promise<boolean> => {
    if (!("documentPictureInPicture" in window)) {
      return false;
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
      return true;
    } catch (err) {
      console.error("Failed to open PiP window:", err);
      return false;
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
    isPipSupported,
    openPipOverlay,
    closePipOverlay,
  };
}
