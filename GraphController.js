class GraphController {
    constructor(updateFunctions) {

        this.updateFunctions = updateFunctions;
        this.drawPending = [];
        this.callbacks = [];
    }

    get inProgress(){
        return !!this.drawPending.length
    }

    update(updatedNames = Object.keys(this.updateFunctions), cb) {
        if (this.drawPending.length) {
            this.drawPending = this.drawPending.concat(updatedNames);
            cb && this.callbacks.push(cb);
            return;
        }
        this.drawPending = updatedNames;
        cb && this.callbacks.push(cb);
        requestAnimationFrame((time) => {
            const forUpdate = this.drawPending.filter((v, i) => this.drawPending.indexOf(v) === i);
            const callbacks = this.callbacks;//for don't remove callbacks, maked in recursion
            this.drawPending = [];
            this.callbacks = [];
            callbacks.forEach(cb => cb(time));
            for (const name of forUpdate) {
                this.updateFunctions.hasOwnProperty(name) && this.updateFunctions[name](time);
            }
        });
    }

    animatedValueFactory({ctx, name, startValue, speed, updFnIds, onEndAnimacion}) {
        let currValue = startValue,
            needValue = startValue,
            inWork = false,
            lastTime = 0;
        const updFn = (time) => {
            if(lastTime === 0){//performance.now() has some issues in work without dev tools. Like performance.now() in setter was less then time in this callback
                lastTime = time;
                this.update(updFnIds, updFn);
                return;
            }
            const changeTime = time - lastTime;
            lastTime = time;
            const delta = Math.sign(needValue - currValue) * changeTime * speed;
            if (Math.abs(delta) > Math.abs(needValue - currValue) || delta === 0) {
                currValue = needValue;
                this.update(updFnIds, onEndAnimacion);
                inWork = false;
                return;
            }
            currValue += delta;
            this.update(updFnIds, updFn)
        };
        Object.defineProperty(ctx, name, {
            get: () => {
                return currValue
            },
            set: (value) => {
                needValue = value;
                if (inWork) return;
                inWork = true;
                lastTime = 0;
                this.update(updFnIds, updFn)
            },
            enumerable: true
        })
    }
}