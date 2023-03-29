import { b2Body, b2BodyDef, b2BodyType, b2CircleShape, b2FixtureDef, b2PolygonShape, b2Vec2 } from "@box2d/core";
import { toMeters } from "../../shared/config";
import World from "../world";
import { PhysicsBodyController } from "./controller";
import { COLLISION_MASK, COLLISION_TAG } from "../Constants";
import { IBodyUserData, IFixtureUserData } from "../types";

const RADIUS = 60;

const bodyDef: b2BodyDef = {
    type: b2BodyType.b2_dynamicBody,
    position: new b2Vec2(0, 0),
    linearDamping: 10,
    fixedRotation: true,
}

//const bodyShape: b2CircleShape = new b2CircleShape(toMeters(RADIUS));

const points = [{ "x": 350, "y": 0 }, { "x": 247.48737341529164, "y": 247.48737341529161 }, { "x": 2.1431318985078682e-14, "y": 350 }, { "x": -247.48737341529161, "y": 247.48737341529164 }, { "x": -350, "y": 4.2862637970157365e-14 }, { "x": -247.4873734152917, "y": -247.48737341529161 }, { "x": -6.429395695523604e-14, "y": -350 }, { "x": 247.4873734152916, "y": -247.4873734152917 }];

const verts: b2Vec2[] = [];

for (let i = 0; i < points.length; i++) {
    const point = points[i];
    verts.push(new b2Vec2(toMeters(point.x), toMeters(point.y)))
}

const area = function () {
    var area = 0,
        i,
        j,
        point1,
        point2;

    for (i = 0, j = verts.length - 1; i < verts.length; j = i, i++) {
        point1 = verts[i];
        point2 = verts[j];
        area += point1.x * point2.y;
        area -= point1.y * point2.x;
    }
    area /= 2;

    return area;
};

const centroid = function () {
    var x = 0,
        y = 0,
        i,
        j,
        f,
        point1,
        point2;

    for (i = 0, j = verts.length - 1; i < verts.length; j = i, i++) {
        point1 = verts[i];
        point2 = verts[j];
        f = point1.x * point2.y - point2.x * point1.y;
        x += (point1.x + point2.x) * f;
        y += (point1.y + point2.y) * f;
    }

    f = area() * 6;

    return new b2Vec2(x / f, y / f);
};

const _verts: b2Vec2[] = [new b2Vec2(-1, -1), new b2Vec2(1, -1), new b2Vec2(1, 1), new b2Vec2(-1, 1)];
_verts.map(vert => {
    vert.x *= toMeters(300);
    vert.y *= toMeters(300);
    return vert;
})

const bodyShape = new b2PolygonShape();
bodyShape.Set(verts, verts.length);

const hitboxDef: b2FixtureDef = {
    shape: bodyShape,
    density: 1.0,
    friction: 0.0,
    isSensor: true,
    filter: {
        categoryBits: COLLISION_MASK.ENVRIONMENT,
        maskBits: COLLISION_MASK.VIEWBOX | COLLISION_MASK.ALIVE,
    }
}

const sensorDef: b2FixtureDef = {
    shape: bodyShape,
    density: 1.0,
    friction: 0.0,
    isSensor: true,
    filter: {
        categoryBits: COLLISION_MASK.ALIVE,
        maskBits: COLLISION_MASK.ALIVE
    }
}

export class LakePhysicsController extends PhysicsBodyController {
    static radius = RADIUS;

    onAdded(world: World): void {

        /*
        *   Body
        */

        const body: b2Body = world.b2world.CreateBody(bodyDef);

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

        const hitbox = body.CreateFixture(hitboxDef);

        const hitboxUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.BODY,
            controller: this,
        }

        hitbox.SetUserData(hitboxUserData);

        /*
        * sensosr 
        */

        const sensor = body.CreateFixture(sensorDef);

        const sensorUserData: IFixtureUserData = {
            eid: this.eid,
            tag: COLLISION_TAG.WATER,
            controller: this,
        }

        sensor.SetUserData(sensorUserData);

        super.onAdded(world);
    }

    onRemoved(world: World): void {
        world.b2world.DestroyBody(this.body);
    }

}