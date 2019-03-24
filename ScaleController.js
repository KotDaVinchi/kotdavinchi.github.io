const oneDay = 1000 * 60 * 60 * 24;
const roundTemplate = {
    x: [1, 2, 4, 8, 16, 32].map(x => oneDay * x),
    y: [1, 2, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 100000, 200000, 300000, 500000, 1000000]

}

class ScaleController {
    constructor(graphController, speed, updatedFuctions) {
        this.graphController = graphController;
        this.speed = speed;
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

    makeScaleDivisions(a, b, template) {
        const diff = (b - a) / 6;
        const precMap = template
            .map(x => Math.abs(diff - x));
        let minValue = {
            i: -1,
            min: Number.MAX_SAFE_INTEGER
        };
        for (let i = 0; i < precMap.length; i++) {
            if( precMap[i] < minValue.min ){
                minValue = {i, min: precMap[i] }
            } else {
                break;
            }
        }
        const iMin = minValue.i;

        const firstLabel = Math.ceil((a) / template[iMin]) * template[iMin];
        // console.log('diff', diff);
        // console.log('precMap', precMap);
        // console.log('iMin', iMin);
        // console.log('roundDateTemplate[iMin]', template[iMin]);
        // console.log('firstLabel', firstLabel);
        // console.log('(b-a)/roundDateTemplate[iMin]', (b - a) / template[iMin]);
        // console.log('(b-roundDateTemplate[iMin])/roundDateTemplate[iMin]', (b - firstLabel) / template[iMin]);
        return Array(Math.ceil((b - firstLabel) / template[iMin])).fill(0).map((_, i) => firstLabel + template[iMin] * i);
    }

    getAxisDivisions(axisName, left, right) {//date
        const divisions = this.makeScaleDivisions(left, right, roundTemplate[axisName]);
        const axis = this.axis[axisName];
        axis.prevDivisions.concat(divisions).forEach(division => {
            const inPrev = axis.prevDivisions.indexOf(division) + 1,
                inNew = divisions.indexOf(division) + 1;

            if (inPrev && !inNew) {
                axis.colorMap[division] = 0;
            }
            if (inNew && !inPrev) {
                //axis.colorMap[division]
                if (!(division in axis.colorMap)) {
                    this.graphController.animatedValueFactory({
                        ctx: axis.colorMap,
                        name: division,
                        startValue: 0,
                        speed: this.speed,
                        updFnIds: this.updatedFunction,
                        // onEndAnimacion: () => {
                        //     //todo: need clear memory
                        //     //if (axis.colorMap[division] === 0) delete axis.colorMap[division]
                        // }
                    })
                }
                axis.colorMap[division] = 1;
            }
        });
        axis.prevDivisions = divisions;
        return axis.colorMap;
    }
}