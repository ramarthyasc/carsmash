interface IPlayer {
    x: number,
    y: number,
    vx: number,
    vy: number
}
interface IGame {
    car: IPlayer
}
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
export let game: IGame = {
    car: {
        x: 50,
        y: 50,
        vx: 0.1, // constant speed
        vy: 0.1, // constant speed
    }
};


export default function update(tFrame: DOMHighResTimeStamp) {
    const car = game.car;
    const dt = tFrame - lastTime;
    lastTime = tFrame;

    if (rightPressed) {
        car.x += car.vx * dt;
    }
    if (leftPressed) {
        car.x -= car.vx * dt;
    }
    if (upPressed) {
        car.y -= car.vy * dt;
    }
    if (downPressed) {
        car.y += car.vy * dt;
    }

}
