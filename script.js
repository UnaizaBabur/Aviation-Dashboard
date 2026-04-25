const width = 800;
const height = 450;
const margin = { top: 50, right: 50, bottom: 100, left: 80 };

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const lineSvg = d3.select("#lineChart")
    .append("svg")
    .attr("width", 800)
    .attr("height", 400);

const tooltip = d3.select("#tooltip");

let isReversed = false;
let currentData = [];

d3.csv("data.csv").then(data => {

    data.forEach(d => {
        d.Fatalities = +d.Fatalities || 0;
        const parsed = new Date(d.Date);
        d.year = isNaN(parsed) ? null : parsed.getFullYear();
    });

    const grouped = d3.rollup(
        data,
        v => d3.sum(v, d => d.Fatalities),
        d => d.Operator
    );

    let dataset = Array.from(grouped, ([key, value]) => ({
        Operator: key,
        Fatalities: value
    }));

    dataset.sort((a, b) => b.Fatalities - a.Fatalities);
    currentData = dataset.slice(0, 10);

    // 🌈 NEW COLOR PALETTE
    const color = d3.scaleLinear()
        .domain([0, d3.max(currentData, d => d.Fatalities)])
        .range(["#00cec9", "#6c5ce7"]);

    const x = d3.scaleBand().range([margin.left, width - margin.right]).padding(0.2);
    const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`);

    const yAxisGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`);

    function drawBars(dataSet) {

        x.domain(dataSet.map(d => d.Operator));
        y.domain([0, d3.max(dataSet, d => d.Fatalities)]);

        const bars = svg.selectAll("rect")
            .data(dataSet, d => d.Operator);

        bars.exit().remove();

        bars.transition()
            .duration(600)
            .attr("x", d => x(d.Operator))
            .attr("y", d => y(d.Fatalities))
            .attr("height", d => height - margin.bottom - y(d.Fatalities))
            .attr("width", x.bandwidth())
            .attr("fill", d => color(d.Fatalities));

        bars.enter()
            .append("rect")
            .attr("x", d => x(d.Operator))
            .attr("y", height - margin.bottom)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 6)
            .attr("fill", d => color(d.Fatalities))

            .on("click", function(event, d) {
                d3.selectAll("rect").attr("opacity", 0.3);
                d3.select(this).attr("opacity", 1);
                updateLineChart(d.Operator);
            })

            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .text(`${d.Operator}: ${d.Fatalities}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => tooltip.style("visibility", "hidden"))

            .transition()
            .duration(600)
            .attr("y", d => y(d.Fatalities))
            .attr("height", d => height - margin.bottom - y(d.Fatalities));

        xAxisGroup.call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end");

        yAxisGroup.call(d3.axisLeft(y));
    }

    drawBars(currentData);

    // 📈 LINE CHART (NEW STYLE)
    function updateLineChart(operator = null) {

        lineSvg.selectAll("*").remove();

        let filtered = operator
            ? data.filter(d => d.Operator === operator)
            : data;

        const yearly = d3.rollups(
            filtered,
            v => d3.sum(v, d => d.Fatalities),
            d => d.year
        ).map(([year, value]) => ({ year, fatalities: value }));

        yearly.sort((a, b) => a.year - b.year);

        const xLine = d3.scaleLinear()
            .domain(d3.extent(yearly, d => d.year))
            .range([80, 750]);

        const yLine = d3.scaleLinear()
            .domain([0, d3.max(yearly, d => d.fatalities)])
            .range([350, 50]);

        const line = d3.line()
            .x(d => xLine(d.year))
            .y(d => yLine(d.fatalities))
            .curve(d3.curveMonotoneX);

        lineSvg.append("path")
            .datum(yearly)
            .attr("fill", "none")
            .attr("stroke", "#2d3436")
            .attr("stroke-width", 3)
            .attr("d", line);

        lineSvg.append("g")
            .attr("transform", "translate(0,350)")
            .call(d3.axisBottom(xLine).tickFormat(d3.format("d")));

        lineSvg.append("g")
            .attr("transform", "translate(80,0)")
            .call(d3.axisLeft(yLine));
    }

    updateLineChart();

    // FILTER
    const operators = ["all", ...new Set(dataset.map(d => d.Operator))];

    d3.select("#filter")
        .selectAll("option")
        .data(operators)
        .enter()
        .append("option")
        .text(d => d);

    d3.select("#filter").on("change", function() {
        const val = this.value;

        currentData = val === "all"
            ? dataset.slice(0, 10)
            : dataset.filter(d => d.Operator === val);

        drawBars(currentData);
    });

    // RECONFIGURE
    d3.select("#toggleBtn").on("click", () => {
        isReversed = !isReversed;

        currentData = isReversed
            ? [...currentData].reverse()
            : currentData.sort((a, b) => b.Fatalities - a.Fatalities);

        drawBars(currentData);
    });

});