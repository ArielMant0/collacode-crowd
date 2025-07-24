// Utilities
import { defineStore } from 'pinia'
import Cookies from 'js-cookie';

export const useSettings = defineStore('settings', {
    state: () => ({
        isLoading: false,
        askUserIdentity: false,

        lightMode: true,
        verticalLayout: false,
        panelSide: "left",

        panelSort: [2, 0, 0]
    }),

    actions: {

        setPanelSide(side) {
            this.panelSide = side;
            Cookies.set("panel-side", side, { expires: 365 })
        },
    }
})
