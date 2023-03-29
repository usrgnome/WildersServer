import { b2Body, b2BodyDef, b2BodyType, b2CircleShape, b2FixtureDef, b2Vec2 } from "@box2d/core";
import { toMeters } from "../../shared/config";
import World from "../world";
import { PhysicsBodyController } from "./controller";
import { COLLISION_MASK, COLLISION_TAG } from "../constants";
import { IBodyUserData, IFixtureUserData } from "../types";

const RADIUS = 135;

export class CaveWallPhysicsController extends PhysicsBodyController {
    static bodyShape: b2CircleShape = new b2CircleShape(toMeters(RADIUS));

    private static bodyDef: b2BodyDef = {
        type: b2BodyType.b2_staticBody,
        position: new b2Vec2(0, 0),
        linearDamping: 10,
        fixedRotation: true,
    }

    private static hitboxDef: b2FixtureDef = {
        shape: CaveWallPhysicsController.bodyShape,
        density: 1.0,
        friction: 0.0,
        filter: {
            categoryBits: COLLISION_MASK.ENVRIONMENT,
            maskBits: COLLISION_MASK.ALIVE | COLLISION_MASK.VIEWBOX,
        }
    }

    static radius = RADIUS;

    onAdded(world: World): void {

        /*
        *   Body
        */

        const body: b2Body = world.b2world.CreateBody(CaveWallPhysicsController.bodyDef);

        const bodyUserData: IBodyUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.NONE,
            controller: this,
        }

        body.SetUserData(bodyUserData);

        this.body = body;

        /*
        *  Hitbox 
        */

        const hitbox = body.CreateFixture(CaveWallPhysicsController.hitboxDef);

        const hitboxUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.BODY,
            controller: this,
        }

        hitbox.SetUserData(hitboxUserData);

        super.onAdded(world);
    }

    onRemoved(world: World): void {
        world.b2world.DestroyBody(this.body);
    }

}