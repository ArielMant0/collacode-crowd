class DataManager {

    constructor() {
        this.data = new Map();
        this.times = {}
        this.ids = new Map()
        this.graph = null
        this.update();
    }

    get empty() {
        return this.data.size === 0
    }

    update() {
        this.time = Date.now()
    }

    clear() {
        this.graph = null
        this.data.clear()
    }

    hasGraph() {
        return this.graph !== null
    }

    getGraph() {
        return this.graph
    }

    setGraph(graph) {
        this.graph = graph
    }

    hasData(key) {
        return this.data.has(key)
    }

    setData(key, data) {
        this.data.set(key, data);
        this.times[key] = Date.now();
        this.update();
    }

    getData(key) {
        if (!this.hasData(key)) return [];
        return this.data.get(key)
    }

    getDataBy(key, callback) {
        if (!this.hasData(key)) return [];
        const d = this.data.get(key)
        if (d instanceof Map) {
            return Array.from(d.values()).filter(callback)
        }
        return d.filter(callback);
    }

    getDataItem(key, id) {
        if (!this.hasData(key)) return null;
        const d = this.data.get(key)
        if (d instanceof Map) {
            return d.get(id)
        }
        return d.find(dd => dd.id === id);
    }

    getSize(key) {
        return this.getData(key).length
    }

    getSizeBy(key, callback) {
        return this.getDataBy(key, callback).length
    }

    find(key, callback) {
        const data = this.getData(key)
        if (data) {
            return data.find(callback)
        }
        return null
    }

    at(key, index) {
        const data = this.getData(key);
        if (index >= 0 && data && index < data.length) {
            return data[index]
        }
        return null;
    }

    push(key, datum) {
        const data = this.getData(key);
        if (data) {
            data.push(datum)
            this.update()
        }
        return data;
    }

    remove(key, id) {
        const data = this.getData(key);
        if (data) {
            const index = data.findIndex(d => d.id === id)
            if (index >= 0) {
                data.splice(index, 1)
                this.data.set(key, data)
                return true
            }
        }
        return false;
    }

    pushFront(key, datum) {
        const data = this.getData(key)
        if (data) {
            data.unshift(datum)
            this.update()
        }
        return data;
    }


    getIds(key) {
        return new Set(this.getData(key).map(d => d.id))
    }
}

const DM = new DataManager()

export { DM as default };
