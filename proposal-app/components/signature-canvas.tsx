"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";

export interface SignatureCanvasHandle {
  isEmpty: () => boolean;
  /** Returns a trimmed PNG data URL, or null if empty. */
  toDataURL: () => string | null;
  clear: () => void;
}

interface Props {
  onChange?: (hasSignature: boolean) => void;
}

// Touch + mouse signature canvas. Handles high-DPI scaling and window resize so
// the drawn line stays crisp and aligned on phones and laptops alike.
export const SignatureCanvas = forwardRef<SignatureCanvasHandle, Props>(
  function SignatureCanvas({ onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePad | null>(null);
    const [hasInk, setHasInk] = useState(false);

    useImperativeHandle(ref, () => ({
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: () =>
        padRef.current && !padRef.current.isEmpty()
          ? padRef.current.toDataURL("image/png")
          : null,
      clear: () => {
        padRef.current?.clear();
        setHasInk(false);
        onChange?.(false);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pad = new SignaturePad(canvas, {
        penColor: "#0A1628",
        backgroundColor: "rgba(255,255,255,0)",
        minWidth: 0.8,
        maxWidth: 2.4,
      });
      padRef.current = pad;

      const markChange = () => {
        const empty = pad.isEmpty();
        setHasInk(!empty);
        onChange?.(!empty);
      };
      pad.addEventListener("endStroke", markChange);

      // Resize canvas to its CSS box * devicePixelRatio, preserving content.
      const resize = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const data = pad.toData();
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        const ctx = canvas.getContext("2d");
        ctx?.scale(ratio, ratio);
        pad.clear();
        if (data.length) pad.fromData(data);
      };

      resize();
      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        pad.removeEventListener("endStroke", markChange);
        pad.off();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="space-y-2">
        <div className="relative rounded-card border-2 border-dashed border-input bg-white">
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none rounded-card"
            aria-label="Signature pad"
          />
          {!hasInk && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Sign here with your finger or mouse
            </span>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              padRef.current?.clear();
              setHasInk(false);
              onChange?.(false);
            }}
          >
            Clear signature
          </Button>
        </div>
      </div>
    );
  }
);
