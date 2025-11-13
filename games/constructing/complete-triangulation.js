let inuse = false;
let polysize = 0;
let polysizeinput = null;
let polysizebutton = null;
let points = [];
let player = false;
let selected = false;
let first_point = null;
let edges = [];
let score1 = 0;
let score2 = 0;
let highlighted = []
let triangles = [];
let winner = null; // null = not determined / not shown, 0 = tie, 1 = player1, 2 = player2
class point{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    equal(other, eps=1e-6){
        if (other instanceof point){
            return Math.abs(this.x - other.x) < eps && Math.abs(this.y - other.y) < eps;
        }
        return false;
    }
    almost_contains(other, radius){
        let dist = Math.sqrt((this.x - other.x)*(this.x - other.x) + (this.y - other.y)*(this.y - other.y)) 
        return dist < radius;
    }
}
class edge{
    constructor(p1, p2){
        this.p1 = min(p1.x, p2.x) == p1.x ? p1 : p2;
        this.p2 = min(p1.x, p2.x) == p1.x ? p2 : p1;
    }
    equal(other){
        if (other instanceof edge){
            return this.p1.equal(other.p1) && this.p2.equal(other.p2);
        }
        return false;
    }
     intersects(other) {
        if (!(other instanceof edge)){
            return false;
        }
        const { p1: a, p2: b } = this;
        const { p1: c, p2: d } = other;

        // Cross product
        const cross = (p, q, r) =>
            (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

        // Strictly within segment (excluding endpoints)
        const onSegment = (p, q, r) =>
            Math.min(p.x, r.x) < q.x && q.x < Math.max(p.x, r.x) &&
            Math.min(p.y, r.y) < q.y && q.y < Math.max(p.y, r.y);

        const d1 = cross(a, b, c);
        const d2 = cross(a, b, d);
        const d3 = cross(c, d, a);
        const d4 = cross(c, d, b);

        // Proper intersection
        if (d1 * d2 < 0 && d3 * d4 < 0) return true;

        // Collinear overlaps (excluding endpoints)
        if (d1 === 0 && onSegment(a, c, b)) return true;
        if (d2 === 0 && onSegment(a, d, b)) return true;
        if (d3 === 0 && onSegment(c, a, d)) return true;
        if (d4 === 0 && onSegment(c, b, d)) return true;

        return false;
    }
    connected(other){
         if (!(other instanceof edge)){
            return false;
        }
        return other.p1.equal(this.p1) || other.p1.equal(this.p2) || other.p2.equal(this.p1) || other.p2.equal(this.p2);
    }
    formsTriangle(e2, e3) {
        const e1 = this;
        const Tedges = [e1, e2, e3];
        const points = [e1.p1, e1.p2, e2.p1, e2.p2, e3.p1, e3.p2];
        // Unique points
        const uniquePoints = points.filter(
            (p, i, arr) => arr.findIndex(q => p.equal(q)) === i
        );
        // Must have exactly 3 unique vertices
        if (uniquePoints.length !== 3) return false;

        // Each edge must connect to the other two
        for (let i = 0; i < Tedges.length; i++) {
            let connections = 0;
            for (let j = 0; j < Tedges.length; j++) {
                if (i === j) continue;
                const eA = Tedges[i];
                const eB = Tedges[j];
                if (
                    eA.p1.equal(eB.p1) || eA.p1.equal(eB.p2) ||
                    eA.p2.equal(eB.p1) || eA.p2.equal(eB.p2)
                ) {
                    connections++;
                }
            }
            if (connections < 2) return false; // not connected to both others
        }
        return new Triangle(uniquePoints[0], uniquePoints[1], uniquePoints[2]);
    }
}
class Triangle{
    constructor(a, b, c, owner = 0){
        this.pts = [a, b, c];
        this.owner = owner; // 1 = player1, 2 = player2
    }
    // order-insensitive equality: all three points match (using point.equal)
    equals(other){
        if (!(other instanceof Triangle)) return false;
        return this.pts.every(p => other.pts.some(q => p.equal(q)));
    }
}

function setup() {
    const popup = document.getElementById('completetriangpopup');
    const popupContent = popup.shadowRoot.querySelector('.popup-content');
    const canvas = createCanvas(400, 400);
    canvas.parent(popup);

    // Observe popup visibility changes
    const observer = new MutationObserver(() => {
        const isHidden = getComputedStyle(popupContent).display === "none";
        handleDisplayChange(isHidden);
    });

    // Watch only this popup element for 'style' changes
    observer.observe(popupContent, { attributes: true, attributeFilter: ["style"] });

    // UI setup
    polysizeinput = createInput('enter polygon size');
    polysizeinput.parent(popup);
    polysizeinput.style('margin-right', '10px');

    polysizebutton = createButton('Submit');
    polysizebutton.mousePressed(() => {
        polysize = int(polysizeinput.value());

        // check for valid number properly (NaN check should use isNaN)
        if (!isNaN(polysize) && polysize > 2 && polysize < 20) {
            refresh();
            constructPolygon();
            addBaseEdges();
        } else {
            alert('Please enter a valid polygon size greater than 2 and smaller than 20.');
        }
    });
    polysizebutton.parent(popup);
    winner = 0;
}

function handleDisplayChange(isHidden) {
    if (isHidden) {
        fullRefresh();
    }
    if (!isHidden) {
        fullRefresh();
    }
}

function refresh() {
    points = [];
    player = false;
    selected = false;
    edges = [];
    score1 = 0;
    score2 = 0;
    highlighted = [];
    // hide winner when refreshing the game state
    winner = 0;
}
function fullRefresh(){
    console.log("full refresh called");
    inuse = !inuse;
    polysize = 0;
    polysizeinput.value("enter polygon size");
    refresh();
}

function draw() {
    background(220);
    drawTriangles(); // draw filled owned triangles first
    drawEdges();
    drawPoints();
    if(winner > 0){
        fill(0);
        textSize(32);
        if(winner == 1){
            text("Player 1 wins!", width/2 - 100, height/2);
        } else if(winner == 2){
            text("Player 2 wins!", width/2 - 100, height/2);
        } else{
            text("It's a tie!", width/2 - 70, height/2);
        }
    }

}
function drawEdges(){
    noFill();
    stroke(0);
    strokeWeight(2);
    for(let i = 0; i < edges.length; i++){
        line(edges[i].p1.x, edges[i].p1.y, edges[i].p2.x, edges[i].p2.y);
    }
}

function drawPoints(){

    for(let i = 0; i < points.length; i++){
        fill(255);
        if(points[i].equal(highlighted[0]) || points[i].equal(highlighted[1])) fill(0,0,255);
        circle(points[i].x, points[i].y, 8);
    }
}

// add this drawing helper
function drawTriangles(){
    noStroke();
    for (let t of triangles) {
        if (!(t instanceof Triangle)) continue;
        if (t.owner === 1) {
            fill(0, 180, 0, 120); // green for player 1
        } else if (t.owner === 2) {
            fill(200, 0, 0, 120); // red for player 2
        } else {
            fill(150,150,150,80);
        }
        beginShape();
        vertex(t.pts[0].x, t.pts[0].y);
        vertex(t.pts[1].x, t.pts[1].y);
        vertex(t.pts[2].x, t.pts[2].y);
        endShape(CLOSE);
    }
}

function constructPolygon(){
    points = [];
    let diameter = min(width, height) * 0.8;
    let centerX = width / 2;
    let centerY = height / 2;
    let angleStep = TWO_PI / polysize;
    for (let i = 0; i < polysize; i++) {
        let angle = i * angleStep - HALF_PI;
        let x = centerX + (diameter / 2) * cos(angle);
        let y = centerY + (diameter / 2) * sin(angle);
        points.push(new point(x, y));

    }
    endShape(CLOSE);

}
function mousePressed(){
    if(!inuse) return;
    console.log("mouse pressed at", mouseX, mouseY);
    let pressed = checkPointPress(mouseX, mouseY);
    if(pressed > -1){
        if(highlighted.length >= 2) highlighted = [];
        highlighted.push(points[pressed]);
        if(highlighted.length == 2){
            addEdge(highlighted[0], highlighted[1]);
            if(!checkTri(edges[edges.length -1])){
                player = !player;
            } else{
                if (checkDone()){
                    winner = score1 > score2 ? 1 : score2 > score1 ? 2 : 0;
                }
            }
        }
        
    } else if(pressed == -2){
        highlighted = [];
    }
}
function checkTri(e){
    let newTri = false;
    const others = edges.filter(ed => !e.equal(ed));
    if (others.length < 2) return false;

    for (let i = 0; i < others.length; i++) {
        for (let j = i + 1; j < others.length; j++) {
            const tri = e.formsTriangle(others[i], others[j]);
            if (tri) {
                // set owner based on current player (player=true => player1)
                tri.owner = player ? 1 : 2;

                // if triangle is new, add to triangles array
                const exists = triangles.some(t => t.equals(tri));
                if (!exists) {
                    triangles.push(tri);
                    console.log('new triangle added', tri);
                    if (player) {
                        score1++;
                    } else {
                        score2++;
                    }
                    newTri = true;
                } else {
                    console.log('triangle already exists', tri);
                } 
            }
        }
    }
    return newTri;
}

function checkDone(){
    console.log('Checking for remaining valid edges...');
    // return true when there are no valid edges that can be added
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const candidate = new edge(points[i], points[j]);
            // skip if edge already exists
            if (edges.some(ed => ed.equal(candidate))) continue;
            // if candidate does not intersect any existing edge, a valid move exists
            if (checkEdge(candidate)) {
                return false; // not done, a valid edge can still be added
            }
        }
    }
    // no valid edges remain
    console.log('No valid edges left — game done.');
    return true;
}

function checkPointPress(mouseX, mouseY){
    let po = new point(mouseX, mouseY);
    let rad = 8;
    for(i in points){
        if(po.almost_contains(points[i], rad)){
            if(points[i].equal(highlighted[0])) return -2;
            return i;
        }
    }
    return -1;
}
function addEdge(p1, p2){
    e = new edge(p1, p2);
    if(checkEdge(e)){
        edges.push(new edge(p1, p2));
    }else{
        alert("this edge crossed another edge")
    }
    console.log(edges)
}

function checkEdge(e){
    for (let k = 0; k < edges.length; k++) {
        const other = edges[k];
        // allow touching at endpoints (don't treat shared endpoints as intersection)
        if (e.p1.equal(other.p1) || e.p1.equal(other.p2) ||
            e.p2.equal(other.p1) || e.p2.equal(other.p2)) {
            continue;
        }
        if (e.intersects(other)) {
            console.debug('checkEdge: intersection found', e, other);
            return false;
        }
    }
    return true;
}