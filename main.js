// set the dimensions and margins of the graph
const margin = {top: 50, right: 50, bottom: 50, left: 50},
    width = 1400 - margin.left - margin.right,
    height = 1100 - margin.top - margin.bottom,
    svg_width = width + margin.left + margin.right,
    svg_height = height + margin.top + margin.bottom;

// use a tooltip to show node info
const tooltip_div = d3.select("body")
   .append("tooltip_div")
   .attr("class", "tooltip")
   .style("opacity", 0)
   .style("display", "none");

const format = d3.format(",d");

const highlight = (d) => {
    tooltip_div.transition()
    .duration(200)
    .style("opacity", .9);

    tooltip_div.html(tooltipHTML(d))
        .style("left", (d3.event.pageX/1.2) + "px")
        .style("top", (d3.event.pageY/1.2) + "px")
        .style("display", null);
};

const tooltipHTML = (d) => {
    if (d.data.county === 'JUDEȚ NECUNOSCUT') d.data.county = 'JUDEȚ NECUNOSCUT';
    return "<b>" + d.data.county + "</b><br />" +
        "Confirmate: " + d.data.total_case + "<br />" +
        "Vindecări: " + ( d.data.total_healed === null ? 0 : d.data.total_healed ) + "<br />" +
        "Decese: " + ( d.data.total_dead === null ? 0 : d.data.total_dead );

    // return `${d.ancestors().reverse().map(d => d.data.county_code).join("/")}</br>${format(d.data.total_case)} cases`;
};

const unHighlight = () => {
    tooltip_div.transition()
        .duration(200)
        .style("opacity", 0);
};

// https://medialab.github.io/iwanthue/
// hcl[0]>=0 && hcl[0]<=340
//     && hcl[1]>=30 && hcl[1]<=80
//     && hcl[2]>=35 && hcl[2]<=100
const countyColors = [
    "#e4588c", "#35d394", "#ba1ea8", "#4caf1c", "#1848ca", "#aad42b", "#9b85ff", "#068400", "#8b2487", "#97ff8b", "#d60042", "#00ae87", "#f94740", "#48d3ff", "#d17300", "#5ea2ff", "#cfb100", "#53498f", "#ffe353", "#325383", "#86a700", "#ff9eeb", "#007f30", "#d9b6ff", "#3b5c12", "#89c2ff", "#964000", "#00bfbb", "#ff6f54", "#01aac6", "#ffb65d", "#008857", "#ff8e90", "#145f36", "#952e31", "#fffea6", "#8e3440", "#5a936f", "#883d0c", "#ffaf81", "#34a6c2", "#b09764", "#458a18"
];
const counties = [
    "ALBA", "ARAD", "ARGEȘ", "BACĂU", "BIHOR", "BISTRIȚA-NĂSĂUD", "BOTOȘANI", "BRAȘOV", "BRĂILA", "BUCUREȘTI", "BUZĂU", "CARAȘ-SEVERIN", "CLUJ", "CONSTANȚA", "COVASNA", "CĂLĂRAȘI", "DOLJ", "DÂMBOVIȚA", "GALAȚI", "GIURGIU", "GORJ", "HARGHITA", "HUNEDOARA", "IALOMIȚA", "IAȘI", "ILFOV", "JUDEȚ NECUNOSCUT", "MARAMUREȘ", "MEHEDINȚI", "MUREȘ", "NEAMȚ", "OLT", "PRAHOVA", "SATU MARE", "SIBIU", "SUCEAVA", "SĂLAJ", "TELEORMAN", "TIMIȘ", "TULCEA", "VASLUI", "VRANCEA", "VÂLCEA"
];
const countyColor = d3.scaleOrdinal(countyColors).domain(counties);


(() => {

    // d3.json("cases_relations.json").then( data => { // dummy data
    d3.json("https://covid19.geo-spatial.org/api/dashboard/v2/getCasesByCounty").then( data => {

        nodes = data.data.data;

        changeView(nodes);
    });

    const changeView = (nodes) => {

        const svg = d3.select("#chart")
            .append("svg")
            .attr("class", "chart-group")
            .attr("preserveAspectRatio", "xMidYMid")
            .attr("width", svg_width)
            .attr("height", svg_height)
            .attr("viewBox", '0, 0 ' + svg_width + ' ' + svg_height)
                .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
        const data = {
            "name": "Districts",
            "children": nodes,
        };

        const format = d3.format(",d");

        const treemap = data => d3.treemap()
        .tile(d3.treemapResquarify)
        .size([width, height])
        .padding(1)
        .round(true)
            (d3.hierarchy(data)
                .eachBefore( d => { 
                    return d.data.county_code = (d.parent && d.parent.data.county_code !== "undefined" ? d.parent.data.county_code + "." : "") + d.data.county_code; 
                })
                .sum(d => d.total_case)
                .sort((a, b) => b.total_case - a.total_case))

        const root = treemap(data);

        const leaf = svg.selectAll("g")
            .data(root.leaves())
            .join("g")
                .attr("transform", d => `translate(${d.x0},${d.y0})`);

        leaf.append("rect")
            .attr("id", d => d.data.county_code)
            .attr("class", "districts")
            .attr("fill", d => { while (d.depth > 1) d = d.parent; return countyColor(d.data.county); })
            .attr("fill-opacity", 0.6)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .on("mouseover", d => highlight(d))
            .on("mouseout", d => unHighlight(d));

        leaf.append("clipPath")
            .attr("id", d => `clip-${d.data.county_code}`)
            .append("use")
                .attr("xlink:href", d => `#${d.data.county_code}`);

        leaf.append("text")
            .attr("clip-path", d => `url(#clip-${d.data.county_code})`)
            .selectAll("tspan")
            .data(d => {
                    let thisCounty = d.data.county_code;
                    if (thisCounty === 'NA') thisCounty = 'JUDEȚ NECUNOSCUT';
                    return thisCounty.split(/(?=[A-Z][^A-Z])/g).concat(format(d.data.total_case));
                })
            .join("tspan")
                .attr("x", 3)
                .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
                .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
                .text(d => d);

        /******************************** Title ********************************/
        // svg.append("text")
        //     .attr("x", (width / 2))
        //     .attr("y", -15)
        //     .attr("text-anchor", "middle")
        //     .style("font-size", "16px")
        //     .style("text-decoration", "underline")
        //     .text("Repartiția cazurilor pe județe");
    };

}).call(this);