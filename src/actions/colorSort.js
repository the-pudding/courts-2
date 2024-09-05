import { color, hsl } from "d3";

let steps = 3;


function sets(data){
    const list = new Array(steps).fill().map(x => []);
    const splits = splitCircle(steps);


    data.forEach(c => {

        let d = color(c.color.split(",")[0]);

        d = hsl(d); // {h: 207.27…, s: 0.44, l: 0.4902…, opacity: 1}
        let hue = d.h;
        let hueSet = withinSegment(splits, hue);
        list[hueSet].push([c, d, d.s]);
    });
    return list;
}

function sets2(data) {
    // separate greys
    let greys = [];
    let c = sets(data);
    // const c = [...colorSet];

    c.forEach((set, i) => {
      let cleanSet = [];
      set.forEach(a => {

        const saturation = a[1].s;

        if (saturation > .23) {
          cleanSet.push(a);
        } else {
          greys.push(a)
        }
      });
      cleanSet = cleanSet.sort(byLightness)
      cleanSet = cleanSet.map(d => d[0]);
      c[i] = cleanSet
    });
    // console.log(c)

    greys.sort(byLightness)
    greys = greys.map(d => d[0]);    
    return [...c, greys]
}

function withinSegment(segments, q) {
    for (let i = 0; i < segments.length; ++i) {
        let [lower, upper] = segments[i];
        if (lower < q && q <= upper) {
            return i;
        }
    }
    return 0;
}

function splitCircle(n) {
    const angle = 360 / n;
    const list = new Array(n).fill(null).map((x, i) => {
    const centre = i * angle;
    return [centre - angle / 2, centre + angle / 2].map(c => c > 0 ? c : 360 + c);
    });
    return list;
}

function byLightness(a, b){
    return b[1].l - a[1].l;
}


export default function colorSort(data) {
    // console.log(data)
    let colorSet = sets2(data);
    return colorSet.flat(1);
}