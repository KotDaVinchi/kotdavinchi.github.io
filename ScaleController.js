const oneDay = 1000 * 60 * 60 * 24;
const roundTemplate = {
    x: [1, 2, 4, 8, 16, 32].map(x => oneDay * x),
    y: [1, 2, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 100000, 200000, 300000, 500000, 1000000]

}

class ScaleController {
    constructor(graphController, speed, dpx, color, updatedFuctions) {
        this.graphController = graphController;
        this.speed = speed;
        this.color = color;
        this.dpx = dpx;
        this.updatedFunction = updatedFuctions;
        this.axis = {
            x: {
                colorMap: {},
                prevDivisions: []
            },
            y: {
                colorMap: {},
                prevDivisions: []
            }
        };
    }

    createVirtualCanvas(length) {
        const canvas = document.createElement('canvas');
        canvas.width = 7 * length * this.dpx;
        canvas.height = 10 * this.dpx;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = this.color;
        // ctx.scale(this.dpx, this.dpx);
        return [canvas, ctx];
    }

    makeScaleDivisions(a, b, template) {
        const diff = (b - a) / 6;
        const precMap = template
            .map(x => Math.abs(diff - x));
        let minValue = {
            i: -1,
            min: Number.MAX_SAFE_INTEGER
        };
        for (let i = 0; i < precMap.length; i++) {
            if (precMap[i] < minValue.min) {
                minValue = {i, min: precMap[i]}
            } else {
                break;
            }
        }
        const iMin = minValue.i;

        const firstLabel = Math.ceil((a) / template[iMin]) * template[iMin];
        return Array(Math.ceil((b - firstLabel) / template[iMin])).fill(0).map((_, i) => firstLabel + template[iMin] * i);
    }

    getAxisDivisions(axisName, left, right, convertFn) {//date
        const divisions = this.makeScaleDivisions(left, right, roundTemplate[axisName]);
        const axis = this.axis[axisName];
        axis.prevDivisions.concat(divisions).forEach(division => {
            const inPrev = axis.prevDivisions.indexOf(division) + 1,
                inNew = divisions.indexOf(division) + 1;

            if (inPrev && !inNew) {
                axis.colorMap[division].opacity = 0;
            }
            if (inNew && !inPrev) {
                if (!(division in axis.colorMap)) {
                    const text = convertFn(division);
                    const [canvas, ctx] = this.createVirtualCanvas(text.length);
                    ctx.fillText(text, 0, Math.floor(canvas.height / this.dpx));
                    axis.colorMap[division] = {
                        text: canvas,
                        size: {width: canvas.width / this.dpx, height: canvas.height / this.dpx}
                    };
                    this.graphController.animatedValueFactory({
                        ctx: axis.colorMap[division],
                        name: 'opacity',
                        startValue: 0,
                        speed: this.speed,
                        updFnIds: this.updatedFunction,
                        //onEndAnimacion: () => {if(axis.colorMap[division].opacity === 0 ) {delete this.axis[axisName].colorMap[division]}}
                    })
                }
                axis.colorMap[division].opacity = 1;
            }
        });
        axis.prevDivisions = divisions;
        return Object.keys(axis.colorMap).filter(key => axis.colorMap[key].opacity).reduce((acc, key) => {
            acc[key] = axis.colorMap[key];
            return acc
        }, {});
    }
}