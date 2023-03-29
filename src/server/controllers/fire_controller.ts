import { b2Body, b2BodyDef, b2BodyType, b2CircleShape, b2FixtureDef, b2Vec2 } from "@box2d/core";
import { toMeters } from "../../shared/config";
import World from '../world'
import { PhysicsBodyController } from "./controller";
import { COLLISION_MASK, COLLISION_TAG } from "../constants";
import { IBodyUserData, IFixtureUserData } from "../types";


export class FirePhysicsController extends PhysicsBodyController {

    private static bodyDef: b2BodyDef = {
        type: b2BodyType.b2_staticBody,
        position: new b2Vec2(0, 0),
        linearDamping: 10,
        fixedRotation: true,
    }

    static hitboxShape: b2CircleShape = new b2CircleShape(toMeters(100));
    private static hitboxDef: b2FixtureDef = {
        shape: FirePhysicsController.hitboxShape,
        density: 1.0,
        friction: 0.0,
        filter: {
            categoryBits: COLLISION_MASK.ENVRIONMENT,
            maskBits: COLLISION_MASK.VIEWBOX,
        }
    }

    private static sensorShape: b2CircleShape = new b2CircleShape(toMeters(200));
    private static sensorDef: b2FixtureDef = {
        shape: FirePhysicsController.sensorShape,
        density: 1.0,
        friction: 0.0,
        isSensor: true,
        filter: {
            categoryBits: COLLISION_MASK.FIRE,
            maskBits: COLLISION_MASK.ALIVE,
        }
    }


    onAdded(world: World): void {

        /*
        *   Body 
        */

        const body: b2Body = world.b2world.CreateBody(FirePhysicsController.bodyDef);

        const bodyUserData: IBodyUserData = {
            eid: this.eid,
            tag: COLLISION_MASK.FIRE,
            controller: this,
        }

        body.SetUserData(bodyUserData);

        this.body = body;

        /*
        *   Hitbox 
        */
        const hitbox = body.CreateFixture(FirePhysicsController.hitboxDef);

        const hitboxUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.BODY,
            controller: this,
        }

        hitbox.SetUserData(hitboxUserData);

        /*
        *   Sensor 
        */

        const sensor = body.CreateFixture(FirePhysicsController.sensorDef);

        const sensorUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.FIRE_WARMTH,
            controller: this,
        }

        sensor.SetUserData(sensorUserData);

        super.onAdded(world);
    }

    onRemoved(world: World): void {
        world.b2world.DestroyBody(this.body);
    }

}