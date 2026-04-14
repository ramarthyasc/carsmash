import { IPlayerState } from "../gameEngine";
import { IPlayerClient } from "./update";

//dummy init value for all players
const INIT_X = 10;
const INIT_Y = 10;

const clientPlayerState: IPlayerState = {
    room: "",
    playerid: 0,
    x: INIT_X,
    y: INIT_Y 
};

export default function renderPlayers(players: Map<IPlayerState["playerid"], IPlayerState>, playerclient: IPlayerClient,
    ctx: CanvasRenderingContext2D) {



    // animate/render the current player that iam working with
    // dummy calculations for clientside prediction
    updater(playerclient, clientPlayerState);

    ctx.imageSmoothingEnabled = false;



    function clientSidePrediction() {
        // I have to enumerate each action (left / right / up / down) and remember it in the client side  

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





    // render all players
    // For each frame, we have to clear the frame, then render the one frame with all the players
    ctx.clearRect(0, 0, 320, 180);
    for (const [_, player] of players) {
        let x;
        let y;
        if (player.playerid === playerclient.playerid) {
            // clientside calculated values
            x = Math.round(clientPlayerState.x);
            y = Math.round(clientPlayerState.y);
        } else {
            x = Math.round(player?.x ?? INIT_X);
            y = Math.round(player?.y ?? INIT_Y);
        }

        // Math.ceil for not having blurry edges due to drawing the border of the
        // filledRect in the center of canvas pixels (refer MDN)
        ctx.fillRect(x, y, 10, 10);
    }
}


function updater(playerclient: IPlayerClient, clientPlayerState: IPlayerState) {
    // update x, y , vx, vy
    //NOTE:: // CONSTANTS NEED TO UPDATE LATER - SAME AS THAT OF SERVER
    const vx = 10;
    const vy = 10;
    const dt = 0.1


    clientPlayerState.playerid = playerclient.playerid;
    clientPlayerState.room = playerclient.room;

    if (playerclient.left) {
        clientPlayerState.x = clientPlayerState.x - playerclient.left * vx * dt;
    }
    if (playerclient.right) {
        clientPlayerState.x = clientPlayerState.x + playerclient.right * vx * dt;
        console.log("clientPlayerState.x here", clientPlayerState.x)
    }

    if (playerclient.up) {
        clientPlayerState.y = clientPlayerState.y - playerclient.up * vy * dt;
    }
    if (playerclient.down) {
        clientPlayerState.y = clientPlayerState.y + playerclient.down * vy * dt;
    }
}
