// Utilities
import DM from '@/use/data-manager';
import { randomChoice } from '@/use/random';
import { capitalize } from '@/use/utility';
import { defineStore } from 'pinia'

export const APP_URLS = Object.freeze({
    TEASER: __URL_TEASER__,
    EVIDENCE: __URL_EVIDENCE__,
    DATA: __URL_STATIC_DATA__,
})


export const useApp = defineStore('app', {
    state: () => ({
        initialized: false,
        fetchUpdateTime: 0,
        updateItemsTime: 0,

        code: null,
        ds: null,
        dataset: null,
        activeUserId: null,
        ipAddress: null,

        // which method (binary search = 1 or clusters = 2) to prefer
        // by default, we randomly pick one
        method: 0,

        // which items the user can still do
        itemSet: new Set(),

        // target item to do similarity for
        target: null
    }),

    getters: {
        schema: state => state.dataset ? state.dataset.schema : null,
        itemColumns: state => state.schema ? state.schema.columns : [],
        itemName: state => state.dataset ? state.dataset.item_name : "Item",
        itemNameCaptial: state => capitalize(state.itemName),
        hasNextItem: state => state.itemSet.size > 0
    },

    actions: {

        fetchUpdate() {
            this.fetchUpdateTime = Date.now()
        },

        updateItems() {
            this.updateItemsTime = Date.now()
        },

        setMetaInfo(meta) {
            this.code = meta.code
            this.itemSet = new Set(meta.itemOptions)
            this.dataset = meta.dataset
            this.ds = meta.dataset.id
            this.method = meta.method ? meta.method : 0
        },

        setTarget(item) {
            this.itemSet.delete(item.id)
            this.target = item
        },

        chooseRandomTarget() {
            const ids = Array.from(this.itemSet.values())
            const item = DM.getDataItem("items", randomChoice(ids, 1))
            if (item) {
                this.setTarget(item)
            }
        },

        setActiveUser(id) {
            if (id !== this.activeUserId) {
                this.activeUserId = id
            }
        },

        setInitialized() {
            this.initialized = true;
        },
    }
})
