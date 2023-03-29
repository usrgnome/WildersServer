import { b2Body, b2Rot, b2Transform, b2Vec2 } from "@box2d/core";
import World from "../world"
import { Client } from "../client";

const TMP_TRANSFORM = new b2Transform();
const TMP_VEC1 = new b2Vec2(0, 0);
const TMP_VEC2 = new b2Vec2(0, 0);
const TMP_ROT = new b2Rot(0);

export class PhysicsBodyController {

    private _x = 0;
    private _y = 0;
    private wantsToSetPosition = false;

    eid: number;
    body: b2Body;
    visibleEntities: Set<number> = new Set();

    constructor(eid: number, client: Client = null) {
        this.eid = eid;
        this.visibleEntities.add(eid);
    }

    onAdded(world: World) {
        if(this.wantsToSetPosition) {
            this.wantsToSetPosition = false;
            this.setPosition(this._x, this._y);
        }
    }
    onRemoved(world: World) { }

    setPosition(x: number, y: number) {
        if(!this.body) {
            this.wantsToSetPosition = true;
            this._x = x;
            this._y = y;
            return;
        };
        let transform = TMP_TRANSFORM;
        TMP_VEC1.x = x;
        TMP_VEC1.y = y;
        TMP_ROT.Set(0);
        transform.SetPosition(TMP_VEC1);
        transform.SetRotation(TMP_ROT);
        this.body.SetTransform(transform);
    }

    getPosition() {
        return this.body.GetPosition();
    }

    getVelocity() {
        return this.body.GetLinearVelocity();
    }

    getMass() {
        return this.body.GetMass();
    }

    applyForce(x: number, y: number) {
        TMP_VEC1.x = x;
        TMP_VEC1.y = y;
        this.body.ApplyForceToCenter(TMP_VEC1);
    }

    applyImpulse(x: number, y: number) {
        TMP_VEC1.x = x;
        TMP_VEC1.y = y;
        this.body.ApplyLinearImpulseToCenter(TMP_VEC1);
    }
}