import { IPlayerState } from "../gameEngine";
import { IPlayerAction, clientSideQueue } from "./update";
import * as DYNAMICS from "./constants/dynamics";

//dummy init value for all players
const INIT_X = 10;
const INIT_Y = 10;
const QSCALE = 1000; // Quantization scale

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
        predictedPlayerState.x = Math.fround(predictedPlayerState.x - DYNAMICS.VX * DYNAMICS.DT);
    } else if (playerAction.right) {
        predictedPlayerState.x = Math.fround(predictedPlayerState.x + DYNAMICS.VX * DYNAMICS.DT);
    } else if (playerAction.up) {
        predictedPlayerState.y = Math.fround(predictedPlayerState.y - DYNAMICS.VY * DYNAMICS.DT);
    } else if (playerAction.down) {
        predictedPlayerState.y = Math.fround(predictedPlayerState.y + DYNAMICS.VY * DYNAMICS.DT);
    }

    if (playerAction.left && playerAction.up) {
        predictedPlayerState.x = Math.fround(predictedPlayerState.x - DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
        predictedPlayerState.y = Math.fround(predictedPlayerState.y - DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
    }
    if (playerAction.left && playerAction.down) {
        predictedPlayerState.x = Math.fround(predictedPlayerState.x - DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
        predictedPlayerState.y = Math.fround(predictedPlayerState.y + DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
    }
    if (playerAction.right && playerAction.up) {
        predictedPlayerState.x = Math.fround(predictedPlayerState.x + DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
        predictedPlayerState.y = Math.fround(predictedPlayerState.y - DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
    }
    if (playerAction.right && playerAction.down) {
        predictedPlayerState.x = Math.fround(predictedPlayerState.x + DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
        predictedPlayerState.y = Math.fround(predictedPlayerState.y + DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
    }
    console.log("Predicted X", predictedPlayerState.x, "Predicted Y", predictedPlayerState.y);

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
    if (prevClientActionNum ? (prevClientActionNum === serverActionNum) : false) {
        console.log("PrevClientActionNum and ServerActionNum is same");
        return;
    };

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
            xStateChange = Math.fround(xStateChange - DYNAMICS.VX * DYNAMICS.DT);
        } else if (action.right) {
            xStateChange = Math.fround(xStateChange + DYNAMICS.VX * DYNAMICS.DT);
        } else if (action.up) {
            yStateChange = Math.fround(yStateChange - DYNAMICS.VY * DYNAMICS.DT);
        } else if (action.down) {
            yStateChange = Math.fround(yStateChange + DYNAMICS.VY * DYNAMICS.DT);
        }


        if (action.left && action.up) {
            xStateChange = Math.fround(xStateChange - DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
            yStateChange = Math.fround(yStateChange - DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
        }
        if (action.left && action.down) {
            xStateChange = Math.fround(xStateChange - DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
            yStateChange = Math.fround(yStateChange + DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
        }
        if (action.right && action.up) {
            xStateChange = Math.fround(xStateChange + DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
            yStateChange = Math.fround(yStateChange - DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
        }
        if (action.right && action.down) {
            xStateChange = Math.fround(xStateChange + DYNAMICS.VX * DYNAMICS.DT / Math.sqrt(2));
            yStateChange = Math.fround(yStateChange + DYNAMICS.VY * DYNAMICS.DT / Math.sqrt(2));
        }
    }

    // console.log("PlayerX, xChange, PlayerY, yChange, serveraction, actiondeletedfromfront", thisPlayerState.x, xStateChange,
    //     thisPlayerState.y, yStateChange, serverActionNum, clientActionNum);

    const calculatedStateX = Math.fround(thisPlayerState.x + xStateChange);
    const calculatedStateY = Math.fround(thisPlayerState.y + yStateChange);

    //NOTE: // Incremental accumulation vs recomputation -> causes float64 (js number) to be rounded differently
    // for each calculation. causing slight end decimal number mismatches.
    //So Do QUANTIZED RECONCILIATION instead of exact matching for Fast paced shooters. Fast paced shooters don't need perfect
    //Mathematical determinism

    const equalX = Math.round(calculatedStateX * QSCALE) === Math.round(predictedPlayerState.x * QSCALE);
    const equalY = Math.round(calculatedStateY * QSCALE) === Math.round(predictedPlayerState.y * QSCALE);
    if (equalX && equalY) {
        // good
        return;
    } else {
        console.log("Quantum : PREDICTED STATE X, CALCULATED X", Math.round(predictedPlayerState.x * QSCALE),
            Math.round(calculatedStateX * QSCALE));
        console.log("Quantum : PREDICTED STATE Y, CALCULATED Y", Math.round(predictedPlayerState.y * QSCALE), 
                    Math.round(calculatedStateY * QSCALE));
        console.log("BADDDDDDDDDDD");
        //NOTE:  Revert the current predictedPlayerState to the CalculatedState - NOT bad, this will happen
        //when the error in the prediction state adds up and crosses the quanta threshold of 10^-3
        //THE ONLY THING WE NEED TO DO IS TO REDUCE THE NUMBER OF THESE RESETS
        predictedPlayerState.x = calculatedStateX;
        predictedPlayerState.y = calculatedStateY;
        return;
    }
}
