const roundFn = (x) => x;//Math.round;
const slideLengthRate = 0.2;
const slidePanelLength = 0.02;
const dateScalePaddingPx = 15;

let _someCtx = null;
Object.prototype.svCtx = function () {
    _someCtx = this;
    return this;
};

Function.prototype.log = function (...arg) {
    console.log(...arg);
    return this.apply(_someCtx, arg);
};

// console.log = ()=>{};
// console.time = ()=>{};
// console.timeEnd = ()=>{};

class Chart {
    constructor(params) {
        this.DOM = params.DOM;
        this.chartData = params.chartData;
        this.chartData.columns = this.chartData.columns.reduce((acc, elem) => {
            acc[elem[0]] = elem.slice(1);
            return acc;
        }, {});
        this.chartData.maxs = {};
        Object.keys(this.chartData.colors).forEach(name => {
            this.chartData.maxs[name] = Math.max.apply(null, this.chartData.columns[name]);//todo:old, to delete
        });
        this.chartData.max = Math.max.apply(null, Object.values(this.chartData.maxs));

        //todo: creating canvas end controls
        this.DOM.className += ' chart';
        const width = params.fitsContainer ? this.DOM.width : params.width;
        this.DOM.innerHTML = `<canvas class="board" width="${width}" height="${width}"/>
        <canvas class="fullChart" width="${width}" height="${width / 8}"/>
        <canvas class="chartsControl" width="${width}" height="${width / 8}"/>`;

        document.body.insertAdjacentHTML(
            'beforeend',
            `<div id="info" style="display:none"><div class="date"/><div class="values"/></div>`);

        this.graphController = new GraphController({
            chart: this.drawChart.bind(this),
            fChart: this.drawFullChart.bind(this),
            ctrl: this.drawControl.bind(this)
        });
        this.scaleController = new ScaleController(this.graphController, 0.005, ['chart']);

        const control = this.DOM.getElementsByClassName('chartsControl')[0];
        this.controlDOM = control;
        this.controlCtx = control.getContext('2d');
        this.control = {
            width: control.width,
            height: control.height,
            slide: {
                start: roundFn(control.width * (1 - slideLengthRate)),
                length: roundFn(control.width * slideLengthRate),
                panelLength: roundFn(slidePanelLength * control.width)
            }
        };

        const chart = this.DOM.getElementsByClassName('board')[0];
        this.chartDOM = chart;
        this.chartCtx = chart.getContext('2d');
        this.chart = {
            width: chart.width,
            height: chart.height,
            marker: null,
            range: {},
        };
        this.graphController.animatedValueFactory({
            ctx: this.chart,
            name: 'maxHeight',
            startValue: Math.max.apply(null, [].concat.call(...Object.values(this.chartData.columns)
                .slice(1)//remove x axis
                .map(arr => arr.slice(this.chart.range.left, this.chart.range.right)))),//todo:DRY!
            speed: roundFn(this.chartData.max * 0.001),
            updFnIds: ['chart']
        });

        const fullChart = this.DOM.getElementsByClassName('fullChart')[0];
        this.fullChartCtx = fullChart.getContext('2d');
        this.fullChart = {
            width: fullChart.width,
            height: fullChart.height
        };

        this.infoDOM = document.getElementById('info');
        this.info = {
            date: this.infoDOM.getElementsByClassName('date')[0],
            values: this.infoDOM.getElementsByClassName('values')[0]
        };


        // this.lines = document.createElement('div');
        // this.lines.className = 'lines';
        // this.DOM.insertAdjacentElement('afterBegin', Object.keys(this.chartData.names)
        //                                                    .map(name => {
        //                                                        const input = document.createElement('input');
        //                                                        input.type = 'checkbox';
        //                                                        input.name = name;
        //                                                        input.checked = true;
        //                                                        input.addEventListener('onclick', this.onChooseLine.bind(this))
        //                                                        return input;
        //                                                    }).reduce((lines, input)=>{
        //                                                        lines.appendChild(input)
        // },this.lines));


        this.recalcChartVals();
        this.graphController.update();
        control.addEventListener('mousedown', this.mouseActionControl.bind(this), {passive: true});
        control.addEventListener('dblclick', this.mouseActionControl.bind(this), {passive: true});
        chart.addEventListener('click', () => {//todo: remove debug
            this.graphController.update();
        });
        chart.addEventListener('mousemove', this.mouseActionChart.bind(this), {passive: true});
        chart.addEventListener('mouseleave', this.mouseActionChart.bind(this), {passive: true});

        console.log(this);
    }

    recalcChartVals() {
        this.chart.range = {
            left: Math.max(0, Math.floor(this.control.slide.start / this.control.width * this.chartData.columns['x'].length) - 1),
            right: Math.min(
                this.chartData.columns['x'].length - 1,
                Math.ceil((this.control.slide.start + this.control.slide.length) / this.control.width * this.chartData.columns['x'].length) + 1
            )
        };
        this.chart.maxHeight = Math.max.apply(null, [].concat.call(...Object.values(this.chartData.columns)
            .slice(1)//remove x axis
            .map(arr => arr.slice(this.chart.range.left, this.chart.range.right))));
    }

    drawChart() {
        console.time('drawChart');
        this.chartCtx.clearRect(0, 0, this.chart.width, this.chart.height);

        const columns = this.chartData.columns;
        const length = columns['x'].length;
        const xMult = 1 / ((columns['x'][length - 1] - columns['x'][0]));
        const xFix = this.control.slide.start / this.control.width;
        const xFixMult = this.chart.width * this.chart.width / (this.control.slide.length);
        const maxXValue = this.chart.maxHeight;
        const yMult = 1 / maxXValue * (this.chart.height - dateScalePaddingPx * 2);


        // const valueDivisions = this.scaleController.makeScaleDivisions(, roundValueTemplate);//todo add generating
        const valueDivisions = this.scaleController.getAxisDivisions('y', 0, maxXValue);
        this.chartCtx.lineWidth = 1;
        this.chartCtx.textAlign = 'left';
        for (const division in valueDivisions) {
            if (!valueDivisions.hasOwnProperty(division)) continue;
            this.chartCtx.strokeStyle = `rgba(160, 160, 160, ${valueDivisions[division]})`;
            this.chartCtx.fillStyle = `rgba(160, 160, 160, ${valueDivisions[division]})`;
            this.chartCtx.beginPath();
            this.chartCtx.moveTo(
                roundFn(0),
                roundFn(this.chart.height - division * yMult - dateScalePaddingPx),
            );
            this.chartCtx.lineTo(
                roundFn(this.chart.width),
                roundFn(this.chart.height - division * yMult - dateScalePaddingPx),
            );
            this.chartCtx.stroke();
            this.chartCtx.fillText(division.toString(),
                roundFn(5),
                this.chart.height - division * yMult - dateScalePaddingPx - 5
            );
        }


        //lines
        this.chartCtx.lineWidth = 1.5;
        for (let lineName in this.chartData.colors) {
            if (!this.chartData.colors.hasOwnProperty(lineName)) continue;
            this.chartCtx.strokeStyle = this.chartData.colors[lineName];
            this.chartCtx.beginPath();
            for (let i = this.chart.range.left; i <= this.chart.range.right; i++) {
                //skip points don has effect on test dataset
                this.chartCtx.lineTo(
                    roundFn((((columns['x'][i] - columns['x'][0]) * xMult) - xFix) * xFixMult),
                    roundFn(this.chart.height - columns[lineName][i] * yMult - dateScalePaddingPx)
                );
            }
            this.chartCtx.stroke();
        }

        //draw axis x - date
        const left = this.chart.range.left + 1,
            right = this.chart.range.right - 1;
        const dateDivisions = this.scaleController.getAxisDivisions('x', columns['x'][left], columns['x'][right]);
        this.chartCtx.lineWidth = 1.5;
        // this.chartCtx.strokeStyle = '#888';
        this.chartCtx.textAlign = 'center';
        for (const divis in dateDivisions) {
            if (!dateDivisions.hasOwnProperty(divis)) continue;
            this.chartCtx.fillStyle = `rgba(128, 128 ,128 ,${dateDivisions[divis]})`;
            this.chartCtx.fillText(new Date(parseInt(divis)).toString().slice(4, 10),
                roundFn(((divis - columns['x'][0]) / (columns['x'][length - 1] - columns['x'][0]) - xFix) * xFixMult),
                this.chart.height - dateScalePaddingPx + 8);
        }

        //marker
        if (this.chart.marker) {//mb need to move in handler, for stop rerendering
            const markerX = roundFn((((columns['x'][this.chart.marker] - columns['x'][0]) * xMult) - xFix) * xFixMult);
            this.chartCtx.lineWidth = 1;
            this.chartCtx.strokeStyle = '#000';
            this.chartCtx.beginPath();
            this.chartCtx.moveTo(markerX, 0);
            this.chartCtx.lineTo(markerX, this.chart.height);
            this.chartCtx.stroke();//and draw circles, just white stroke circles with stroke color
            console.log(new Date(columns['x'][this.chart.marker]), ...Object.values(columns).slice(1).map(col => col[this.chart.marker]));

        }


        console.timeEnd('drawChart');
    }

    drawFullChart() {
        this.fullChartCtx.clearRect(0, 0, this.fullChart.width, this.fullChart.height);

        const columns = this.chartData.columns;
        const length = columns['x'].length;
        const xMult = 1 / (columns['x'][length - 1] - columns['x'][0]) * this.fullChart.width;
        const yMult = 1 / Math.max.apply(null, Object.values(this.chartData.maxs)) * this.fullChart.height;

        //lines
        this.fullChartCtx.lineWidth = 1.5;
        for (let lineName in this.chartData.colors) {
            if (!this.chartData.colors.hasOwnProperty(lineName)) continue;
            this.fullChartCtx.strokeStyle = this.chartData.colors[lineName];
            this.fullChartCtx.beginPath();
            for (let i = 0; i < length; i++) {
                this.fullChartCtx.lineTo(
                    roundFn((columns['x'][i] - columns['x'][0]) * xMult),
                    roundFn(this.fullChart.height - columns[lineName][i] * yMult)
                );
            }
            this.fullChartCtx.stroke();
        }
    }

    drawControl() {
        console.time('drawControl');
        this.controlCtx.clearRect(0, 0, this.control.width, this.control.height);

        const slide = this.control.slide;
        this.controlCtx.strokeStyle = '#8888FFAA';
        this.controlCtx.fillStyle = '#8888FFAA';
        this.controlCtx.fillRect(slide.start, 0, slide.panelLength, this.control.height);
        this.controlCtx.fillRect(slide.start + slide.length - slide.panelLength, 0, slide.panelLength, this.control.height);
        this.controlCtx.fillStyle = '#6666FF33';
        this.controlCtx.fillRect(0, 0, slide.start, this.control.height);
        this.controlCtx.fillRect(slide.start + slide.length, 0, this.control.width - slide.start + slide.length, this.control.height);
        this.controlCtx.strokeRect(slide.start, 0, slide.length, this.control.height);

        console.timeEnd('drawControl');
    }

    mouseActionControl(e) {
        const slide = this.control.slide;

        if (e.type === 'dblclick') {
            slide.start += slide.length / 4;
            slide.length -= slide.length / 2;
            this.graphController.update(['chart', 'ctrl']);
            return;
        }

        const offsetXfromControl = e.clientX - this.controlDOM.offsetLeft - this.DOM.offsetLeft - slide.start;
        const targetType = offsetXfromControl > 0 && offsetXfromControl < slide.panelLength ? 'leftPanel' :
            offsetXfromControl < slide.length && offsetXfromControl > slide.length - slide.panelLength ? 'rightPanel' :
                null;

        const changeControlAction = (e) => {
                const controlOffsetX = e.clientX - this.controlDOM.offsetLeft - this.DOM.offsetLeft;
                if (targetType === 'leftPanel') {
                    const possibleStart = roundFn(controlOffsetX - slide.panelLength / 2);
                    const newStart = Math.max(0, Math.min(slide.start + slide.length - slide.panelLength * 2, possibleStart));
                    slide.length = slide.start + slide.length - newStart;
                    slide.start = newStart;

                } else if (targetType === 'rightPanel') {
                    const possibleEnd = roundFn(controlOffsetX + slide.panelLength / 2);
                    const newEnd = Math.max(slide.start + slide.panelLength * 2, Math.min(this.control.width, possibleEnd));
                    slide.length = newEnd - slide.start;

                } else {
                    const possibleStart = roundFn(controlOffsetX - slide.length / 2);
                    slide.start = Math.max(0, Math.min(this.control.width - slide.length, possibleStart));
                }

                this.recalcChartVals();
                this.graphController.update(['chart', 'ctrl']);

                // this.control.start
            },
            stopWatch = (e) => {
                document.body.removeEventListener('mousemove', changeControlAction);
                document.body.removeEventListener('mouseup', stopWatch);
                document.body.removeEventListener('mouseleave', stopWatch);
            };
        changeControlAction(e);
        document.body.addEventListener('mousemove', changeControlAction, {passive: true});
        document.body.addEventListener('mouseup', stopWatch, {once: true, passive: true});
        document.body.addEventListener('mouseleave', stopWatch, {once: true, passive: true});
    }

    mouseActionChart(e) {
        if (e.type === 'mouseleave') {
            this.chart.marker = null;
            this.infoDOM.style = 'display: none';
            this.graphController.update(['chart']);
            return;
        }
        if (this.infoDOM.style.display === 'none') {
            this.info.values.innerHTML = Object.keys(this.chartData.colors)
                .map(lineName => {
                    return `<div class="value" style="color: ${this.chartData.colors[lineName]}"><span data-name="${lineName}">42</span>${this.chartData.names[lineName]}</div>`;
                }).join('');
        }
        // console.log(e.type);
        // console.log(e.clientX, e.clientY);
        // console.log(this.controlDOM.offsetLeft, this.DOM.offsetLeft);
        // console.log(this.DOM.offsetTop, this.infoDOM.clientHeight);


        const oldMarker = this.chart.marker;
        this.chart.marker = Math.round(
            (e.clientX - this.chartDOM.offsetLeft - this.DOM.offsetLeft)
            /
            this.chart.width * (this.chart.range.right - this.chart.range.left))
            + this.chart.range.left;

        this.infoDOM.style = `left: ${Math.round(e.clientX - this.chartDOM.offsetLeft - this.DOM.offsetLeft)}px; top: ${Math.round(e.clientY
            - this.DOM.offsetTop
            - this.infoDOM.clientHeight)}px`;
        this.info.date.innerText = new Date(this.chartData.columns['x'][this.chart.marker]).toString().slice(0, 10);
        this.info.values.querySelectorAll('.values span').forEach(valueNode => {
            valueNode.innerText = this.chartData.columns[valueNode.dataset.name][this.chart.marker];
        });

        if (oldMarker !== this.chart.marker) {
            this.graphController.update(['chart']);
        }
    }

    onChooseLine(e) {

    }
}

const chartsDOM = document.getElementById('charts');
fetch("chart_data.json")
    .then(responce => responce.json())
    .then(chart_data => {
        for (const chart of chart_data) {
            new Chart({DOM: chartsDOM.appendChild(document.createElement('div')), chartData: chart, width: 400})
        }
    });