///////////////////////////////////////////////////////////////
//  GEOMETRY CLASSES – these can stay global (they use no p5) //
///////////////////////////////////////////////////////////////

class point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    equal(other, eps = 1e-6) {
        if (other instanceof point) {
            return Math.abs(this.x - other.x) < eps && Math.abs(this.y - other.y) < eps;
        }
        return false;
    }
    almost_contains(other, radius) {
        let dist = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
        return dist < radius;
    }
}

class edge {
    constructor(p1, p2) {
        this.p1 = (Math.min(p1.x, p2.x) === p1.x) ? p1 : p2;
        this.p2 = (Math.min(p1.x, p2.x) === p1.x) ? p2 : p1;
    }

    equal(other) {
        if (!(other instanceof edge)) return false;
        return this.p1.equal(other.p1) && this.p2.equal(other.p2);
    }

    intersects(other) {
        if (!(other instanceof edge)) return false;

        const { p1: a, p2: b } = this;
        const { p1: c, p2: d } = other;

        const cross = (p, q, r) =>
            (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

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

    connected(other) {
        if (!(other instanceof edge)) return false;

        return other.p1.equal(this.p1) || other.p1.equal(this.p2) ||
               other.p2.equal(this.p1) || other.p2.equal(this.p2);
    }

    formsTriangle(e2, e3) {
        const e1 = this;
        const Tedges = [e1, e2, e3];
        const points = [e1.p1, e1.p2, e2.p1, e2.p2, e3.p1, e3.p2];

        const uniquePoints = points.filter(
            (p, i, arr) => arr.findIndex(q => p.equal(q)) === i
        );
        if (uniquePoints.length !== 3) return false;

        for (let i = 0; i < 3; i++) {
            let connections = 0;
            for (let j = 0; j < 3; j++) {
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
            if (connections < 2) return false;
        }

        return new Triangle(uniquePoints[0], uniquePoints[1], uniquePoints[2]);
    }
}

class Triangle {
    constructor(a, b, c, owner = 0) {
        this.pts = [a, b, c];
        this.owner = owner;
    }
    equals(other) {
        if (!(other instanceof Triangle)) return false;
        return this.pts.every(p => other.pts.some(q => p.equal(q)));
    }
}

////////////////////////////////////////////////////////////////////
//                  P5 INSTANCE-MODE SKETCH                      //
////////////////////////////////////////////////////////////////////

function completeTriangulation(p) {

    //---------------------------------------------------------------------
    // INSTANCE VARIABLES (formerly globals)
    //---------------------------------------------------------------------
    p.inuse = false;
    p.polysize = 0;
    p.points = [];
    p.player = false;
    p.selected = false;
    p.edges = [];
    p.score1 = 0;
    p.score2 = 0;
    p.highlighted = [];
    p.triangles = [];
    p.winner = null;

    //---------------------------------------------------------------------
    //  REUSABLE HELPERS (NOW INSIDE INSTANCE)
    //---------------------------------------------------------------------

    p.refresh = function () {
        p.points = [];
        p.player = false;
        p.selected = false;
        p.edges = [];
        p.score1 = 0;
        p.score2 = 0;
        p.highlighted = [];
        p.triangles = [];
        p.winner = 0;
    };

    p.fullRefresh = function () {
        p.inuse = !p.inuse;
        p.polysize = 0;
        p.polysizeinput.value("enter polygon size");
        p.refresh();
    };

    p.constructPolygon = function () {
        p.points = [];
        const diameter = p.min(p.width, p.height) * 0.8;
        const centerX = p.width / 2;
        const centerY = p.height / 2;
        const angleStep = p.TWO_PI / p.polysize;

        for (let i = 0; i < p.polysize; i++) {
            const angle = i * angleStep - p.HALF_PI;
            const x = centerX + (diameter / 2) * p.cos(angle);
            const y = centerY + (diameter / 2) * p.sin(angle);
            p.points.push(new point(x, y));
        }
    };

    p.checkPointPress = function (mx, my) {
        const po = new point(mx, my);
        const rad = 8;

        for (let i = 0; i < p.points.length; i++) {
            if (po.almost_contains(p.points[i], rad)) {
                if (p.points[i].equal(p.highlighted[0])) return -2;
                return i;
            }
        }
        return -1;
    };

    p.checkEdge = function (e) {
        for (const other of p.edges) {
            if (
                e.p1.equal(other.p1) || e.p1.equal(other.p2) ||
                e.p2.equal(other.p1) || e.p2.equal(other.p2)
            ) continue;
            if (e.intersects(other)) return false;
        }
        return true;
    };

    p.addEdge = function (p1, p2) {
        const e = new edge(p1, p2);
        if (p.checkEdge(e)) {
            p.edges.push(e);
        } else {
            alert("This edge crosses another edge.");
        }
    };

    p.checkTri = function (e) {
        let newTri = false;
        const others = p.edges.filter(ed => !e.equal(ed));
        if (others.length < 2) return false;

        for (let i = 0; i < others.length; i++) {
            for (let j = i + 1; j < others.length; j++) {
                const tri = e.formsTriangle(others[i], others[j]);
                if (tri) {
                    tri.owner = p.player ? 1 : 2;

                    const exists = p.triangles.some(t => t.equals(tri));
                    if (!exists) {
                        p.triangles.push(tri);
                        if (p.player) p.score1++;
                        else p.score2++;
                        newTri = true;
                    }
                }
            }
        }

        return newTri;
    };

    p.checkDone = function () {
        for (let i = 0; i < p.points.length; i++) {
            for (let j = i + 1; j < p.points.length; j++) {
                const candidate = new edge(p.points[i], p.points[j]);
                if (p.edges.some(ed => ed.equal(candidate))) continue;
                if (p.checkEdge(candidate)) return false;
            }
        }
        return true;
    };

    //---------------------------------------------------------------------
    // DRAWING HELPERS
    //---------------------------------------------------------------------

    p.drawEdges = function () {
        p.noFill();
        p.stroke(0);
        p.strokeWeight(2);
        for (let e of p.edges) {
            p.line(e.p1.x, e.p1.y, e.p2.x, e.p2.y);
        }
    };

    p.drawPoints = function () {
        for (const pt of p.points) {
            p.fill(255);
            if (p.highlighted.some(h => pt.equal(h))) p.fill(0, 0, 255);
            p.circle(pt.x, pt.y, 8);
        }
    };

    p.drawTriangles = function () {
        p.noStroke();
        for (const t of p.triangles) {
            if (t.owner === 1) p.fill(0, 180, 0, 120);
            else if (t.owner === 2) p.fill(200, 0, 0, 120);
            else p.fill(150, 150, 150, 80);
            p.beginShape();
            for (const v of t.pts) p.vertex(v.x, v.y);
            p.endShape(p.CLOSE);
        }
    };

    //---------------------------------------------------------------------
    // P5 SETUP + DRAW
    //---------------------------------------------------------------------

    p.setup = function () {
        const popup = document.getElementById('completetriangpopup');
        const popupContent = popup.shadowRoot.querySelector('.popup-content');
        const canvas = p.createCanvas(400, 400);
        canvas.parent(popup);

        const observer = new MutationObserver(() => {
            const isHidden = getComputedStyle(popupContent).display === "none";
            p.fullRefresh();
        });
        observer.observe(popupContent, { attributes: true, attributeFilter: ["style"] });

        p.polysizeinput = p.createInput('enter polygon size');
        p.polysizeinput.parent(popup);
        p.polysizeinput.style('margin-right', '10px');

        p.polysizebutton = p.createButton('Submit');
        p.polysizebutton.parent(popup);

        p.polysizebutton.mousePressed(() => {
            p.polysize = parseInt(p.polysizeinput.value());
            if (!isNaN(p.polysize) && p.polysize > 2 && p.polysize < 20) {
                p.refresh();
                p.constructPolygon();
            } else {
                alert("Enter a valid polygon size (3–19).");
            }
        });

        p.winner = 0;
    };

    p.draw = function () {
        p.background(220);
        p.drawTriangles();
        p.drawEdges();
        p.drawPoints();

        if (p.winner > 0) {
            p.fill(0);
            p.textSize(32);
            if (p.winner === 1) p.text("Player 1 wins!", 100, 200);
            else if (p.winner === 2) p.text("Player 2 wins!", 100, 200);
            else p.text("It's a tie!", 150, 200);
        }
    };

    //---------------------------------------------------------------------
    // MOUSE INPUT
    //---------------------------------------------------------------------

    p.mousePressed = function () {
        if (!p.inuse) return;

        const idx = p.checkPointPress(p.mouseX, p.mouseY);
        if (idx === -1) return;

        if (idx === -2) {
            p.highlighted = [];
            return;
        }

        p.highlighted.push(p.points[idx]);
        if (p.highlighted.length === 2) {
            const e = new edge(p.highlighted[0], p.highlighted[1]);
            p.addEdge(e.p1, e.p2);

            if (!p.checkTri(p.edges[p.edges.length - 1])) {
                p.player = !p.player;
            } else if (p.checkDone()) {
                p.winner = p.score1 > p.score2 ? 1 :
                           p.score2 > p.score1 ? 2 : 0;
            }

            p.highlighted = [];
        }
    };
}

new p5(completeTriangulation);
