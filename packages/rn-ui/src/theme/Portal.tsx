import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";

export type PortalLayer = "overlay" | "popover" | "tooltip" | "toast";

const PORTAL_LAYER_ORDER: Record<PortalLayer, number> = {
  overlay: 10,
  popover: 20,
  tooltip: 30,
  toast: 100,
};

interface PortalEntry {
  key: string;
  host: string;
  layerOrder: number;
  seq: number;
  node: ReactNode;
}

class PortalStore {
  private entries = new Map<string, PortalEntry>();
  private listeners = new Map<string, Set<() => void>>();
  private seq = 0;

  mount(key: string, host: string, layer: PortalLayer, node: ReactNode) {
    const existing = this.entries.get(key);
    const layerOrder = PORTAL_LAYER_ORDER[layer];
    const seq = existing ? existing.seq : ++this.seq;
    this.entries.set(key, { key, host, layerOrder, seq, node });
    this.notify(host);
    if (existing && existing.host !== host) {
      this.notify(existing.host);
    }
  }

  unmount(key: string) {
    const existing = this.entries.get(key);
    if (!existing) return;
    this.entries.delete(key);
    this.notify(existing.host);
  }

  subscribe(host: string, listener: () => void): () => void {
    let set = this.listeners.get(host);
    if (!set) {
      set = new Set();
      this.listeners.set(host, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listeners.delete(host);
      }
    };
  }

  getEntriesForHost(host: string): PortalEntry[] {
    const result: PortalEntry[] = [];
    this.entries.forEach((entry) => {
      if (entry.host === host) {
        result.push(entry);
      }
    });
    result.sort((a, b) =>
      a.layerOrder !== b.layerOrder ? a.layerOrder - b.layerOrder : a.seq - b.seq,
    );
    return result;
  }

  private notify(host: string) {
    this.listeners.get(host)?.forEach((listener) => listener());
  }
}

const PortalContext = createContext<PortalStore | null>(null);

export interface PortalProviderProps {
  children: ReactNode;
}

export function PortalProvider({ children }: PortalProviderProps) {
  const storeRef = useRef<PortalStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new PortalStore();
  }

  return (
    <PortalContext.Provider value={storeRef.current}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalContext() {
  return useContext(PortalContext);
}

export interface PortalHostProps {
  name?: string;
}

export function PortalHost({ name = "root" }: PortalHostProps) {
  const store = usePortalContext();
  const [entries, setEntries] = useState<PortalEntry[]>(() =>
    store ? store.getEntriesForHost(name) : [],
  );

  useEffect(() => {
    if (!store) {
      setEntries([]);
      return;
    }
    setEntries(store.getEntriesForHost(name));
    return store.subscribe(name, () => {
      setEntries(store.getEntriesForHost(name));
    });
  }, [name, store]);

  if (!store || entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="box-none" collapsable={false}>
      {entries.map((entry) => (
        <React.Fragment key={entry.key}>{entry.node}</React.Fragment>
      ))}
    </View>
  );
}

export interface PortalProps {
  children: ReactNode;
  layer?: PortalLayer;
  host?: string;
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Portal({
  children,
  layer = "overlay",
  host = "root",
}: PortalProps) {
  const store = usePortalContext();
  const id = useId();
  const portalKey = useMemo(() => `portal:${id}`, [id]);

  useIsoLayoutEffect(() => {
    if (!store) return;
    store.mount(portalKey, host, layer, children);
  }, [children, host, layer, portalKey, store]);

  useEffect(() => {
    return () => {
      store?.unmount(portalKey);
    };
  }, [portalKey, store]);

  if (!store) {
    return <>{children}</>;
  }

  return null;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
});
