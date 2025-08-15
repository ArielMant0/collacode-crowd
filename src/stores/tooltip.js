// Utilities
import { useMouse } from '@vueuse/core';
import { pointer } from 'd3';
import { defineStore } from 'pinia'
import { useApp } from './app';
import { capitalize, mediaPath } from '@/use/utility';

let delayT = null;

export const useTooltip = defineStore('tooltip', {
    state: () => ({
        data: null,
        x: 0,
        y: 0,
        align: "right",
    }),

    actions: {

        show(data, x, y, align="right") {
            this.x = x;
            this.y = y;
            this.align = align
            this.data = data;
        },

        showAfterDelay(data, x, y, delay=350, align="right") {
            const mouse = useMouse()
            if (delayT !== null) {
                clearTimeout(delayT)
                delayT = null
            }
            delayT = setTimeout(() => {
                delayT = null;
                if (mouse.x.value === x && mouse.y.value === y) {
                    this.x = x;
                    this.y = y;
                    this.align = align
                    this.data = data;
                }
            }, delay)
        },

        hide() {
            this.data = null
        },

        showItem(event, item, imageOnly=true) {
            const app = useApp()
            const [mx, my] = pointer(event, document.body)

            const path = item.teaser.startsWith("http") ? item.teaser : mediaPath('teaser', item.teaser)
            if (imageOnly) {
                this.show(`
                    <div class="text-caption">
                        <div>${item.name}</div>
                        <img src="${path}" style="max-height: 120px; object-fit: contain;"/>
                    </div>`, mx, my
                )
            } else {
                const extra = app.itemColumns.reduce((acc, c) => {
                    return acc + (item[c.name] !== undefined && item[c.name] !== null ?
                        `<div><b>${capitalize(c.name)}:</b> ${item[c.name]}</div>` :
                        "")
                }, "")
                this.show(
                    `<div>
                        <img src="${path}" style="max-height: 120px; object-fit: contain;"/>
                        <div class="mt-1 text-caption">
                            <div>${item.name}</div>
                            ${item.description ? '<div><b>Description:</b> '+item.description+'</div>' : ''}
                            ${extra}
                        </div>
                    </div>`,
                    mx, my
                )
            }

        },
    }
})
