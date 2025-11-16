const allGreenSketch = (p) => {
  ////////// Data Struct //////////

  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  let points = [];
  let DelaunayEdges = [];
  let Triangles = [];

  let LockedEdges = [];

  let totalEdges = 0;
  let lowerBound = 0;

  let buttonRandom;

  ////////// Drawing //////////

  p.setup = function () {
    const parent = document.getElementById("all-green-container");
    const w = parent?.clientWidth || 900;
    const h = parent?.clientHeight || 700;

    const canvas = p.createCanvas(w, h);
    canvas.parent(parent);

    p.fill("black");
    p.textSize(16);

    buttonRandom = p.createButton("New Triangulation");
    buttonRandom.parent(parent);
    buttonRandom.position(30, 30);
    buttonRandom.mousePressed(AddRandomDelaunay);
  };

  p.draw = function () {
    p.background(150);

    p.fill("black");
    p.textSize(16);

    p.text(`number of points : ${points.length}`, 20, 40);

    p.text(`Current Green edges : ${LockedEdges.length}`, 20, 80);
    p.text(`Remaining Black     : ${Math.max(0, totalEdges - LockedEdges.length)}`, 20, 100);

    // All-Green victory condition
    if (LockedEdges.length >= totalEdges && totalEdges > 0) {
      p.fill("green");
      p.textSize(30);
      p.text("You Won!", p.width - 200, p.height - 80);
      p.fill("black");
      p.textSize(16);
    }


    // draw points
    for (let pt of points) {
      p.ellipse(pt.x, pt.y, 4, 4);
    }

    

    // draw all Delaunay edges in black
    p.stroke("black");
    for (let e of DelaunayEdges) {
      p.line(e[0].x, e[0].y, e[1].x, e[1].y);
    }

    
    p.stroke("green");
    for (const [i1, i2] of LockedEdges) {
      const p1 = points[i1];
      const p2 = points[i2];
      p.line(p1.x, p1.y, p2.x, p2.y);
    }
    p.stroke("black");
  };

  

  p.mousePressed = function () {
    const edge = findClickedEdge(p.mouseX, p.mouseY);
    if (edge) {
      onEdgeClick(edge);
    }
  };

  p.windowResized = function () {
    const parent = document.getElementById("all-green-container");
    if (!parent) return;
    const w = parent.clientWidth || 900;
    const h = parent.clientHeight || 700;
    p.resizeCanvas(w, h);
  };

  ////////// Button functions //////////

  function resetpoints() {
    points = [];
    DelaunayEdges = [];
    Triangles = [];
    LockedEdges = [];
    lowerBound = 0;
    totalEdges = 0;
  }

  

  function AddRandomDelaunay() {
    resetpoints();

    const n = p.int(p.random(20, 60));
    const margin = 100;

    // random points
    for (let i = 0; i < n; i++) {
      const x = p.random(margin, p.width - margin);
      const y = p.random(margin, p.height - margin);
      points.push(new Point(x, y));
    }

    // keep only points in convex position
    points = convexHull(points);

    DelaunayTriangulation();
    computeBounds();
  }

  ////////// Delaunay triangulation  //////////

  function DelaunayTriangulation() {
    DelaunayEdges = [];
    Triangles = [];

    if (points.length < 3) return;

    const coords = points.map(pt => [pt.x, pt.y]);

    // get an array of point indices that form a triangle
    const delaunay = Delaunator.from(coords);
    const t = delaunay.triangles;

    // find the triangles
    for (let i = 0; i < t.length; i += 3) {
      Triangles.push([t[i], t[i + 1], t[i + 2]]);
    }

    // need a unique undirected edge set 
    const edgeMap = new Map();

    function addEdge(i, j) {
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a}-${b}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, [a, b]);
      }
    }

    for (const tri of Triangles) {
      const [i0, i1, i2] = tri;
      addEdge(i0, i1);
      addEdge(i1, i2);
      addEdge(i2, i0);
    }

    DelaunayEdges = [];
    for (const [i, j] of edgeMap.values()) {
      DelaunayEdges.push([points[i], points[j]]);
    }

    totalEdges = edgeMap.size;
  }

  ////////// Helpers //////////

  function Orientation(p0, q0, r0) {
    const det = -((q0.x - p0.x) * (r0.y - p0.y) - (q0.y - p0.y) * (r0.x - p0.x));
    return det; // > 0: CCW, < 0: CW, 0: collinear
  }

  function convexHull(pts) {
    if (pts.length <= 1) return pts.slice();

    const sorted = pts.slice().sort((a, b) => {
      if (a.x === b.x) return a.y - b.y;
      return a.x - b.x;
    });

    const lower = [];
    for (const p0 of sorted) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p0) <= 0
      ) {
        lower.pop();
      }
      lower.push(p0);
    }

    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p0 = sorted[i];
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p0) <= 0
      ) {
        upper.pop();
      }
      upper.push(p0);
    }

    // remove duplicated endpoints
    upper.pop();
    lower.pop();

    return lower.concat(upper);
  }

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  function findIndexInPoints(p0) {
    return points.findIndex((q0) => q0.x === p0.x && q0.y === p0.y);
  }

  // equality with precision errors
  function samePoint(p0, q0) {
    const eps = 1e-6;
    return Math.abs(p0.x - q0.x) < eps && Math.abs(p0.y - q0.y) < eps;
  }

  // distance from a point P to a segment AB
  function distPointToSegment(px, py, x1, y1, x2, y2) {

    // get vector AB
    const AB_x = x2 - x1;
    const AB_y = y2 - y1;

    // get vector AP
    const AP_x = px - x1;
    const AP_y = py - y1;

    // projection of P
    const projP = AB_x * AP_x + AB_y * AP_y;

    // before A
    if (projP <= 0) {
      return p.dist(px, py, x1, y1);
    }

    const sqLen = AB_x * AB_x + AB_y * AB_y;

    // after B
    if (sqLen <= projP) {
      return p.dist(px, py, x2, y2);
    }

    // on AB
    const t = projP / sqLen;
    const projx = x1 + t * AB_x; // get projected coord
    const projy = y1 + t * AB_y;
    return p.dist(px, py, projx, projy);

  }

  // find clicked edge
  function findClickedEdge(mouse_x, mouse_y) {
    if (DelaunayEdges.length === 0) return null;

    const threshold = 15;
    let bestEdge = null;
    let bestDist = Infinity;

    for (let i = 0; i < DelaunayEdges.length; i++) {
      const [a, b] = DelaunayEdges[i];
      const d = distPointToSegment(mouse_x, mouse_y, a.x, a.y, b.x, b.y);
      if (d <= threshold && d < bestDist) {
        bestDist = d;
        bestEdge = {a,b};
      }
    }

    return bestEdge;
  }

  ////////// Edge flipping //////////

  // triangles that contain both vertices A and B
  function findAdjacentTriangles(A, B) {
    const adj = [];
    for (let i = 0; i < Triangles.length; i++) {
      if (Triangles[i].includes(A) && Triangles[i].includes(B)) {
        adj.push({ index: i, tri: Triangles[i]});
      }
    }
    return adj;
  }

  // check convexity of quadrilateral
  function isConvexQuad(A, C, B, D) {
    const quad = [A, C, B, D];
    let sign = 0;

    for (let i = 0; i < 4; i++) {
      const o = Orientation(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]);
      const s = Math.sign(o);

      if (s === 0) continue; // colinear
      if (sign === 0) sign = s; // set the direction
      else if (sign !== s) return false;
    }

    return true;
  }

  function isEdgeLocked(A, B) {
    for (const [u, v] of LockedEdges) {
      if ((u === A && v === B) || (u === B && v === A)) return true;
    }
    return false;
  }


  function flipEdge(A, B, C, D) {

    // Make a new Triangle list without the removed triangles
    const newTriangles = [];
    for (const T of Triangles) {
      const hasA = T.includes(A);
      const hasB = T.includes(B);
      if (!(hasA && hasB)) {
        newTriangles.push(T);
      }
    }

    // Add two new triangles
    newTriangles.push([A, C, D]);
    newTriangles.push([B, C, D]);

    Triangles = newTriangles;

    // remove old and add new edge
    DelaunayEdges = DelaunayEdges.filter(([p0, q0]) => {
      const matchAB =
        (samePoint(p0, points[A]) && samePoint(q0, points[B])) ||
        (samePoint(p0, points[B]) && samePoint(q0, points[A]));
        return !matchAB;
    })

    DelaunayEdges.push([points[C], points[D]]);

    // lock the 5 edges
    const newLocked = [
      [A, C],
      [C, B],
      [B, D],
      [D, A],
      [C, D],
    ];

    for (const [u, v] of newLocked) {
      if (!isEdgeLocked(u, v)) LockedEdges.push([u, v]);
    }
  }

  function onEdgeClick(edge) {
    const A = findIndexInPoints(edge.a);
    const B = findIndexInPoints(edge.b);

    if (A === -1 || B === -1) return;

    if (isEdgeLocked(A, B)) {
      return;
    }

    const adj = findAdjacentTriangles(A, B);

    // check if has two adjacent triangles
    if (adj.length !== 2) {
      return;
    }

    // find the other 2 vetices 
    const C = adj[0].tri.find((i) => i !== A && i !== B);
    const D = adj[1].tri.find((i) => i !== A && i !== B);


    // check if the quadrilateral is Convex
    if (!isConvexQuad(points[A], points[C], points[B], points[D])) {
      return;
    }

    flipEdge(A, B, C, D);
  }

  function computeBounds() {
    lowerBound = Math.ceil(totalEdges / 6);
  }
};

window.addEventListener("load", () => {
  const container = document.getElementById("all-green-container");
  if (container) {
    new p5(allGreenSketch, container);
  }
});
