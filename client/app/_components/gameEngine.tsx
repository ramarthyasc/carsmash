"use client"

import { useContext, useEffect, useRef } from "react"
import update, { IPlayerBin } from "./_services/update";
import render from "./_services/render";
import { setupHandles } from "./_services/update";
import { PlayerContext } from "./_context/playerContext";
import { player } from "./_services/update";

const renderPlayer: IPlayerBin = {
    room: "",
    playerid: 0,
    x: 50,
    y: 50,
    vx: 0.1,
    vy: 0.1,
}

export default function GameEngine() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D>(null);
    const initTime = useRef<DOMHighResTimeStamp>(0);
    const dataRef = useRef<ArrayBuffer>(null);

    const ctx = useContext(PlayerContext);
    if (!ctx) {
        throw new Error("GameEngine should be used inside PlayerProvider");
    }
    const { room, playeridRef, ws1 } = ctx;

    useEffect(() => {
        console.log("2 useEffect")
        if (!ws1) {
            return;
        }
        const canvas = canvasRef.current!;
        ctxRef.current = canvas.getContext("2d");
        // const dpr = window.devicePixelRatio;
        // const style = window.getComputedStyle(canvas);
        // canvas.width = parseFloat(style.width)*dpr;
        // canvas.height = parseFloat(style.height)*dpr;
        ws1.addEventListener("message", ({ data }) => {
            if (data instanceof ArrayBuffer) {
                //binaryframe
                setTimeout(() => { dataRef.current = data; }, 1000);
            }
        })
        setupHandles();
        // document.addEventListener("keydown", drawRectangle);
        main(0);
    }, [ws1])

    function main(tFrame: DOMHighResTimeStamp) {
        requestAnimationFrame(main);
        console.log(player);
        // simulate commands being send to server 
        // (AUTHORITATIVE SERVER - does all the calculations);
        update(tFrame, ws1!, playeridRef.current, room);


        // simulate results/game data being send from server to client - where the client just renders it
        // (DUMB CLIENT - DOESN'T Do ANY Calculations)
        if (dataRef.current) {
            //mutates player
            console.log(player.x)
            binaryDecoder(renderPlayer, dataRef.current);
        }

        render(renderPlayer, ctxRef.current!);
        dataRef.current = null; // make it null after each ws message arrives
    }

    return (
        <canvas ref={canvasRef} width={320} height={180} className="bg-gray-400 h-full w-full pixelated">
        </canvas>
    )

}

function binaryDecoder(player: IPlayerBin, data: ArrayBuffer) {
    //((I use Dataview instead of TypedArrays to get a view of ArrayBuffer bcs I need to
    // store different datatypes inside the ArrayBuffer))
    const view = new DataView(data);

    // string would be encoded like this : 12encodedstring where 12 is the length of encoded bytes (same 
    // as the number of chars - which would be stored in a fixed memory like int8 or int16)

    // ArrayBuffer is of 11 bytes + 6 bytes
    const strlength = view.getUint16(0, true); // endianness should be little endian - as it's written in the 
    // arraybuffer as littleendian when written by using views
    const typedArray = new Uint8Array(data, 2, strlength); //strlength would be 6 chars ie; 6 bytes: Room 1, Room 2 ,etc..
    const decoder = new TextDecoder();
    player.room = decoder.decode(typedArray);
    player.playerid = view.getUint32(strlength + 2, true)
    player.x = view.getFloat32(strlength + 6, true);
    player.y = view.getFloat32(strlength + 10, true);
    player.vx = view.getFloat32(strlength + 14, true);
    player.vy = view.getFloat32(strlength + 18, true);
}
