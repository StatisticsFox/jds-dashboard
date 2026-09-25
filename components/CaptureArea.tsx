"use client";

import { toBlob } from "html-to-image";
import { useRef, useState } from "react";

type Props = {
  fileName: string; // 저장될 이미지 이름 (확장자 제외)
  caption?: string; // 캡처 이미지 맨 위에만 들어가는 설명 (개강·기간 등)
  className?: string;
  children: React.ReactNode;
};

type Status = "idle" | "busy" | "copied" | "saved";

// 감싼 영역을 PNG 이미지로 복사하거나 저장하는 버튼을 오른쪽 위에 붙임
export function CaptureArea({ fileName, caption, className = "", children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");

  // 캡처하는 동안만 설명 줄을 보이게 하고, 버튼은 이미지에서 뺌
  async function render(): Promise<Blob> {
    const node = ref.current!;
    node.dataset.capturing = "";
    try {
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(node).getPropertyValue("--background").trim() || "#ffffff",
        style: { margin: "0" },
        filter: (el) => !(el instanceof HTMLElement && el.dataset.captureIgnore !== undefined),
      });
      if (!blob) throw new Error("이미지를 만들지 못했어요.");
      return blob;
    } finally {
      delete node.dataset.capturing;
    }
  }

  function done(next: Status) {
    setStatus(next);
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function copy() {
    setStatus("busy");
    try {
      // Safari는 클릭 직후에 바로 write를 불러야 해서, 이미지 대신 '만들어질 이미지'(Promise)를 넘김
      await navigator.clipboard.write([new ClipboardItem({ "image/png": render() })]);
      done("copied");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      alert("클립보드 복사에 실패했어요. 브라우저가 이미지 복사를 지원하지 않으면 '저장'을 이용해 주세요.");
    }
  }

  async function save() {
    setStatus("busy");
    try {
      const url = URL.createObjectURL(await render());
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      done("saved");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      alert("저장에 실패했어요. 다시 시도해 주세요.");
    }
  }

  const button = "px-2.5 py-1 hover:bg-accent-soft hover:text-foreground disabled:opacity-50";
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        data-capture-ignore
        className="absolute right-4 top-4 z-10 flex divide-x divide-border overflow-hidden rounded-full border border-border bg-surface text-xs text-muted shadow-sm"
      >
        {status === "copied" || status === "saved" ? (
          <span className="px-2.5 py-1 font-medium text-good">✓ {status === "copied" ? "복사됨" : "저장됨"}</span>
        ) : (
          <>
            <button type="button" onClick={copy} disabled={status === "busy"} className={button} title="이미지를 클립보드에 복사">
              📋 복사
            </button>
            <button type="button" onClick={save} disabled={status === "busy"} className={button} title="PNG 파일로 저장">
              📷 저장
            </button>
          </>
        )}
      </div>
      {caption && <p className="capture-only mb-3 text-xs text-muted">{caption}</p>}
      {children}
    </div>
  );
}
