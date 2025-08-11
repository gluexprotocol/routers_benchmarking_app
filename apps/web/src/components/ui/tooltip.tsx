import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  ReactNode,
  HTMLAttributes,
  ReactElement,
} from "react";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom" | "left" | "right";

type TooltipContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  id: string;
  placement: Placement;
  offset: number;
  delay: number;
};

const TooltipCtx = createContext<TooltipContextValue | null>(null);

type TooltipRootProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  placement?: Placement;
  offset?: number;
  delay?: number;
};

export function Tooltip({
  children,
  defaultOpen = false,
  placement = "top",
  offset = 8,
  delay = 100,
}: TooltipRootProps) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  const value: TooltipContextValue = useMemo(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      id,
      placement,
      offset,
      delay,
    }),
    [open, placement, offset, delay, id]
  );

  return <TooltipCtx.Provider value={value}>{children}</TooltipCtx.Provider>;
}

type TriggerProps = {
  asChild?: boolean;
  children: ReactElement<any>; // <- not unknown
};

export function TooltipTrigger({ asChild = false, children }: TriggerProps) {
  const ctx = useTooltipCtx("TooltipTrigger");
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const setWithDelay = (next: boolean) => {
    const ms = ctx.delay;
    if (next) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      openTimer.current = window.setTimeout(() => ctx.setOpen(true), ms);
    } else {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      closeTimer.current = window.setTimeout(() => ctx.setOpen(false), ms);
    }
  };

  useEffect(() => {
    return () => {
      if (openTimer.current) window.clearTimeout(openTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const child = children as ReactElement<any>;
  const childProps = (child.props ?? {}) as any;

  const mergedProps = {
    ref: ctx.triggerRef as React.Ref<any>,
    "aria-describedby": ctx.open ? ctx.id : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      childProps.onMouseEnter?.(e);
      setWithDelay(true);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      childProps.onMouseLeave?.(e);
      setWithDelay(false);
    },
    onFocus: (e: React.FocusEvent) => {
      childProps.onFocus?.(e);
      setWithDelay(true);
    },
    onBlur: (e: React.FocusEvent) => {
      childProps.onBlur?.(e);
      setWithDelay(false);
    },
    tabIndex:
      childProps.tabIndex ?? (typeof child.type === "string" ? 0 : undefined),
    style: { ...(childProps.style ?? {}), outline: "none" },
  };

  return asChild
    ? React.cloneElement(child, mergedProps)
    : React.createElement("span", mergedProps, child);
}

type ContentProps = {
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export function TooltipContent({
  children,
  className = "",
  style,
  ...rest
}: ContentProps) {
  const ctx = useTooltipCtx("TooltipContent");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );

  const computePosition = () => {
    const trigger = ctx.triggerRef.current;
    const content = ctx.contentRef.current;
    if (!trigger || !content) return;

    const r = trigger.getBoundingClientRect();
    const c = content.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let top = 0;
    let left = 0;

    switch (ctx.placement) {
      case "bottom":
        top = r.bottom + ctx.offset;
        left = r.left + r.width / 2 - c.width / 2;
        break;
      case "left":
        top = r.top + r.height / 2 - c.height / 2;
        left = r.left - c.width - ctx.offset;
        break;
      case "right":
        top = r.top + r.height / 2 - c.height / 2;
        left = r.right + ctx.offset;
        break;
      case "top":
      default:
        top = r.top - c.height - ctx.offset;
        left = r.left + r.width / 2 - c.width / 2;
        break;
    }

    // viewport nudging
    const margin = 8;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (left < margin) left = margin;
    if (left + c.width > vw - margin) left = vw - c.width - margin;
    if (top < margin) top = margin;
    if (top + c.height > vh - margin) top = vh - c.height - margin;

    setCoords({ top: top + scrollY, left: left + scrollX });
  };

  useEffect(() => {
    if (!ctx.open) return;
    computePosition();
    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open, ctx.placement, ctx.offset, children]);

  if (!ctx.open) return null;

  const node = (
    <div
      ref={ctx.contentRef}
      id={ctx.id}
      role="tooltip"
      className={
        "pointer-events-none z-[9999] fixed translate-y-0 transition-opacity duration-100 " +
        "rounded-md border bg-black/90 text-white text-xs px-2 py-1 shadow-lg " +
        (className ?? "")
      }
      style={{
        position: "absolute",
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );

  if (typeof window === "undefined" || !document?.body) return node;
  return createPortal(node, document.body);
}

function useTooltipCtx(component: string) {
  const ctx = useContext(TooltipCtx);
  if (!ctx) throw new Error(`${component} must be used inside <Tooltip>`);
  return ctx;
}
