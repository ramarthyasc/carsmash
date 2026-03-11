"use client"

import { useEffect, useRef } from "react"
import update from "./_services/update";
import render from "./_services/render";
import { setupHandles } from "./_services/update";

export default function GameEngine() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D>(null);
    const initTime = useRef<DOMHighResTimeStamp>(0);

    useEffect(() => {
        const canvas = canvasRef.current!;
        ctxRef.current = canvas.getContext("2d");
        // const dpr = window.devicePixelRatio;
        // const style = window.getComputedStyle(canvas);
        // canvas.width = parseFloat(style.width)*dpr;
        // canvas.height = parseFloat(style.height)*dpr;

        setupHandles();
        // document.addEventListener("keydown", drawRectangle);
        main(0);
    },[])

    function main(tFrame: DOMHighResTimeStamp) {
        requestAnimationFrame(main);

        update(tFrame);

        render(ctxRef.current!);
    }

    // function drawRectangle() {
    //     const ctx = ctxRef.current;
    //     if (!ctx) return;
    //
    //     ctx.fillRect(0, 0, 5, 5);
    //     ctx.strokeRect(2.5, 2.5, 5, 5);
    // }
    //
    return (
        <canvas ref={canvasRef} width={320} height={180} className="bg-white h-full w-full pixelated">
        </canvas>
    )

}
