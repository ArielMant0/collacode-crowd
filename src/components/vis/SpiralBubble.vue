<template>
    <svg ref="el" :width="width" :height="height" :style="{ minWidth: width+'px', minHeight: height+'px' }"></svg>
</template>

<script setup>
    import * as d3 from 'd3'
    import { computed, onMounted, ref, watch } from 'vue';
    import { mediaPath } from '@/use/utility';

    const props = defineProps({
        data: {
            type: Array,
            required: true
        },
        selected: {
            type: Array,
            required: false
        },
        highlights: {
            type: Array,
            required: false
        },
        color: {
            type: String,
            default: "grey"
        },
        selectedColor: {
            type: String,
            default: "red"
        },
        highlightsColor: {
            type: String,
            default: "blue"
        },
        width: {
            type: Number,
            default: 200
        },
        height: {
            type: Number,
            default: 200
        },
        dataColors: {
            type: Object,
        },
        imageThreshold: {
            type: Number,
            default: 6
        },
        imageAttr: {
            type: String,
        },
        mediaPathType: {
            type: String,
            default: "teaser"
        },
        padding: {
            type: Number,
            default: 3
        },
        time: {
            type: Number,
            default: 0
        },
        selectable: {
            type: Boolean,
            default: true
        },
    })

    const el = ref(null)

    const emit = defineEmits(["click", "hover"])

    const aspect = computed(() => props.width / props.height)

    function getColor(d, set, high) {
        if (props.dataColors !== undefined) {
            return props.dataColors[d.id] ? props.dataColors[d.id] : props.color
        }
        return set.has(d.id) ? props.selectedColor : (high.has(d.id) ? props.highlightsColor : props.color)
    }

    function draw(animate=true) {

        const svg = d3.select(el.value)
        svg.selectAll("*").remove()

        if (props.data.length === 0) return

        const set = new Set(props.selected)
        const high = new Set(props.highlights)

        if (props.imageAttr && props.data.length <= props.imageThreshold) {
            drawImages(set, high, animate)
        } else {
            drawSpiral(set, high, animate)
        }
    }

    /**
     * Draw data points as a grid of images
     * @param set Set of selected ids
     * @param high Set of highlighted ids
     */
    function drawImages(set, high, animate) {
        const svg = d3.select(el.value)

        const cols = Math.floor(props.imageThreshold / 2)
        const rows = Math.ceil(Math.max(1, props.data.length) / cols)

        const w = Math.floor(props.width / cols)
        const h = Math.floor(props.height / rows)

        let trans;
        if (animate) {
            trans = d3
                .transition()
                .duration(1500)
                .ease(d3.easeElasticOut.amplitude(1.05))
                .delay((_d, i) => i * 100)
        }

        const g = svg.selectAll("g")
            .data(props.data)
            .join("g")
            .attr("transform", (_d, i) => `translate(${(i % cols) * w},${(Math.floor(i / cols)) * h})`)
            .style("cursor", props.selectable ? "pointer" : "default")
            .on("mouseenter", function(event, d) {
                emit("hover", d, event)
                d3.select(this)
                    .select("rect")
                    .transition(50)
                    .attr("fill-opacity", 0.5)
            })
            .on("mousemove", function(event, d) {
                emit("hover", d, event)
            })
            .on("mouseleave", function(_event, d) {
                emit("hover", null, null)
                d3.select(this)
                    .select("rect")
                    .transition(50)
                    .attr("fill-opacity", 0.2)
            })
            .on("click", function(event, d) {
                emit("click", d, event)
            })

        const rects = g.append("rect")
            .attr("stroke", "none")
            .attr("stroke", d => getColor(d, set, high))
            .attr("fill", d => getColor(d, set, high))
            .attr("fill-opacity", animate ? 0.2 : 0)
            .attr("width", animate ? 0 : w - props.padding)
            .attr("height", animate ? 0 : h - props.padding)

        if (animate) {
            rects
                .transition(trans)
                .attr("fill-opacity", 0.2)
                .attr("width", w - props.padding)
                .attr("height", h - props.padding)
        }

        const imgs = g.append("image")
            .attr("href", d => {
                if (props.mediaPathType) {
                    return mediaPath(props.mediaPathType, d[props.imageAttr])
                }
                return d[props.imageAttr]
            })
            .attr("width", animate ? 0 : w - props.padding)
            .attr("height", animate ? 0 : h - props.padding)

        if (animate) {
            imgs
                .transition(trans)
                .attr("width", w - props.padding)
                .attr("height", h - props.padding)
        }
    }

    /**
     * Draw data points as circles along a spiral
     * @param set Set of selected ids
     * @param high Set of highlighted ids
     */
    function drawSpiral(set, high, animate) {
        const svg = d3.select(el.value)
        const cx = Math.floor(props.width / 2)
        const cy = Math.floor(props.height / 2)
        const maxRadius = Math.min(cx, cy)

        const numPoints = props.data.length

        const simulateSpacing = () => {
            let theta = 0
            let s = 14; // initial guess for spacing
            let b = s / (1.75 * Math.PI); // tightness factor
            let r = 0, i = 0
            while (r < maxRadius && i < numPoints) {
                r = b * theta;
                const dTheta = s / Math.sqrt((b * theta) ** 2 + b ** 2);
                theta += dTheta;
                i++;
            }
            return { b, spacing: s };
        };

        const { b, spacing } = simulateSpacing();

        let theta = 0
        const coords = []
        for (let i = 0; i < numPoints; i++) {
            const r = b * theta;
            const x = cx + r * Math.cos(theta)
            const y = cy + r * Math.sin(theta)
            coords.push({
                id: props.data[i].id,
                data: props.data[i],
                index: i,
                x: x,
                y: y,
                r: theta
            });

            theta += spacing / Math.sqrt((b * theta) ** 2 + b ** 2)
        }

        const pointRadius = spacing / 2 - 2

        const dots = svg.selectAll("circle")
            .data(coords)
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", d => {
                const c = d3.color(getColor(d, set, high))
                return animate ? c.brighter(1.5) : c
            })
            .attr("stroke", d => d3.color(getColor(d, set, high)).darker(1))
            .attr("r", animate ? 0 : pointRadius)
            .style("cursor", props.selectable ? "pointer" : "default")
            .on("mouseenter", function(event, d) {
                emit("hover", d.data, event)
                d3.select(this)
                    .transition(50)
                    .attr("r", pointRadius+1)
            })
            .on("mousemove", function(event, d) {
                emit("hover", d.data, event)
            })
            .on("mouseleave", function(d) {
                emit("hover", null, null)
                d3.select(this)
                    .transition(50)
                    .attr("r", pointRadius)
            })
            .on("click", function(event, d) {
                emit("click", d.data, event)
            })

        if (animate) {
            dots
                .transition()
                .duration(1500)
                .ease(d3.easeElasticOut.amplitude(1.05))
                .delay((_d, i) => i * (numPoints > 100 ? 8 : (numPoints > 25 ? 15 : 100)))
                .attr("r", pointRadius)
                .attr("fill", d => getColor(d, set, high))
            }
    }

    onMounted(() => draw(true))

    watch(aspect, () => draw(true))
    watch(() => props.time, () => draw(true))
    watch(() => ([props.selectedColor, props.highlightsColor]), () => draw(false))
    watch(() => props.selected, () => draw(false))
    watch(() => props.highlights, () => draw(false))
    watch(() => props.dataColors, () => draw(false))
</script>