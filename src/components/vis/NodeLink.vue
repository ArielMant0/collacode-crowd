<template>
    <div>
        <v-progress-linear v-if="workerActive" :model-value="workerProgress"></v-progress-linear>
        <svg ref="el" :width="width" :height="height"></svg>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { watch, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
    import MyWorker from '@/worker/force-worker?worker'
    import DM from '@/use/data-manager'

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
        transitionDuration: { type: Number, default: 1000 },
    })

    const emit = defineEmits(["click", "hover", "right-click"])

    let simulation, dragStarted = false, once = false
    let ng, lg
    let nodes, links

    let x, y, zoom, zoomTransform = d3.zoomIdentity
    const el = useTemplateRef("el")

    const workerProgress = ref(0)
    const workerActive = ref(false)

    function resetZoom() {
        let transform = d3.zoomIdentity
        const [x0, x1] = d3.extent(nodes, d => d.x)
        const [y0, y1] = d3.extent(nodes, d => d.y)

        if (x0 !== undefined && x1 !== undefined &&
            y0 !== undefined && y1 !== undefined
        ) {
            transform = d3.zoomIdentity
                .translate(props.width / 2, props.height / 2)
                .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / props.width, (y1 - y0) / props.height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
        }

        d3.select(el.value)
            .transition()
            .duration(props.transitionDuration)
            .call(zoom.transform, transform)
    }

    function focus(target=props.target) {
        if (!target) return
        const node = nodes.find(d => d.id === target)
        if (node) {
            d3.select(el.value)
                .transition()
                .duration(props.transitionDuration)
                .call(
                    zoom.transform,
                    d3.zoomIdentity
                        .translate(props.width / 2, props.height / 2)
                        .scale(5)
                        .translate(-node.x, -node.y)
                )
        } else {
            resetZoom()
        }
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

        let wscale;
        if (props.weightAttr){
            wscale = d3.scaleQuantile(links.map(d => d[props.weightAttr]), [2, 4, 6, 8])
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

        let maxWeight = 1
        if (props.weightAttr) {
            maxWeight = d3.max(links, d => d[props.weightAttr])
        }

        function distanceFunction(d) {
            return props.weightAttr ?
                (1 + ((maxWeight - d[props.weightAttr]) / maxWeight)) * props.radius * 0.5 :
                props.radius
        }

        simulation = d3.forceSimulation(nodes)
            .alphaDecay(nodes.length < 100 ? 0.025 : 0.015)
            .force('link', d3.forceLink(links).id(d => d.id).distance(distanceFunction))
            .force('charge', d3.forceManyBody().strength(0.5))
            .force('collide', d3.forceCollide(props.radius / 2))
            .force('center', d3.forceCenter(props.width / 2, props.height / 2))
            .on('tick', () => updateNodesAndLinks())
            .on('end', () => {
                DM.setData("graph_layout", nodes.map(d => ({
                    id: d.id,
                    x: d.x / props.width,
                    y: d.y / props.height
                })))
                if (!once) {
                    focus(props.target)
                    once = true
                }
            })
            .stop()

        const graph = DM.getData("graph_layout", false)
        if (graph && graph.length > 0) {
            workerActive.value = false
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
                const worker = new MyWorker()
                workerProgress.value = 0
                workerActive.value = true
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
                        workerProgress.value = event.data.progress
                    } else {
                        workerActive.value = false
                        event.data.nodes.forEach((d, i) => {
                            nodes[i].x = d.x
                            nodes[i].y = d.y
                        })
                        DM.setData("graph_layout", nodes.map(d => ({
                            id: d.id,
                            x: d.x / props.width,
                            y: d.y / props.height
                        })))
                        updateNodesAndLinks()
                        once = true
                        focus(props.target)
                    }
                }
            } else {
                workerActive.value = false
                simulation.restart()
            }
        }

        // buggy and does not work on firefox
        // const drag = d3
        //     .drag()
        //     .on("start", onDragStart)
        //     .on("drag", onDragged)
        //     .on("end", onDragEnd)

        // ng.call(drag)

        svg.call(zoom)

        if (props.target) {
            setTimeout(() => focus(props.target), 2000)
        }
    }

    function onDragStart(event) {
        d3.select(this).classed("fixed", true);
        dragStarted = true
    }

    function onDragEnd(event, d) {
        if (!dragStarted) return
        dragStarted = false
        delete d.fx
        delete d.fy
        d3.select(this).classed("fixed", false)
        simulation.alpha(1).restart()
    }

    function onDragged(event, d) {
        if (!dragStarted) return
        const [mx, my] = d3.pointer(event, el.value)
        const zx = zoomTransform.rescaleX(x).interpolate(d3.interpolateRound)
        const zy = zoomTransform.rescaleY(y).interpolate(d3.interpolateRound)
        d.fx = zx.invert(mx)
        d.fy = zy.invert(my)
        simulation.alpha(1).restart()
    }

    defineExpose({ resetZoom, focus })

    onMounted(draw)
    onBeforeUnmount(() => {
        if (simulation) {
            simulation.stop()
            simulation = null
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