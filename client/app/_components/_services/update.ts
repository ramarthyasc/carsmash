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
                console.log("hellooo")
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


interface IPlayerClient {
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
    const buffer = binaryDirectionConverter({ left, right, up, down }, playerclient);
    ws1!.send(buffer);
}

type Binary = 0 | 1;

interface IDirections {
    left: Binary;
    right: Binary;
    up: Binary;
    down: Binary;
}

function binaryDirectionConverter({ left, right, up, down }: IDirections, playerclient: IPlayerClient) {
    // each key press is send to the server continuously  -> left, right, up, down
    const BYTESNUM = 8;
    const directionPacked =
        left << 3 |
        right << 2 |
        up << 1 |
        down << 0;
    const arrayBuffer = new ArrayBuffer(BYTESNUM);
    const uint8bufferView = new Uint8Array(arrayBuffer);
    const encoder = new TextEncoder();
    const uint8StringView = encoder.encode(playerclient.room);

    uint8bufferView.set(uint8StringView, 0);
    uint8bufferView[6] = playerclient.playerid;
    uint8bufferView[7] = directionPacked;


    return arrayBuffer;
}

// function binaryConverter(player: IPlayerBin) {
//     // Length of string, Encode the string 'Room' and embed into Arraybuffer
//     const arrayBuffer = new ArrayBuffer(28);
//     // Room string Length
//     const uint16bufferView = new Uint16Array(arrayBuffer, 0);
//     uint16bufferView[0] = player.room.length;
//     //Room
//     const uint8bufferView = new Uint8Array(arrayBuffer, 2);
//     const encoder = new TextEncoder();
//     const strTypedArray = encoder.encode(player.room);
//     uint8bufferView.set(strTypedArray, 0);
//
//     const uint32bufferView = new Uint32Array(arrayBuffer, 2 + strTypedArray.length);
//     uint32bufferView[0] = player.playerid;
//     // Embed playerid, x, y, vx, vy in the same order
//     const float32bufferView = new Float32Array(arrayBuffer, 6 + strTypedArray.length);
//     float32bufferView[0] = player.x;
//     float32bufferView[1] = player.y;
//     float32bufferView[2] = player.vx;
//     float32bufferView[3] = player.vy;
//
//     return arrayBuffer;
// }
