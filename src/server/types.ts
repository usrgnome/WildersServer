import { PhysicsBodyController } from "./controllers/controller";
import { Attack } from "./entity";

export interface SpawnPoint {
    x: number;
    y: number;
}

export interface IFixtureUserData {
    eid: number;
    tag: number;
    controller?: PhysicsBodyController;
    attack?: Attack;
}

export interface IBodyUserData {
    eid: number;
    tag: number;
    controller?: PhysicsBodyController;
    attack?: Attack;
}