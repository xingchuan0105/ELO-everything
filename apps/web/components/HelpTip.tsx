"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HELP_TIPS, type HelpTipId } from "@/content/help/tips";

type Props = {
  id: HelpTipId;
  className?: string;
};

/**
 * 注释小标：悬停/聚焦看摘要，点击跳转帮助文档锚点。
 */
export function HelpTip({ id, className }: Props) {
  const tip = HELP_TIPS[id];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!tip) return null;

  return (
    <span className={`help-tip ${className ?? ""}`} ref={rootRef}>
      <button
        type="button"
        className="help-tip-btn"
        aria-label={`${tip.label}：说明`}
        aria-expanded={open}
        aria-controls={panelId}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onClick={(e) => {
          // 点击：跳转详细文档
          e.preventDefault();
          window.location.href = tip.href;
        }}
      >
        ?
      </button>
      {open && (
        <span className="help-tip-panel" id={panelId} role="tooltip">
          <strong className="help-tip-title">{tip.label}</strong>
          <span className="help-tip-summary">{tip.summary}</span>
          <a className="help-tip-more" href={tip.href} onClick={(e) => e.stopPropagation()}>
            详细说明 →
          </a>
        </span>
      )}
    </span>
  );
}

/** 带标签的字段标题 */
export function FieldLabel({
  children,
  tip,
}: {
  children: React.ReactNode;
  tip?: HelpTipId;
}) {
  return (
    <label className="field-label">
      <span className="field-label-text">
        {children}
        {tip ? <HelpTip id={tip} /> : null}
      </span>
    </label>
  );
}
