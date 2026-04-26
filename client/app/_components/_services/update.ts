import * as PACKET from './constants/binaryConverter';

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
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            up = down = left = right = 0;
        }
    });
};



export interface IPlayerAction {
    room: string;
    playerid: number;
    left: Binary;
    right: Binary;
    up: Binary;
    down: Binary;
    actionNum: number;
}

export const playerAction: IPlayerAction = {
    room: "",
    playerid: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0,
    actionNum: 0
}

class Node {
    public val: IPlayerAction;
    public next: null | Node;
    constructor(val: IPlayerAction, next = null) {
        this.val = val;
        this.next = next;
    }
}

class ClientSideQueue {
    private head: Node | null;
    private tail: Node | null;
    public length: number;
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    enqueue(val: IPlayerAction) {
        if (this.head === null || this.tail === null) {
            this.head = new Node(val);
            this.tail = this.head;

        } else {
            const temp = new Node(val);
            this.tail.next = temp;
            this.tail = temp;
            // increase length
            length++;

        }
        return this.head.val;
    }

    dequeue() {
        if (this.head === null || this.tail === null) {
            return null;
        } else {
            const temp = this.head;
            this.head = this.head.next;
            temp.next = null;

            // decrease length
            length--;

            return temp.val;


        }

    }

    toArray() {
        const array = [];
        let curr = this.head;
        while (curr) {
            array.push(curr.val);
            curr = curr.next;
        }

        return array;
    }







}

// starting point - Global object
export const clientSideQueue = new ClientSideQueue();

export default function updateServer(tFrame: DOMHighResTimeStamp, ws1: WebSocket, playerid: number, room: string) {


    playerAction.room = room;
    playerAction.playerid = playerid;
    playerAction.left = left;
    playerAction.right = right;
    playerAction.up = up;
    playerAction.down = down;

    playerAction.actionNum++;
    clientSideQueue.enqueue({ ...playerAction });
    console.log("Player right action", playerAction.right);

    const buffer = binaryDirectionConverter(playerAction);
    ws1!.send(buffer);
}

type Binary = 0 | 1;


function binaryDirectionConverter(playerAction: IPlayerAction) {
    // each key press is send to the server continuously  -> left, right, up, down
    // room: 6, playerid: 4, directionPacked: 2, actionNum: 4 (4 billion = 2 years with 60fps)
    const directionPacked =
        playerAction.left << 3 |
        playerAction.right << 2 |
        playerAction.up << 1 |
        playerAction.down << 0;
    const arrayBuffer = new ArrayBuffer(PACKET.CLIENT_BYTES_NUM);
    const view = new DataView(arrayBuffer);
    const uint8StringView = new Uint8Array(arrayBuffer);
    const encoder = new TextEncoder();
    const uint8String = encoder.encode(playerAction.room);


    uint8StringView.set(uint8String);
    view.setUint32(PACKET.ROOM_BYTE, playerAction.playerid)
    view.setUint16(PACKET.ROOM_BYTE + PACKET.PLAYERID_BYTE, directionPacked);
    view.setUint32(PACKET.ROOM_BYTE + PACKET.PLAYERID_BYTE + PACKET.DIRECTIONPACKED_BYTE, playerAction.actionNum);

    return arrayBuffer;
}

//NOTE:: clientSideOwnPlayerPrediction

// I have to enumerate each action (left / right / up / down) and remember it in the client side  & store in clientSideQueue

// I send the "done" action with that enumeration to the server


// I get the enumerated STATE back from the server

// On top of that recieved state with that enumeration, I calculate at the clientside,
// the diff of the state from the enumerated server state, until my current clientside state.
// If the diff is equal to the calculation of state change by the actions starting from that enumerated action,
// from the clientside, then we predicted successfully.  - Don't do any change on the client state
//
// Else, it means that I "the client" cheated with speed/position
// hack or something in the client  - so I need to change my current position (client state)
// to the calculated state ( by adding the calculated statechange (using the actions - starting
// from the enumerated action(server sent enumeration)) on top of the enumerated server sent state )


//That's it- then test the cheating side - where i can change the state (like hacker do) or network issue
