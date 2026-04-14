import { IPlayerState } from "../gameEngine";
import { IPlayerClient } from "./update";

const clientPlayerState: IPlayerState = {
    room: "",
    playerid: 0,
    x: 0,
    y: 0
};
//dummy init value for all players
const INIT_X = 10;
const INIT_Y = 10;

export default function renderPlayers(players: Map<IPlayerState["playerid"], IPlayerState>, playerclient: IPlayerClient,
    ctx: CanvasRenderingContext2D) {



    // animate/render the current player that iam working with
    // dummy calculations for clientside prediction
    updater(playerclient, clientPlayerState);

    ctx.imageSmoothingEnabled = false;

    // render all players
    // For each frame, we have to clear the frame, then render the one frame with all the players
    ctx.clearRect(0, 0, 320, 180);
    for (const [_, player] of players) {
        let x;
        let y;
        console.log("Player.playerid",player.playerid);
        console.log("playerclient.playerid",playerclient.playerid);
        if (player.playerid === playerclient.playerid) {
            // clientside calculated values
            console.log("HELLOOOOOOOOOOOOO")
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

    clientPlayerState.x = INIT_X;
    clientPlayerState.y = INIT_Y;
    clientPlayerState.playerid = playerclient.playerid;
    clientPlayerState.room = playerclient.room;

    if (playerclient.left) {
        clientPlayerState.x = clientPlayerState.x - playerclient.left * vx * dt;
    }
    if (playerclient.right) {
        clientPlayerState.x = clientPlayerState.x + playerclient.right * vx * dt;
    }

    if (playerclient.up) {
        clientPlayerState.y = clientPlayerState.y - playerclient.up * vy * dt;
    }
    if (playerclient.down) {
        clientPlayerState.y = clientPlayerState.y + playerclient.down * vy * dt;
    }
}
