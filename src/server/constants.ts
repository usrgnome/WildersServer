export const ECS_NULL = -1;
export const CID_NULL = 0;

export const COLLISION_MASK = {
    NONE: 0,
    PLAYER: 1,
    ENVRIONMENT: 2,
    VIEWBOX: 4,
    FIRE: 8,
    FIRE_BURN: 16,
    MOB: 32,
    ALIVE: 1 | 32,
    ENTITY_HITBOX: 1 | 2 | 32,
};

export const COLLISION_TAG = {
    FIRE_WARMTH: 6,
    FIRE_BURN: 2,
    NONE: 1,
    ATTACK: 3,
    VIEW: 4,
    BODY: 5,
    WORKBENCH: 7,
    WATER: 8,
    ITEM: 9,
}