import { useRegisterSW } from "virtual:pwa-register/react";

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

  return {
    needRefresh,
    offlineReady,
    update: () => updateServiceWorker(true),
  };
}
