let inuse = false;
let polysize = 0;
let polysizeinput = null;
let polysizebutton = null;
let points = [];
let player = false;
let edges = [];
let highlighted = [];
let triangles = [];
let winner = null; // 1 or 2 when a triangle is made, null otherwise

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
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        return Math.sqrt(dx*dx + dy*dy) < radius;
    }
}

class edge{
    constructor(p1, p2){
        // canonical order by x to ease equality
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
        if (!(other instanceof edge)) return false;
        const { p1: a, p2: b } = this;
        const { p1: c, p2: d } = other;
        const cross = (p, q, r) => (q.x - p.x)*(r.y - p.y) - (q.y - p.y)*(r.x - p.x);
        const onSegment = (p, q, r) =>
            Math.min(p.x, r.x) < q.x && q.x < Math.max(p.x, r.x) &&
            Math.min(p.y, r.y) < q.y && q.y < Math.max(p.y, r.y);

        const d1 = cross(a, b, c);
        const d2 = cross(a, b, d);
        const d3 = cross(c, d, a);
        const d4 = cross(c, d, b);

        if (d1 * d2 < 0 && d3 * d4 < 0) return true;
        if (d1 === 0 && onSegment(a, c, b)) return true;
        if (d2 === 0 && onSegment(a, d, b)) return true;
        if (d3 === 0 && onSegment(c, a, d)) return true;
        if (d4 === 0 && onSegment(c, b, d)) return true;
        return false;
    }
    formsTriangle(e2, e3) {
        const Tedges = [this, e2, e3];
        const pts = [this.p1, this.p2, e2.p1, e2.p2, e3.p1, e3.p2];
        const unique = pts.filter((p, i, arr) => arr.findIndex(q => p.equal(q)) === i);
        if (unique.length !== 3) return false;
        // ensure each edge connects to the other two
        for (let i = 0; i < 3; i++){
            let connections = 0;
            for (let j = 0; j < 3; j++){
                if (i === j) continue;
                const a = Tedges[i], b = Tedges[j];
                if (a.p1.equal(b.p1) || a.p1.equal(b.p2) || a.p2.equal(b.p1) || a.p2.equal(b.p2)) connections++;
            }
            if (connections < 2) return false;
        }
        return new Triangle(unique[0], unique[1], unique[2]);
    }
}

class Triangle{
    constructor(a, b, c, owner = 0){
        this.pts = [a, b, c];
        this.owner = owner;
    }
    equals(other){
        if (!(other instanceof Triangle)) return false;
        return this.pts.every(p => other.pts.some(q => p.equal(q)));
    }
}

function setup(){
    const popup = document.getElementById('singletriangpopup');
    const canvas = createCanvas(400, 400);
    canvas.parent(popup);

    polysizeinput = createInput('enter polygon size');
    polysizeinput.parent(popup);
    polysizeinput.style('margin-right', '10px');

    polysizebutton = createButton('Submit');
    polysizebutton.mousePressed(() => {
        polysize = int(polysizeinput.value());
        if (!isNaN(polysize) && polysize > 2 && polysize < 20) {
            startSingleTriangleGame();
        } else {
            alert('Enter polygon size 3..19');
        }
    });
    polysizebutton.parent(popup);
}

function startSingleTriangleGame(){
    points = [];
    edges = [];
    triangles = [];
    highlighted = [];
    player = false;
    winner = null;
    inuse = true;
    constructPolygon();
}

function draw(){
    background(220);
    drawTriangles();
    drawEdges();
    drawPoints();

    if (winner !== null){
        noStroke();
        textSize(28);
        textAlign(CENTER, CENTER);
        fill(winner === 1 ? 'green' : 'red');
        const msg = `Player ${winner} made a triangle!`;
        text(msg, width/2, height/2);
    }
}

function drawEdges(){
    noFill();
    stroke(0);
    strokeWeight(2);
    for (let e of edges) line(e.p1.x, e.p1.y, e.p2.x, e.p2.y);
}

function drawPoints(){
    for (let i = 0; i < points.length; i++){
        fill(255);
        if (highlighted[0] && points[i].equal(highlighted[0]) || highlighted[1] && points[i].equal(highlighted[1])) fill(0,0,255);
        circle(points[i].x, points[i].y, 8);
    }
}

function drawTriangles(){
    noStroke();
    for (let t of triangles){
        if (!(t instanceof Triangle)) continue;
        if (t.owner === 1) fill(0,180,0,120);
        else if (t.owner === 2) fill(200,0,0,120);
        else fill(150,150,150,80);
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
    let cx = width / 2, cy = height / 2;
    let step = TWO_PI / polysize;
    for (let i = 0; i < polysize; i++){
        let a = i * step - HALF_PI;
        points.push(new point(cx + (diameter/2)*cos(a), cy + (diameter/2)*sin(a)));
    }
}

function mousePressed(){
    if(!inuse) return;
    let pressed = checkPointPress(mouseX, mouseY);
    if (pressed > -1){
        if (highlighted.length >= 2) highlighted = [];
        highlighted.push(points[pressed]);
        if (highlighted.length == 2){
            addEdge(highlighted[0], highlighted[1]);
            const newTri = checkTri(edges[edges.length-1]);
            if (!newTri){
                player = !player;
            } else {
                // stop the game as soon as one triangle is formed
                winner = player ? 1 : 2;
                inuse = false;
            }
        }
    } else if (pressed == -2){
        highlighted = [];
    }
}

function checkTri(e){
    const others = edges.filter(ed => !e.equal(ed));
    if (others.length < 2) return false;
    for (let i = 0; i < others.length; i++){
        for (let j = i+1; j < others.length; j++){
            const tri = e.formsTriangle(others[i], others[j]);
            if (tri){
                // assign owner and add if new
                tri.owner = player ? 1 : 2;
                if (!triangles.some(t => t.equals(tri))){
                    triangles.push(tri);
                    return true;
                }
            }
        }
    }
    return false;
}

function checkPointPress(mx, my){
    let po = new point(mx, my);
    for (let i = 0; i < points.length; i++){
        if (po.almost_contains(points[i], 8)){
            if (highlighted[0] && points[i].equal(highlighted[0])) return -2;
            return i;
        }
    }
    return -1;
}

function addEdge(p1, p2){
    const e = new edge(p1, p2);
    if (checkEdge(e)){
        edges.push(e);
    } else {
        alert("This edge would cross another edge.");
    }
}

function checkEdge(e){
    for (let k = 0; k < edges.length; k++){
        const other = edges[k];
        // skip shared endpoints
        if (e.p1.equal(other.p1) || e.p1.equal(other.p2) || e.p2.equal(other.p1) || e.p2.equal(other.p2)) continue;
        if (e.intersects(other)) return false;
    }
    return true;
}
