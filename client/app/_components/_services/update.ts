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
    actionNum: number;
}

export const playerclient: IPlayerClient = {
    room: "",
    playerid: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0,
    actionNum: 0
}
interface Action {
    playerclient: IPlayerClient;
    actionNum: number;
}

class Node {
    public val: Action;
    public next: null | Node;
    constructor(val: Action, next = null) {
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

    enqueue(val: Action) {
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
        return this.head;
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

            return temp;


        }

    }




}

// starting point - Global object
let actionNum = 1;
const queue = new ClientSideQueue();

export default function updateServer(tFrame: DOMHighResTimeStamp, ws1: WebSocket, playerid: number, room: string) {

    function clientSideOwnPlayerPrediction(playerclient: IPlayerClient, queue: ClientSideQueue) {
        // I have to enumerate each action (left / right / up / down) and remember it in the client side  
        const action = { playerclient, actionNum };
        queue.enqueue(action);
        actionNum++;

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
    }

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

