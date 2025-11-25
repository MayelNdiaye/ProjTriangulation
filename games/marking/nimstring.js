const nimString = (p) => {
  p.setup = function () {
    p.createCanvas(800, 600);
    p.textSize(20);


    p.points = [];
    p.edges = [];
    p.triangles = [];
    p.currentPlayer = 0; // 0 = Red, 1 = Blue
    p.colors = ["red", "blue"];
    p.centerPt = 0;
    p.won = false;

    p.generateConvexPolygon(6); // 6 vertices
    p.buildTriangulations(); // simple triangulation

    // Add reset button
    p.resetButton = p.createButton("Reset Game");
    p.resetButton.position(10, 10);
    p.resetButton.mousePressed(() => {
      p.points = [];
      p.edges = [];
      p.triangles = [];
      p.currentPlayer = 0;
      p.won = false;
      p.generateConvexPolygon(6);
      p.buildTriangulations();
    });
  }

  p.draw = function () {
    p.background(180);
    p.drawEdges();
    p.drawTriangles();
    p.drawPoints();
    p.drawUI();
  }

  p.mousePressed = function () {
    for (let e of p.edges) {
      if (!e.marked && p.isMouseNearEdge(e)) {
        // Mark edge green
        e.marked = true;
        e.owner = p.currentPlayer;
        e.color = "green";

        let completed = p.checkCompletedTriangles(p.currentPlayer);

        if (completed <= 0) {
          p.currentPlayer = 1 - p.currentPlayer;
        }
        break;
      }
    }
    p.checkGameState();
  }

  //////////////////////////////////////////////////////////
  // Geometry + game logic
  //////////////////////////////////////////////////////////

  p.checkGameState = function() {
    let result = true;
    
    for (e of p.edges) {
      if (!e.marked) {
        result = false;
        break;
      }
    }
    
    if (result) {
      p.won = true;
    }
  }

  p.generateConvexPolygon = function(n) {
    let angleStep = (3.141582*2) / n;
    let r = 200;
    let cx = p.width / 2;
    let cy = p.height / 2;

    for (let i = 0; i < n; i++) {
      let a = angleStep * i;
      p.points.push({
        x: cx + r * p.cos(a),
        y: cy + r * p.sin(a),
      });
    }
  }

  // helper to add unique undirected edge
  p.addEdge = function (a, b) {
    if (a > b) [a, b] = [b, a];
    for (let i = 0; i < p.edges.length; i++) {
      if (p.edges[i].a === a && p.edges[i].b === b) return i;
    }
    p.edges.push({ a: a, b: b, color: "black" });
    return p.edges.length - 1;
  }

  p.buildTriangulations = function() {
    p.edges = [];
    p.triangles = [];
    const n = p.points.length;

    // add outer polygon edges (i, i+1)
    for (let i = 0; i < n; i++) {
      p.addEdge(i, (i + 1) % n);
    }

    // now create triangles and add missing center edges as needed
    for (let i = 1; i < n - 1; i++) {
      const a = p.centerPt,
        b = i,
        c = i + 1;
      const e1 = p.addEdge(a, b);
      const e2 = p.addEdge(b, c);
      const e3 = p.addEdge(a, c);
      p.triangles.push({ edges: [e1, e2, e3], completedBy: null });
    }
  }

  p.checkCompletedTriangles = function (player) {
    let completed = 0;
    for (let t of p.triangles) {
      if (t.completedBy === null) {
        let count = 0;
        for (let i = 0; i < t.edges.length; i++) {
          let edgeIdx = t.edges[i];
          let e = p.edges[edgeIdx];
          if (e.marked) {
            count++;
          }
        }

        if (count === 3) {
          t.completedBy = player;
          completed++;
        }
      }
    }
    return completed;
  }

  p.isMouseNearEdge = function (e) {
    let p1 = p.points[e.a];
    let q = p.points[e.b];
    let d = p.distToSegment(p.mouseX, p.mouseY, p1.x, p1.y, q.x, q.y);
    return d < 10;
  }

  // Distance from point to segment
  p.distToSegment= function (px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return p.dist(px, py, xx, yy);
  }

  p.getUniqueVertices = function (index_edges) {
    let verts = [];

    for (i of index_edges) {
      const e = p.edges[i];
      verts.push(e.a);
      verts.push(e.b);
    }

    let uniq = [...new Set(verts)];
    let to_ret = [];

    for (e of uniq) {
      to_ret.push(p.points[e]);
    }
    return to_ret;
  }

  //////////////////////////////////////////////////////////
  // Drawing
  //////////////////////////////////////////////////////////

  p.drawPoints = function () {
    p.fill(0);
    p.noStroke();
    for (let p1 of p.points) {
      p.circle(p1.x, p1.y, 8);
    }
  }

  p.drawEdges = function () {
    for (let e of p.edges) {
      let p1 = p.points[e.a];
      let q = p.points[e.b];

      p.strokeWeight(e.marked ? 4 : 1);
      p.stroke(e.color);

      p.line(p1.x, p1.y, q.x, q.y);
    }
  }

  p.drawTriangles = function () {
    p.noFill();
    for (let t of p.triangles) {
      if (t.completedBy !== null) {
        p.fill("rgba(0,255,0,0.2)");
        p.noStroke();
        let set_p = p.getUniqueVertices(t.edges);
        let p1 = set_p[0];
        let p2 = set_p[1];
        let p3 = set_p[2];
        p.triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      }
    }
  }

  p.drawUI = function() {
    p.fill(0);
    p.text("Current player: " + p.colors[p.currentPlayer], 10, 80);
    if (p.won) {
      p.text("Winner: " + p.colors[1 - p.currentPlayer], 10, 110);
    }
  }
}

window.addEventListener("load", () => {
  const container = document.getElementById("nimstring-container");
  if (container) {
    new p5(nimString, container);
  }
});