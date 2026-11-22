import { mock } from "bun:test";
import React from "react";

export interface MockUiState {
  colorScheme: "light" | "dark";
  reducedMotion: boolean;
  windowWidth: number;
  windowHeight: number;
  appState: "active" | "background" | "inactive";
  hapticCount: number;
  withSpringCallCount: number;
  appStateListeners: Set<(state: string) => void>;
  anchorRect: { x: number; y: number; width: number; height: number };
  reset(): void;
}

export const mockUiState: MockUiState = {
  colorScheme: "light",
  reducedMotion: false,
  windowWidth: 390,
  windowHeight: 844,
  appState: "active",
  hapticCount: 0,
  withSpringCallCount: 0,
  appStateListeners: new Set(),
  anchorRect: { x: 24, y: 120, width: 140, height: 44 },
  reset() {
    this.colorScheme = "light";
    this.reducedMotion = false;
    this.windowWidth = 390;
    this.windowHeight = 844;
    this.appState = "active";
    this.hapticCount = 0;
    this.withSpringCallCount = 0;
    this.appStateListeners.clear();
    this.anchorRect = { x: 24, y: 120, width: 140, height: 44 };
  },
};

export function flattenStyle(s: unknown): Record<string, unknown> {
  if (Array.isArray(s)) {
    return Object.assign({}, ...s.filter(Boolean).map(flattenStyle));
  }
  return typeof s === "object" && s ? (s as Record<string, unknown>) : {};
}

function withLayoutHandle(tag: string) {
  return React.forwardRef<unknown, Record<string, unknown>>(
    function MockHost(props, ref) {
      React.useImperativeHandle(ref, () => ({
        focus: () => {},
        blur: () => {},
        clear: () => {},
        measureInWindow: (
          cb: (x: number, y: number, w: number, h: number) => void,
        ) => {
          const r = mockUiState.anchorRect;
          cb(r.x, r.y, r.width, r.height);
        },
        measure: (
          cb: (
            x: number,
            y: number,
            w: number,
            h: number,
            px: number,
            py: number,
          ) => void,
        ) => {
          const r = mockUiState.anchorRect;
          cb(0, 0, r.width, r.height, r.x, r.y);
        },
        scrollTo: () => {},
        scrollToOffset: () => {},
        scrollToEnd: () => {},
      }));

      const { style, children, ...rest } = props;
      const flat = flattenStyle(style);
      const renderedChildren =
        typeof children === "function"
          ? (children as (state: { pressed: boolean }) => React.ReactNode)({
              pressed: false,
            })
          : (children as React.ReactNode);

      const resolvedStyle =
        typeof style === "function"
          ? flattenStyle(
              (style as (state: { pressed: boolean }) => unknown)({
                pressed: false,
              }),
            )
          : flat;

      return React.createElement(
        tag,
        {
          ...rest,
          style: resolvedStyle,
          "data-style": JSON.stringify(resolvedStyle),
        },
        renderedChildren,
      );
    },
  );
}

const MockView = withLayoutHandle("rn-view");
const MockScrollView = withLayoutHandle("rn-scrollview");
const MockText = withLayoutHandle("rn-text");
const MockTextInput = withLayoutHandle("rn-textinput");
const MockPressable = withLayoutHandle("rn-pressable");
const MockImage = withLayoutHandle("rn-image");
const MockKAV = withLayoutHandle("rn-kav");

function MockFlatList<T>(
  props: {
    data?: T[] | null;
    renderItem?: (info: { item: T; index: number }) => React.ReactNode;
    ListEmptyComponent?: React.ReactNode;
    style?: unknown;
    contentContainerStyle?: unknown;
  } & Record<string, unknown>,
) {
  const { data = [], renderItem, ListEmptyComponent, ...rest } = props;
  const items = Array.isArray(data) ? data : [];
  const children =
    items.length > 0 && renderItem
      ? items.map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: `fl-${index}` },
            renderItem({ item, index }),
          ),
        )
      : ListEmptyComponent ?? null;

  return React.createElement(
    "rn-flatlist",
    {
      ...rest,
      "data-style": JSON.stringify(flattenStyle(props.style)),
    },
    children,
  );
}

const FlatListWithRef = React.forwardRef<
  unknown,
  {
    data?: unknown[] | null;
    renderItem?: (info: { item: unknown; index: number }) => React.ReactNode;
    ListEmptyComponent?: React.ReactNode;
    style?: unknown;
    contentContainerStyle?: unknown;
  } & Record<string, unknown>
>(function FlatListWrapper(props, ref) {
  React.useImperativeHandle(ref, () => ({
    scrollToOffset: () => {},
    scrollToIndex: () => {},
    scrollToEnd: () => {},
  }));
  return MockFlatList(props);
});

function MockModal(
  props: {
    visible?: boolean;
    children?: React.ReactNode;
    onRequestClose?: () => void;
  } & Record<string, unknown>,
) {
  if (!props.visible) return null;
  return React.createElement("rn-modal", props, props.children);
}

mock.module("react-native", () => ({
  View: MockView,
  Text: MockText,
  TextInput: MockTextInput,
  Pressable: MockPressable,
  ScrollView: MockScrollView,
  FlatList: FlatListWithRef,
  Modal: MockModal,
  Image: MockImage,
  KeyboardAvoidingView: MockKAV,
  ActivityIndicator: (props: Record<string, unknown>) =>
    React.createElement("rn-activity-indicator", props),
  Switch: (props: Record<string, unknown>) =>
    React.createElement("rn-switch", props),
  StatusBar: {
    currentHeight: 24,
  },
  Platform: {
    OS: "android",
    select: <T>(obj: Record<string, T>): T | undefined =>
      obj.android ?? obj.default,
  },
  Dimensions: {
    get: () => ({
      width: mockUiState.windowWidth,
      height: mockUiState.windowHeight,
      scale: 2,
      fontScale: 1,
    }),
    addEventListener: () => ({ remove: () => {} }),
  },
  useWindowDimensions: () => ({
    width: mockUiState.windowWidth,
    height: mockUiState.windowHeight,
    scale: 2,
    fontScale: 1,
  }),
  useColorScheme: () => mockUiState.colorScheme,
  AppState: {
    get currentState() {
      return mockUiState.appState;
    },
    addEventListener: (_event: string, listener: (state: string) => void) => {
      mockUiState.appStateListeners.add(listener);
      return {
        remove: () => {
          mockUiState.appStateListeners.delete(listener);
        },
      };
    },
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => mockUiState.reducedMotion,
    addEventListener: () => ({ remove: () => {} }),
  },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    flatten: flattenStyle,
    hairlineWidth: 0.5,
    absoluteFill: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
  },
}));

mock.module("react-native-reanimated", () => ({
  default: {
    View: withLayoutHandle("anim-view"),
    Text: withLayoutHandle("anim-text"),
    ScrollView: withLayoutHandle("anim-scrollview"),
    FlatList: FlatListWithRef,
    createAnimatedComponent: <T>(Comp: T) => Comp,
  },
  createAnimatedComponent: <T>(Comp: T) => Comp,
  useSharedValue: <T>(initial: T) => {
    const storeRef = React.useRef<{ value: T }>({ value: initial });
    const wrapperRef = React.useRef<{
      value: T;
      get(): T;
      set(next: T): void;
    } | null>(null);
    if (!wrapperRef.current) {
      wrapperRef.current = {
        get value() {
          return storeRef.current.value;
        },
        set value(next: T) {
          storeRef.current.value = next;
        },
        get: () => storeRef.current.value,
        set: (next: T) => {
          storeRef.current.value = next;
        },
      };
    }
    return wrapperRef.current;
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useAnimatedScrollHandler: () => () => {},
  useAnimatedProps: (fn: () => unknown) => fn(),
  useDerivedValue: <T>(fn: () => T) => ({ value: fn() }),
  useReducedMotion: () => mockUiState.reducedMotion,
  withTiming: <T>(toValue: T, _cfg?: unknown, cb?: (finished?: boolean) => void) => {
    if (typeof cb === "function") {
      cb(true);
    }
    return toValue;
  },
  interpolateColor: (
    _val: number,
    _input: number[],
    outputColors: string[],
  ) => outputColors[0] ?? "#000000",
  withDelay: <T>(_delay: number, anim: T) => anim,
  withRepeat: <T>(anim: T) => anim,
  withSequence: <T>(...anims: T[]) => anims[anims.length - 1],
  withSpring: <T>(toValue: T) => {
    mockUiState.withSpringCallCount += 1;
    return toValue;
  },
  cancelAnimation: () => {},
  interpolate: (
    val: number,
    input: number[],
    output: number[],
  ): number => {
    if (!input.length || !output.length) return 0;
    if (val <= input[0]!) return output[0]!;
    const last = input.length - 1;
    if (val >= input[last]!) return output[last]!;
    return output[0]!;
  },
  Extrapolation: { CLAMP: "clamp" },
  Easing: {
    bezier: () => (t: number) => t,
    linear: (t: number) => t,
    ease: (t: number) => t,
  },
  cubicBezier: () => "cubic-bezier(0.23, 1, 0.32, 1)",
}));

mock.module("react-native-gesture-handler", () => ({
  GestureHandlerRootView: MockView,
  GestureDetector: (props: {
    gesture?: unknown;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      "rngh-detector",
      { "data-gesture": props.gesture },
      props.children,
    ),
  usePanGesture: (config?: Record<string, unknown>) => ({
    kind: "pan",
    config: config ?? {},
  }),
  useTapGesture: (config?: Record<string, unknown>) => ({
    kind: "tap",
    config: config ?? {},
  }),
  useCompetingGestures: (...gestures: unknown[]) => ({
    kind: "competing",
    gestures,
  }),
  useExclusiveGestures: (...gestures: unknown[]) => ({
    kind: "exclusive",
    gestures,
  }),
  useSimultaneousGestures: (...gestures: unknown[]) => ({
    kind: "simultaneous",
    gestures,
  }),
}));

mock.module("react-native-worklets", () => ({
  runOnJS: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  scheduleOnRN: <Args extends unknown[]>(
    fn: (...args: Args) => unknown,
    ...args: Args
  ) => {
    fn(...args);
  },
  runOnUI: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  scheduleOnUI: <Args extends unknown[]>(
    fn: (...args: Args) => unknown,
    ...args: Args
  ) => {
    fn(...args);
  },
}));

mock.module("react-native-svg", () => {
  const SvgMock = (props: Record<string, unknown>) =>
    React.createElement("svg", props, props.children as React.ReactNode);
  const primitive = (tag: string) => (props: Record<string, unknown>) =>
    React.createElement(tag, props, props.children as React.ReactNode);
  return {
    default: SvgMock,
    Svg: SvgMock,
    Circle: primitive("circle"),
    Ellipse: primitive("ellipse"),
    Path: primitive("path"),
    Polygon: primitive("polygon"),
    Polyline: primitive("polyline"),
    Line: primitive("line"),
    Rect: primitive("rect"),
    G: primitive("g"),
    Text: primitive("svg-text"),
    TSpan: primitive("tspan"),
    Defs: primitive("defs"),
    LinearGradient: primitive("linearGradient"),
    RadialGradient: primitive("radialGradient"),
    Stop: primitive("stop"),
  };
});

const localeConfigStore: {
  locales: Record<string, Record<string, unknown>>;
  defaultLocale: string;
} = {
  locales: {},
  defaultLocale: "en",
};

mock.module("react-native-calendars", () => ({
  Calendar: (props: Record<string, unknown>) =>
    React.createElement("wix-calendar", props),
  ExpandableCalendar: Object.assign(
    (props: Record<string, unknown>) =>
      React.createElement("wix-expandable-calendar", props),
    { positions: { CLOSED: "closed", OPEN: "open" } },
  ),
  CalendarProvider: (props: Record<string, unknown>) =>
    React.createElement(
      "wix-calendar-provider",
      props,
      props.children as React.ReactNode,
    ),
  AgendaList: (props: Record<string, unknown>) =>
    React.createElement("wix-agenda-list", props),
  WeekCalendar: (props: Record<string, unknown>) =>
    React.createElement("wix-week-calendar", props),
  Timeline: (props: Record<string, unknown>) =>
    React.createElement("wix-timeline", props),
  TimelineList: (props: Record<string, unknown>) =>
    React.createElement("wix-timeline-list", props),
  CalendarUtils: {
    getCalendarDateString: (d: Date) => d.toISOString().slice(0, 10),
  },
  LocaleConfig: localeConfigStore,
}));

mock.module("react-native-calendars/src/expandableCalendar", () => ({
  Positions: {
    CLOSED: "closed",
    OPEN: "open",
  },
}));

mock.module("react-native-safe-area-context", () => ({
  SafeAreaProvider: MockView,
  SafeAreaView: MockView,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

mock.module("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  impactAsync: async () => {
    mockUiState.hapticCount += 1;
  },
  notificationAsync: async () => {
    mockUiState.hapticCount += 1;
  },
  selectionAsync: async () => {
    mockUiState.hapticCount += 1;
  },
}));

export interface HostNode {
  type?: string;
  props?: Record<string, unknown>;
  text?: string;
  children: HostNode[];
}

interface ReconcilerContainer {
  children: HostNode[];
}

interface ReconcilerInstance {
  createContainer(
    containerInfo: ReconcilerContainer,
    tag: number,
    hydrationCallbacks: null,
    isStrictMode: boolean,
    concurrentUpdatesByDefaultOverride: null,
    identifierPrefix: string,
    onUncaughtError: (err: Error) => void,
    transitionCallbacks: null,
  ): unknown;
  updateContainer(
    element: React.ReactElement | null,
    container: unknown,
    parentComponent: null,
    callback: () => void,
  ): void;
}

const createReconciler = require("react-reconciler") as (
  hostConfig: Record<string, unknown>,
) => ReconcilerInstance;
const { ConcurrentRoot, DefaultEventPriority } = require(
  "react-reconciler/constants",
) as { ConcurrentRoot: number; DefaultEventPriority: number };

const reconciler = createReconciler({
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  createInstance: (type: string, props: Record<string, unknown>): HostNode => ({
    type,
    props,
    children: [],
  }),
  createTextInstance: (text: string): HostNode => ({
    text,
    children: [],
  }),
  appendInitialChild: (parent: HostNode, child: HostNode) => {
    parent.children.push(child);
  },
  appendChild: (parent: HostNode, child: HostNode) => {
    parent.children.push(child);
  },
  appendChildToContainer: (container: ReconcilerContainer, child: HostNode) => {
    container.children.push(child);
  },
  insertBefore: (parent: HostNode, child: HostNode) => {
    parent.children.push(child);
  },
  insertInContainerBefore: (
    container: ReconcilerContainer,
    child: HostNode,
  ) => {
    container.children.push(child);
  },
  removeChild: (parent: HostNode, child: HostNode) => {
    const idx = parent.children.indexOf(child);
    if (idx !== -1) parent.children.splice(idx, 1);
  },
  removeChildFromContainer: (
    container: ReconcilerContainer,
    child: HostNode,
  ) => {
    const idx = container.children.indexOf(child);
    if (idx !== -1) container.children.splice(idx, 1);
  },
  commitUpdate: (
    instance: HostNode,
    _type: string,
    _oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ) => {
    instance.props = newProps;
  },
  commitTextUpdate: (
    textInstance: HostNode,
    _oldText: string,
    newText: string,
  ) => {
    textInstance.text = newText;
  },
  finalizeInitialChildren: () => false,
  prepareForCommit: () => null,
  resetAfterCommit: () => {},
  getRootHostContext: () => ({}),
  getChildHostContext: (parentHostContext: unknown) => parentHostContext,
  getPublicInstance: (instance: HostNode) => instance,
  preparePortalMount: () => {},
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  shouldSetTextContent: () => false,
  clearContainer: (container: ReconcilerContainer) => {
    container.children = [];
  },
  getCurrentUpdatePriority: () => DefaultEventPriority,
  setCurrentUpdatePriority: () => {},
  resolveUpdatePriority: () => DefaultEventPriority,
  maySuspendCommit: () => false,
  NotPendingTransition: null,
  HostTransitionContext: React.createContext(null),
  resetFormInstance: () => {},
  requestPostPaintCallback: () => {},
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  waitForCommitToBeReady: () => null,
  preloadInstance: () => true,
  startSuspendingCommit: () => {},
  suspendInstance: () => {},
  detachDeletedInstance: () => {},
});

const globalActEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
globalActEnv.IS_REACT_ACT_ENVIRONMENT = true;

export function renderUI(element: React.ReactElement) {
  const container: ReconcilerContainer = { children: [] };
  const root = reconciler.createContainer(
    container,
    ConcurrentRoot,
    null,
    false,
    null,
    "",
    (err: Error) => {
      throw err;
    },
    null,
  );

  const update = (nextEl: React.ReactElement | null) => {
    React.act(() => {
      reconciler.updateContainer(nextEl, root, null, () => {});
    });
  };

  update(element);

  return {
    container,
    rerender: (nextEl: React.ReactElement) => update(nextEl),
    unmount: () => update(null),
  };
}

export function findAllNodes(
  node: HostNode | ReconcilerContainer,
  predicate: (item: HostNode) => boolean,
): HostNode[] {
  const results: HostNode[] = [];
  const visit = (curr: HostNode | ReconcilerContainer) => {
    if ("type" in curr && predicate(curr)) {
      results.push(curr);
    }
    for (const child of curr.children) {
      visit(child);
    }
  };
  visit(node);
  return results;
}

export function collectText(node: HostNode | ReconcilerContainer): string {
  const parts: string[] = [];
  const visit = (curr: HostNode | ReconcilerContainer) => {
    if ("text" in curr && curr.text !== undefined) {
      parts.push(curr.text);
    }
    for (const child of curr.children) {
      visit(child);
    }
  };
  visit(node);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function act(callback: () => void) {
  React.act(callback);
}
