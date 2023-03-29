import { toMeters } from './config';
import { ENTITY } from './EntityTypes';
import { SPRITE } from './Sprite';

type Recipe = {
    recipe: [number, number][];
    campfire: boolean;
    craftbench: boolean;
}

function copyOpts(o: any, b: any) {
    for (let key in b) {
        if (!o.hasOwnProperty(key) || o[key] === undefined) {
            o[key] = b[key];
        }
    }

    return o
}

export class Item {
    name: string;
    id: number = 0;
    leftArm: boolean = true;
    handSprite: number = SPRITE.SPEAR;
    invSprite: number = SPRITE.SPEAR;
    meelee: boolean = false;
    placeable: boolean = false;
    consumable: boolean = false;
    equipable: boolean = false;
    craftedFrom: Recipe | null;
    category = 0;
    level = 0;
    swapCooldown = 0;
    damage = 0;
    feeds = 0;
    castTime = 0;
    effectTime = 0;
    cooldownTime = 0;
    hitForce = 0;

    /*constructor(name: string, spriteId: number, inventorySpriteId, craftedFrom: Recipe | null, category = 0, level = 0) {
        this.name = name;
        this.spriteId = spriteId;
        this.invSpriteId = inventorySpriteId;
        this.craftedFrom = craftedFrom;
        this.category = category;
        this.level = 0;
    }*/

    constructor(config: ItemConfig) {
        const defaultConfig: ItemConfig = {
            name: '',
            invSprite: SPRITE.NONE,
            handSprite: SPRITE.NONE,
            recipe: null,
            category: 0,
            level: 0,
            swapCooldown: 0,
            feeds: 0,
            damage: 0,
            castTime: 0,
            effectTime: 0,
            cooldownTime: 0,
            equipable: false,
            hitForce: 0,
        }

        copyOpts(config, defaultConfig);
        this.name = config.name;
        this.craftedFrom = config.recipe;
        this.handSprite = config.handSprite;
        this.invSprite = config.invSprite;
        this.category = config.category;
        this.level = config.level;
        this.swapCooldown = config.swapCooldown;
        this.damage = config.damage;
        this.feeds = config.feeds;
        this.castTime = config.castTime;
        this.cooldownTime = config.cooldownTime;
        this.effectTime = config.effectTime;
        this.equipable = config.equipable;
        this.hitForce = config.hitForce;
    }
}

export class MeeleItem extends Item {
    override equipable: boolean = true;
    override meelee: boolean = true;
    radius: number = toMeters(100);
    arcAngle = Math.PI * .5;
}

export class PickaxeItem extends Item {
    override equipable: boolean = true;
    override meelee: boolean = true;
    radius: number = toMeters(100);
    arcAngle = Math.PI * .5;
    override category = ITEM_CATEGORY.PICK;
}

export class ConsumableItem extends Item {
    override consumable: boolean = true;
    override equipable: boolean = true;
}

export class PlaceableItem extends Item {
    placeable: boolean = true;
    override equipable: boolean = true;
}

export const ITEMS: Item[] = [];

function registerItem(item: Item, itemId: number) {
    item.id = itemId;
    ITEMS[itemId] = item;
}

// add new item, add its id then register it

export const ITEM_CATEGORY = {
    PICK: 1,
    MEELE: 2,
    FIST: 4,
}

export const ITEM_LEVEL = {
    FIST: 0,
    WOOD: 1,
    STONE: 2,
    GOLD: 3,
    DIAMOND: 4,
    AMYTHYST: 5,
}

let __v = 0;
export const ITEM = {
    NONE: 0,
    GOLD: 1,
    STONE_SWORD: 2,
    WOOD_SWORD: 3,
    GOLD_SWORD: 4,
    DIAMOND_SWORD: 5,
    AMYTHYST_SWORD: 6,
    SPEAR: 7,
    STONE_PICK: 8,
    WOOD_PICK: 9,
    GOLD_PICK: 10,
    DIAMOND_PICK: 11,
    AMY_PICK: 12,
    WOOD_WALL: 13,
    WORK_BENCH: 14,
    FIRE: 15,
    TORCH: 16,
    APPLE: 17,
    STICKS: 18,
    EMERALD: 19,
    AMYTHYST: 20,
    DIAMOND: 21,
    STONE_SHARD: 22,
};

type ItemConfig = {
    name: string;
    handSprite: number;
    invSprite: number;
    recipe?: Recipe | null;
    category?: number;
    level?: number;
    swapCooldown?: number;
    damage?: number;
    feeds?: number;
    castTime?: number;
    cooldownTime?: number;
    effectTime?: number
    equipable?: boolean;
    hitForce?: number;
}

type PlaceableItemConfig = {
    placeSprite: number;
}

registerItem(
    new MeeleItem({
        name: 'fist',
        invSprite: SPRITE.NONE,
        handSprite: SPRITE.NONE,
        recipe: null,
        category: ITEM_CATEGORY.FIST,
        level: ITEM_LEVEL.FIST,
        damage: 5,
        equipable: true,
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
        hitForce: 100,
    }),
    ITEM.NONE
);

registerItem(
    new PlaceableItem({
        name: 'Workbench',
        invSprite: SPRITE.INV_WORKBENCH,
        handSprite: SPRITE.WORKBENCH,
        recipe: {
            recipe: [[ITEM.STICKS, 20], [ITEM.STONE_SHARD, 10]],
            campfire: false,
            craftbench: false,
        }
    }), ITEM.WORK_BENCH
)

registerItem(
    new PlaceableItem({
        name: 'Camp fire',
        recipe: {
            recipe: [[ITEM.STICKS, 25], [ITEM.STONE_SHARD, 5]],
            campfire: false,
            craftbench: false,
        },
        handSprite: SPRITE.FIRE_STICKS,
        invSprite: SPRITE.INV_CAMPFIRE
    }),
    ITEM.FIRE
);

registerItem(
    new PickaxeItem({
        name: 'Wood Pick',
        handSprite: SPRITE.WOOD_PICK,
        invSprite: SPRITE.INV_WOOD_PICK,
        category: ITEM_CATEGORY.PICK,
        level: ITEM_LEVEL.WOOD,
        damage: 3,
        recipe: {
            craftbench: false,
            campfire: false,
            recipe: [[ITEM.STICKS, 10]]
        },
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.WOOD_PICK
);

registerItem(
    new PickaxeItem({
        name: 'Stone Pick',
        handSprite: SPRITE.STONE_PICK,
        invSprite: SPRITE.INV_STONE_PICK,
        category: ITEM_CATEGORY.PICK,
        level: ITEM_LEVEL.STONE,
        damage: 3,
        recipe: {
            craftbench: true,
            campfire: false,
            recipe: [[ITEM.STICKS, 50], [ITEM.STONE_SHARD, 15], [ITEM.WOOD_PICK, 1]]
        },
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.STONE_PICK
);

registerItem(
    new PickaxeItem({
        name: 'Gold Pick',
        handSprite: SPRITE.GOLD_PICK,
        invSprite: SPRITE.INV_GOLD_PICK,
        category: ITEM_CATEGORY.PICK,
        level: ITEM_LEVEL.GOLD,
        damage: 3,
        recipe: {
            craftbench: true,
            campfire: false,
            recipe: [[ITEM.STICKS, 40], [ITEM.STONE_SHARD, 30], [ITEM.STONE_PICK, 1]]
        },
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.GOLD_PICK
);

registerItem(
    new PickaxeItem({
        name: 'Diamond Pick',
        handSprite: SPRITE.DIAMOND_PICK,
        invSprite: SPRITE.INV_DIAMOND_PICK,
        category: ITEM_CATEGORY.PICK,
        level: ITEM_LEVEL.DIAMOND,
        damage: 3,
        recipe: {
            craftbench: true,
            campfire: true,
            recipe: [[ITEM.STICKS, 10], [ITEM.STONE_SHARD, 10], [ITEM.GOLD_PICK, 1]]
        },
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.DIAMOND_PICK
);

registerItem(
    new PickaxeItem({
        name: 'Amythyst Pick',
        handSprite: SPRITE.AMY_PICK,
        invSprite: SPRITE.INV_AMY_PICK,
        category: ITEM_CATEGORY.PICK,
        level: ITEM_LEVEL.AMYTHYST,
        damage: 3,
        recipe: {
            craftbench: true,
            campfire: true,
            recipe: [[ITEM.STICKS, 10], [ITEM.STONE_SHARD, 10], [ITEM.DIAMOND_PICK, 1]]
        },
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.AMY_PICK
);

registerItem(
    new MeeleItem({
        name: "Wood Sword",
        handSprite: SPRITE.WOOD_SWORD,
        invSprite: SPRITE.INV_WOOD_SWORD,
        recipe: {
            recipe: [[ITEM.STICKS, 30]],
            campfire: false,
            craftbench: false,
        },
        category: ITEM_CATEGORY.MEELE,
        level: ITEM_LEVEL.WOOD,
        damage: 14,
        equipable: true,
        swapCooldown: 10,
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.WOOD_SWORD
);

registerItem(
    new MeeleItem({
        name: "Gold Sword",
        handSprite: SPRITE.GOLD_SWORD,
        invSprite: SPRITE.INV_GOLD_SWORD,
        recipe: {
            recipe: [[ITEM.STICKS, 60], [ITEM.STONE_SHARD, 50], [ITEM.STONE_SWORD, 1]],
            campfire: true,
            craftbench: true,
        },
        category: ITEM_CATEGORY.MEELE,
        level: ITEM_LEVEL.GOLD,
        damage: 14,
        equipable: true,
        swapCooldown: 10,
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.GOLD_SWORD
);

registerItem(
    new MeeleItem({
        name: "Diamond Sword",
        handSprite: SPRITE.DIAMOND_SWORD,
        invSprite: SPRITE.INV_DIAMOND_SWORD,
        recipe: {
            recipe: [[ITEM.STONE_SHARD, 80], [ITEM.DIAMOND, 40], [ITEM.DIAMOND_SWORD, 1]],
            campfire: true,
            craftbench: true,
        },
        category: ITEM_CATEGORY.MEELE,
        level: ITEM_LEVEL.DIAMOND,
        damage: 14,
        equipable: true,
        swapCooldown: 10,
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.DIAMOND_SWORD
);

registerItem(
    new MeeleItem({
        name: "Amythyst Sword",
        handSprite: SPRITE.AMYTHYST_SWORD,
        invSprite: SPRITE.INV_AMYTHYST_SWORD,
        recipe: {
            recipe: [[ITEM.DIAMOND, 60], [ITEM.AMYTHYST, 40], [ITEM.DIAMOND_SWORD, 1]],
            campfire: true,
            craftbench: true,
        },
        category: ITEM_CATEGORY.MEELE,
        level: ITEM_LEVEL.AMYTHYST,
        damage: 14,
        equipable: true,
        swapCooldown: 10,
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.AMYTHYST_SWORD
);

registerItem(
    new MeeleItem({
        name: "Stone Sword",
        handSprite: SPRITE.STONE_SWORD,
        invSprite: SPRITE.INV_STONE_SWORD,
        recipe: {
            recipe: [[ITEM.STICKS, 50], [ITEM.STONE_SHARD, 25], [ITEM.WOOD_SWORD, 1]],
            campfire: false,
            craftbench: true,
        },
        category: ITEM_CATEGORY.MEELE,
        level: ITEM_LEVEL.STONE,
        damage: 14,
        equipable: true,
        swapCooldown: 10,
        castTime: 0.3 * 15,
        effectTime: 1,
        cooldownTime: 0 * 15,
    }),
    ITEM.STONE_SWORD
);

registerItem(
    new Item({
        name: 'torch',
        handSprite: SPRITE.TORCH,
        invSprite: SPRITE.INV_TORCH,
        equipable: true,
        recipe: {
            recipe: [[ITEM.STICKS, 25]],
            craftbench: false,
            campfire: true,
        }
    }),
    ITEM.TORCH
);

registerItem(
    new PlaceableItem({
        name: 'Wood Wall',
        handSprite: SPRITE.WALL,
        invSprite: SPRITE.INV_WOOD_WALL,
        recipe: {
            recipe: [[ITEM.STICKS, 20]],
            campfire: false,
            craftbench: true,
        }
    }),
    ITEM.WOOD_WALL
);

registerItem(
    new ConsumableItem({
        name: "Apple",
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_APPLE,
        feeds: 5,
    }),
    ITEM.APPLE
);

registerItem(
    new Item({
        name: 'Wood',
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_STICKS,
    }),
    ITEM.STICKS
);

registerItem(
    new Item({
        name: 'Stone',
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_STONE_SHARD,
    }),
    ITEM.STONE_SHARD
);

registerItem(
    new Item({
        name: 'Gold',
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_GOLD,
    }),
    ITEM.GOLD
);

registerItem(
    new Item({
        name: 'Diamond',
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_DIAMOND,
    }),
    ITEM.DIAMOND
);

registerItem(
    new Item({
        name: 'Emerald',
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_EMERALD,
    }),
    ITEM.EMERALD
);

registerItem(
    new Item({
        name: 'Amythyst',
        handSprite: SPRITE.NONE,
        invSprite: SPRITE.INV_AMYTHYST
    }),
    ITEM.AMYTHYST
);

export function numIsValidItem(num: number) {
    if (num >= ITEMS.length || num < 0) return false;
    if (!Number.isInteger(num)) return false;
    return ITEMS[num];
}