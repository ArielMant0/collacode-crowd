<template>
    <div>
        <div v-if="workerActive" class="text-caption" style="text-align: center;">
            <div>
                <i v-if="workerProgress < 75">calculating a nice layout..</i>
                <i v-else>almost there..</i>
            </div>
            <v-progress-linear
                max="100"
                height="6"
                color="primary"
                :model-value="workerProgress">
            </v-progress-linear>
        </div>
        <svg ref="el" :width="width" :height="height"></svg>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
    import MyWorker from '@/worker/force-worker?worker'
    import DM from '@/use/data-manager'
    import { useElementVisibility } from '@vueuse/core'

    const props = defineProps({
        nodes: { type: Array, required: true },
        links: { type: Array, required: true },
        target: { type: Number, required: false },
        weightAttr: { type: String, required: false },
        imageAttr: { type: String, required: false },
        colorAttr: { type: String, required: false },
        targetColor: { type: String, default: "#DC143C" },
        highlightColor: { type: String, default: "#00BFFF" },
        fillColor: { type: String, default: "grey" },
        width: { type: Number, default: 600 },
        height: { type: Number, default: 400 },
        radius: { type: Number, default: 10 },
        selectable: { type: Boolean, default: true },
        useDataManager: { type: Boolean, default: false },
        useKeyNavigation: { type: Boolean, default: false },
        transitionDuration: { type: Number, default: 1000 },
    })

    const emit = defineEmits(["click", "hover", "right-click"])

    let simulation, once = false
    let ng, lg
    let nodes, links

    const nav = {
        left: false,
        right: false,
        up: false,
        down: false
    }

    let x, y, zoom, zoomTransform = d3.zoomIdentity
    const el = useTemplateRef("el")

    const elVisible = useElementVisibility(el)

    let worker, wscale
    const workerProgress = ref(0)
    const workerActive = ref(false)

    function zoomToBoundingBox(node=null) {
        let transform = d3.zoomIdentity
        const [x0, x1] = d3.extent(nodes, d => d.x)
        const [y0, y1] = d3.extent(nodes, d => d.y)

        if (x0 !== undefined && x1 !== undefined &&
            y0 !== undefined && y1 !== undefined
        ) {
            let tx0, tx1, ty0, ty1
            if (node === null) {
                tx0 = x0
                tx1 = x1
                ty0 = y0
                ty1 = y1
            } else {
                const ids = new Set()
                links.forEach(l => {
                    if (l.source.id === node || l.target.id === node) {
                        ids.add(l.source.id)
                        ids.add(l.target.id)
                    }
                })
                const subset = nodes.filter(d => ids.has(d.id))
                const [ex0, ex1] = d3.extent(subset, d => d.x)
                const [ey0, ey1] = d3.extent(subset, d => d.y)
                tx0 = ex0 - props.radius / 2
                tx1 = ex1 + props.radius / 2
                ty0 = ey0 - props.radius / 4
                ty1 = ey1 + props.radius / 4
            }

            transform = d3.zoomIdentity
                .translate(props.width / 2, props.height / 2)
                .scale(Math.min(8, 0.9 / Math.max((tx1 - tx0) / props.width, (ty1 - ty0) / props.height)))
                .translate(-(tx0 + tx1) / 2, -(ty0 + ty1) / 2)
        }

        d3.select(el.value)
            .transition()
            .duration(props.transitionDuration)
            .call(zoom.transform, transform)
    }

    function resetZoom() {
        zoomToBoundingBox()
    }

    function focus(target=props.target) {
        if (!target) return
        const node = nodes.find(d => d.id === target)
        zoomToBoundingBox(node ? node.id : null)
    }

    function updateNodesAndLinks(transform=null) {

        const zx = transform ?
            transform.rescaleX(x).interpolate(d3.interpolateRound) :
            zoomTransform.rescaleX(x).interpolate(d3.interpolateRound)

        const zy = transform ?
            transform.rescaleY(y).interpolate(d3.interpolateRound) :
            zoomTransform.rescaleY(y).interpolate(d3.interpolateRound)

        if (transform) {
            zoomTransform = transform
        }

        ng
            .attr("transform", d => `translate(${zx(d.x)},${zy(d.y)}) scale(${Math.max(0.4, zoomTransform.k / 3)})`)

        lg
            .attr("stroke-width", d => wscale(d.value) * Math.max(0.4, zoomTransform.k / 3))
            .attr("x1", d => zx(d.source.x))
            .attr("x2", d => zx(d.target.x))
            .attr("y1", d => zy(d.source.y))
            .attr("y2", d => zy(d.target.y))
    }

    function highlight(id) {
        const match = new Set()
        const matchLink = new Set()
        if (id) {
            links.forEach(d => {
                if (d.source.id === id || d.target.id === id) {
                    matchLink.add(d.id)
                    match.add(d.source.id)
                    match.add(d.target.id)
                }
            })
        }

        ng
            .selectAll(".outline")
            .attr("stroke", d => d.id === props.target ? props.targetColor : "currentColor")
        ng
            .filter(d => match.has(d.id))
            .raise()
            .selectAll(".outline")
            .attr("stroke", props.highlightColor)
        lg
            .attr("stroke", d => d.source.id === props.target || d.target.id === props.target ? props.targetColor : "currentColor")

        lg
            .filter(d => matchLink.has(d.id))
            .attr("stroke", props.highlightColor)
            .raise()
    }

    function draw() {
        if (simulation) {
            simulation.stop()
            simulation = null
        }

        once = false
        nodes = props.nodes.map(d => ({ ...d }))
        links = props.links.map(d => ({ ...d }))
        nodes.forEach(d => {
            d.x = Math.random() * props.width - props.radius
            d.y = Math.random() * props.height - props.radius / 2
        })

        zoom = d3.zoom()
            .scaleExtent([0.1, 32])
            .on("zoom", ({transform}) => updateNodesAndLinks(transform))

        const svg = d3.select(el.value)
        svg.selectAll('*').remove()

        let maxWeight= 1

        if (props.weightAttr){
            const [minW, maxW] = d3.extent(links.map(d => d[props.weightAttr]))
            maxWeight = maxW
            wscale = d3.scaleLinear()
                .domain([minW, maxW])
                .range([2, 8])
        } else {
            wscale = () => 2
        }

        lg = svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("x1", d => d.source.x)
            .attr("x2", d => d.target.x)
            .attr("y1", d => d.source.y)
            .attr("y2", d => d.target.y)
            .attr("stroke", d => d.source.id === props.target || d.target.id === props.target ? props.targetColor : "currentColor")
            .attr("stroke-width", d => wscale(d.value))
            .attr("opacity", 0.5)

        ng = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("transform", `translate(${props.width/2}, ${props.height/2})`)
            .style("cursor", props.selectable ? "pointer" : "default")
            .classed("fixed", d => d.fx !== undefined)
            .on("click", function(event, d) {
                if (!props.selectable) return
                emit("click", d, event)
            })
            .on("contextmenu", function(event, d) {
                event.preventDefault()
                emit("right-click", d, event)
            })
            .on("mouseenter", function(_event, d) {
                d3.select(this).raise()
                highlight(d.id)
            })
            .on("mousemove", function(event, d) {
                emit("hover", d, event)
            })
            .on("mouseleave", function(event, d) {
                emit("hover", null)
                highlight(null)
            })

        if (props.imageAttr) {

            ng.append("rect")
                .classed("outline", true)
                .attr("x", -props.radius-1)
                .attr("y", -props.radius*0.5-1)
                .attr("width", props.radius*2+2)
                .attr("height", props.radius+2)
                .attr("stroke", d => d.id === props.target ? props.targetColor : "currentColor")
                .attr("stroke-width", 3)
                .attr("fill", "white")

            ng.append("image")
                .attr("x", -props.radius)
                .attr("y", -props.radius*0.5)
                .attr("width", props.radius*2)
                .attr("height", props.radius)
                .attr("href", d => d[props.imageAttr])

        } else {
            ng.append("circle")
                .classed("outline", true)
                .attr("r", props.radius)
                .attr("fill", props.colorAttr ? d[props.colorAttr] : props.fillColor)
                .attr("stroke", d => d.id === props.target ? props.targetColor : "currentColor")
        }

        x = d3.scaleLinear()
            .domain([0, props.width])
            .range([0, props.width])

        y = d3.scaleLinear()
            .domain([0, props.height])
            .range([0, props.height])


        function distanceFunction(d) {
            return props.weightAttr ?
                (1 + ((maxWeight - d[props.weightAttr]) / maxWeight)) * props.radius * 0.5 :
                props.radius
        }

        simulation = d3.forceSimulation(nodes)
            .alphaDecay(nodes.length < 100 ? 0.025 : 0.001)
            .force('link', d3.forceLink(links).id(d => d.id).distance(distanceFunction))
            .force('charge', d3.forceManyBody().strength(-10))
            .force('collide', d3.forceCollide(props.radius / 2))
            .force('center', d3.forceCenter(props.width / 2, props.height / 2).strength(0.5))
            .on('tick', () => updateNodesAndLinks())
            .on('end', () => {
                if (props.useDataManager) {
                    DM.setData("graph_layout", nodes.map(d => ({
                        id: d.id,
                        x: d.x / props.width,
                        y: d.y / props.height
                    })))
                }
                if (!once) {
                    focus(props.target)
                    once = true
                }
            })
            .stop()

        const graph = DM.getData("graph_layout", false)
        if (graph && graph.length > 0) {
            workerActive.value = false
            worker = null
            graph.forEach(d => {
                const n = nodes.find(dd => dd.id === d.id)
                if (n) {
                    n.x = d.x * props.width
                    n.y = d.y * props.height
                }
            })
            updateNodesAndLinks()
            once = true
            focus(props.target)
        } else {
            if (window.Worker) {
                worker = new MyWorker()
                workerProgress.value = 0
                workerActive.value = true
                console.log("started layout worker")
                worker.postMessage({
                    nodes: nodes,
                    links: links,
                    width: props.width,
                    height: props.height,
                    radius: props.radius,
                    weightAttr: props.weightAttr,
                    maxWeight: maxWeight
                })
                worker.onmessage = function(event) {
                    if (event.data.type === "tick") {
                        workerActive.value = true
                        workerProgress.value = event.data.progress
                    } else {
                        workerActive.value = false
                        event.data.nodes.forEach((d, i) => {
                            nodes[i].x = d.x
                            nodes[i].y = d.y
                        })
                        if (props.useDataManager) {
                            DM.setData("graph_layout", nodes.map(d => ({
                                id: d.id,
                                x: d.x / props.width,
                                y: d.y / props.height
                            })))
                        }
                        updateNodesAndLinks()
                        once = true
                        focus(props.target)
                    }
                }
            } else {
                worker = null
                workerActive.value = false
                simulation.restart()
            }
        }

        svg.call(zoom)

        if (props.target) {
            setTimeout(() => focus(props.target), 2000)
        }

    }

    function onKeyDown(event) {
        if (!props.useKeyNavigation) return
        const tn = document.activeElement.tagName.toLowerCase()
        if (elVisible.value && tn !== "input" && tn !== "button") {

            switch(event.code) {
                case "KeyW":
                    nav.up = true
                    break
                case "KeyA":
                    nav.left = true
                    break
                case "KeyD":
                    nav.right = true
                    break
                case "KeyS":
                    nav.down = true
                    break
            }
            updateTransform()
        }
    }
    function onKeyUp(event) {
        if (!props.useKeyNavigation) return
        const tn = document.activeElement.tagName.toLowerCase()
        if (elVisible.value && tn !== "input" && tn !== "button") {
            switch(event.code) {
                case "KeyW":
                    nav.up = false
                    break
                case "KeyA":
                    nav.left = false
                    break
                case "KeyD":
                    nav.right = false
                    break
                case "KeyS":
                    nav.down = false
                    break
            }
            updateTransform()
        }
    }

    function updateTransform() {
        const transform = new d3.ZoomTransform(
            zoomTransform.k,
            zoomTransform.x,
            zoomTransform.y
        )

        if (nav.left && !nav.right) {
            transform.x += 15
        } else if (nav.right && !nav.left) {
            transform.x -= 15
        }

        if (nav.up && !nav.down) {
            transform.y += 15
        } else if (nav.down && !nav.up) {
            transform.y -= 15
        }

        d3.select(el.value).call(zoom.transform, transform)
    }

    defineExpose({ resetZoom, focus })

    onMounted(function() {
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("keyup", onKeyUp)
        draw()
    })
    onBeforeUnmount(() => {
        if (simulation) {
            simulation.stop()
            simulation = null
        }
        if (workerActive.value && worker) {
            worker.terminate()
        }
    })

    watch(() => props.target, function() {
        highlight()
        focus()
    })
    watch(() => ([
        props.nodes,
        props.links,
        props.width,
        props.height,
        props.radius,
        props.weightAttr,
        props.imageAttr
    ]), draw, { deep: true })
</script>

<style scoped>
svg {
  background: #fafafa;
  border: 1px solid #eee;
}
text {
  pointer-events: none;
}
</style>