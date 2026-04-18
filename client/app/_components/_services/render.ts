import { IPlayerState } from "../gameEngine";
import { IPlayerAction, queue } from "./update";

//dummy init value for all players
const INIT_X = 10;
const INIT_Y = 10;

const predictedPlayerState: IPlayerState = {
    room: "",
    playerid: 0,
    x: INIT_X,
    y: INIT_Y,
    actionNum: 0

};

export default function renderPlayers(players: Map<IPlayerState["playerid"], IPlayerState>, playerAction: IPlayerAction,
    ctx: CanvasRenderingContext2D) {



    // animate/render the current player that iam working with
    // dummy calculations for clientside prediction
    updater(players, playerAction, predictedPlayerState);

    ctx.imageSmoothingEnabled = false;








    // render all players
    // For each frame, we have to clear the frame, then render the one frame with all the players
    ctx.clearRect(0, 0, 320, 180);
    for (const [_, player] of players) {
        let x;
        let y;
        if (player.playerid === playerAction.playerid) {
            // clientside calculated values
            x = Math.round(predictedPlayerState.x);
            y = Math.round(predictedPlayerState.y);
        } else {
            x = Math.round(player?.x ?? INIT_X);
            y = Math.round(player?.y ?? INIT_Y);
        }

        // Math.ceil for not having blurry edges due to drawing the border of the
        // filledRect in the center of canvas pixels (refer MDN)
        ctx.fillRect(x, y, 10, 10);
    }
}


function updater(players: Map<IPlayerState["playerid"], IPlayerState>, 
                 playerAction: IPlayerAction, predictedPlayerState: IPlayerState) {
    // update x, y , vx, vy
    //NOTE:: // CONSTANTS NEED TO UPDATE LATER - SAME AS THAT OF SERVER
    const vx = 10;
    const vy = 10;
    const dt = 0.1


    predictedPlayerState.playerid = playerAction.playerid;
    predictedPlayerState.room = playerAction.room;
    predictedPlayerState.actionNum = playerAction.actionNum;

    if (playerAction.left) {
        predictedPlayerState.x = predictedPlayerState.x - playerAction.left * vx * dt;
    }
    if (playerAction.right) {
        predictedPlayerState.x = predictedPlayerState.x + playerAction.right * vx * dt;
        console.log("predictedPlayerState.x here", predictedPlayerState.x)
    }

    if (playerAction.up) {
        predictedPlayerState.y = predictedPlayerState.y - playerAction.up * vy * dt;
    }
    if (playerAction.down) {
        predictedPlayerState.y = predictedPlayerState.y + playerAction.down * vy * dt;
    }
    

    //NOTE: // After the Prediction calculation Above, We check if the Prediction is correct or not - BELOW : 

    // when server's state is sent, then i have to calculate the diff and verify if current clientstate is correct
    
    //// if server playerstate of this client's playerid has not reached this client yet, then don't do anything
    const thisPlayerState = players.get(playerAction.playerid);
    if (!thisPlayerState) { return; }

    const firstPlayerAction = queue.dequeue()!; ///// the queue won't become empty 

    //// firstPlayerAction.actionNum === thisPlayerState.actionNum;

    // calculate the x & y states after adding up the actions until the present server state & Check if it's equal
        // to Server state


        // DO ::
    //// firstPlayerAction.
    //// if (firstPlayerAction)
}
