import type { ReactNode } from "react";

type Props = {
  /** 简短说明 */
  children: ReactNode;
  /** 帮助链接 */
  href: string;
  /** 链接文案 */
  linkLabel?: string;
  /** 可选标题 */
  title?: string;
  className?: string;
};

/**
 * 空状态 / 引导：短提示 + 链到帮助对应章节。
 */
export function EmptyHelp({
  children,
  href,
  linkLabel = "查看使用说明",
  title,
  className,
}: Props) {
  return (
    <div className={`empty-help${className ? ` ${className}` : ""}`}>
      {title ? <p className="empty-help-title">{title}</p> : null}
      <div className="empty-help-body">{children}</div>
      <a href={href} className="empty-help-link">
        {linkLabel} →
      </a>
    </div>
  );
}
