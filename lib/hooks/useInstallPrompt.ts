import { useState, useEffect } from "react";
import { Platform } from "react-native";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSWeb, setIsIOSWeb] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Detect if running on iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);

    // Check if app is already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone);

    if (isIos && isSafari && !isStandalone) {
      setIsIOSWeb(true);
      setIsInstallable(true);
    }

    // Android/Chrome event listener
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Stash the event so it can be triggered later.
      setPromptEvent(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If app gets installed while using it
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!promptEvent) return;

    // Show the install prompt
    await promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;

    if (outcome === "accepted") {
      setIsInstallable(false);
    }
  };

  return { isInstallable, isIOSWeb, isInstalled, promptInstall };
}
