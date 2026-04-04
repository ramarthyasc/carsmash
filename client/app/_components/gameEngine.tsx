"use client"

import { useContext, useEffect, useRef } from "react"
import update from "./_services/update";
import renderPlayers from "./_services/render";
import { setupHandles } from "./_services/update";
import { PlayerContext } from "./_context/playerContext";

export interface IPlayerState {
    room: string;
    playerid: number;
    x: number;
    y: number;
}

const players = new Map<IPlayerState["playerid"], IPlayerState>();



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
        // simulate commands being send to server 
        // (AUTHORITATIVE SERVER - does all the calculations);
        update(tFrame, ws1!, playeridRef.current, room);


        // simulate results/game data being send from server to client - where the client just renders it
        // (DUMB CLIENT - DOESN'T Do ANY Calculations)
        if (dataRef.current) {
            //mutates the specific player
            // if (!renderPlayer) {}
            binaryDecoderAndPlayersUpdater(dataRef.current, players);

        }

        renderPlayers(players, ctxRef.current!);
        dataRef.current = null; // make it null after each ws message arrives
    }

    return (
        <canvas ref={canvasRef} width={320} height={180} className="bg-gray-400 h-full w-full pixelated">
        </canvas>
    )

}
function binaryDecoderAndPlayersUpdater(data: ArrayBuffer, players: Map<IPlayerState["playerid"], IPlayerState>) {

    const uint8ArrayRoomView = new Uint8Array(data, 0, 6);
    const room = (new TextDecoder).decode(uint8ArrayRoomView);

    const uint8ArrayView = new Uint8Array(data, 6, 1);
    const playerid = uint8ArrayView[0];

    const uint16ArrayView = new Int16Array(data, 8);
    const x = uint16ArrayView[0];
    const y = uint16ArrayView[1];

    // mutating the Mapped player object and returning only that object
    let renderPlayer = players.get(playerid);
    if (renderPlayer) {
        renderPlayer.room = room;
        renderPlayer.playerid = playerid;
        renderPlayer.x = x;
        renderPlayer.y = y;

    } else {
        renderPlayer = { room, playerid, x, y};
        players.set(playerid, renderPlayer);
    }
}
