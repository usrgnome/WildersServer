import { b2Body, b2BodyDef, b2BodyType, b2CircleShape, b2FixtureDef, b2Vec2 } from "@box2d/core";
import { toMeters } from "../../shared/config";
import World from "../world";
import { PhysicsBodyController } from "./controller";
import { COLLISION_MASK, COLLISION_TAG } from "../constants";
import { IBodyUserData, IFixtureUserData } from "../types";


export class WorkbenchPhysicsController extends PhysicsBodyController {
    static hitboxShape: b2CircleShape = new b2CircleShape(toMeters(60));

    private static bodyDef: b2BodyDef = {
        type: b2BodyType.b2_staticBody,
        position: new b2Vec2(0, 0),
        linearDamping: 10,
        fixedRotation: true,
    }

    private static hitboxDef: b2FixtureDef = {
        shape: WorkbenchPhysicsController.hitboxShape,
        density: 1.0,
        friction: 0.0,
        filter: {
            categoryBits: COLLISION_MASK.ENVRIONMENT,
            maskBits: COLLISION_MASK.VIEWBOX | COLLISION_MASK.ALIVE,
        }
    }

    private static sensorShape: b2CircleShape = new b2CircleShape(toMeters(200));
    private static sensorDef: b2FixtureDef = {
        shape: WorkbenchPhysicsController.sensorShape,
        density: 1.0,
        friction: 0.0,
        isSensor: true,
        filter: {
            categoryBits: COLLISION_MASK.VIEWBOX,
            maskBits: COLLISION_MASK.ALIVE,
        }
    }

    onAdded(world: World): void {

        /*
        *   Body
        */

        const body: b2Body = world.b2world.CreateBody(WorkbenchPhysicsController.bodyDef);

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

        const hitbox = body.CreateFixture(WorkbenchPhysicsController.hitboxDef);

        const hitboxUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.BODY,
            controller: this,
        }

        hitbox.SetUserData(hitboxUserData);

        /*
        *   Sensor 
        */

        const sensor = body.CreateFixture(WorkbenchPhysicsController.sensorDef);

        const sensorUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.WORKBENCH,
            controller: this,
        }

        sensor.SetUserData(sensorUserData);

        super.onAdded(world);
    }

    onRemoved(world: World): void {
        world.b2world.DestroyBody(this.body);
    }

}