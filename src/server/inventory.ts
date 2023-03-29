import { Inventory, Stack } from "../shared/inventory";
import { Item } from "../shared/Item";
import { Client } from "./client";
import { ECS_NULL } from "./constants";

export class ServerInventory extends Inventory {
    client: Client = null;
    eid: number = ECS_NULL;

    constructor (size: number, client: Client) {
        super(size);
        this.client = client;
    }

    addItem (item: Item, quantity: number): number {
        let added = super.addItem(item, quantity);
        if (this.client && added > 0)
            this.client.protocol.writeAddItem(item, added);
        return added;
    }

    removeItem (item: Item, quantity: number): number {
        let removed = super.removeItem(item, quantity);
        if (this.client && removed > 0)
            this.client.protocol.writeRemoveItem(item, removed);
        return removed;
    }

    onStackAdded (stack: Stack): void {
        super.onStackAdded(stack);
        //if (this.client) this.client.protocol.addItem(stack);
    }

    onStackRemoved (stack: Stack): void {
        super.onStackRemoved(stack);
        //if (stack.item.itemId !== ITEM.NONE && this.client)
        //this.client.protocol.removeItem(stack);
    }
}
