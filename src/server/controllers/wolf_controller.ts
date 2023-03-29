import { b2Body, b2BodyDef, b2BodyType, b2CircleShape, b2FixtureDef, b2PolygonShape, b2Vec2 } from "@box2d/core";
import { toMeters } from "../../shared/config";
import World from "../world";
import { PhysicsBodyController } from "./controller";
import { COLLISION_MASK, COLLISION_TAG } from "../Constants";
import { IBodyUserData, IFixtureUserData } from "../types";

const bodyDef: b2BodyDef = {
    type: b2BodyType.b2_dynamicBody,
    position: new b2Vec2(0, 0),
    linearDamping: 10,
    fixedRotation: true,
    allowSleep: false,
}

const hitboxShape: b2CircleShape = new b2CircleShape(toMeters(70));
const hitboxDef: b2FixtureDef = {
    shape: hitboxShape,
    density: 1.0,
    friction: 0.0,
    filter: {
        categoryBits: COLLISION_MASK.MOB,
        maskBits: COLLISION_MASK.ENVRIONMENT | COLLISION_MASK.VIEWBOX | COLLISION_MASK.FIRE | COLLISION_MASK.ALIVE,
    }
}

const viewportShape = getBoxShape(toMeters(1920 * 0.5), toMeters(1080 * 0.5))//: b2CircleShape = new b2CircleShape(toMeters(40));
const viewportDef: b2FixtureDef = {
    shape: viewportShape,
    isSensor: true,
    filter: {
        categoryBits: COLLISION_MASK.VIEWBOX,
        maskBits: COLLISION_MASK.ENTITY_HITBOX,
    }
}

function getBoxShape(w: number, h: number) {
    let shape = new b2PolygonShape();
    shape.SetAsBox(w / 2.0, h / 2.0);
    return shape;
}

export class WolfPhysicsController extends PhysicsBodyController {
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
        *  Hitbox 
        */

        const hitbox = body.CreateFixture(hitboxDef);

        const hitboxUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.BODY,
            controller: this,
        }

        hitbox.SetUserData(hitboxUserData);

        /*
        * Viewport 
        */

        const viewport = body.CreateFixture(viewportDef);

        const viewportUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.VIEW,
            controller: this,
        }

        viewport.SetUserData(viewportUserData);

        super.onAdded(world);
    }

    onRemoved(world: World): void {
        world.b2world.DestroyBody(this.body);
    }
}