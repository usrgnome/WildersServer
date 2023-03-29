let $v = 0;
export const SERVER_HEADER = {
    ADD_CLIENT: 1,
    STATS: 2,
    INTRODUCE: 3,
    ENTITY_CHANGE_ITEM: 4,
    BOB_ANIMATION: 5,
    PLAYER_INFO: 6,
    SET_OUR_ENTITY: 7,
    UPDATE_ENTITY: 8,
    CONFIG: 9,
    REMOVE_ENTITY: 10,
    ADD_ENTITY: 11,
    SWAP_ITEM: 12,
    ACTION: 13,
    HIT_BOUNCE_EFFECT: 14,
    CHANGE_TIME: 15,
    DIED: 16,
    INVENTORY: 17,
    ADD_ITEM: 18,
    REMOVE_ITEM: 19,
    UPDATE_HEALTH: 20,
    LEADERBOARD: 21,
    HEALTH: 22,
    CHAT: 23,
    PING: 24,
    PING_RESPONSE: 25,
    BUILD_MODE: 26,
    HURT: 27,
    HUNGER: 28,
    TEMPERATURE: 29,
    RESPAWN: 30,
    HIT: 31,
    DEPTH: 32,
    PLACED_STRUCTURE: 33,
    EQUIP_COOLDOWN: 34,
    WRONG_TOOL: 35,
    SPECTATE: 36,
};

export const CLIENT_HEADER = {
    REQUEST_RESPAWN_TOKEN: 0,
    INPUT: 1,
    MOUSE_DOWN: 2,
    MOUSE_UP: 3,
    INVENTORY: 4,
    CHAT: 5,
    PONG: 6,
    EQUIP: 7,
    CRAFT: 8,
    SWAP: 9,
    DROP_ITEM: 10,
    MOBILE_INPUT: 11,
    PLACE: 12,
    REQUEST_RESPAWN: 13,
};


if (process.env.NODE_ENV === 'development') {
    function verifyObj(a: { [key: string]: number }) {
        let used = new Set();
        for (let l in a) {
            let val = a[l];
            if (used.has(val)) {
                throw `Packet did not pass verification key: ${l}, objj: ${a}`;
            }
            used.add(val);
        }
    }

    verifyObj(SERVER_HEADER);
    verifyObj(CLIENT_HEADER);
}