// Add event listeners globally
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

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
                console.log("hellooo")
                upPressed = true;
                break;
            case "KeyS":
                downPressed = true;
                break;
            case "KeyA":
                leftPressed = true;
                break;
            case "KeyD":
                rightPressed = true;
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
                upPressed = false;
                break;
            case "KeyS":
                downPressed = false;
                break;
            case "KeyA":
                leftPressed = false;
                break;
            case "KeyD":
                rightPressed = false;
                break;
        }
    })
};


// State at Global scope
let lastTime = 0;
// export let game: IGame = {
//     player: {
//         x: 50,
//         y: 50,
//         vx: 0.1, // constant speed
//         vy: 0.1, // constant speed
//     }
// };


export interface IPlayerBin {
    room: string;
    playerid: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export const player: IPlayerBin = {
    room: "",
    playerid: 0,
    x: 50,
    y: 50,
    vx: 0.1,
    vy: 0.1,
}

export default function update(tFrame: DOMHighResTimeStamp, ws1: WebSocket, playerid: number, room: string) {
    const dt = tFrame - lastTime;
    lastTime = tFrame;

    if (rightPressed) {
        player.x += player.vx * dt;
        console.log(player.vx, dt);
        console.log("inside update x ", player.x);
    }
    if (leftPressed) {
        player.x -= player.vx * dt;
    }
    if (upPressed) {
        player.y -= player.vy * dt;
    }
    if (downPressed) {
        player.y += player.vy * dt;
    }

    if (rightPressed || leftPressed || upPressed || downPressed) {
        player.room = room;
        player.playerid = playerid;
        const buffer = binaryConverter(player);
        ws1!.send(buffer);

    }
}

function binaryConverter(player: IPlayerBin) {
    // Length of string, Encode the string 'Room' and embed into Arraybuffer
    const arrayBuffer = new ArrayBuffer(28);
    // Room string Length
    const uint16bufferView = new Uint16Array(arrayBuffer, 0, 2);
    uint16bufferView[0] = player.room.length;
    //Room
    const uint8bufferView = new Uint8Array(arrayBuffer, 2);
    const encoder = new TextEncoder();
    const strTypedArray = encoder.encode(player.room);
    uint8bufferView.set(strTypedArray, 0);

    const uint32bufferView = new Uint32Array(arrayBuffer, 2 + strTypedArray.length, 4);
    uint32bufferView[0] = player.playerid;
    // Embed playerid, x, y, vx, vy in the same order
    const float32bufferView = new Float32Array(arrayBuffer, 6 + strTypedArray.length);
    float32bufferView[0] = player.x;
    float32bufferView[1] = player.y;
    float32bufferView[2] = player.vx;
    float32bufferView[3] = player.vy;

    return arrayBuffer;
}
