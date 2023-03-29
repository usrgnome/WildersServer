import { ITEM, Item, ITEMS } from './Item';
import { ERRORS } from '../shared/errors';

export class Stack {
    item: Item;
    quantity: number;

    constructor(item: Item, quantity: number) {
        this.item = item;
        this.quantity = quantity;
    }

    update(item: Item, quantity: number) {
        this.item = item;
        this.quantity = quantity;
    }
}

export class Inventory {
    items: Stack[] = [];
    size: number = 0;

    setSlot(slot: number, item: Item, quantity: number) {
        if (slot < 0 || slot >= this.size)
            throw ERRORS.INVENTORY_MODIFY_INDEX_OUT_OF_BOUNDS;
        const stack = this.getStack(item, quantity);
        const prev = this.items[slot];
        this.onStackRemoved(prev);
        this.items[slot] = stack;
        this.onStackAdded(stack);
    }

    private addStack(newStack: Stack) {
        for (let i = 0; i < this.size; i++) {
            const stack = this.items[i];
            if (stack.item.id === ITEM.NONE) {
                this.onStackRemoved(stack);
                this.items[i] = newStack;
                this.onStackAdded(newStack);
                return;
            }
        }

        throw new Error('cant find candidate!');
    }

    hasItem(item: Item) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].item.id === item.id) return true;
        }
        return false;
    }

    hasQuantity(itemId: number, quantity: number) {
        let foundQuantity = 0;
        for (let i = 0; i < this.size; i++) {
            if (this.items[i].item.id === itemId) {
                foundQuantity += this.items[i].quantity;
            }
        }

        return foundQuantity >= quantity;
    }

    addItem(item: Item, quantity: number): number {
        if (this.hasItem(item)) {
            for (let i = 0; i < this.items.length; i++) {
                if (this.items[i].item.id === item.id) {
                    const stack = this.items[i];
                    stack.update(this.items[i].item, stack.quantity + quantity);
                    return quantity;
                }
            }
        } else {
            if (this.isFull()) {
                return 0;
            } else {
                const stack = this.getStack(item, quantity);
                this.addStack(stack);
                return quantity;
            }
        }
    }

    removeItem(item: Item, quantity: number): number {
        let ToRemove = quantity;
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].item.id === item.id) {
                const selectedStack = this.items[i];

                let oldQuantity = selectedStack.quantity;
                let newQuantity = Math.max(0, oldQuantity - quantity);
                if (newQuantity === 0) {
                    selectedStack.update(ITEMS[ITEM.NONE], 0);
                } else {
                    selectedStack.update(item, newQuantity);
                }

                return oldQuantity - newQuantity;
            }
        }
    }

    isFull() {
        for (let i = 0; i < this.size; i++) {
            if (
                this.items[i].item.id === ITEM.NONE
            )
                return false;
        }
        return true;
    }

    getStack(item: Item, quantity) {
        return new Stack(item, quantity);
    }

    constructor(size: number) {
        this.resize(size);
    }

    swap(slot1: number, slot2: number) {
        const tmp = this.items[slot1];
        this.items[slot1] = this.items[slot2];
        this.items[slot2] = tmp;
    }

    resize(size: number): Stack[] {
        let dropped: Stack[] = [];

        if (size < this.size) {
            for (let i = size; i < this.size; i++) {
                dropped.push(this.items[i]);
            }
            this.items.length = size;
        } else if (size > this.size) {
            this.items.length = size;
            for (let i = this.size; i < size; i++) {
                const stack = this.getStack(ITEMS[ITEM.NONE], 0);
                this.items[i] = stack;
                this.onStackAdded(stack);
            }
        }

        this.size = size;
        for (let i = 0; i < dropped.length; i++) {
            this.onStackRemoved(dropped[i]);
        }
        return dropped;
    }

    hasMaterialsNeededToCraft(item: Item, quantity: number) {
        const recipe = item.craftedFrom.recipe;
        if (!recipe) return;

        for (let i = 0; i < recipe.length; i++) {
            const resource = recipe[i];
            const itemId = resource[0];
            const itemQuantity = resource[1] * quantity;
            if (!this.hasQuantity(itemId, itemQuantity)) return false;
        }

        return true;
    }

    canCraft(item: Item, quantity: number) {
        if (this.isFull()) return false;
        return this.hasMaterialsNeededToCraft(item, quantity);
    }

    craft(item: Item, quantity: number) {
        const recipe = item.craftedFrom.recipe;
        if (!recipe) return;

        for (let i = 0; i < recipe.length; i++) {
            const resource = recipe[i];
            const itemId = resource[0];
            const itemQuantity = resource[1] * quantity;
            //if (!this.hasQuantity(itemId, itemQuantity)) return false;
            this.removeItem(ITEMS[itemId], itemQuantity);
        }

        this.addItem(item, quantity);
        return true;
    }

    onStackAdded(stack: Stack) { }

    onStackRemoved(stack: Stack) { }
}
