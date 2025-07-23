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

        // user data
        activeUserId: null,
        ipAddress: null,
        cwSource: null,
        cwId: null,

        // which method (binary search = 1 or clusters = 2) to prefer
        // by default, we randomly pick one
        method: 0,

        // which items the user can still do
        itemsLeft: new Set(),
        itemsDone: new Set(),
        itemsGone: new Set(),
        itemCounts: {},
        itemTime: 0,

        // target item to do similarity for
        target: null,

        // excluded tag names (for binary search)
        excludedTags: new Set()
    }),

    getters: {
        schema: state => state.dataset ? state.dataset.schema : null,
        itemColumns: state => state.schema ? state.schema.columns : [],
        itemName: state => state.dataset ? state.dataset.item_name : "Item",
        itemNameCaptial: state => capitalize(state.itemName),
        hasNextItem: state => state.itemsLeft.size > 0
    },

    actions: {

        fetchUpdate() {
            this.fetchUpdateTime = Date.now()
        },

        updateItems() {
            this.updateItemsTime = Date.now()
        },

        setCrowdMeta(meta) {
            this.code = meta.code
            this.dataset = meta.dataset
            this.ds = meta.dataset.id
            this.excludedTags = new Set(meta.excludedTags)
            if (meta.cwId) {
                this.cwId = meta.cwId
                this.cwSource = meta.cwSource
            }
            if (meta.guid) {
                this.setActiveUser(meta.guid)
            }
        },

        setCrowdItems(meta) {
            this.itemsLeft = new Set(meta.itemsLeft)
            this.itemsDone = new Set(meta.itemsDone)
            this.itemsGone = new Set(meta.itemsGone)
            this.itemCounts = meta.itemCounts
            this.method = meta.method ? meta.method : 0
            this.itemTime = Date.now()
        },

        setTarget(item) {
            if (
                 this.itemsLeft.has(item.id) &&
                !this.itemsDone.has(item.id) &&
                !this.itemsGone.has(item.id)
            ) {
                this.target = item
            } else {
                this.target = null
            }
        },

        completedTarget() {
            if (this.target !== null) {
                this.itemsLeft.delete(this.target.id)
                this.itemsDone.add(this.target.id)
            }
        },

        chooseRandomTarget() {
            const ids = Array.from(this.itemsLeft.values())
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
