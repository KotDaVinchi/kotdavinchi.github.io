class GraphController {
    constructor(updateFunctions) {

        this.updateFunctions = updateFunctions;
        this.drawPending = [];
    }

    update(updatedNames = Object.keys(this.updateFunctions), cb) {
        if (this.drawPending.length) {
            const intersect = this.drawPending.filter(value => updatedNames.includes(value));
            if(intersect.length === this.drawPending.length){
                return;
            }else {
                this.drawPending = this.drawPending.concat(updatedNames);
                this.drawPending = this.drawPending.filter((v,i) => names.indexOf(v) === i);
            }
        }
        this.drawPending = updatedNames;
        requestAnimationFrame((time) => {
            this.drawPending = [];
            cb && cb(time);
            for (const name of updatedNames) {
                this.updateFunctions.hasOwnProperty(name) && this.updateFunctions[name](time);
            }
        });
    }

    animatedValueFactory({ctx, name, startValue, speed, updFnIds}) {
        let currValue = startValue,
            needValue = startValue,
            inWork = false,
            lastTime = 0;
        const updFn = (time) => {
            const changeTime = time - lastTime;
            lastTime = time;
            currValue += Math.sign(needValue-currValue)*changeTime*speed;
            if(Math.abs(currValue)+Number.EPSILON > Math.abs(needValue)){
                currValue=needValue;
                this.update(updFnIds);
                inWork = false;
                return;
            }
            this.update(updFnIds,updFn)
        };
        Object.defineProperty(ctx, name, {
            get: () => {
                return currValue
            },
            set: (value) => {
                needValue = value;
                if(inWork) return;
                inWork = true;
                lastTime = performance.now();
                this.update(updFnIds, updFn)
            }
        })
    }
}