import { IPlayerState } from "../gameEngine";

// Add event listeners globally
let right: Binary = 0;
let left: Binary = 0;
let up: Binary = 0;
let down: Binary = 0;

export function setupHandles() {
    document.addEventListener("keydown", (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable) {
            return;
        }

        switch (e.code) {
            case "KeyW":
                up = 1;
                break;
            case "KeyS":
                down = 1;
                break;
            case "KeyA":
                left = 1;
                break;
            case "KeyD":
                right = 1;
                break;
        }
    })
    document.addEventListener("keyup", (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable) {
            return;
        }
        switch (e.code) {
            case "KeyW":
                up = 0;
                break;
            case "KeyS":
                down = 0;
                break;
            case "KeyA":
                left = 0;
                break;
            case "KeyD":
                right = 0;
                break;
        }
    })
};



export interface IPlayerClient {
    room: string;
    playerid: number;
    left: Binary;
    right: Binary;
    up: Binary;
    down: Binary;
}

export const playerclient: IPlayerClient = {
    room: "",
    playerid: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0
}

export default function updateServer(tFrame: DOMHighResTimeStamp, ws1: WebSocket, playerid: number, room: string) {

    playerclient.room = room;
    playerclient.playerid = playerid;
    playerclient.left = left;
    playerclient.right = right;
    playerclient.up = up;
    playerclient.down = down;
    const buffer = binaryDirectionConverter(playerclient);
    ws1!.send(buffer);
}

type Binary = 0 | 1;


function binaryDirectionConverter(playerclient: IPlayerClient) {
    // each key press is send to the server continuously  -> left, right, up, down
    const BYTESNUM = 8;
    const directionPacked =
        playerclient.left << 3 |
        playerclient.right << 2 |
        playerclient.up << 1 |
        playerclient.down << 0;
    const arrayBuffer = new ArrayBuffer(BYTESNUM);
    const uint8bufferView = new Uint8Array(arrayBuffer);
    const encoder = new TextEncoder();
    const uint8StringView = encoder.encode(playerclient.room);

    uint8bufferView.set(uint8StringView, 0);
    uint8bufferView[6] = playerclient.playerid;
    uint8bufferView[7] = directionPacked;

    const lalaUint8View = new Uint8Array(arrayBuffer, 6, 1);



    return arrayBuffer;
}

