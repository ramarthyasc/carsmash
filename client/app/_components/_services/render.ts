import { IPlayerState } from "../gameEngine";
import { IPlayerAction, clientSideQueue } from "./update";
import * as DYNAMICS from "./constants/dynamics";

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
    updater(playerAction, predictedPlayerState);
    predictionVerifierAndModifier(players, playerAction);

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


function updater(playerAction: IPlayerAction, predictedPlayerState: IPlayerState) {
    // update x, y , vx, vy

    predictedPlayerState.playerid = playerAction.playerid;
    predictedPlayerState.room = playerAction.room;
    predictedPlayerState.actionNum = playerAction.actionNum;

    if (playerAction.left) {
        predictedPlayerState.x -= DYNAMICS.VX * DYNAMICS.DT;
    }
    if (playerAction.right) {
        predictedPlayerState.x += DYNAMICS.VX * DYNAMICS.DT;
    }

    if (playerAction.up) {
        predictedPlayerState.y -= DYNAMICS.VY * DYNAMICS.DT;
    }
    if (playerAction.down) {
        predictedPlayerState.y += DYNAMICS.VY * DYNAMICS.DT;
    }
    // console.log("CLIENT SIDE x, y", predictedPlayerState.x, predictedPlayerState.y);


}

let prevClientActionNum: number;

function predictionVerifierAndModifier(players: Map<IPlayerState["playerid"], IPlayerState>, playerAction: IPlayerAction) {

    //NOTE: // After the Prediction calculation (updater function) Above, We check if the Prediction is correct or not - BELOW : 

    // when server's state is sent, then i have to calculate the diff & add to it,
    // and verify if current clientstate is correct
    //// If server playerstate of this client's playerid has not reached this client yet, then don't do anything
    const thisPlayerState = players.get(playerAction.playerid);
    if (!thisPlayerState) { return; }

    // serverAction may stay the same for many cycles. So we need the client actionNum which was popped out in the 
    // previous cycle
    const serverActionNum = thisPlayerState.actionNum;
    if (prevClientActionNum ? (prevClientActionNum === serverActionNum): false) { 
        console.log("PrevClientActionNum and ServerActionNum is same");
        return;};

    let clientActionNum = clientSideQueue.dequeue()!.actionNum;

    while (serverActionNum !== clientActionNum) {
        clientActionNum = clientSideQueue.dequeue()!.actionNum;
    }
    prevClientActionNum = clientActionNum;

    //NOTE : /// BUT WHAT IF dataRef change just after break  & before I calculate - verify ? 
    //ie; Changing the serverActionNum -- = VERY VERY LOW CHANCE - BECAUSE THAT dt from for loop to execution of 
    // calculation is VERY SMALL compared to NETWORK LAG


    // NOW Calculate & verify if the clientState right now is same as serverState(Action1) + 
    // s(actions[action2, actions3,...])


    const actionsArray = clientSideQueue.toArray();

    // calculate the diff & verify
    let xStateChange = 0;
    let yStateChange = 0;
    for (const action of actionsArray) {
        if (action.left) {
            xStateChange -= DYNAMICS.VX * DYNAMICS.DT;
        }
        if (action.right) {
            xStateChange += DYNAMICS.VX * DYNAMICS.DT;
        }
        if (action.down) {
            yStateChange += DYNAMICS.VY * DYNAMICS.DT;
        }
        if (action.up) {
            yStateChange -= DYNAMICS.VY * DYNAMICS.DT;
        }
    }

    // console.log("PlayerX, xChange, serveraction, actiondeletedfromfront", thisPlayerState.x, xStateChange,
        // serverActionNum, clientActionNum);
    const calculatedStateX = thisPlayerState.x + xStateChange;
    const calculatedStateY = thisPlayerState.y + yStateChange;

    if (calculatedStateX === predictedPlayerState.x && calculatedStateY === predictedPlayerState.y) {
        // good
        return;
    } else {
        console.log("PREDICTED STATE X, CALCULATED X", predictedPlayerState.x, calculatedStateX);
        console.log("PREDICTED STATE Y, CALCULATED Y", predictedPlayerState.y, calculatedStateY);
        console.log("BADDDDDDDDDDD");
        //bad - Revert the current predictedPlayerState to the CalculatedState
        predictedPlayerState.x = calculatedStateX;
        predictedPlayerState.y = calculatedStateY;
        return;
    }
}
