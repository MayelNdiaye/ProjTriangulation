function singleTriangle(p) {
    p.inuse = false;
    p.polysize = 0;
    p.polysizeinput = null;
    p.polysizebutton = null;
    p.points = [];
    p.player = false;
    p.edges = [];
    p.highlighted = [];
    p.triangles = [];
    p.winner = null;

    // ----------- CLASSES --------------
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
        equal(other, eps = 1e-6) {
            return (
                other instanceof Point &&
                p.abs(this.x - other.x) < eps &&
                p.abs(this.y - other.y) < eps
            );
        }
        almost_contains(other, r) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            return p.sqrt(dx * dx + dy * dy) < r;
        }
    }

    class Edge {
        constructor(a, b) {
            // canonical order
            this.p1 = p.min(a.x, b.x) === a.x ? a : b;
            this.p2 = this.p1 === a ? b : a;
        }
        equal(other) {
            return (
                other instanceof Edge &&
                this.p1.equal(other.p1) &&
                this.p2.equal(other.p2)
            );
        }
        intersects(other) {
            if (!(other instanceof Edge)) return false;

            const { p1: a, p2: b } = this;
            const { p1: c, p2: d } = other;

            const cross = (p0, p1, p2) =>
                (p1.x - p0.x) * (p2.y - p0.y) -
                (p1.y - p0.y) * (p2.x - p0.x);

            const onSegment = (p0, pX, p1) =>
                p.min(p0.x, p1.x) < pX.x &&
                pX.x < p.max(p0.x, p1.x) &&
                p.min(p0.y, p1.y) < pX.y &&
                pX.y < p.max(p0.y, p1.y);

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
            const edges = [this, e2, e3];
            const pts = [
                this.p1, this.p2,
                e2.p1, e2.p2,
                e3.p1, e3.p2
            ];

            const unique = pts.filter(
                (p0, idx, arr) =>
                    arr.findIndex(q => p0.equal(q)) === idx
            );
            if (unique.length !== 3) return false;

            // Every edge must connect with the other two
            for (let i = 0; i < 3; i++) {
                let conn = 0;
                for (let j = 0; j < 3; j++) {
                    if (i === j) continue;
                    const a = edges[i], b = edges[j];
                    if (
                        a.p1.equal(b.p1) ||
                        a.p1.equal(b.p2) ||
                        a.p2.equal(b.p1) ||
                        a.p2.equal(b.p2)
                    ) conn++;
                }
                if (conn < 2) return false;
            }

            return new Triangle(unique[0], unique[1], unique[2]);
        }
    }

    class Triangle {
        constructor(a, b, c, owner = 0) {
            this.pts = [a, b, c];
            this.owner = owner;
        }
        equals(other) {
            return (
                other instanceof Triangle &&
                this.pts.every(p0 =>
                    other.pts.some(q0 => p0.equal(q0))
                )
            );
        }
    }

    // ----------- SETUP ----------------
    p.setup = function () {
        const popup = document.getElementById("singletriangpopup");
        const canvas = p.createCanvas(400, 400);
        canvas.parent(popup);

        p.polysizeinput = p.createInput("enter polygon size");
        p.polysizeinput.parent(popup);

        p.polysizebutton = p.createButton("Submit");
        p.polysizebutton.parent(popup);
        p.polysizebutton.mousePressed(() => {
            p.polysize = parseInt(p.polysizeinput.value());
            if (p.polysize > 2 && p.polysize < 20) {
                startGame();
            } else {
                window.alert("Enter polygon size 3..19");
            }
        });
    };

    // ----------- START GAME -----------
    function startGame() {
        p.points = [];
        p.edges = [];
        p.triangles = [];
        p.highlighted = [];
        p.player = false;
        p.winner = null;
        p.inuse = true;
        constructPolygon();
    }

    // ----------- DRAW -----------------
    p.draw = function () {
        p.background(220);
        drawTriangles();
        drawEdges();
        drawPoints();

        if (p.winner !== null) {
            p.noStroke();
            p.textSize(28);
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(p.winner === 1 ? "red" : "green");
            p.text("Player " + p.winner + " made a triangle!", p.width / 2, p.height / 2);
        }
    };

    // -------- DRAW HELPERS ------------
    function drawEdges() {
        p.noFill();
        p.stroke(0);
        p.strokeWeight(2);
        for (let e of p.edges)
            p.line(e.p1.x, e.p1.y, e.p2.x, e.p2.y);
    }

    function drawPoints() {
        for (let pt of p.points) {
            p.fill(255);
            if (
                (p.highlighted[0] && pt.equal(p.highlighted[0])) ||
                (p.highlighted[1] && pt.equal(p.highlighted[1]))
            ) {
                p.fill(0, 0, 255);
            }
            p.circle(pt.x, pt.y, 8);
        }
    }

    function drawTriangles() {
        p.noStroke();
        for (let t of p.triangles) {
            if (t.owner === 1) p.fill(0, 180, 0, 120);
            else if (t.owner === 2) p.fill(200, 0, 0, 120);
            else p.fill(150, 150, 150, 80);

            p.beginShape();
            p.vertex(t.pts[0].x, t.pts[0].y);
            p.vertex(t.pts[1].x, t.pts[1].y);
            p.vertex(t.pts[2].x, t.pts[2].y);
            p.endShape(p.CLOSE);
        }
    }

    // -------- POLYGON -----------------
    function constructPolygon() {
        p.points = [];
        let d = p.min(p.width, p.height) * 0.8;
        let cx = p.width / 2, cy = p.height / 2;
        let step = p.TWO_PI / p.polysize;

        for (let i = 0; i < p.polysize; i++) {
            let a = i * step - p.HALF_PI;
            p.points.push(
                new Point(
                    cx + (d / 2) * p.cos(a),
                    cy + (d / 2) * p.sin(a)
                )
            );
        }
    }

    // -------- INPUT / GAME LOGIC ------
    p.mousePressed = function () {
        if (!p.inuse) return;

        let idx = checkPointPress(p.mouseX, p.mouseY);

        // Clicked empty area or deselection
        if (idx === -2) {
            p.highlighted = [];
            return;
        }

        if (idx === -1) return;

        // Highlighting logic
        if (p.highlighted.length >= 2) p.highlighted = [];
        p.highlighted.push(p.points[idx]);

        // Edge creation
        if (p.highlighted.length === 2) {
            addEdge(p.highlighted[0], p.highlighted[1]);
            const triMade = checkTriangle(p.edges[p.edges.length - 1]);

            if (triMade) {
                p.winner = p.player ? 2 : 1;
                p.inuse = false;
            } else {
                p.player = !p.player;
            }
        }
    };

    function checkPointPress(mx, my) {
        let temp = new Point(mx, my);

        for (let i = 0; i < p.points.length; i++) {
            if (temp.almost_contains(p.points[i], 8)) {
                if (p.highlighted[0] && temp.equal(p.highlighted[0])) return -2;
                return i;
            }
        }
        return -1;
    }

    function addEdge(a, b) {
        const e = new Edge(a, b);
        if (edgeOK(e)) p.edges.push(e);
        else window.alert("This edge would cross another edge.");
    }

    function edgeOK(e) {
        for (let other of p.edges) {
            // Skip shared endpoints
            if (
                e.p1.equal(other.p1) ||
                e.p1.equal(other.p2) ||
                e.p2.equal(other.p1) ||
                e.p2.equal(other.p2)
            )
                continue;

            if (e.intersects(other)) return false;
        }
        return true;
    }

    function checkTriangle(e0) {
        const others = p.edges.filter(ed => !e0.equal(ed));
        if (others.length < 2) return false;

        for (let i = 0; i < others.length; i++) {
            for (let j = i + 1; j < others.length; j++) {
                const tri = e0.formsTriangle(others[i], others[j]);
                if (tri) {
                    tri.owner = p.player ? 1 : 2;

                    if (!p.triangles.some(t => t.equals(tri))) {
                        p.triangles.push(tri);
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

new p5(singleTriangle);
