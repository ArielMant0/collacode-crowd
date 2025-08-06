// Utilities
import { defineStore } from 'pinia'

export const useTimes = defineStore('times', {
    state: () => ({
        n_all: 0,
        n_crowd: 0,
        n_similarity: 0,

        all: 0,
        crowd: 0,
        similarity: 0,

        actions: {}
    }),

    actions: {

        needsReload(key='all') {
            this['n_'+key] = Date.now();
        },

        reloaded(key) {
            this[key] = Date.now();
            if (this.actions[key]) {
                this.actions[key].forEach(f => f())
                delete this.actions[key]
            }
        },

        hasTime(key) {
            return this[key] !== undefined
        },

        getTime(key) {
            return Math.max(this.all, this[key])
        },

        addAction(key, callback) {
            if (!this.actions[key]) this.actions[key] = []
            this.actions[key].push(callback)
        }
    }

})
