function catmullRom2bezier(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]},${points[0][1]} `;
  if (points.length === 2) {
    return d + `L ${points[1][0]},${points[1][1]}`;
  }
  
  const p = [points[0], ...points, points[points.length - 1]];
  
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]} `;
  }
  return d;
}
console.log(catmullRom2bezier([[450, 950], [420, 850], [400, 750]]));
