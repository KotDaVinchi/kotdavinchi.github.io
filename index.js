const roundFn = (x) => x;//Math.round;
const slideLengthRate = 0.2;
const slidePanelLength = 0.02;
const dateScalePaddingPx = 15;

class Chart {
    constructor(params) {
        this.DOM = params.DOM;
        this.chartData = params.chartData;
        this.chartData.columns = this.chartData.columns.reduce((acc, elem) => {
            acc[elem[0]] = elem.slice(1);
            return acc;
        }, {});

        this.graphController = new GraphController({
            chart: this.drawChart.bind(this),
            fChart: this.drawFullChart.bind(this),
            ctrl: this.drawControl.bind(this)
        });
        this.chartData.enabled = Object.keys(this.chartData.names).reduce((acc,name)=>{acc[name] = true; return acc},{});

        this.chartData.currentOpacity = {};
        for (let name in this.chartData.names) {
            if (!this.chartData.names.hasOwnProperty(name)) continue;
            this.graphController.animatedValueFactory({
                ctx: this.chartData.currentOpacity,
                name: name,
                startValue: 1,
                speed: 0.01,
                updFnIds: ['fChart', 'chart']
            })
        }

        this.chartData.maxs = {};
        Object.keys(this.chartData.colors).forEach(name => {
            this.chartData.maxs[name] = Math.max.apply(null, this.chartData.columns[name]);
        });
        this.chartData.max = Math.max.apply(null, Object.values(this.chartData.maxs));

        this.DOM.className += ' chart';
        const width = params.fitsContainer ? this.DOM.width : params.width;
        this.DOM.innerHTML = `<canvas class="board" width="${width}" height="${width}"></canvas>
        <div class="control"><canvas class="fullChart" width="${width}" height="${width / 8}"/></canvas>
        <canvas class="chartsControl" width="${width}" height="${width / 8}"/></canvas></div>`;

        if(!document.getElementById('info')){
            document.body.insertAdjacentHTML(
                'beforeend',
                `<div id="info" style="display:none"><div class="date"></div><div class="values"></div></div>`);
        }

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
                .map(arr => arr.slice(this.chart.range.left, this.chart.range.right)))),
            speed: roundFn(this.chartData.max * 0.001),
            updFnIds: ['fChart']
        });
        this.graphController.animatedValueFactory({
            ctx: this.chart,
            name: 'currentMaxHeight',
            startValue: this.chart.maxHeight,
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


        this.lines = document.createElement('div');
        this.lines.className = 'lines';
        this.DOM.insertAdjacentElement('beforeend', Object.keys(this.chartData.names)
            .map(name => {
                const label = document.createElement('label');
                const input = document.createElement('input');
                const icon = document.createElement('div');
                icon.className = 'icon';
                icon.style.borderColor = this.chartData.colors[name];
                icon.style.backgroundColor = this.chartData.colors[name];
                input.type = 'checkbox';
                input.name = name;
                input.checked = true;
                input.style.borderColor = this.chartData.colors[name];
                input.addEventListener('click', this.onChooseLine.bind(this));
                label.appendChild(input);
                label.appendChild(icon);
                label.appendChild(document.createTextNode(this.chartData.names[name]));
                return label;
            }).reduce((lines, input) => {
                lines.appendChild(input);
                return lines;
            }, this.lines));


        this.recalcChartVals();
        this.graphController.update();
        control.addEventListener('mousedown', this.mouseActionControl.bind(this), {passive: true});
        control.addEventListener('dblclick', this.mouseActionControl.bind(this), {passive: true});
        chart.addEventListener('mousemove', this.mouseActionChart.bind(this), {passive: true});
        chart.addEventListener('mouseleave', this.mouseActionChart.bind(this), {passive: true});

        console.log(this);
    }

    recalcChartVals() {
        const xColumn = this.chartData.columns['x'];
        this.chart.window = {
            xStart: (this.control.slide.start / this.control.width) * (xColumn[xColumn.length - 1] - xColumn[0]) + xColumn[0],
            xEnd: ((this.control.slide.start + this.control.slide.length) / this.control.width) * (xColumn[xColumn.length - 1] - xColumn[0]) + xColumn[0]
        };
        this.chart.range = {
            left: Math.max(
                0,
                Math.floor((this.chart.window.xStart - xColumn[0]) / (xColumn[xColumn.length - 1] - xColumn[0]) * (xColumn.length - 1))
            ),
            right: Math.min(
                xColumn.length - 1,
                Math.ceil((this.chart.window.xEnd - xColumn[0]) / (xColumn[xColumn.length - 1] - xColumn[0]) * (xColumn.length - 1))
            )
        };
        const enabledNames = Object.keys(this.chartData.enabled).filter(name => this.chartData.enabled[name]);
        const valuesOfEnabledNames = enabledNames.map(name => this.chartData.columns[name]);
        this.chart.maxHeight = Math.max.apply(null, [].concat.call(...valuesOfEnabledNames));
        this.chart.currentMaxHeight = Math.max.apply(null, [].concat.call(...valuesOfEnabledNames
            .map(arr => arr.slice(this.chart.range.left, this.chart.range.right))));
    }

    drawChart() {
        console.time('drawChart');
        this.chartCtx.clearRect(0, 0, this.chart.width, this.chart.height);

        const columns = this.chartData.columns;
        const length = columns['x'].length;
        const xStart = (this.control.slide.start / this.control.width) * (columns['x'][length - 1] - columns['x'][0]) + columns['x'][0];
        const xEnd = ((this.control.slide.start + this.control.slide.length) / this.control.width) * (columns['x'][length - 1] - columns['x'][0]) + columns['x'][0];
        const xMult = this.chart.width / (xEnd - xStart);
        const maxXValue = this.chart.currentMaxHeight;
        const yMult = 1 / maxXValue * (this.chart.height - dateScalePaddingPx * 2);


        const valueDivisions = this.scaleController.getAxisDivisions('y', 0, maxXValue);
        this.chartCtx.lineWidth = 1;
        this.chartCtx.textAlign = 'left';
        for (const division in valueDivisions) {
            if (!valueDivisions.hasOwnProperty(division)) continue;
            this.chartCtx.strokeStyle = `rgba(180, 180, 180, ${valueDivisions[division]})`;
            this.chartCtx.fillStyle = `rgba(180, 180, 180, ${valueDivisions[division]})`;
            this.chartCtx.beginPath();
            this.chartCtx.moveTo(
                roundFn(dateScalePaddingPx/2),
                roundFn(this.chart.height - division * yMult - dateScalePaddingPx*2),
            );
            this.chartCtx.lineTo(
                roundFn(this.chart.width),
                roundFn(this.chart.height - division * yMult - dateScalePaddingPx*2),
            );
            this.chartCtx.stroke();
            this.chartCtx.fillText(division.toString(),
                roundFn(dateScalePaddingPx/2),
                this.chart.height - division * yMult - dateScalePaddingPx*2 - 5
            );
        }


        //lines
        this.chartCtx.lineWidth = 1.5;
        const enabledNames = Object.keys(this.chartData.currentOpacity).filter(name => this.chartData.currentOpacity[name]!==0);
        for (let lineName of enabledNames) {
            this.chartCtx.strokeStyle = this.chartData.colors[lineName];
            this.chartCtx.globalAlpha = this.chartData.currentOpacity[lineName];
            this.chartCtx.beginPath();
            for (let i = this.chart.range.left; i <= this.chart.range.right; i++) {
                //skip points don has effect on test dataset
                this.chartCtx.lineTo(
                    roundFn((columns['x'][i] - xStart) * xMult),
                    roundFn(this.chart.height - columns[lineName][i] * yMult - dateScalePaddingPx*2)
                );
            }
            this.chartCtx.stroke();
        }
        this.chartCtx.globalAlpha = 1;

        //draw axis x - date
        const left = this.chart.window.xStart,
            right = this.chart.window.xEnd;
        const dateDivisions = this.scaleController.getAxisDivisions('x', left, right);
        this.chartCtx.lineWidth = 1.5;
        this.chartCtx.textAlign = 'center';
        for (const divis in dateDivisions) {
            if (!dateDivisions.hasOwnProperty(divis)) continue;
            this.chartCtx.fillStyle = `rgba(180, 180 ,180 ,${dateDivisions[divis]})`;
            this.chartCtx.fillText(new Date(parseInt(divis)).toString().slice(4, 10),
                roundFn((divis - xStart) * xMult),
                this.chart.height - dateScalePaddingPx + 8);
        }

        //marker
        if (this.chart.marker) {
            const markerX = roundFn((columns['x'][this.chart.marker] - xStart) * xMult);
            this.chartCtx.lineWidth = 1;
            this.chartCtx.strokeStyle = 'rgb(180, 180 ,180)';
            this.chartCtx.beginPath();
            this.chartCtx.moveTo(markerX, 0);
            this.chartCtx.lineTo(markerX, this.chart.height);
            this.chartCtx.stroke();
            for (let lineName of enabledNames) {
                this.chartCtx.strokeStyle = this.chartData.colors[lineName];
                this.chartCtx.fillStyle = document.body.classList.contains('night') ? 'black' : 'white';
                this.chartCtx.beginPath();
                this.chartCtx.arc(
                    markerX,
                    this.chart.height - columns[lineName][this.chart.marker] * yMult - dateScalePaddingPx*2,
                    5,0,Math.PI*2,true);
                this.chartCtx.fill();
                this.chartCtx.beginPath();
                this.chartCtx.arc(
                    markerX,
                    this.chart.height - columns[lineName][this.chart.marker] * yMult - dateScalePaddingPx*2,
                    5,0,Math.PI*2,true);
                this.chartCtx.stroke();
            }

        }


        console.timeEnd('drawChart');
    }

    drawFullChart() {
        this.fullChartCtx.clearRect(0, 0, this.fullChart.width, this.fullChart.height);

        const columns = this.chartData.columns;
        const length = columns['x'].length;
        const xMult = 1 / (columns['x'][length - 1] - columns['x'][0]) * this.fullChart.width;
        const yMult = 1 / this.chart.maxHeight * this.fullChart.height;

        //lines
        const enabledNames = Object.keys(this.chartData.currentOpacity).filter(name => this.chartData.currentOpacity[name]!==0);
        this.fullChartCtx.lineWidth = 1.5;
        for (let lineName of enabledNames) {
            this.fullChartCtx.strokeStyle = this.chartData.colors[lineName];
            this.fullChartCtx.globalAlpha = this.chartData.currentOpacity[lineName];
            this.fullChartCtx.beginPath();
            for (let i = 0; i < length; i++) {
                this.fullChartCtx.lineTo(
                    roundFn((columns['x'][i] - columns['x'][0]) * xMult),
                    roundFn(this.fullChart.height - columns[lineName][i] * yMult)
                );
            }
            this.fullChartCtx.stroke();
        }
        this.fullChartCtx.globalAlpha = 1;
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

        const offsetXfromControl = e.pageX - this.controlDOM.offsetLeft - this.DOM.offsetLeft - slide.start;
        const targetType = offsetXfromControl > 0 && offsetXfromControl < slide.panelLength ? 'leftPanel' :
            offsetXfromControl < slide.length && offsetXfromControl > slide.length - slide.panelLength ? 'rightPanel' :
                null;

        const changeControlAction = (e) => {
                const controlOffsetX = e.pageX - this.controlDOM.offsetLeft - this.DOM.offsetLeft;
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


        const oldMarker = this.chart.marker;
        this.chart.marker = Math.round(
            (e.pageX / this.chart.width * this.control.slide.length + this.control.slide.start) / this.control.width
            *
            (this.chartData.columns['x'].length - 1));

        this.infoDOM.style = `left: ${Math.round(e.pageX + 10)}px; top: ${Math.round(e.pageY - 10 - this.infoDOM.clientHeight)}px`;
        this.info.date.innerText = new Date(this.chartData.columns['x'][this.chart.marker]).toString().slice(0, 10);
        this.info.values.querySelectorAll('.values span').forEach(valueNode => {
            valueNode.innerText = this.chartData.columns[valueNode.dataset.name][this.chart.marker];
        });

        if (oldMarker !== this.chart.marker) {
            this.graphController.update(['chart']);
        }
    }

    onChooseLine(e) {
        if(Object.values(this.chartData.enabled).filter(en => en).length <= 1 && !e.target.checked){
            //not on my shift
            e.preventDefault();
            return;
        }
        this.chartData.enabled[e.target.name] = e.target.checked;
        this.chartData.currentOpacity[e.target.name] = e.target.checked ? 1 : 0;
        this.recalcChartVals();
        this.graphController.update(['fChart', 'chart']);
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

document.getElementById('switchTheme').addEventListener('click',()=>{
    document.body.classList.toggle('night');
})