import { b2Body, b2BodyDef, b2BodyType, b2CircleShape, b2FixtureDef, b2Vec2 } from "@box2d/core";
import { toMeters } from "../../shared/config";
import World from "../world";
import { PhysicsBodyController } from "./controller";
import { COLLISION_MASK, COLLISION_TAG } from "../Constants";
import { IBodyUserData, IFixtureUserData } from "../types";

const bodyDef: b2BodyDef = {
    type: b2BodyType.b2_staticBody,
    position: new b2Vec2(0, 0),
    linearDamping: 10,
    fixedRotation: true,
}

const hitboxShape: b2CircleShape = new b2CircleShape(toMeters(100));
const hitboxDef: b2FixtureDef = {
    shape: hitboxShape,
    density: 1.0,
    friction: 0.0,
    filter: {
        categoryBits: COLLISION_MASK.ENVRIONMENT,
        maskBits: COLLISION_MASK.VIEWBOX | COLLISION_MASK.ALIVE,
    }
}

export class ResourcePhysicsController extends PhysicsBodyController {
    onAdded(world: World): void {

        /*
        *   Body
        */

        const body: b2Body = world.b2world.CreateBody(bodyDef);

        const bodyUserData: IBodyUserData = {
            eid: this.eid,
            tag: COLLISION_MASK.NONE,
            controller: this,
        }

        body.SetUserData(bodyUserData);

        this.body = body;

        /*
        *   Hitbox 
        */

        const hitbox = body.CreateFixture(hitboxDef);

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